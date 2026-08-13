import { ChevronLeft, Download } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import fs from "node:fs/promises"

import { PdfViewer } from "@/components/file/pdf-viewer"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { canViewFile } from "@/lib/permission"
import { safeStoragePath } from "@/lib/storage/files"
import { eq } from "drizzle-orm"

const textExtensions = new Set(["txt", "md", "json", "xml", "yaml", "yml", "sql", "log", "csv"])

export default async function FilePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const file = await db.query.files.findFirst({ where: eq(files.id, id) })
  if (!file || !(await canViewFile(file.resourceId))) notFound()
  let text = ""
  if (file.extension && textExtensions.has(file.extension)) text = await fs.readFile(safeStoragePath(file.storagePath), "utf8")
  const isPdf = file.mimeType === "application/pdf" || file.previewStatus === "SUCCESS"
  return <div className="min-h-screen"><div className="flex h-16 items-center justify-between border-b px-4 md:px-6"><Button variant="ghost" size="sm" asChild><Link href={`/resources/${file.resourceId}`}><ChevronLeft />返回模块</Link></Button><p className="min-w-0 truncate px-4 text-sm font-medium">{file.originalName}</p><Button asChild variant="outline" size="sm"><Link href={`/api/files/${id}/download`}><Download />下载</Link></Button></div>{isPdf ? <PdfViewer url={`/api/files/${id}/preview`} /> : file.mimeType.startsWith("image/") ? <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-muted p-5"><Image src={`/api/files/${id}/content`} alt={file.originalName} width={1600} height={1000} unoptimized className="max-h-[85vh] max-w-full object-contain" /></div> : text ? <pre className="mx-auto max-w-5xl overflow-auto whitespace-pre-wrap p-5 font-mono text-xs leading-6 md:p-8">{text}</pre> : <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">此文件暂不支持在线预览。</div>}</div>
}
