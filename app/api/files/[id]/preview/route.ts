import fs from "node:fs/promises"
import path from "node:path"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { writeAudit } from "@/lib/audit/log"
import { canViewFile } from "@/lib/permission"
import { safeStoragePath } from "@/lib/storage/files"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 })
  const { id } = await params
  const file = await db.query.files.findFirst({ where: eq(files.id, id) })
  if (!file || !(await canViewFile(file.resourceId))) return NextResponse.json({ success: false, error: "无权预览" }, { status: 403 })
  const previewRoot = path.resolve(process.cwd(), "data", "previews")
  const target = file.previewStatus === "SUCCESS" && file.previewPath ? path.resolve(previewRoot, file.previewPath) : safeStoragePath(file.storagePath)
  if (file.previewPath && !target.startsWith(`${previewRoot}${path.sep}`)) return NextResponse.json({ success: false, error: "无效预览路径" }, { status: 500 })
  try { const body = await fs.readFile(target); await writeAudit({ userId: user.id, action: "FILE_PREVIEW", resourceId: file.resourceId, targetType: "FILE", targetId: id }); return new Response(body, { headers: { "Content-Type": file.previewStatus === "SUCCESS" ? "application/pdf" : file.mimeType, "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"` } }) } catch { return NextResponse.json({ success: false, error: "预览不存在" }, { status: 404 }) }
}
