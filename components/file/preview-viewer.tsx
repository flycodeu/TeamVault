"use client"

import JSZip from "jszip"
import { Download, FileText, FileWarning, Info, LoaderCircle, RotateCcw } from "lucide-react"
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
 * 视频预览兼容策略：
 * 1. 平台优先支持 MP4（H.264/AAC）与 WebM（VP8/VP9/Opus）；
 * 2. 渲染前用 canPlayType 预检测，MOV 等容器兼容性不确定时给出提示条；
 * 3. 播放失败按错误码区分（编码不兼容 / 文件损坏 / 网络中断）给出明确指引；
 * 4. 长时间未加载到元数据时兜底提示，并提供重试与下载。
 */
const VIDEO_LOAD_TIMEOUT_MS = 20_000

const VIDEO_CODEC_HINTS: Record<string, string> = {
  mp4: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
  webm: 'video/webm; codecs="vp9, opus"',
}

type Playability = "supported" | "uncertain"

function detectPlayability(extension: string | null, mimeType: string): Playability {
  const ext = extension?.toLowerCase() ?? ""
  const probe = document.createElement("video")
  const codecHint = VIDEO_CODEC_HINTS[ext]
  if (codecHint && probe.canPlayType(codecHint)) return "supported"

  const baseType = mimeType.startsWith("video/") ? mimeType : ext ? `video/${ext}` : ""
  if (baseType && baseType !== "video/unknown" && probe.canPlayType(baseType)) return "supported"

  // Chrome / Firefox 对 quicktime 等容器 canPlayType 通常返回 ""，但部分文件实际可播，
  // 因此不直接判定不可播放，而是渲染播放器并提示兼容性不确定。
  return "uncertain"
}

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
        desc: "文件可能已损坏或包含浏览器不支持的编码，请下载源文件后用本地播放器尝试打开。",
      }
    case 2: // MEDIA_ERR_NETWORK
      return {
        title: "视频加载失败",
        desc: "网络异常或文件读取中断，请重试；若反复失败可下载源文件后查看。",
      }
    default:
      return {
        title: "浏览器无法播放此视频",
        desc: "视频封装或编码与当前浏览器不兼容。平台优先支持 MP4（H.264/AAC）和 WebM，可下载源文件后使用本地播放器查看。",
      }
  }
}

function VideoFallback({
  title,
  desc,
  downloadUrl,
  onRetry,
}: {
  title: string
  desc: string
  downloadUrl?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <FileWarning className="size-8 text-amber-500" />
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mx-auto max-w-lg text-xs leading-5 text-muted-foreground">{desc}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onRetry}>
            <RotateCcw className="size-3.5" />
            重试播放
          </Button>
        ) : null}
        {downloadUrl ? (
          <Button asChild size="sm" className="h-8 gap-1.5 text-xs">
            <a href={downloadUrl}>
              <Download className="size-3.5" />
              下载源文件
            </a>
          </Button>
        ) : null}
      </div>
      <p className="max-w-md text-[11px] leading-5 text-muted-foreground/70">
        平台优先支持 MP4（H.264/AAC）与 WebM（VP8/VP9/Opus）；如需在线播放，请将视频转码为上述格式后重新上传。
      </p>
    </div>
  )
}

function VideoPreview({
  url,
  downloadUrl,
  file,
}: {
  url: string
  downloadUrl?: string
  file: { originalName: string; mimeType: string; extension: string | null }
}) {
  const [playability, setPlayability] = useState<Playability>(() => detectPlayability(file.extension, file.mimeType))
  const [mediaError, setMediaError] = useState<number | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (mediaError !== null) return
    const timer = setTimeout(() => setTimedOut(true), VIDEO_LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [mediaError, attempt])

  const retry = () => {
    setPlayability(detectPlayability(file.extension, file.mimeType))
    setMediaError(null)
    setTimedOut(false)
    setAttempt(current => current + 1)
  }

  if (mediaError !== null) {
    const info = describeVideoError(mediaError)
    return <VideoFallback title={info.title} desc={info.desc} downloadUrl={downloadUrl} onRetry={retry} />
  }

  if (timedOut) {
    return (
      <VideoFallback
        title="视频加载缓慢或无法播放"
        desc="长时间未加载到视频信息，可能是网络较慢、文件过大，或封装/编码与浏览器不兼容。可重试一次，或下载源文件后用本地播放器查看。"
        downloadUrl={downloadUrl}
        onRetry={retry}
      />
    )
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center bg-black p-4">
      {playability === "uncertain" ? (
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-1.5 bg-amber-500/90 px-4 py-2 text-center text-[11px] font-medium text-white">
          <Info className="size-3.5 shrink-0" />
          该封装格式兼容性不确定（如 MOV），若无法播放或没有声音，请下载后用 VLC / PotPlayer 等本地播放器查看。
        </div>
      ) : null}
      <video
        key={attempt}
        src={url}
        controls
        playsInline
        preload="metadata"
        className="max-h-[85vh] max-w-full bg-black shadow-2xl"
        onLoadedMetadata={() => setTimedOut(false)}
        onError={event => {
          const code = (event.currentTarget as HTMLVideoElement).error?.code ?? null
          setMediaError(code)
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
}: {
  contentUrl: string
  wordTextUrl?: string
  file: PreviewFile
  kind: PreviewKind
  downloadUrl?: string
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

  if (kind === "VIDEO") return <VideoPreview url={contentUrl} downloadUrl={downloadUrl} file={file} />

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
