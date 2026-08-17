"use client"

import JSZip from "jszip"
import { Download, FileText, FileWarning, LoaderCircle, RotateCcw } from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import type { PreviewKind } from "@/lib/file/kinds"
import { PdfViewer } from "./pdf-viewer"
import { PresentationViewer } from "./presentation-viewer"
import { SpreadsheetViewer } from "./spreadsheet-viewer"
import { DocxViewer, LegacyWordViewer } from "./word-viewer"

type PreviewFile = {
  originalName: string
  mimeType: string
  extension: string | null
  size: number
}

const TEXT_PREVIEW_MAX = 1024 * 1024
const ZIP_PREVIEW_MAX = 30 * 1024 * 1024

function PreviewMessage({
  icon,
  title,
  desc,
}: {
  icon?: React.ReactNode
  title: string
  desc?: string
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      {icon ?? <FileText className="size-8 text-muted-foreground/50" />}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {desc ? <p className="max-w-lg text-xs leading-5 text-muted-foreground">{desc}</p> : null}
    </div>
  )
}

function TextPreview({ size, url }: { size: number; url: string }) {
  const [text, setText] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          headers: size > TEXT_PREVIEW_MAX ? { Range: `bytes=0-${TEXT_PREVIEW_MAX - 1}` } : undefined,
        })
        if (!response.ok && response.status !== 206) throw new Error("无法读取文本文件")
        const value = new TextDecoder("utf-8", { fatal: false }).decode(await response.arrayBuffer())
        if (!cancelled) setText(value)
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "文本读取失败")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [size, url])

  if (loading) return <PreviewMessage icon={<LoaderCircle className="size-6 animate-spin text-teal-500" />} title="正在读取文本" />
  if (error) return <PreviewMessage icon={<FileWarning className="size-7 text-amber-500" />} title="文本无法预览" desc={error} />
  return (
    <pre className="mx-auto max-w-5xl overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 md:p-8">
      {text}
      {size > TEXT_PREVIEW_MAX ? "\n\n…（文件较大，仅显示前 1MB 内容）" : ""}
    </pre>
  )
}

function ZipPreview({ name, size, url }: { name: string; size: number; url: string }) {
  const [entries, setEntries] = useState<{ name: string; dir: boolean }[] | null>(null)
  const [error, setError] = useState("")
  const sizeError = size > ZIP_PREVIEW_MAX
    ? "压缩包超过 30MB，为避免浏览器内存占用过高，请下载后查看。"
    : ""

  useEffect(() => {
    let cancelled = false
    if (size > ZIP_PREVIEW_MAX) return
    async function load() {
      try {
        const response = await fetch(url, { cache: "no-store" })
        if (!response.ok) throw new Error("无法读取压缩包")
        const zip = await JSZip.loadAsync(await response.arrayBuffer())
        const list = Object.values(zip.files)
          .slice(0, 2000)
          .map(entry => ({ name: entry.name, dir: entry.dir }))
        if (!cancelled) setEntries(list)
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "压缩包解析失败")
      }
    }
    void load()
    return () => { cancelled = true }
  }, [size, url])

  if (sizeError || error) return <PreviewMessage icon={<FileWarning className="size-7 text-amber-500" />} title="压缩包无法预览" desc={sizeError || error} />
  if (!entries) return <PreviewMessage icon={<LoaderCircle className="size-6 animate-spin text-amber-500" />} title="正在解析压缩包" />

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="truncate pr-2 text-sm font-bold text-foreground">{name}</h2>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{entries.length} 项</span>
        </div>
        <ul className="max-h-[70vh] divide-y divide-border/50 overflow-y-auto px-4">
          {entries.map(entry => (
            <li key={entry.name} className="flex items-center gap-2 py-2 text-xs">
              <span aria-hidden>{entry.dir ? "▸" : "·"}</span>
              <span className={`truncate font-mono ${entry.dir ? "font-semibold text-primary" : "text-foreground"}`}>{entry.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * 视频在线播放流程：
 * 1. 请求 video-playable 接口：原文件可直接播放（MP4 H.264/AAC、WebM VP8/VP9）→ 直出；
 * 2. 封装或编码不兼容（H.265/HEVC、ProRes、AV1、MOV/MKV 等）→ 服务端 FFmpeg 自动转码，
 *    首次预览异步转换并轮询进度，转换完成后自动播放；原文件始终保留可下载；
 * 3. 播放异常按错误码区分提示（编码不兼容 / 文件损坏 / 网络中断），并给出重试与下载。
 */
const VIDEO_LOAD_TIMEOUT_MS = 20_000

function describeVideoError(code: number | null): { title: string; desc: string } {
  switch (code) {
    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
      return {
        title: "视频编码与当前浏览器不兼容",
        desc: "该视频的封装或编码（如 H.265/HEVC、ProRes、AV1 等）当前浏览器无法解码。平台优先支持 MP4（H.264/AAC）与 WebM，可下载源文件后用 VLC、PotPlayer 等本地播放器查看。",
      }
    case 3: // MEDIA_ERR_DECODE
      return {
        title: "视频解码失败",
        desc: "文件可能包含浏览器当前无法硬解的色彩/编码格式，请尝试兼容转码播放或下载源文件后打开。",
      }
    case 2: // MEDIA_ERR_NETWORK
      return {
        title: "视频加载失败",
        desc: "网络异常或文件读取中断，请重试；若反复失败可下载源文件后查看。",
      }
    default:
      return {
        title: "浏览器无法播放此视频",
        desc: "视频封装或编码与当前浏览器不兼容。可尝试兼容转码播放，或下载源文件后使用本地播放器查看。",
      }
  }
}

function detectHevcSupport(): boolean {
  if (typeof window === "undefined") return false
  try {
    const v = document.createElement("video")
    return (
      v.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') === "probably" ||
      v.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') === "probably" ||
      v.canPlayType('video/mp4; codecs="hvc1"') === "probably"
    )
  } catch {
    return false
  }
}

function VideoFallback({
  title,
  desc,
  downloadUrl,
  onRetry,
  onForceTranscode,
}: {
  title: string
  desc: string
  downloadUrl?: string
  onRetry?: () => void
  onForceTranscode?: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <FileWarning className="size-8 text-amber-500" />
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mx-auto max-w-lg text-xs leading-5 text-muted-foreground">{desc}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onForceTranscode ? (
          <Button type="button" size="sm" className="h-8 gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white" onClick={onForceTranscode}>
            <RotateCcw className="size-3.5" />
            尝试兼容转码播放
          </Button>
        ) : null}
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onRetry}>
            <RotateCcw className="size-3.5" />
            重试播放
          </Button>
        ) : null}
        {downloadUrl ? (
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <a href={downloadUrl}>
              <Download className="size-3.5" />
              下载源文件
            </a>
          </Button>
        ) : null}
      </div>
      <p className="max-w-md text-[11px] leading-5 text-muted-foreground/70">
        平台优先支持 MP4（H.264/AAC）与 WebM；如遇特殊编码格式，系统支持自动转码并始终保留原片下载。
      </p>
    </div>
  )
}

type VideoSourceState =
  | { kind: "checking" }
  | { kind: "ready"; url: string }
  | { kind: "converting" }
  | { kind: "failed"; reason: "too-large" | "convert-error" | "probe-error" | "unknown"; maxMb?: number }

function VideoPreview({
  contentUrl,
  playableUrl,
  convertedUrl,
  downloadUrl,
}: {
  contentUrl: string
  playableUrl: string
  convertedUrl: string
  downloadUrl?: string
}) {
  const [source, setSource] = useState<VideoSourceState>({ kind: "checking" })
  const [mediaError, setMediaError] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [forceTranscode, setForceTranscode] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    async function check() {
      try {
        const hevcSupported = detectHevcSupport()
        const queryParams = new URLSearchParams()
        if (hevcSupported) queryParams.set("hevc", "1")
        if (forceTranscode) queryParams.set("force", "1")
        const queryString = queryParams.toString()
        const targetUrl = queryString
          ? `${playableUrl}${playableUrl.includes("?") ? "&" : "?"}${queryString}`
          : playableUrl

        const response = await fetch(targetUrl, { cache: "no-store" })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = await response.json()
        if (cancelled) return
        if (data.status === "ready-original") {
          setSource({ kind: "ready", url: contentUrl })
        } else if (data.status === "ready-converted") {
          setSource({ kind: "ready", url: convertedUrl })
        } else if (data.status === "converting") {
          setSource({ kind: "converting" })
          timer = setTimeout(check, 2500)
        } else if (data.status === "failed") {
          setSource({ kind: "failed", reason: data.reason ?? "unknown", maxMb: data.maxMb })
        } else {
          setSource({ kind: "failed", reason: "unknown" })
        }
      } catch {
        if (!cancelled) setSource({ kind: "failed", reason: "unknown" })
      }
    }
    void check()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [playableUrl, contentUrl, convertedUrl, attempt, forceTranscode])

  const readyUrl = source.kind === "ready" ? source.url : null
  useEffect(() => {
    if (mediaError !== null || !readyUrl) return
    const timer = setTimeout(() => setTimedOut(true), VIDEO_LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [mediaError, readyUrl, attempt])

  // 处理视频加载或解码异常：若原文件直出播放失败，自动容错切换为服务端兼容性转码
  const handleVideoError = (code: number | null) => {
    if (source.kind === "ready" && source.url === contentUrl && !forceTranscode) {
      // 自动触发强制转码降级
      setForceTranscode(true)
      setSource({ kind: "converting" })
      setMediaError(null)
      setTimedOut(false)
      setAttempt(current => current + 1)
      return
    }
    setMediaError(code)
  }

  const retry = () => {
    setMediaError(null)
    setTimedOut(false)
    setSource(current => (current.kind === "failed" && current.reason !== "too-large" ? { kind: "checking" } : current))
    setAttempt(current => current + 1)
  }

  const triggerForceTranscode = () => {
    setForceTranscode(true)
    setMediaError(null)
    setTimedOut(false)
    setSource({ kind: "converting" })
    setAttempt(current => current + 1)
  }

  if (mediaError !== null) {
    const info = describeVideoError(mediaError)
    return (
      <VideoFallback
        title={info.title}
        desc={info.desc}
        downloadUrl={downloadUrl}
        onRetry={retry}
        onForceTranscode={!forceTranscode ? triggerForceTranscode : undefined}
      />
    )
  }

  if (timedOut) {
    return (
      <VideoFallback
        title="视频加载缓慢或无法播放"
        desc="长时间未加载到视频信息，可能是网络较慢、文件过大，或编码格式与当前浏览器不兼容。"
        downloadUrl={downloadUrl}
        onRetry={retry}
        onForceTranscode={!forceTranscode ? triggerForceTranscode : undefined}
      />
    )
  }

  if (source.kind === "checking") {
    return <PreviewMessage icon={<LoaderCircle className="size-6 animate-spin text-teal-500" />} title="正在检测视频兼容性…" />
  }

  if (source.kind === "converting") {
    return (
      <PreviewMessage
        icon={<LoaderCircle className="size-6 animate-spin text-teal-500" />}
        title={forceTranscode ? "正在进行兼容性转码…" : "正在转换视频格式…"}
        desc="原视频的封装、编码或色彩格式（如 H.265/HEVC、ProRes、10-bit）当前浏览器无法直接硬解，系统正在自动转码为 H.264/AAC 在线播放，完成后自动开始；源文件始终保留不受影响。"
      />
    )
  }

  if (source.kind === "failed") {
    const messages: Record<"too-large" | "convert-error" | "probe-error" | "unknown", { title: string; desc: string }> = {
      "too-large": {
        title: "视频文件过大，暂不支持在线转码",
        desc: `文件超过 ${source.maxMb ?? "1GB"} 自动转码上限。请下载源文件后使用本地播放器（VLC / PotPlayer）查看。`,
      },
      "convert-error": {
        title: "视频转码失败",
        desc: "服务器转码服务不可用或转换失败（请确认服务器已安装 FFmpeg）。可下载源文件后使用本地播放器查看。",
      },
      "probe-error": {
        title: "无法识别该视频",
        desc: "未能解析视频的封装或编码信息，文件可能已损坏。请下载源文件后用本地播放器尝试打开。",
      },
      unknown: {
        title: "视频加载失败",
        desc: "网络异常或服务暂时不可用，请重试；若反复失败可下载源文件后查看。",
      },
    }
    const info = messages[source.reason]
    return (
      <VideoFallback
        title={info.title}
        desc={info.desc}
        downloadUrl={downloadUrl}
        onRetry={retry}
        onForceTranscode={source.reason !== "too-large" && !forceTranscode ? triggerForceTranscode : undefined}
      />
    )
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center bg-black p-4">
      <video
        key={`${attempt}-${source.url}`}
        src={source.url}
        controls
        playsInline
        preload="metadata"
        className="max-h-[85vh] max-w-full bg-black shadow-2xl"
        onLoadedMetadata={() => setTimedOut(false)}
        onError={event => {
          const code = (event.currentTarget as HTMLVideoElement).error?.code ?? null
          handleVideoError(code)
        }}
      >
        当前浏览器不支持视频播放。
      </video>
    </div>
  )
}

export function FilePreviewViewer({
  contentUrl,
  wordTextUrl,
  file,
  kind,
  downloadUrl,
  playableUrl,
  convertedUrl,
}: {
  contentUrl: string
  wordTextUrl?: string
  file: PreviewFile
  kind: PreviewKind
  downloadUrl?: string
  playableUrl?: string
  convertedUrl?: string
}) {
  if (kind === "PDF") return <PdfViewer url={contentUrl} />
  if (kind === "PRESENTATION") return <PresentationViewer name={file.originalName} size={file.size} url={contentUrl} />
  if (kind === "SPREADSHEET") return <SpreadsheetViewer name={file.originalName} size={file.size} url={contentUrl} />
  if (kind === "WORD") {
    return file.extension?.toLowerCase() === "docx"
      ? <DocxViewer name={file.originalName} size={file.size} url={contentUrl} />
      : wordTextUrl
        ? <LegacyWordViewer name={file.originalName} textUrl={wordTextUrl} />
        : <PreviewMessage title="旧版 Word 文档无法预览" desc="缺少兼容文本预览地址，请下载源文件查看。" />
  }

  if (kind === "IMAGE") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-zinc-100 p-5 dark:bg-zinc-950">
        <Image src={contentUrl} alt={file.originalName} width={1800} height={1200} unoptimized className="max-h-[85vh] max-w-full object-contain shadow-xl" />
      </div>
    )
  }

  if (kind === "VIDEO") {
    if (!playableUrl || !convertedUrl) {
      return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-black p-4">
          <video src={contentUrl} controls playsInline preload="metadata" className="max-h-[85vh] max-w-full bg-black shadow-2xl">
            当前浏览器不支持视频播放。
          </video>
        </div>
      )
    }
    return <VideoPreview contentUrl={contentUrl} playableUrl={playableUrl} convertedUrl={convertedUrl} downloadUrl={downloadUrl} />
  }

  if (kind === "AUDIO") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 bg-muted/40 p-5">
        <p className="max-w-md truncate text-xs font-semibold text-foreground">{file.originalName}</p>
        <audio src={contentUrl} controls preload="metadata" className="w-full max-w-xl" />
      </div>
    )
  }

  if (kind === "TEXT") return <TextPreview size={file.size} url={contentUrl} />
  if (kind === "ZIP") return <ZipPreview name={file.originalName} size={file.size} url={contentUrl} />

  const extension = file.extension?.toLowerCase() ?? ""
  const detail = extension === "ppt"
    ? "旧版 .ppt 是二进制格式，浏览器无法可靠渲染。请另存为 .pptx 后重新上传，或直接下载查看。"
    : `${extension ? `.${extension} ` : "该"}格式暂不支持在线预览，请直接下载源文件查看。`

  return <PreviewMessage title="此文件暂不支持在线预览" desc={detail} />
}
