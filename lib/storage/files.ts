import "server-only"

import { createHash, randomUUID } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

const root = path.resolve(process.cwd(), "data", "files")
const allowed = new Set(["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx", "png", "jpg", "jpeg", "webp", "gif", "txt", "md", "json", "xml", "yaml", "yml", "sql", "log", "csv", "zip"])
const maxBytes = 500 * 1024 * 1024

export function validateUpload(file: File) {
  const extension = path.extname(file.name).slice(1).toLowerCase()
  if (!allowed.has(extension)) throw new Error("不支持的文件类型")
  if (file.size <= 0 || file.size > maxBytes) throw new Error("文件大小必须在 1B 到 500MB 之间")
  return extension
}

export async function persistUpload(file: File, extension: string) {
  const now = new Date()
  const relativeDir = path.join(String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0"))
  const directory = path.join(root, relativeDir)
  await fs.mkdir(directory, { recursive: true })
  const storageName = `${randomUUID()}.${extension}`
  const relativePath = path.join(/* turbopackIgnore: true */ relativeDir, storageName)
  const target = path.join(root, relativePath)
  const temp = path.join(process.cwd(), "data", "temp", `${randomUUID()}.upload`)
  await fs.mkdir(path.dirname(temp), { recursive: true })
  const bytes = Buffer.from(await file.arrayBuffer())
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  await fs.writeFile(temp, bytes, { flag: "wx" })
  await fs.rename(temp, target)
  return { storageName, storagePath: relativePath, sha256, size: bytes.byteLength }
}

export function safeStoragePath(relativePath: string) {
  const resolved = path.resolve(root, relativePath)
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage path")
  return resolved
}
