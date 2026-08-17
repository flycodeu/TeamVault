import "server-only"

import { spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"

import { dataPath } from "@/lib/paths"

/**
 * 视频在线播放兼容服务。
 *
 * 针对各种视频封装与编码进行智能分流：
 * 1. 原生硬解直通（DirectPlay）：
 *    - 现代浏览器支持的标准 H.264/AAC MP4、VP8/VP9 WebM；
 *    - 前端支持 H.265（HEVC）且为 MP4 容器时，直接直通硬解秒开，0 服务端开销。
 * 2. 极速转封装（Remux）：
 *    - 容器不兼容（如 MKV/MOV）但编码兼容时，通过 -c:v copy 秒级生成 MP4/WebM，0 CPU 重编码损耗。
 * 3. 智能兼容转码（Transcode）：
 *    - 编码不兼容（ProRes、AV1、老旧设备上的 H.265 等）或 10-bit 色彩时，转为 8-bit H.264/AAC MP4；
 *    - 限制分辨率最高 1080p（scale='min(1920,iw)':-2）极大加速转码并降低服务器 CPU 负载。
 * 4. 自动容错降级（Fallback）：
 *    - 前端直出播放异常时可携带 force=true 强制重新转码并覆盖缓存。
 */

const CONVERTED_DIR = () => dataPath("previews", "videos")
const MAX_CONVERT_MB = Number(process.env.TEAMVAULT_VIDEO_CONVERT_MAX_MB) || 1024
const FAILURE_MEMORY_MS = 10 * 60 * 1000
const MAX_CONCURRENT = 2
const PROBE_ANALYZE_US = 20_000_000 // 20s 分析上限

type ProbeStream = { codec?: string; pix_fmt?: string }
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
      [
        "-v", "error",
        "-analyzeduration", String(PROBE_ANALYZE_US),
        "-probesize", "100M",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        filePath,
      ],
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
          video: video ? { codec: video.codec_name, pix_fmt: video.pix_fmt } : undefined,
          audio: audio ? { codec: audio.codec_name } : undefined,
        })
      } catch {
        reject(new Error("ffprobe 输出解析失败"))
      }
    })
  })
}

/** 按「扩展名 + 实际编码 + 像素格式 + 客户端能力」判断浏览器是否可直接播放 */
function isDirectlyPlayable(extension: string, probe: ProbeResult, supportsHevc = false): boolean {
  const ext = extension.toLowerCase()
  const videoCodec = probe.video?.codec
  if (!videoCodec) return false

  // 音频必须是浏览器常用可直接解码格式（排除 DTS/AC3/EAC3 等需转码的音轨）
  if (probe.audio?.codec && !PLAYABLE_AUDIO.has(probe.audio.codec)) return false

  if (ext === "webm") {
    return videoCodec === "vp8" || videoCodec === "vp9"
  }

  if (ext === "mp4") {
    if (videoCodec === "h264") {
      // 10-bit H.264 大多数浏览器原生硬解无法播放，需走转码
      if (probe.video?.pix_fmt?.includes("10")) return false
      return true
    }
    if (videoCodec === "vp9") return true
    if (videoCodec === "hevc" && supportsHevc) return true
  }

  return false
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
function remuxArgs(input: string, output: string, probe: ProbeResult, outputExt: "mp4" | "webm", isHevc = false) {
  const args = ["-y", "-v", "error", "-i", input, "-map", "0:v:0", "-map", "0:a?", "-c:v", "copy"]
  if (isHevc && outputExt === "mp4") {
    args.push("-tag:v", "hvc1")
  }
  const audioCodec = probe.audio?.codec
  if (audioCodec && (outputExt === "mp4" ? ["aac", "mp3", "opus"].includes(audioCodec) : ["opus", "vorbis"].includes(audioCodec))) {
    args.push("-c:a", "copy")
  } else if (audioCodec) {
    args.push("-c:a", outputExt === "mp4" ? "aac" : "opus", "-b:a", "128k")
  }
  args.push("-movflags", "+faststart", "-threads", "0", "-f", outputExt, output)
  return args
}

/** 编码不兼容或客户端无法硬解 → 重编码为 1080p 兼容性 H.264/AAC MP4 */
function transcodeArgs(input: string, output: string) {
  return [
    "-y", "-v", "error", "-i", input,
    "-map", "0:v:0", "-map", "0:a?",
    "-vf", "scale='min(1920,iw)':-2",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k",
    "-movflags", "+faststart", "-threads", "0", "-f", "mp4", output,
  ]
}

function startConversion(
  fileId: string,
  storagePath: string,
  probe: ProbeResult,
  forceTranscode = false,
  supportsHevc = false,
): Promise<void> {
  const input = path.resolve(storagePath)
  const isVp = !forceTranscode && (probe.video?.codec === "vp8" || probe.video?.codec === "vp9")
  const outputExt: "mp4" | "webm" = isVp ? "webm" : "mp4"
  const targets = convertedVideoPath(fileId)
  const output = targets[outputExt]
  const temp = `${output}.${randomUUID()}.tmp`

  return new Promise((resolve, reject) => {
    void (async () => {
      await fs.mkdir(CONVERTED_DIR(), { recursive: true }).catch(() => {})
      await acquireSlot()

      let args: string[]
      const codec = probe.video?.codec
      if (!forceTranscode && codec && ["h264", "vp8", "vp9"].includes(codec)) {
        args = remuxArgs(input, temp, probe, outputExt)
      } else if (!forceTranscode && codec === "hevc" && supportsHevc) {
        args = remuxArgs(input, temp, probe, outputExt, true)
      } else {
        args = transcodeArgs(input, temp)
      }

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

async function convertOrStart(
  fileId: string,
  storagePath: string,
  size: number,
  probe: ProbeResult,
  forceTranscode = false,
  supportsHevc = false,
): Promise<VideoPlayableStatus> {
  const lastFailure = failedAt.get(fileId)
  if (!forceTranscode && lastFailure && Date.now() - lastFailure < FAILURE_MEMORY_MS) {
    return { status: "failed", reason: "convert-error" }
  }
  if (runningJobs.has(fileId)) return { status: "converting" }

  if (size > MAX_CONVERT_MB * 1024 * 1024) {
    return { status: "failed", reason: "too-large", maxMb: MAX_CONVERT_MB }
  }

  // 强制转码时清除失败记忆
  if (forceTranscode) {
    failedAt.delete(fileId)
  }

  const job = startConversion(fileId, storagePath, probe, forceTranscode, supportsHevc)
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
  supportsHevc?: boolean
  force?: boolean
}): Promise<VideoPlayableStatus> {
  const targets = convertedVideoPath(opts.fileId)

  // 1. 如果已有转码缓存
  const mp4Exists = await fs.access(targets.mp4).then(() => true).catch(() => false)
  const webmExists = await fs.access(targets.webm).then(() => true).catch(() => false)

  if (!opts.force && (mp4Exists || webmExists)) {
    return { status: "ready-converted" }
  }

  // 2. 读取/执行探测
  const marker = await readProbeMarker(opts.fileId)
  let probe = marker && marker.storagePath === opts.storagePath ? marker.probe : null
  if (!probe) {
    try {
      probe = await probeFile(path.resolve(opts.storagePath))
      await writeProbeMarker(opts.fileId, opts.storagePath, probe).catch(() => {})
    } catch {
      return { status: "failed", reason: "probe-error" }
    }
  }

  // 3. 非强制转码时，若原文件支持硬解直出，返回 ready-original
  if (!opts.force && isDirectlyPlayable(opts.extension ?? "", probe, opts.supportsHevc ?? false)) {
    return { status: "ready-original" }
  }

  // 4. 若强制转码且已存在转码缓存，直接返回已转码状态（若需要重新转码，convertOrStart 会处理）
  if (opts.force && (mp4Exists || webmExists) && !runningJobs.has(opts.fileId)) {
    return { status: "ready-converted" }
  }

  return convertOrStart(opts.fileId, opts.storagePath, opts.size, probe, Boolean(opts.force), Boolean(opts.supportsHevc))
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
