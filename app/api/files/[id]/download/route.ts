import { GET as getContent } from "../content/route"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { canDownloadFile } from "@/lib/permission"
import { writeAudit } from "@/lib/audit/log"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 })
  const { id } = await context.params
  const file = await db.query.files.findFirst({ where: eq(files.id, id) })
  if (!file || !(await canDownloadFile(file.resourceId))) return NextResponse.json({ success: false, error: "无权下载" }, { status: 403 })
  const response = await getContent(request, context)
  if (response.ok) {
    await writeAudit({ userId: user.id, action: "FILE_DOWNLOAD", resourceId: file.resourceId, targetType: "FILE", targetId: id })
  }
  const disposition = response.headers.get("Content-Disposition")?.replace("inline", "attachment")
  if (disposition) response.headers.set("Content-Disposition", disposition)
  return response
}
