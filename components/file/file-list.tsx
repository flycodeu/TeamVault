"use client"

import {
  Archive,
  Check,
  CheckSquare,
  Download,
  Eye,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Film,
  Music,
  Package,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import type { FileRecord } from "@/lib/db/schema"
import { deleteFile } from "@/lib/file/actions"
import { fileKindMeta, fileKindOrder, getFileKind, getPreviewKind } from "@/lib/file/kinds"
import { cn } from "@/lib/utils"
import { FileActions } from "./file-actions"

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

export function FileList({
  files,
  mayEdit = false,
}: {
  files: FileRecord[]
  mayEdit?: boolean
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)

  if (!files.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        <FileText className="mx-auto size-6 text-muted-foreground/60 mb-2" />
        <p className="font-medium text-foreground">暂未上传文件</p>
      </div>
    )
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(files.map(f => f.id)))
    }
  }

  async function handleBatchExport() {
    if (!selectedIds.size) return
    try {
      setExporting(true)
      const res = await fetch("/api/files/batch-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: Array.from(selectedIds) }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        alert(errorData.error || "导出失败，请重试")
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      a.download = `teamvault-files-${timestamp}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error(err)
      alert("批量下载异常，请重试")
    } finally {
      setExporting(false)
    }
  }

  async function handleBatchDelete() {
    for (const id of selectedIds) {
      await deleteFile(id)
    }
    setSelectedIds(new Set())
    router.refresh()
  }

  const groups = fileKindOrder
    .map(kind => ({ kind, files: files.filter(file => getFileKind(file) === kind) }))
    .filter(group => group.files.length)

  const isAllSelected = selectedIds.size === files.length && files.length > 0

  return (
    <div className="space-y-6">
      {/* Batch Operations Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 p-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition"
          >
            {isAllSelected ? (
              <CheckSquare className="size-4 text-primary" />
            ) : (
              <Square className="size-4 text-muted-foreground" />
            )}
            <span>{isAllSelected ? "取消全选" : "全选全部"}</span>
          </button>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            共 {files.length} 个文件
            {selectedIds.size > 0 ? (
              <span className="ml-1.5 font-bold text-primary">已选择 {selectedIds.size} 项</span>
            ) : null}
          </span>
        </div>

        {selectedIds.size > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleBatchExport}
              disabled={exporting}
              className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
            >
              {exporting ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>正在打包 ZIP...</span>
                </>
              ) : (
                <>
                  <Package className="size-3.5" />
                  <span>批量导出 ({selectedIds.size})</span>
                </>
              )}
            </Button>

            {mayEdit ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBatchDeleteConfirm(true)}
                disabled={exporting}
                className="h-8 text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5 mr-1" />
                <span>批量删除</span>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* File Groups */}
      {groups.map(group => (
        <section key={group.kind} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {fileKindMeta[group.kind].label}
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {group.files.length}
            </span>
          </div>
          {group.kind === "IMAGE" ? (
            <ImageGrid
              files={group.files}
              mayEdit={mayEdit}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          ) : (
            <DocumentList
              files={group.files}
              mayEdit={mayEdit}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          )}
        </section>
      ))}

      {/* Batch Delete Modal */}
      <ConfirmDialog
        open={showBatchDeleteConfirm}
        onClose={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleBatchDelete}
        title="确定批量删除选中的文件？"
        description={`您正在删除 ${selectedIds.size} 个文件。删除后这些源文件及所有预览缩略图将永久销毁。`}
        confirmText={`确认删除 (${selectedIds.size}) 项`}
        variant="danger"
      />
    </div>
  )
}

function ImageGrid({
  files,
  mayEdit,
  selectedIds,
  onToggleSelect,
}: {
  files: FileRecord[]
  mayEdit: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {files.map(file => {
        const isSelected = selectedIds.has(file.id)
        return (
          <article
            key={file.id}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-card shadow-xs transition duration-200 hover:shadow-md",
              isSelected
                ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                : "border-border/80 hover:border-primary/40",
            )}
          >
            {/* Selection Checkbox */}
            <button
              type="button"
              onClick={() => onToggleSelect(file.id)}
              className="absolute left-2.5 top-2.5 z-20 grid size-6 place-items-center rounded-lg bg-background/80 backdrop-blur border border-border/80 shadow-xs hover:border-primary transition"
              aria-label="选择文件"
            >
              {isSelected ? (
                <Check className="size-3.5 text-primary stroke-[3]" />
              ) : (
                <div className="size-3 rounded-sm border border-muted-foreground/50" />
              )}
            </button>

            <Link
              href={`/files/${file.id}/preview`}
              className="relative block aspect-[4/3] overflow-hidden bg-muted/60"
            >
              <Image
                src={`/api/files/${file.id}/thumbnail`}
                alt={file.originalName}
                fill
                unoptimized
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur font-medium">
                  <Eye className="size-3.5" /> 查看大图
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/files/${file.id}/preview`}
                  className="block truncate text-xs font-semibold text-foreground hover:text-primary transition-colors"
                  title={file.originalName}
                >
                  {file.originalName}
                </Link>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <FileActions id={file.id} name={file.originalName} mayDelete={mayEdit} showPreview={false} />
              <DownloadButton file={file} />
            </div>
          </article>
        )
      })}
    </div>
  )
}

function DocumentList({
  files,
  mayEdit,
  selectedIds,
  onToggleSelect,
}: {
  files: FileRecord[]
  mayEdit: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
}) {
  return (
    <div className="grid gap-2.5 lg:grid-cols-2">
      {files.map(file => {
        const badge = getExtensionBadge(file.extension)
        const BadgeIcon = badge.icon
        const isSelected = selectedIds.has(file.id)
        const previewSupported = getPreviewKind(file) !== "NONE"

        return (
          <article
            key={file.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-card p-3 shadow-xs transition duration-200",
              isSelected
                ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                : "border-border/80 hover:border-primary/40 hover:shadow-xs",
            )}
          >
            {/* Selection Checkbox */}
            <button
              type="button"
              onClick={() => onToggleSelect(file.id)}
              className="grid size-6 shrink-0 place-items-center rounded-lg border border-border/80 bg-background hover:border-primary transition"
              aria-label="选择文件"
            >
              {isSelected ? (
                <Check className="size-3.5 text-primary stroke-[3]" />
              ) : (
                <div className="size-3 rounded-sm border border-muted-foreground/50" />
              )}
            </button>

            {/* Type Badge Icon */}
            <span className={cn("grid size-9.5 shrink-0 place-items-center rounded-xl border", badge.bg)}>
              <BadgeIcon className="size-5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <Link
                  href={`/files/${file.id}/preview`}
                  className="truncate text-xs font-semibold text-foreground hover:text-primary transition-colors"
                  title={file.originalName}
                >
                  {file.originalName}
                </Link>
                <span className="rounded px-1.5 py-0.2 text-[9px] font-bold uppercase bg-muted text-muted-foreground shrink-0">
                  {badge.label}
                </span>
              </div>

              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>{formatSize(file.size)}</span>
                <span>·</span>
                <span className={previewSupported ? "font-medium text-primary" : ""}>
                  {previewSupported ? "支持在线预览" : "仅支持下载"}
                </span>
              </div>
            </div>

            <FileActions id={file.id} name={file.originalName} mayDelete={mayEdit} />
            <DownloadButton file={file} />
          </article>
        )
      })}
    </div>
  )
}

function DownloadButton({ file }: { file: FileRecord }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-foreground"
      title="下载文件"
      aria-label={`下载 ${file.originalName}`}
    >
      <Link href={`/api/files/${file.id}/download`}>
        <Download className="size-4" />
      </Link>
    </Button>
  )
}
