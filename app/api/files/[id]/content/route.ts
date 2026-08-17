import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files, resources } from "@/lib/db/schema"
import { fileResponse } from "@/lib/http/file-response"
import { canViewFile } from "@/lib/permission"
import { safeStoragePath } from "@/lib/storage/files"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 })
  const { id } = await params
  const result = await db.select({ file: files, resource: resources }).from(files).innerJoin(resources, eq(files.resourceId, resources.id)).where(and(eq(files.id, id), eq(resources.status, "ACTIVE"))).limit(1)
  const row = result[0]
  if (!row || !(await canViewFile(row.resource.id))) return NextResponse.json({ success: false, error: "无权访问" }, { status: 403 })

  try {
    return await fileResponse(request, safeStoragePath(row.file.storagePath), {
      contentType: row.file.mimeType,
      fileName: row.file.originalName,
    })
  } catch {
    return NextResponse.json({ success: false, error: "文件不存在" }, { status: 404 })
  }
}
