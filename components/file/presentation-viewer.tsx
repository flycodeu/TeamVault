"use client"

import { ChevronLeft, ChevronRight, FileWarning, LoaderCircle, Presentation } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { PresentationData, SlideData } from "@office-kit/pptx"

import { Button } from "@/components/ui/button"

const MAX_PRESENTATION_BYTES = 50 * 1024 * 1024

export function PresentationViewer({ name, size, url }: { name: string; size: number; url: string }) {
  const presentationRef = useRef<PresentationData | null>(null)
  const slidesRef = useRef<readonly SlideData[]>([])
  const renderRef = useRef<typeof import("@office-kit/pptx-preview").renderSlideToSvg | null>(null)
  const [page, setPage] = useState(0)
  const [pages, setPages] = useState(0)
  const [ready, setReady] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [fallbacks, setFallbacks] = useState(0)
  const [error, setError] = useState("")
  const sizeError =
    size > MAX_PRESENTATION_BYTES
      ? "演示文稿超过 50MB，为避免浏览器内存占用过高，请下载后查看。"
      : ""

  useEffect(() => {
    let cancelled = false
    if (size > MAX_PRESENTATION_BYTES) return

    async function load() {
      setError("")
      setReady(false)
      try {
        const response = await fetch(url, { cache: "no-store" })
        if (!response.ok) throw new Error("无法读取演示文稿")
        const [{ getSlides, loadPresentation }, { renderSlideToSvg }] = await Promise.all([
          import("@office-kit/pptx"),
          import("@office-kit/pptx-preview"),
        ])
        const loaded = await loadPresentation(await response.arrayBuffer())
        const slides = getSlides(loaded)
        if (!slides.length) throw new Error("演示文稿中没有可显示的幻灯片")
        if (cancelled) return
        presentationRef.current = loaded
        slidesRef.current = slides
        renderRef.current = renderSlideToSvg
        setPage(0)
        setPages(slides.length)
        setReady(true)
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "PPTX 解析失败")
      }
    }

    void load()
    return () => {
      cancelled = true
      presentationRef.current = null
      slidesRef.current = []
      renderRef.current = null
    }
  }, [size, url])

  useEffect(() => {
    if (!ready) return
    const presentation = presentationRef.current
    const slide = slidesRef.current[page]
    const renderSlide = renderRef.current
    if (!presentation || !slide || !renderSlide) return

    try {
      const svg = renderSlide(presentation, slide)
      const nextUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }))
      setFallbacks((svg.match(/data-pptx-fallback=/g) ?? []).length)
      setImageUrl(nextUrl)
      return () => URL.revokeObjectURL(nextUrl)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "当前幻灯片渲染失败")
    }
  }, [page, ready])

  if (sizeError || error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <FileWarning className="size-7 text-amber-500" />
        <p className="text-sm font-semibold">PPTX 无法预览</p>
        <p className="max-w-lg text-xs leading-5 text-muted-foreground">{sizeError || error}</p>
      </div>
    )
  }

  if (!ready || !imageUrl) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <LoaderCircle className="size-6 animate-spin text-orange-500" />
        <p className="text-sm font-semibold">正在解析演示文稿</p>
        <p className="max-w-md truncate text-xs text-muted-foreground">{name}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-[#171717] overflow-hidden">
      <div className="sticky top-0 z-10 flex h-11 shrink-0 items-center justify-between border-b border-white/10 bg-[#171717]/95 px-4 text-white backdrop-blur">
        <div className="flex min-w-0 items-center gap-2 text-xs text-white/70">
          <Presentation className="size-4 shrink-0 text-orange-400" />
          <span className="truncate max-w-[200px] md:max-w-md" title={name}>
            {name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-white hover:bg-white/10 hover:text-white"
            onClick={() => setPage(value => Math.max(0, value - 1))}
            disabled={page === 0}
            aria-label="上一页"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-16 text-center text-xs font-medium tabular-nums">{page + 1} / {pages}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-white hover:bg-white/10 hover:text-white"
            onClick={() => setPage(value => Math.min(pages - 1, value + 1))}
            disabled={page >= pages - 1}
            aria-label="下一页"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="hidden text-[11px] text-white/45 sm:block">只读 PPTX 预览</span>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-auto p-4 md:p-8">
        {/* SVG 以图片资源加载，避免用户文档中的标记进入页面 DOM。 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`${name} 第 ${page + 1} 页`}
          className="max-h-full max-w-full bg-white shadow-2xl rounded-xs object-contain"
        />
        {fallbacks ? (
          <p className="absolute bottom-4 rounded-full bg-amber-400/10 px-3 py-1 text-[11px] text-amber-200">
            本页有 {fallbacks} 个复杂元素使用安全占位显示
          </p>
        ) : null}
      </div>
    </div>
  )
}
