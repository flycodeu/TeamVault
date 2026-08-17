import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { safeStoragePath } from "@/lib/storage/files"
import { getShareAccess } from "@/lib/share/access"
import { isShareFileAllowed } from "@/lib/share/file-access"
import { getVideoPlayableStatus } from "@/lib/video/preview"

/** 外部分享：查询视频可播放状态（遵守 allowPreview，不检查 allowDownload） */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const access = await getShareAccess(token)
  const file = await db.query.files.findFirst({ where: eq(files.id, fileId) })
  if (!access || !file || !isShareFileAllowed(access.share, file, "preview")) {
    return NextResponse.json({ success: false, error: "分享无效或不允许预览" }, { status: 403 })
  }

  const status = await getVideoPlayableStatus({
    fileId: file.id,
    storagePath: safeStoragePath(file.storagePath),
    extension: file.extension,
    size: file.size,
  })
  return NextResponse.json(status)
}
