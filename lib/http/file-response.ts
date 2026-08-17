import "server-only"

import { createReadStream, type ReadStream } from "node:fs"
import fs from "node:fs/promises"

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

/**
 * 将 Node.js 文件流安全转换为 Web ReadableStream。
 *
 * 避免浏览器在视频 Range 分片请求、快进/跳转或客户端提前中断 TCP 连接时，
 * 触发 `TypeError: Invalid state: Controller is already closed (ERR_INVALID_STATE)` 异常。
 */
function createSafeWebStream(stream: ReadStream, signal?: AbortSignal): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let isDone = false

      const safeCleanup = () => {
        if (isDone) return
        isDone = true
        stream.removeAllListeners()
        if (!stream.destroyed) {
          stream.destroy()
        }
      }

      if (signal) {
        if (signal.aborted) {
          safeCleanup()
          return
        }
        signal.addEventListener("abort", () => {
          safeCleanup()
        }, { once: true })
      }

      stream.on("data", chunk => {
        if (isDone) return
        try {
          controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
          if (controller.desiredSize !== null && controller.desiredSize <= 0) {
            stream.pause()
          }
        } catch {
          safeCleanup()
        }
      })

      stream.on("end", () => {
        if (isDone) return
        isDone = true
        try {
          controller.close()
        } catch {
          // 忽略已关闭状态
        }
      })

      stream.on("error", err => {
        if (isDone) return
        isDone = true
        try {
          controller.error(err)
        } catch {
          // 忽略已关闭状态
        }
      })

      stream.on("close", () => {
        isDone = true
      })
    },
    pull() {
      stream.resume()
    },
    cancel() {
      if (!stream.destroyed) {
        stream.destroy()
      }
    },
  })
}

export async function fileResponse(request: Request, filePath: string, options: FileResponseOptions) {
  const stats = await fs.stat(filePath)
  const headers = baseHeaders(stats.size, options)
  const range = request.headers.get("range")

  if (!range) {
    const stream = createReadStream(filePath)
    return new Response(createSafeWebStream(stream, request.signal), { headers })
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
  return new Response(createSafeWebStream(stream, request.signal), {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(length),
      "Content-Range": `bytes ${start}-${end}/${stats.size}`,
    },
  })
}
