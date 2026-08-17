import { Download } from "lucide-react"
import { eq } from "drizzle-orm"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PreviewBackButton } from "@/components/file/preview-back-button"
import { FilePreviewViewer } from "@/components/file/preview-viewer"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { getPreviewKind } from "@/lib/file/kinds"
import { getShareAccess } from "@/lib/share/access"
import { isShareFileAllowed } from "@/lib/share/file-access"

export default async function SharedFilePreviewPage({ params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const access = await getShareAccess(token)
  const file = await db.query.files.findFirst({ where: eq(files.id, fileId) })
  if (!access || !file || !isShareFileAllowed(access.share, file, "preview")) notFound()

  return (
    <main className="min-h-screen bg-background">
      <div className="flex h-16 items-center justify-between border-b px-4 md:px-6">
        <PreviewBackButton fallbackHref={`/s/${token}`} label="返回分享" />
        <p className="min-w-0 truncate px-4 text-sm font-medium">{file.originalName}</p>
        {access.share.allowDownload ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/s/${token}/files/${file.id}/download`}>
              <Download />
              下载
            </Link>
          </Button>
        ) : <span className="w-20" />}
      </div>
      <FilePreviewViewer
        contentUrl={`/s/${token}/files/${file.id}/content`}
        wordTextUrl={`/s/${token}/files/${file.id}/word-text`}
        downloadUrl={access.share.allowDownload ? `/s/${token}/files/${file.id}/download` : undefined}
        playableUrl={`/s/${token}/files/${file.id}/video-playable`}
        convertedUrl={`/s/${token}/files/${file.id}/video-preview`}
        file={{
          originalName: file.originalName,
          mimeType: file.mimeType,
          extension: file.extension,
          size: file.size,
        }}
        kind={getPreviewKind(file)}
      />
    </main>
  )
}
