import "server-only"

import { createHash, randomUUID } from "node:crypto"
import fs from "node:fs/promises"
import { createWriteStream } from "node:fs"
import path from "node:path"
import { Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import { Readable } from "node:stream"

import { allowedFileExtensions, storageDirectoryForExtension } from "@/lib/file/kinds"

const root = path.resolve(process.cwd(), "data", "files")
const allowed = new Set<string>(allowedFileExtensions)
const maxBytes = 500 * 1024 * 1024

export function validateUpload(file: File) {
  const extension = path.extname(file.name).slice(1).toLowerCase()
  if (!allowed.has(extension)) throw new Error(`不支持${extension ? ` .${extension}` : "该"}文件。支持 PDF、Office、图片（含 SVG）、文本、CSV 和 ZIP`)
  if (file.size <= 0 || file.size > maxBytes) throw new Error("文件大小必须在 1B 到 500MB 之间")
  return extension
}

export async function persistUpload(file: File, extension: string) {
  const now = new Date()
  const relativeDir = path.join(storageDirectoryForExtension(extension), String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0"))
  const directory = path.join(root, relativeDir)
  await fs.mkdir(directory, { recursive: true })
  const storageName = `${randomUUID()}.${extension}`
  const relativePath = path.join(/* turbopackIgnore: true */ relativeDir, storageName)
  const target = path.join(root, relativePath)
  const temp = path.join(process.cwd(), "data", "temp", `${randomUUID()}.upload`)
  await fs.mkdir(path.dirname(temp), { recursive: true })

  // 流式写盘：边写边计算 SHA-256，避免将整个文件（上限 500MB）读入内存
  const hash = createHash("sha256")
  let size = 0
  const hashingTransform = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk)
      size += chunk.length
      callback(null, chunk)
    },
  })
  await pipeline(
    Readable.fromWeb(file.stream() as unknown as import("node:stream/web").ReadableStream),
    hashingTransform,
    createWriteStream(temp, { flags: "wx" }),
  )
  const sha256 = hash.digest("hex")
  await fs.rename(temp, target)
  return { storageName, storagePath: relativePath, sha256, size }
}

export function safeStoragePath(relativePath: string) {
  const resolved = path.resolve(root, relativePath)
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage path")
  return resolved
}
