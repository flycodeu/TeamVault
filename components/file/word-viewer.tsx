"use client"

import { FileWarning, LoaderCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const DOCX_PREVIEW_MAX = 30 * 1024 * 1024

type LegacyWordContent = {
  body: string
  headers: string
  footers: string
  footnotes: string
  endnotes: string
  annotations: string
  textboxes: string
  truncated: boolean
}

function WordStatus({ loading, error }: { loading?: boolean; error?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      {loading
        ? <LoaderCircle className="size-7 animate-spin text-blue-600" />
        : <FileWarning className="size-8 text-amber-500" />}
      <p className="text-sm font-semibold">{loading ? "正在排版 Word 文档" : "Word 文档无法预览"}</p>
      {error ? <p className="max-w-lg text-xs leading-5 text-muted-foreground">{error}</p> : null}
    </div>
  )
}

function secureRenderedLinks(container: HTMLElement) {
  for (const link of container.querySelectorAll<HTMLAnchorElement>("a")) {
    const href = link.getAttribute("href")?.trim() ?? ""
    if (!/^(https?:|mailto:)/i.test(href)) link.removeAttribute("href")
    link.target = "_blank"
    link.rel = "noopener noreferrer nofollow"
  }
}

export function DocxViewer({ name, size, url }: { name: string; size: number; url: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(size <= DOCX_PREVIEW_MAX)

  useEffect(() => {
    const controller = new AbortController()
    const container = containerRef.current
    if (!container || size > DOCX_PREVIEW_MAX) return

    async function render(target: HTMLDivElement) {
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal })
        if (!response.ok) throw new Error("无法读取 Word 文档")
        const { renderAsync } = await import("docx-preview")
        if (controller.signal.aborted) return
        target.replaceChildren()
        await renderAsync(await response.arrayBuffer(), target, target, {
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          renderAltChunks: false,
          renderComments: false,
          renderChanges: false,
          useBase64URL: true,
        })
        if (controller.signal.aborted) return
        secureRenderedLinks(target)
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Word 文档解析失败")
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void render(container)
    return () => {
      controller.abort()
      container.replaceChildren()
    }
  }, [size, url])

  const sizeError = size > DOCX_PREVIEW_MAX
    ? "DOCX 超过 30MB，为避免浏览器内存占用过高，请下载后查看。"
    : ""
  if (sizeError || error) return <WordStatus error={sizeError || error} />

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-auto bg-[#dfe3e8] px-2 py-5 dark:bg-zinc-950 md:px-6 md:py-8">
      <div className="mx-auto mb-3 flex max-w-[816px] items-center justify-between px-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
        <span className="truncate">{name}</span>
        <span className="ml-4 shrink-0 rounded-full bg-white/75 px-2 py-1 shadow-sm dark:bg-zinc-900">只读 DOCX</span>
      </div>
      {loading ? <WordStatus loading /> : null}
      <div
        ref={containerRef}
        className={`word-preview mx-auto max-w-full transition-opacity duration-200 ${loading ? "h-0 overflow-hidden opacity-0" : "opacity-100"} [&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-0 [&_.docx-wrapper>section.docx]:!mb-5 [&_.docx-wrapper>section.docx]:!shadow-[0_4px_22px_rgba(15,23,42,0.16)]`}
      />
    </div>
  )
}

function TextSection({ title, content, muted = false }: { title: string; content: string; muted?: boolean }) {
  if (!content) return null
  return (
    <section className={muted ? "border-y border-blue-100 bg-blue-50/50 px-8 py-5 text-zinc-600" : "px-8 py-6 text-zinc-800"}>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700/70">{title}</p>
      <pre className="whitespace-pre-wrap break-words font-serif text-sm leading-7">{content}</pre>
    </section>
  )
}

export function LegacyWordViewer({ name, textUrl }: { name: string; textUrl: string }) {
  const [content, setContent] = useState<LegacyWordContent | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(textUrl, { cache: "no-store", signal: controller.signal })
        const payload = await response.json() as { success: boolean; data?: LegacyWordContent; error?: string }
        if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error || "旧版 Word 文档读取失败")
        if (!controller.signal.aborted) setContent(payload.data)
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "旧版 Word 文档解析失败")
      }
    }
    void load()
    return () => controller.abort()
  }, [textUrl])

  if (error) return <WordStatus error={error} />
  if (!content) return <WordStatus loading />

  const hasContent = Object.values(content).some(Boolean)
  if (!hasContent) return <WordStatus error="文档中没有提取到可显示的文本，可能只包含图片、嵌入对象或不受支持的旧格式内容。" />

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-auto bg-[#dfe3e8] px-3 py-6 dark:bg-zinc-950 md:py-8">
      <div className="mx-auto mb-3 flex max-w-[816px] items-center justify-between px-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
        <span className="truncate">{name}</span>
        <span className="ml-4 shrink-0 rounded-full bg-amber-50 px-2 py-1 text-amber-800 shadow-sm">兼容文本预览</span>
      </div>
      <article className="mx-auto min-h-[900px] max-w-[816px] overflow-hidden bg-white shadow-[0_4px_22px_rgba(15,23,42,0.16)]">
        {content.truncated ? (
          <p className="border-b border-amber-200 bg-amber-50 px-8 py-3 text-xs leading-5 text-amber-900">
            文档文本较多，为控制预览响应大小，仅显示前 200 万个字符。
          </p>
        ) : null}
        <TextSection title="页眉" content={content.headers} muted />
        <TextSection title="正文" content={content.body} />
        <TextSection title="文本框" content={content.textboxes} />
        <TextSection title="脚注" content={content.footnotes} muted />
        <TextSection title="尾注" content={content.endnotes} muted />
        <TextSection title="批注" content={content.annotations} muted />
        <TextSection title="页脚" content={content.footers} muted />
      </article>
    </div>
  )
}
