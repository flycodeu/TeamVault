import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files, resources } from "@/lib/db/schema"
import { fileResponse } from "@/lib/http/file-response"
import { canViewFile } from "@/lib/permission"
import { resolveConvertedVideo } from "@/lib/video/preview"

/** 以流式响应（支持 HTTP Range 拖动进度）提供转码后的视频缓存 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 })

  const { id } = await params
  const result = await db
    .select({ file: files, resource: resources })
    .from(files)
    .innerJoin(resources, eq(files.resourceId, resources.id))
    .where(and(eq(files.id, id), eq(resources.status, "ACTIVE")))
    .limit(1)
  const row = result[0]
  if (!row || !(await canViewFile(row.resource.id))) {
    return NextResponse.json({ success: false, error: "无权访问" }, { status: 403 })
  }

  const resolved = await resolveConvertedVideo(row.file.id)
  if (!resolved) return NextResponse.json({ success: false, error: "转码缓存不存在" }, { status: 404 })

  const baseName = row.file.originalName.replace(/\.[^.]+$/, "") || "video"
  try {
    return await fileResponse(request, resolved.filePath, {
      contentType: resolved.extension === "mp4" ? "video/mp4" : "video/webm",
      fileName: `${baseName}.${resolved.extension}`,
    })
  } catch {
    return NextResponse.json({ success: false, error: "文件不存在" }, { status: 404 })
  }
}
