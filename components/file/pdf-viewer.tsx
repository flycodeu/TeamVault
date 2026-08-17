"use client"

import { ChevronLeft, ChevronRight, FileWarning, LoaderCircle, Minus, Plus, RotateCcw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist"

import { Button } from "@/components/ui/button"

export function PdfViewer({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null)
  const renderTaskRef = useRef<RenderTask | null>(null)
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [scale, setScale] = useState(1.15)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError("")
      setDocument(null)
      setPage(1)
      const pdfjs = await import("pdfjs-dist")
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
      const task = pdfjs.getDocument({ url })
      loadingTaskRef.current = task
      try {
        const loaded = await task.promise
        if (cancelled) {
          await task.destroy()
          return
        }
        setPages(loaded.numPages)
        setDocument(loaded)
      } catch (reason) {
        if (!cancelled) {
          setLoading(false)
          setError(reason instanceof Error ? reason.message : "PDF 加载失败")
        }
      }
    }

    void load()
    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      renderTaskRef.current = null
      void loadingTaskRef.current?.destroy()
      loadingTaskRef.current = null
    }
  }, [url])

  useEffect(() => {
    if (!document) return
    let cancelled = false

    async function renderPage() {
      setLoading(true)
      setError("")
      renderTaskRef.current?.cancel()
      try {
        const current = await document!.getPage(Math.min(page, document!.numPages))
        if (cancelled) return
        const viewport = current.getViewport({ scale })
        const canvas = canvasRef.current
        const context = canvas?.getContext("2d")
        if (!canvas || !context) return

        const outputScale = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        const task = current.render({
          canvas,
          canvasContext: context,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
          viewport,
        })
        renderTaskRef.current = task
        await task.promise
        if (!cancelled) setLoading(false)
      } catch (reason) {
        if (!cancelled && !(reason instanceof Error && reason.name === "RenderingCancelledException")) {
          setLoading(false)
          setError(reason instanceof Error ? reason.message : "PDF 页面渲染失败")
        }
      }
    }

    void renderPage()
    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
    }
  }, [document, page, scale])

  if (error && !document) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <FileWarning className="size-7 text-amber-500" />
        <p className="text-sm font-semibold">PDF 无法打开</p>
        <p className="max-w-lg text-xs leading-5 text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-zinc-200/70 dark:bg-zinc-950 overflow-hidden">
      {/* Controls toolbar */}
      <div className="sticky top-0 z-10 flex h-11 shrink-0 items-center justify-center gap-1 border-b border-border/80 bg-background/95 px-3 backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setPage(value => Math.max(1, value - 1))}
          disabled={page <= 1}
          aria-label="上一页"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="w-20 text-center text-xs font-medium tabular-nums text-foreground">
          {page} / {pages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setPage(value => Math.min(pages, value + 1))}
          disabled={page >= pages}
          aria-label="下一页"
        >
          <ChevronRight className="size-4" />
        </Button>

        <span className="mx-2 h-4 border-l border-border/60" />

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setScale(value => Math.max(0.5, Number((value - 0.15).toFixed(2))))}
          aria-label="缩小"
        >
          <Minus className="size-3.5" />
        </Button>
        <button
          type="button"
          onClick={() => setScale(1.0)}
          className="w-12 text-center text-xs font-mono font-semibold tabular-nums text-foreground hover:text-primary transition"
          title="重置为 100%"
        >
          {Math.round(scale * 100)}%
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setScale(value => Math.min(2.5, Number((value + 0.15).toFixed(2))))}
          aria-label="放大"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {/* Canvas container with centered smooth scroll */}
      <div className="relative flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-xs z-10">
            <LoaderCircle className="size-7 animate-spin text-primary" />
          </div>
        ) : null}
        <canvas ref={canvasRef} className="h-max max-w-full bg-white shadow-xl rounded-xs" />
        {error ? (
          <p className="absolute top-10 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive border border-destructive/20">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
