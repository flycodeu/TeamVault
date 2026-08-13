import { Download, FileArchive, FileCode2, FileImage, FileText } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { FileRecord } from "@/lib/db/schema"
import { fileKindMeta, fileKindOrder, getFileKind, type FileKind } from "@/lib/file/kinds"
import { FileActions } from "./file-actions"

const kindIcons = { IMAGE: FileImage, DOCUMENT: FileText, TEXT: FileCode2, ARCHIVE: FileArchive, OTHER: FileCode2 } satisfies Record<FileKind, typeof FileText>

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function FileList({ files, mayEdit = false }: { files: FileRecord[]; mayEdit?: boolean }) {
  if (!files.length) return <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">还没有文件。</div>

  const groups = fileKindOrder
    .map(kind => ({ kind, files: files.filter(file => getFileKind(file) === kind) }))
    .filter(group => group.files.length)

  return <div className="space-y-7">{groups.map(group => <section key={group.kind}><div className="mb-3 flex items-center gap-2"><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{fileKindMeta[group.kind].label}</h3><span className="text-xs text-muted-foreground">{group.files.length}</span></div>{group.kind === "IMAGE" ? <ImageGrid files={group.files} mayEdit={mayEdit} /> : <DocumentList files={group.files} kind={group.kind} mayEdit={mayEdit} />}</section>)}</div>
}

function ImageGrid({ files, mayEdit }: { files: FileRecord[]; mayEdit: boolean }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{files.map(file => <article key={file.id} className="group overflow-hidden rounded-lg border bg-background"><Link href={`/files/${file.id}/preview`} className="relative block aspect-[4/3] overflow-hidden bg-muted"><Image src={`/api/files/${file.id}/thumbnail`} alt={file.originalName} fill unoptimized loading="lazy" sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw" className="object-cover transition duration-300 group-hover:scale-[1.02]" /><span className="absolute inset-x-0 bottom-0 translate-y-full bg-foreground/75 px-3 py-2 text-xs text-background transition group-hover:translate-y-0">点击图片查看原图</span></Link><div className="flex items-center gap-2 p-3"><div className="min-w-0 flex-1"><Link href={`/files/${file.id}/preview`} className="block truncate text-sm font-medium hover:text-primary">{file.originalName}</Link><p className="mt-0.5 text-xs text-muted-foreground">{formatSize(file.size)}</p></div><FileActions id={file.id} name={file.originalName} mayDelete={mayEdit} showPreview={false} /><DownloadButton file={file} /></div></article>)}</div>
}

function DocumentList({ files, kind, mayEdit }: { files: FileRecord[]; kind: FileKind; mayEdit: boolean }) {
  const Icon = kindIcons[kind]
  return <div className="grid gap-2 lg:grid-cols-2">{files.map(file => <article key={file.id} className="flex items-center gap-3 rounded-lg border bg-background p-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><Link href={`/files/${file.id}/preview`} className="block truncate text-sm font-medium hover:text-primary">{file.originalName}</Link><p className="text-xs text-muted-foreground">{formatSize(file.size)} · {file.previewStatus === "SUCCESS" ? "可在线预览" : "已上传"}</p></div><FileActions id={file.id} name={file.originalName} mayDelete={mayEdit} /><DownloadButton file={file} /></article>)}</div>
}

function DownloadButton({ file }: { file: FileRecord }) {
  return <Button asChild variant="ghost" size="icon" title="下载文件" aria-label={`下载 ${file.originalName}`}><Link href={`/api/files/${file.id}/download`}><Download /></Link></Button>
}
