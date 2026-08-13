import { Download, FileArchive, FileCode2, FileImage, FileText } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { FileRecord } from "@/lib/db/schema"
import { FileActions } from "./file-actions"

function iconFor(mime: string) { if (mime.startsWith("image/")) return FileImage; if (mime.includes("pdf") || mime.includes("text")) return FileText; if (mime.includes("zip")) return FileArchive; return FileCode2 }

export function FileList({ files }: { files: FileRecord[] }) {
  if (!files.length) return <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">还没有文件。支持 PDF、Office、图片和常用文本格式。</div>
  return <div className="space-y-2">{files.map(file => { const Icon = iconFor(file.mimeType); return <div key={file.id} className="flex items-center gap-3 rounded-lg border bg-card p-3"><span className="grid size-8 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.originalName}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.previewStatus === "SUCCESS" ? "可预览" : "已上传"}</p></div><FileActions id={file.id} name={file.originalName} /><Button asChild variant="ghost" size="icon" title="下载文件" aria-label={`下载 ${file.originalName}`}><Link href={`/api/files/${file.id}/download`}><Download /></Link></Button></div> })}</div>
}
