import "server-only"

import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

import { dataPath } from "@/lib/paths"

/**
 * 视频在线播放兼容服务。
 *
 * 浏览器无法直接解码的封装或编码（如 H.265/HEVC、ProRes、AV1、MOV/MKV 容器等），
 * 通过 FFmpeg 自动转为浏览器可播放的格式：
 * - 编码本身可播放但容器不兼容（如 MOV/MKV 里的 H.264）→ 仅 remux（-c copy 视频流），秒级完成、画质无损；
 * - 编码不兼容（HEVC / ProRes / AV1 等）→ 重编码为 H.264/AAC MP4。
 *
 * 转换结果为磁盘缓存（data/previews/videos/<fileId>.<ext>），首次预览触发异步转换，
 * 客户端轮询 video-playable 接口获取状态；原文件始终保留。
 */

const CONVERTED_DIR = () => dataPath("previews", "videos")
const MAX_CONVERT_MB = Number(process.env.TEAMVAULT_VIDEO_CONVERT_MAX_MB) || 1024
const FAILURE_MEMORY_MS = 10 * 60 * 1000
const MAX_CONCURRENT = 2
const PROBE_ANALYZE_US = 20_000_000 // 20s 分析上限，避免 moov 在文件尾部时长时间扫描

type ProbeStream = { codec?: string }
type ProbeResult = {
  container?: string
  video?: ProbeStream
  audio?: ProbeStream
  duration?: number
}

export type VideoPlayableStatus =
  | { status: "ready-original" } // 原文件浏览器可直接播放
  | { status: "ready-converted" } // 已生成转码缓存
  | { status: "converting" } // 转换进行中
  | { status: "failed"; reason: "too-large" | "convert-error" | "probe-error"; maxMb?: number }

const PLAYABLE_VIDEO_BY_CONTAINER: Record<string, Set<string>> = {
  mp4: new Set(["h264", "vp9"]),
  webm: new Set(["vp8", "vp9"]),
}
const PLAYABLE_AUDIO = new Set(["aac", "mp3", "opus", "vorbis"])

function convertedVideoPath(fileId: string) {
  return {
    mp4: path.join(CONVERTED_DIR(), `${fileId}.mp4`),
    webm: path.join(CONVERTED_DIR(), `${fileId}.webm`),
  }
}

function probeMarkerPath(fileId: string) {
  return path.join(CONVERTED_DIR(), `${fileId}.probe.json`)
}

function probeFile(filePath: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "ffprobe",
      ["-v", "error", "-analyzeduration", String(PROBE_ANALYZE_US), "-probesize", "100M",
        "-print_format", "json", "-show_format", "-show_streams", filePath],
      { stdio: ["ignore", "pipe", "pipe"] },
    )
    let stdout = ""
    let stderr = ""
    proc.stdout.on("data", chunk => { stdout += chunk })
    proc.stderr.on("data", chunk => { stderr += chunk })
    proc.on("error", error => reject(new Error(`ffprobe 启动失败：${error.message}`)))
    proc.on("close", code => {
      if (code !== 0) {
        reject(new Error(`ffprobe 退出码 ${code}：${stderr.slice(0, 300)}`))
        return
      }
      try {
        const data = JSON.parse(stdout)
        const format = data.format ?? {}
        const video = (data.streams ?? []).find((s: { codec_type?: string }) => s.codec_type === "video")
        const audio = (data.streams ?? []).find((s: { codec_type?: string }) => s.codec_type === "audio")
        resolve({
          container: typeof format.format_name === "string" ? format.format_name.split(",")[0] : undefined,
          duration: Number.isFinite(Number(format.duration)) ? Number(format.duration) : undefined,
          video: video ? { codec: video.codec_name } : undefined,
          audio: audio ? { codec: audio.codec_name } : undefined,
        })
      } catch {
        reject(new Error("ffprobe 输出解析失败"))
      }
    })
  })
}

/** 按「扩展名 + 实际编码」判断浏览器是否可直接播放 */
function isDirectlyPlayable(extension: string, probe: ProbeResult): boolean {
  const ext = extension.toLowerCase()
  const allowedVideos = PLAYABLE_VIDEO_BY_CONTAINER[ext]
  if (!allowedVideos) return false
  if (!probe.video?.codec || !allowedVideos.has(probe.video.codec)) return false
  if (probe.audio?.codec && !PLAYABLE_AUDIO.has(probe.audio.codec)) return false
  return true
}

type ProbeMarker = { storagePath: string; probe: ProbeResult; at: number }

async function readProbeMarker(fileId: string): Promise<ProbeMarker | null> {
  try {
    return JSON.parse(await fs.readFile(probeMarkerPath(fileId), "utf8")) as ProbeMarker
  } catch {
    return null
  }
}

async function writeProbeMarker(fileId: string, storagePath: string, probe: ProbeResult) {
  const marker: ProbeMarker = { storagePath, probe, at: Date.now() }
  await fs.mkdir(CONVERTED_DIR(), { recursive: true })
  await fs.writeFile(probeMarkerPath(fileId), JSON.stringify(marker), "utf8")
}

// ---- 转换任务：单飞 + 全局并发上限 ----
const runningJobs = new Map<string, Promise<void>>()
const failedAt = new Map<string, number>()
let activeConversions = 0
const waitQueue: Array<() => void> = []

function acquireSlot() {
  if (activeConversions < MAX_CONCURRENT) {
    activeConversions += 1
    return Promise.resolve()
  }
  return new Promise<void>(resolve => waitQueue.push(resolve))
}

function releaseSlot() {
  activeConversions -= 1
  waitQueue.shift()?.()
}

/** 编码可播放但容器不兼容 → 仅 remux（复制视频流，必要时转音频） */
function remuxArgs(input: string, output: string, probe: ProbeResult, outputExt: "mp4" | "webm") {
  const args = ["-y", "-v", "error", "-i", input, "-map", "0:v:0", "-map", "0:a?", "-c:v", "copy"]
  const audioCodec = probe.audio?.codec
  if (audioCodec && (outputExt === "mp4" ? ["aac", "mp3", "opus"].includes(audioCodec) : ["opus", "vorbis"].includes(audioCodec))) {
    args.push("-c:a", "copy")
  } else if (audioCodec) {
    args.push("-c:a", outputExt === "mp4" ? "aac" : "opus", "-b:a", "128k")
  }
  args.push("-movflags", "+faststart", "-threads", "0", "-f", outputExt, output)
  return args
}

/** 编码不兼容 → 重编码为 H.264/AAC MP4 */
function transcodeArgs(input: string, output: string) {
  return [
    "-y", "-v", "error", "-i", input,
    "-map", "0:v:0", "-map", "0:a?",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart", "-threads", "0", "-f", "mp4", output,
  ]
}

function startConversion(fileId: string, storagePath: string, probe: ProbeResult): Promise<void> {
  const input = path.resolve(storagePath)
  const outputExt: "mp4" | "webm" = probe.video?.codec === "vp8" || probe.video?.codec === "vp9" ? "webm" : "mp4"
  const targets = convertedVideoPath(fileId)
  const output = targets[outputExt]
  const temp = `${output}.${randomUUID()}.tmp`

  return new Promise((resolve, reject) => {
    void (async () => {
      await fs.mkdir(CONVERTED_DIR(), { recursive: true }).catch(() => {})
      await acquireSlot()
      const args =
        probe.video?.codec && ["h264", "vp8", "vp9"].includes(probe.video.codec)
          ? remuxArgs(input, temp, probe, outputExt)
          : transcodeArgs(input, temp)
      const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] })
      let stderr = ""
      proc.stderr.on("data", chunk => {
        stderr = (stderr + chunk).slice(-2000)
      })
      proc.on("error", error => {
        releaseSlot()
        reject(new Error(`ffmpeg 启动失败：${error.message}`))
      })
      proc.on("close", async code => {
        releaseSlot()
        if (code !== 0) {
          await fs.rm(temp, { force: true }).catch(() => {})
          reject(new Error(`ffmpeg 退出码 ${code}：${stderr.slice(0, 300)}`))
          return
        }
        try {
          await fs.mkdir(CONVERTED_DIR(), { recursive: true })
          await fs.rename(temp, output)
          resolve()
        } catch (error) {
          await fs.rm(temp, { force: true }).catch(() => {})
          reject(error instanceof Error ? error : new Error("转码结果写入失败"))
        }
      })
    })()
  })
}

async function convertOrStart(fileId: string, storagePath: string, size: number, probe: ProbeResult): Promise<VideoPlayableStatus> {
  const lastFailure = failedAt.get(fileId)
  if (lastFailure && Date.now() - lastFailure < FAILURE_MEMORY_MS) {
    return { status: "failed", reason: "convert-error" }
  }
  if (runningJobs.has(fileId)) return { status: "converting" }

  if (size > MAX_CONVERT_MB * 1024 * 1024) {
    return { status: "failed", reason: "too-large", maxMb: MAX_CONVERT_MB }
  }

  const job = startConversion(fileId, storagePath, probe)
    .then(() => {
      runningJobs.delete(fileId)
      failedAt.delete(fileId)
    })
    .catch((error: unknown) => {
      runningJobs.delete(fileId)
      failedAt.set(fileId, Date.now())
      console.error(`[video-convert] ${fileId} 转码失败：`, error instanceof Error ? error.message : error)
    })
  runningJobs.set(fileId, job)
  return { status: "converting" }
}

export async function getVideoPlayableStatus(opts: {
  fileId: string
  storagePath: string
  extension: string | null
  size: number
}): Promise<VideoPlayableStatus> {
  // 1. 已有转码缓存 → 直接可用
  const targets = convertedVideoPath(opts.fileId)
  if (await fs.access(targets.mp4).then(() => true).catch(() => false)) {
    return { status: "ready-converted" }
  }
  if (await fs.access(targets.webm).then(() => true).catch(() => false)) {
    return { status: "ready-converted" }
  }

  // 2. 读取探测缓存，命中且文件未变更则跳过 ffprobe
  const marker = await readProbeMarker(opts.fileId)
  let probe = marker && marker.storagePath === opts.storagePath ? marker.probe : null
  if (!probe) {
    try {
      probe = await probeFile(path.resolve(opts.storagePath))
    } catch {
      return { status: "failed", reason: "probe-error" }
    }
  }

  // 3. 原文件可直接播放 → 直出
  if (isDirectlyPlayable(opts.extension ?? "", probe)) {
    if (marker?.storagePath !== opts.storagePath) {
      await writeProbeMarker(opts.fileId, opts.storagePath, probe).catch(() => {})
    }
    return { status: "ready-original" }
  }

  return convertOrStart(opts.fileId, opts.storagePath, opts.size, probe)
}

/** 返回已转换缓存文件路径（不存在返回 null） */
export async function resolveConvertedVideo(fileId: string): Promise<{ filePath: string; extension: "mp4" | "webm" } | null> {
  const targets = convertedVideoPath(fileId)
  if (await fs.access(targets.mp4).then(() => true).catch(() => false)) {
    return { filePath: targets.mp4, extension: "mp4" }
  }
  if (await fs.access(targets.webm).then(() => true).catch(() => false)) {
    return { filePath: targets.webm, extension: "webm" }
  }
  return null
}
