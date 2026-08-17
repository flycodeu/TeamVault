import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files, resources } from "@/lib/db/schema"
import { canViewFile } from "@/lib/permission"
import { safeStoragePath } from "@/lib/storage/files"
import { getVideoPlayableStatus } from "@/lib/video/preview"

/** 查询视频可播放状态：原文件直出 / 转码缓存就绪 / 转换中 / 失败（支持 hevc 与 force 参数） */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 })

  const { id } = await params
  const url = new URL(request.url)
  const supportsHevc = url.searchParams.get("hevc") === "1"
  const force = url.searchParams.get("force") === "1"

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

  const status = await getVideoPlayableStatus({
    fileId: row.file.id,
    storagePath: safeStoragePath(row.file.storagePath),
    extension: row.file.extension,
    size: row.file.size,
    supportsHevc,
    force,
  })
  return NextResponse.json(status)
}
