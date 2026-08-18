import "server-only"

/**
 * 视频在线播放服务（轻量直通模式）：
 * 不依赖 FFmpeg，直接由浏览器原生硬解播放标准 MP4/WebM。
 * 如遇不支持的编码封装，前端优雅降级提示下载源文件。
 */

export type VideoPlayableStatus =
  | { status: "ready-original" }
  | { status: "ready-converted" }
  | { status: "converting" }
  | { status: "failed"; reason: "too-large" | "convert-error" | "probe-error"; maxMb?: number }

export async function getVideoPlayableStatus(_opts?: {
  fileId: string
  storagePath: string
  extension: string | null
  size: number
  supportsHevc?: boolean
  force?: boolean
}): Promise<VideoPlayableStatus> {
  return { status: "ready-original" }
}

export async function resolveConvertedVideo(_fileId: string): Promise<{ filePath: string; extension: "mp4" | "webm" } | null> {
  return null
}
