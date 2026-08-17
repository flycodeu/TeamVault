import { and, eq, isNull } from "drizzle-orm"
import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files, resources } from "@/lib/db/schema"
import { writeAudit } from "@/lib/audit/log"
import { normalizeUploadMimeType } from "@/lib/file/kinds"
import { persistUpload, validateUpload } from "@/lib/storage/files"
import { canEditResource } from "@/lib/permission"
import { enqueuePreview } from "@/lib/preview/worker"
import { requireSameOrigin } from "@/lib/auth/csrf"

export async function POST(request: Request) {
  await requireSameOrigin()
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 })
  const form = await request.formData()
  const resourceId = String(form.get("resourceId") ?? "")
  const file = form.get("file")
  if (!(file instanceof File)) return NextResponse.json({ success: false, error: "缺少文件" }, { status: 400 })
  const resource = await db.query.resources.findFirst({ where: and(eq(resources.id, resourceId), isNull(resources.deletedAt)) })
  if (!resource || !(await canEditResource(resourceId))) return NextResponse.json({ success: false, error: "无权上传" }, { status: 403 })
  try {
    const extension = validateUpload(file)
    const saved = await persistUpload(file, extension)
    const [record] = await db.insert(files).values({ resourceId, originalName: file.name.slice(0, 255), ...saved, mimeType: normalizeUploadMimeType(file.type, extension), extension, createdBy: user.id }).returning({ id: files.id })
    await enqueuePreview(record.id, extension)
    await writeAudit({ userId: user.id, action: "FILE_UPLOAD", resourceId, targetType: "FILE", targetId: record.id })
    return NextResponse.json({ success: true, data: record }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "上传失败" }, { status: 400 })
  }
}
