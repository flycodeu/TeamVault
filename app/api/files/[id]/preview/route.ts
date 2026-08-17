import path from "node:path"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { writeAudit } from "@/lib/audit/log"
import { previewsRoot } from "@/lib/paths"
import { fileResponse } from "@/lib/http/file-response"
import { canViewFile } from "@/lib/permission"
import { safeStoragePath } from "@/lib/storage/files"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 })
  const { id } = await params
  const file = await db.query.files.findFirst({ where: eq(files.id, id) })
  if (!file || !(await canViewFile(file.resourceId))) return NextResponse.json({ success: false, error: "无权预览" }, { status: 403 })
  const previewRoot = previewsRoot()
  const target = file.previewStatus === "SUCCESS" && file.previewPath ? path.resolve(previewRoot, file.previewPath) : safeStoragePath(file.storagePath)
  if (file.previewPath && !target.startsWith(`${previewRoot}${path.sep}`)) return NextResponse.json({ success: false, error: "无效预览路径" }, { status: 500 })
  try {
    const response = await fileResponse(_request, target, {
      contentType: file.previewStatus === "SUCCESS" ? "application/pdf" : file.mimeType,
      fileName: file.originalName,
    })
    await writeAudit({ userId: user.id, action: "FILE_PREVIEW", resourceId: file.resourceId, targetType: "FILE", targetId: id })
    return response
  } catch {
    return NextResponse.json({ success: false, error: "预览不存在" }, { status: 404 })
  }
}
