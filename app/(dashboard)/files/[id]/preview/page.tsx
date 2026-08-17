import { Download } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PreviewBackButton } from "@/components/file/preview-back-button"
import { FilePreviewViewer } from "@/components/file/preview-viewer"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { getPreviewKind } from "@/lib/file/kinds"
import { canViewFile } from "@/lib/permission"
import { eq } from "drizzle-orm"

export default async function FilePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const file = await db.query.files.findFirst({ where: eq(files.id, id) })
  if (!file || !(await canViewFile(file.resourceId))) notFound()

  const kind = getPreviewKind(file)

  return (
    <div className="min-h-screen">
      <div className="flex h-16 items-center justify-between border-b px-4 md:px-6">
        <PreviewBackButton
          fallbackHref={`/resources/${file.resourceId}?tab=files`}
          label="返回模块"
        />
        <p className="min-w-0 truncate px-4 text-sm font-medium">{file.originalName}</p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/api/files/${id}/download`}>
            <Download />
            下载
          </Link>
        </Button>
      </div>
      <FilePreviewViewer
        contentUrl={`/api/files/${file.id}/content`}
        wordTextUrl={`/api/files/${file.id}/word-text`}
        downloadUrl={`/api/files/${file.id}/download`}
        file={{
          originalName: file.originalName,
          mimeType: file.mimeType,
          extension: file.extension,
          size: file.size,
        }}
        kind={kind}
      />
    </div>
  )
}
