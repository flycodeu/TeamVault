import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { fileResponse } from "@/lib/http/file-response"
import { safeStoragePath } from "@/lib/storage/files"
import { getShareAccess } from "@/lib/share/access"
import { isShareFileAllowed } from "@/lib/share/file-access"

export async function GET(request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const access = await getShareAccess(token)
  const file = await db.query.files.findFirst({ where: eq(files.id, fileId) })
  if (!access || !file || !isShareFileAllowed(access.share, file, "preview")) {
    return NextResponse.json({ success: false, error: "分享无效或不允许预览" }, { status: 403 })
  }

  try {
    return await fileResponse(request, safeStoragePath(file.storagePath), {
      contentType: file.mimeType,
      fileName: file.originalName,
    })
  } catch {
    return NextResponse.json({ success: false, error: "文件不存在" }, { status: 404 })
  }
}
