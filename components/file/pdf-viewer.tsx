"use client"

import { ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

export function PdfViewer({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    async function render() {
      setLoading(true)
      const pdfjs = await import("pdfjs-dist")
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()
      const document = await pdfjs.getDocument({ url }).promise
      if (cancelled) return
      setPages(document.numPages)
      const current = await document.getPage(Math.min(page, document.numPages))
      const viewport = current.getViewport({ scale })
      const canvas = canvasRef.current
      if (!canvas) return
      const context = canvas.getContext("2d")
      if (!context) return
      canvas.width = viewport.width
      canvas.height = viewport.height
      await current.render({ canvas, canvasContext: context, viewport }).promise
      if (!cancelled) setLoading(false)
    }
    render().catch(() => setLoading(false))
    return () => { cancelled = true }
  }, [page, scale, url])
  return <div><div className="sticky top-16 z-10 flex h-12 items-center justify-center gap-2 border-b bg-background"><Button variant="ghost" size="icon" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={page <= 1}><ChevronLeft /></Button><span className="w-20 text-center text-xs tabular-nums">{page} / {pages}</span><Button variant="ghost" size="icon" onClick={() => setPage(value => Math.min(pages, value + 1))} disabled={page >= pages}><ChevronRight /></Button><span className="mx-2 h-5 border-l" /><Button variant="ghost" size="icon" onClick={() => setScale(value => Math.max(.6, value - .2))}><Minus /></Button><span className="w-12 text-center text-xs">{Math.round(scale * 100)}%</span><Button variant="ghost" size="icon" onClick={() => setScale(value => Math.min(2.4, value + .2))}><Plus /></Button></div><div className="relative flex min-h-[70vh] justify-center overflow-auto bg-muted p-4 md:p-8">{loading ? <LoaderCircle className="absolute top-10 size-5 animate-spin text-muted-foreground" /> : null}<canvas ref={canvasRef} className="h-max max-w-full bg-white shadow-sm" /></div></div>
}
