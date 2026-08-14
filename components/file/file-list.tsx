import {
  Download,
  Eye,
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { FileRecord } from "@/lib/db/schema"
import { fileKindMeta, fileKindOrder, getFileKind, type FileKind } from "@/lib/file/kinds"
import { cn } from "@/lib/utils"
import { FileActions } from "./file-actions"

const kindIcons = {
  IMAGE: FileImage,
  DOCUMENT: FileText,
  TEXT: FileCode2,
  ARCHIVE: FileArchive,
  OTHER: FileCode2,
} satisfies Record<FileKind, typeof FileText>

const kindColors = {
  IMAGE: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-200/50 dark:border-purple-900/30",
  DOCUMENT: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-200/50 dark:border-blue-900/30",
  TEXT: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-900/30",
  ARCHIVE: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-200/50 dark:border-amber-900/30",
  OTHER: "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-200/50 dark:border-slate-800/30",
} satisfies Record<FileKind, string>

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function FileList({ files, mayEdit = false }: { files: FileRecord[]; mayEdit?: boolean }) {
  if (!files.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        <FileText className="mx-auto size-6 text-muted-foreground/60 mb-2" />
        <p className="font-medium text-foreground">暂未上传文件</p>
      </div>
    )
  }

  const groups = fileKindOrder
    .map(kind => ({ kind, files: files.filter(file => getFileKind(file) === kind) }))
    .filter(group => group.files.length)

  return (
    <div className="space-y-6">
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
            <ImageGrid files={group.files} mayEdit={mayEdit} />
          ) : (
            <DocumentList files={group.files} kind={group.kind} mayEdit={mayEdit} />
          )}
        </section>
      ))}
    </div>
  )
}

function ImageGrid({ files, mayEdit }: { files: FileRecord[]; mayEdit: boolean }) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {files.map(file => (
        <article
          key={file.id}
          className="group overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs transition duration-200 hover:border-primary/40 hover:shadow-md"
        >
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
      ))}
    </div>
  )
}

function DocumentList({ files, kind, mayEdit }: { files: FileRecord[]; kind: FileKind; mayEdit: boolean }) {
  const Icon = kindIcons[kind]
  const colorClass = kindColors[kind]
  return (
    <div className="grid gap-2.5 lg:grid-cols-2">
      {files.map(file => (
        <article
          key={file.id}
          className="flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-xs transition duration-200 hover:border-primary/40 hover:shadow-xs"
        >
          <span className={cn("grid size-9.5 shrink-0 place-items-center rounded-xl border", colorClass)}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/files/${file.id}/preview`}
              className="block truncate text-xs font-semibold text-foreground hover:text-primary transition-colors"
              title={file.originalName}
            >
              {file.originalName}
            </Link>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>{formatSize(file.size)}</span>
              <span>·</span>
              <span className={file.previewStatus === "SUCCESS" ? "text-primary font-medium" : ""}>
                {file.previewStatus === "SUCCESS" ? "支持在线预览" : "可直接下载"}
              </span>
            </div>
          </div>
          <FileActions id={file.id} name={file.originalName} mayDelete={mayEdit} />
          <DownloadButton file={file} />
        </article>
      ))}
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

