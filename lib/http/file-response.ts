import "server-only"

import { createReadStream } from "node:fs"
import fs from "node:fs/promises"
import { Readable } from "node:stream"

type FileResponseOptions = {
  contentType: string
  disposition?: "inline" | "attachment"
  fileName: string
}

function contentDisposition(disposition: "inline" | "attachment", fileName: string) {
  const fallback = fileName.replace(/[\r\n"\\]/g, "_").replace(/[^\x20-\x7e]/g, "_") || "file"
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

function baseHeaders(size: number, options: FileResponseOptions) {
  return {
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "Content-Disposition": contentDisposition(options.disposition ?? "inline", options.fileName),
    "Content-Length": String(size),
    "Content-Type": options.contentType || "application/octet-stream",
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
  }
}

export async function fileResponse(request: Request, filePath: string, options: FileResponseOptions) {
  const stats = await fs.stat(filePath)
  const headers = baseHeaders(stats.size, options)
  const range = request.headers.get("range")

  if (!range) {
    const stream = createReadStream(filePath)
    return new Response(Readable.toWeb(stream) as ReadableStream, { headers })
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim())
  if (!match || (!match[1] && !match[2])) {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${stats.size}`, "Content-Length": "0" },
    })
  }

  let start: number
  let end: number
  if (!match[1]) {
    const suffixLength = Number.parseInt(match[2], 10)
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return new Response(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${stats.size}`, "Content-Length": "0" },
      })
    }
    start = Math.max(0, stats.size - suffixLength)
    end = stats.size - 1
  } else {
    start = Number.parseInt(match[1], 10)
    end = match[2] ? Number.parseInt(match[2], 10) : stats.size - 1
  }

  end = Math.min(end, stats.size - 1)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= stats.size) {
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${stats.size}`, "Content-Length": "0" },
    })
  }

  const length = end - start + 1
  const stream = createReadStream(filePath, { start, end })
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(length),
      "Content-Range": `bytes ${start}-${end}/${stats.size}`,
    },
  })
}
