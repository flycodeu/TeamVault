"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Film,
  Music,
  X,
} from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { getPreviewKind } from "@/lib/file/kinds"
import { cn } from "@/lib/utils"
import { FilePreviewViewer } from "./preview-viewer"

export type PreviewableFile = {
  id: string
  originalName: string
  mimeType: string
  extension: string | null
  size: number
  resourceId?: string
}

function getExtensionBadge(ext: string | null) {
  const e = ext?.toLowerCase() ?? ""
  if (e === "pdf") return { label: "PDF", bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/30", icon: FileText }
  if (["ppt", "pptx"].includes(e)) return { label: "PPT", bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-900/30", icon: FileText }
  if (["doc", "docx"].includes(e)) return { label: "DOC", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30", icon: FileText }
  if (["xls", "xlsx", "csv"].includes(e)) return { label: "EXCEL", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30", icon: FileSpreadsheet }
  if (["txt", "md", "json", "yaml", "yml", "sql"].includes(e)) return { label: e.toUpperCase(), bg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200/50 dark:border-teal-900/30", icon: FileCode2 }
  if (["mp4", "webm", "mov"].includes(e)) return { label: "VIDEO", bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/30", icon: Film }
  if (["mp3", "wav"].includes(e)) return { label: "AUDIO", bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200/50 dark:border-violet-900/30", icon: Music }
  if (["zip", "7z", "tar", "gz"].includes(e)) return { label: "ZIP", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30", icon: Archive }
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(e)) return { label: "IMG", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-900/30", icon: FileImage }
  return { label: "FILE", bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/30", icon: FileText }
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function FilePreviewModal({
  file,
  files = [],
  open,
  onClose,
  onSelectFile,
  guestToken,
  allowDownload = true,
}: {
  file: PreviewableFile | null
  files?: PreviewableFile[]
  open: boolean
  onClose: () => void
  onSelectFile?: (file: PreviewableFile) => void
  guestToken?: string
  allowDownload?: boolean
}) {
  const currentIndex = file && files.length ? files.findIndex(f => f.id === file.id) : -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < files.length - 1

  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectFile && files[currentIndex - 1]) {
      onSelectFile(files[currentIndex - 1])
    }
  }, [hasPrev, onSelectFile, files, currentIndex])

  const handleNext = useCallback(() => {
    if (hasNext && onSelectFile && files[currentIndex + 1]) {
      onSelectFile(files[currentIndex + 1])
    }
  }, [hasNext, onSelectFile, files, currentIndex])

  // Keyboard navigation (ArrowLeft, ArrowRight)
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        handlePrev()
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        handleNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, handlePrev, handleNext])

  if (!file) return null

  const kind = getPreviewKind(file)
  const badge = getExtensionBadge(file.extension)
  const BadgeIcon = badge.icon

  const contentUrl = guestToken
    ? `/s/${guestToken}/files/${file.id}/content`
    : `/api/files/${file.id}/content`

  const wordTextUrl = guestToken
    ? `/s/${guestToken}/files/${file.id}/word-text`
    : `/api/files/${file.id}/word-text`

  const downloadUrl = guestToken
    ? `/s/${guestToken}/files/${file.id}/download`
    : `/api/files/${file.id}/download`

  const standaloneUrl = guestToken
    ? `/s/${guestToken}/files/${file.id}/preview`
    : `/files/${file.id}/preview`

  return (
    <DialogPrimitive.Root open={open} onOpenChange={isOpen => { if (!isOpen) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex h-[92vh] w-[95vw] max-w-6xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl duration-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">预览文件：{file.originalName}</DialogPrimitive.Title>

          {/* Modal Header Bar */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card/80 px-4 md:px-6">
            {/* Left: File Info */}
            <div className="flex min-w-0 items-center gap-3 pr-4">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg border font-bold text-[10px]",
                  badge.bg,
                )}
              >
                <BadgeIcon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground md:text-sm" title={file.originalName}>
                  {file.originalName}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {formatSize(file.size)}
                </p>
              </div>
            </div>

            {/* Center Navigation Buttons (Prev / Next) */}
            {files.length > 1 && onSelectFile ? (
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border/60 bg-accent/20 px-2 py-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className="size-7 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                  title="上一个文件 (← 方向键)"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-[11px] font-mono text-muted-foreground px-1">
                  {currentIndex + 1} / {files.length}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="size-7 text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                  title="下一个文件 (→ 方向键)"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null}

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground hidden md:inline-flex"
              >
                <Link href={standaloneUrl} target="_blank" rel="noreferrer" title="在新页面独立打开">
                  <ExternalLink className="size-3.5" />
                  <span>独立页面</span>
                </Link>
              </Button>

              {allowDownload ? (
                <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs font-medium">
                  <a href={downloadUrl} title="下载文件">
                    <Download className="size-3.5" />
                    <span>下载</span>
                  </a>
                </Button>
              ) : null}

              <DialogPrimitive.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground rounded-lg ml-1 cursor-pointer"
                  title="关闭 (Esc)"
                >
                  <X className="size-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Modal Preview Body */}
          <div className="flex-1 overflow-auto bg-muted/20 relative">
            <FilePreviewViewer
              contentUrl={contentUrl}
              wordTextUrl={wordTextUrl}
              downloadUrl={allowDownload ? downloadUrl : undefined}
              file={{
                originalName: file.originalName,
                mimeType: file.mimeType,
                extension: file.extension,
                size: file.size,
              }}
              kind={kind}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
