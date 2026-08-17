"use client"

import {
  AlignLeft,
  BookOpen,
  Check,
  ChevronDown,
  Expand,
  FileText,
  FileWarning,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  ZoomIn,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
      {loading ? (
        <LoaderCircle className="size-7 animate-spin text-blue-600 dark:text-blue-400" />
      ) : (
        <FileWarning className="size-8 text-amber-500" />
      )}
      <p className="text-sm font-semibold text-foreground">
        {loading ? "正在排版与渲染 Word 文档..." : "Word 文档无法预览"}
      </p>
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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(size <= DOCX_PREVIEW_MAX)

  // Zoom & View Mode State
  const [zoom, setZoom] = useState<number>(1.0)
  const [isFitWidth, setIsFitWidth] = useState<boolean>(true)
  const [isFluidMode, setIsFluidMode] = useState<boolean>(false)

  // Auto-calculate fit width zoom
  useEffect(() => {
    function computeFitWidth() {
      if (!wrapperRef.current || !isFitWidth || isFluidMode) return
      const containerWidth = wrapperRef.current.clientWidth - 48 // 48px padding
      const standardA4Width = 816 // Standard A4 ~816px
      if (containerWidth > 0 && containerWidth < standardA4Width) {
        const ratio = Math.max(0.4, Math.min(1.0, containerWidth / standardA4Width))
        setZoom(Number(ratio.toFixed(2)))
      } else if (containerWidth >= standardA4Width) {
        setZoom(1.0)
      }
    }

    computeFitWidth()
    window.addEventListener("resize", computeFitWidth)
    return () => window.removeEventListener("resize", computeFitWidth)
  }, [isFitWidth, isFluidMode, loading])

  // Render DOCX content
  useEffect(() => {
    const controller = new AbortController()
    const container = containerRef.current
    if (!container || size > DOCX_PREVIEW_MAX) return

    async function render(target: HTMLDivElement) {
      try {
        setLoading(true)
        const response = await fetch(url, { cache: "no-store", signal: controller.signal })
        if (!response.ok) throw new Error("无法读取 Word 文档")
        const { renderAsync } = await import("docx-preview")
        if (controller.signal.aborted) return

        target.replaceChildren()
        await renderAsync(await response.arrayBuffer(), target, target, {
          breakPages: !isFluidMode,
          ignoreLastRenderedPageBreak: false,
          renderAltChunks: false,
          renderComments: false,
          renderChanges: false,
          useBase64URL: true,
          inWrapper: true,
          ignoreWidth: isFluidMode,
          ignoreHeight: isFluidMode,
          ignoreFonts: false,
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
  }, [size, url, isFluidMode])

  const sizeError =
    size > DOCX_PREVIEW_MAX ? "DOCX 超过 30MB，为避免浏览器内存占用过高，请下载后查看。" : ""
  if (sizeError || error) return <WordStatus error={sizeError || error} />

  function handleZoomIn() {
    setIsFitWidth(false)
    setZoom(prev => Math.min(2.0, Number((prev + 0.1).toFixed(2))))
  }

  function handleZoomOut() {
    setIsFitWidth(false)
    setZoom(prev => Math.max(0.4, Number((prev - 0.1).toFixed(2))))
  }

  function handleZoomReset() {
    setIsFitWidth(false)
    setZoom(1.0)
  }

  function handleToggleFitWidth() {
    if (!isFitWidth) {
      setIsFitWidth(true)
      if (wrapperRef.current) {
        const containerWidth = wrapperRef.current.clientWidth - 48
        const standardA4Width = 816
        if (containerWidth > 0 && containerWidth < standardA4Width) {
          setZoom(Number((containerWidth / standardA4Width).toFixed(2)))
        } else {
          setZoom(1.0)
        }
      }
    } else {
      setIsFitWidth(false)
      setZoom(1.0)
    }
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-100 dark:bg-zinc-950 overflow-hidden">
      {/* Top Floating Toolbar */}
      <div className="sticky top-0 z-20 flex h-11 shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-3 py-1 text-xs backdrop-blur-md md:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px]">
            DOCX
          </span>
          <span className="truncate font-semibold text-foreground max-w-[200px] md:max-w-md" title={name}>
            {name}
          </span>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= 0.4 || isFluidMode}
              className="size-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="缩小"
            >
              <Minus className="size-3.5" />
            </Button>

            <button
              type="button"
              onClick={handleZoomReset}
              disabled={isFluidMode}
              className="min-w-10 px-1 text-center font-mono text-[11px] font-semibold text-foreground hover:text-primary transition disabled:opacity-40"
              title="重置为 100%"
            >
              {Math.round(zoom * 100)}%
            </button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= 2.0 || isFluidMode}
              className="size-6 text-muted-foreground hover:text-foreground disabled:opacity-30"
              title="放大"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          {/* Fit Width Button */}
          <Button
            type="button"
            variant={isFitWidth && !isFluidMode ? "default" : "ghost"}
            size="sm"
            onClick={handleToggleFitWidth}
            disabled={isFluidMode}
            className={cn(
              "h-7 gap-1 px-2 text-[11px] font-medium hidden sm:inline-flex",
              isFitWidth && !isFluidMode ? "shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
            title="根据当前窗口宽度自动缩放，保证右侧完整可见"
          >
            <Expand className="size-3" />
            <span>自适应宽</span>
          </Button>

          {/* Fluid vs Paginated Switch */}
          <Button
            type="button"
            variant={isFluidMode ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsFluidMode(prev => !prev)}
            className={cn(
              "h-7 gap-1 px-2 text-[11px] font-medium",
              isFluidMode ? "shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
            title={isFluidMode ? "切换为 A4 仿真分页视图" : "切换为 Web 流式换行排版，彻底避免右侧遮挡"}
          >
            <AlignLeft className="size-3" />
            <span>{isFluidMode ? "分页视图" : "流式视图"}</span>
          </Button>
        </div>
      </div>

      {/* Main Document Content Scroll Container */}
      <div
        ref={wrapperRef}
        className="relative flex-1 overflow-x-auto overflow-y-auto p-3 md:p-6"
      >
        {loading ? <WordStatus loading /> : null}

        <div
          className={cn(
            "docx-render-viewport mx-auto transition-opacity duration-200",
            loading ? "h-0 overflow-hidden opacity-0" : "opacity-100",
            isFluidMode ? "max-w-4xl" : "w-fit min-w-fit",
          )}
          style={
            !isFluidMode && zoom !== 1.0
              ? {
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  marginBottom: `${(zoom - 1) * 850}px`,
                }
              : undefined
          }
        >
          <div
            ref={containerRef}
            className={cn(
              "word-preview",
              // docx-preview deep style resets and responsive enhancements
              "[&_.docx-wrapper]:!bg-transparent [&_.docx-wrapper]:!p-0 [&_.docx-wrapper]:!w-full [&_.docx-wrapper]:!max-w-full",
              "[&_.docx-wrapper>section.docx]:!mb-6 [&_.docx-wrapper>section.docx]:!rounded-sm [&_.docx-wrapper>section.docx]:!shadow-[0_4px_24px_rgba(0,0,0,0.12)] [&_.docx-wrapper>section.docx]:!border [&_.docx-wrapper>section.docx]:!border-border/60",
              // Ensure text, tables and elements wrap and never clip on right
              "[&_.docx-wrapper>section.docx]:!box-border [&_.docx-wrapper>section.docx]:!overflow-x-auto",
              "[&_.docx-wrapper>section.docx]:!overflow-y-visible",
              "[&_.docx-wrapper>section.docx]:!max-w-full",
              "[&_.docx-wrapper_table]:!max-w-full [&_.docx-wrapper_table]:!border-collapse",
              "[&_.docx-wrapper_table_td]:!break-words [&_.docx-wrapper_table_th]:!break-words",
              "[&_.docx-wrapper_p]:!break-words [&_.docx-wrapper_span]:!break-words",
              "[&_.docx-wrapper_img]:!max-w-full [&_.docx-wrapper_img]:!h-auto",
              "[&_.docx-wrapper_svg]:!max-w-full [&_.docx-wrapper_svg]:!h-auto",
              isFluidMode &&
                "[&_.docx-wrapper>section.docx]:!w-full [&_.docx-wrapper>section.docx]:!min-w-0 [&_.docx-wrapper>section.docx]:!min-h-0 [&_.docx-wrapper>section.docx]:!p-6 md:[&_.docx-wrapper>section.docx]:!p-10",
            )}
          />
        </div>
      </div>
    </div>
  )
}

function TextSection({ title, content, muted = false }: { title: string; content: string; muted?: boolean }) {
  if (!content) return null
  return (
    <section
      className={
        muted
          ? "border-y border-border/60 bg-muted/30 px-6 py-4 text-muted-foreground"
          : "px-6 py-5 text-foreground"
      }
    >
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-primary/80">{title}</p>
      <pre className="whitespace-pre-wrap break-words font-serif text-xs md:text-sm leading-relaxed overflow-x-auto">
        {content}
      </pre>
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
        const payload = (await response.json()) as {
          success: boolean
          data?: LegacyWordContent
          error?: string
        }
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error || "旧版 Word 文档读取失败")
        }
        if (!controller.signal.aborted) setContent(payload.data)
      } catch (reason) {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "旧版 Word 文档解析失败")
        }
      }
    }
    void load()
    return () => controller.abort()
  }, [textUrl])

  if (error) return <WordStatus error={error} />
  if (!content) return <WordStatus loading />

  const hasContent = Object.values(content).some(Boolean)
  if (!hasContent) {
    return (
      <WordStatus error="文档中没有提取到可显示的文本，可能只包含图片、嵌入对象或不受支持的旧格式内容。" />
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-slate-100 dark:bg-zinc-950 overflow-auto p-3 md:p-6">
      <div className="mx-auto mb-3 flex w-full max-w-4xl items-center justify-between px-1 text-[11px] font-medium text-muted-foreground">
        <span className="truncate" title={name}>
          {name}
        </span>
        <span className="ml-4 shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/20">
          兼容文本排版
        </span>
      </div>
      <article className="mx-auto w-full max-w-4xl min-h-[600px] overflow-hidden rounded-xl bg-card border border-border/80 shadow-lg">
        {content.truncated ? (
          <p className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2.5 text-xs leading-5 text-amber-700 dark:text-amber-300">
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
