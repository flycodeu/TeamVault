import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { fileResponse } from "@/lib/http/file-response"
import { getShareAccess } from "@/lib/share/access"
import { isShareFileAllowed } from "@/lib/share/file-access"
import { resolveConvertedVideo } from "@/lib/video/preview"

/** 外部分享：以流式响应（支持 HTTP Range）提供转码后的视频缓存 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const access = await getShareAccess(token)
  const file = await db.query.files.findFirst({ where: eq(files.id, fileId) })
  if (!access || !file || !isShareFileAllowed(access.share, file, "preview")) {
    return NextResponse.json({ success: false, error: "分享无效或不允许预览" }, { status: 403 })
  }

  const resolved = await resolveConvertedVideo(file.id)
  if (!resolved) return NextResponse.json({ success: false, error: "转码缓存不存在" }, { status: 404 })

  const baseName = file.originalName.replace(/\.[^.]+$/, "") || "video"
  try {
    return await fileResponse(request, resolved.filePath, {
      contentType: resolved.extension === "mp4" ? "video/mp4" : "video/webm",
      fileName: `${baseName}.${resolved.extension}`,
    })
  } catch {
    return NextResponse.json({ success: false, error: "文件不存在" }, { status: 404 })
  }
}
