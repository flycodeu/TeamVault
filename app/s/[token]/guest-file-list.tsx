"use client"

import { useMemo, useState } from "react"
import {
  Archive,
  Download,
  Eye,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Film,
  Folder,
  FolderOpen,
  Music,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { FilePreviewModal } from "@/components/file/file-preview-modal"
import { getPreviewKind } from "@/lib/file/kinds"
import { cn } from "@/lib/utils"

export type GuestFileItem = {
  id: string
  originalName: string
  size: number
  extension: string | null
  mimeType: string
  folder?: string | null
}

function getExtensionBadge(ext: string | null) {
  const e = ext?.toLowerCase() ?? ""
  if (e === "pdf") return { label: "PDF", bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400", icon: FileText }
  if (["ppt", "pptx"].includes(e)) return { label: "PPT", bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400", icon: FileText }
  if (["doc", "docx"].includes(e)) return { label: "DOC", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400", icon: FileText }
  if (["xls", "xlsx", "csv"].includes(e)) return { label: "EXCEL", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", icon: FileSpreadsheet }
  if (["txt", "md", "json", "yaml", "yml", "sql"].includes(e)) return { label: e.toUpperCase(), bg: "bg-teal-500/10 text-teal-600 dark:text-teal-400", icon: FileCode2 }
  if (["mp4", "webm", "mov"].includes(e)) return { label: "VIDEO", bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", icon: Film }
  if (["mp3", "wav"].includes(e)) return { label: "AUDIO", bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400", icon: Music }
  if (["zip", "7z", "tar", "gz"].includes(e)) return { label: "ZIP", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: Archive }
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(e)) return { label: "IMG", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400", icon: FileImage }
  return { label: "FILE", bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400", icon: FileText }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function normalizeFolderName(name?: string | null) {
  if (!name || name.trim() === "" || name.trim() === "/") return "/"
  const clean = name.trim().replace(/^[/\\]+/, "").replace(/[/\\]+$/, "")
  return clean === "" ? "/" : `/${clean}`
}

export function GuestFileList({
  token,
  files,
  allowPreview,
  allowDownload,
}: {
  token: string
  files: GuestFileItem[]
  allowPreview: boolean
  allowDownload: boolean
}) {
  const [activeFolder, setActiveFolder] = useState<string>("ALL")
  const [previewFile, setPreviewFile] = useState<GuestFileItem | null>(null)

  // Group and compute folders
  const allFolders = useMemo(() => {
    const set = new Set<string>()
    set.add("/")
    for (const f of files) {
      set.add(normalizeFolderName(f.folder))
    }
    return Array.from(set).sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)))
  }, [files])

  // Filtered files
  const displayedFiles = useMemo(() => {
    if (activeFolder === "ALL") return files
    return files.filter(f => normalizeFolderName(f.folder) === activeFolder)
  }, [files, activeFolder])

  const hasMultipleFolders = allFolders.length > 1

  return (
    <div className="space-y-3">
      {/* Folder Navigation Bar (shown when multiple folders exist) */}
      {hasMultipleFolders ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-accent/10 p-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveFolder("ALL")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer",
              activeFolder === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-background text-muted-foreground hover:text-foreground border border-border/60",
            )}
          >
            <FolderOpen className="size-3.5" />
            <span>全部文件</span>
            <span className="ml-1 rounded-full bg-black/10 dark:bg-white/15 px-1.5 py-0.2 text-[10px]">
              {files.length}
            </span>
          </button>

          {allFolders.map(folder => {
            const count = files.filter(f => normalizeFolderName(f.folder) === folder).length
            const isRoot = folder === "/"
            const label = isRoot ? "根目录 /" : folder.replace(/^\//, "")
            const isActive = activeFolder === folder

            return (
              <button
                key={folder}
                type="button"
                onClick={() => setActiveFolder(folder)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background text-muted-foreground hover:text-foreground border border-border/60",
                )}
              >
                <Folder className="size-3.5" />
                <span>{label}</span>
                <span className="ml-1 rounded-full bg-black/10 dark:bg-white/15 px-1.5 py-0.2 text-[10px]">
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      {/* File List */}
      <div className="space-y-2">
        {displayedFiles.map(file => {
          const badge = getExtensionBadge(file.extension)
          const BadgeIcon = badge.icon
          const previewKind = getPreviewKind({ extension: file.extension, mimeType: file.mimeType })
          const folderLabel =
            file.folder && file.folder !== "/" ? file.folder.replace(/^\//, "") : null

          return (
            <div
              key={file.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/80 p-3 shadow-xs transition hover:border-primary/40"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg font-bold text-[10px]", badge.bg)}>
                  <BadgeIcon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (allowPreview && previewKind !== "NONE") setPreviewFile(file)
                      }}
                      className={cn(
                        "truncate text-xs font-semibold text-foreground text-left",
                        allowPreview && previewKind !== "NONE" ? "hover:text-primary cursor-pointer" : "cursor-default",
                      )}
                      title={file.originalName}
                    >
                      {file.originalName}
                    </button>
                    {folderLabel ? (
                      <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground shrink-0">
                        <Folder className="size-2.5 text-primary" />
                        <span>{folderLabel}</span>
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground font-mono">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {allowPreview && previewKind !== "NONE" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewFile(file)}
                    className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                    title="在线预览"
                  >
                    <Eye className="size-3.5 mr-1" />
                    <span>预览</span>
                  </Button>
                ) : null}

                {allowDownload ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs px-2 text-primary hover:text-primary/80 hover:bg-primary/10"
                  >
                    <a href={`/s/${token}/files/${file.id}/download`}>
                      <Download className="size-3.5 mr-1" />
                      <span>下载</span>
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {/* File Preview Modal for Shared View */}
      <FilePreviewModal
        file={previewFile}
        files={displayedFiles.filter(f => getPreviewKind(f) !== "NONE")}
        open={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        onSelectFile={f => setPreviewFile(f as GuestFileItem)}
        guestToken={token}
        allowDownload={allowDownload}
      />
    </div>
  )
}
