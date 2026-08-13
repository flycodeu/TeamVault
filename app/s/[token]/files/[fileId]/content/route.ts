import { eq } from "drizzle-orm"
import fs from "node:fs/promises"
import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { safeStoragePath } from "@/lib/storage/files"
import { getShareAccess } from "@/lib/share/access"

export async function GET(request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const access = await getShareAccess(token)
  const file = await db.query.files.findFirst({ where: eq(files.id, fileId) })
  if (!access || !file || !access.share.allowPreview || (access.share.type === "FILE" ? access.share.targetId !== fileId : access.share.targetId !== file.resourceId)) return NextResponse.json({ success: false, error: "分享无效或不允许预览" }, { status: 403 })
  try { const body = await fs.readFile(safeStoragePath(file.storagePath)); return new Response(body, { headers: { "Content-Type": file.mimeType, "Content-Length": String(file.size), "Content-Disposition": `inline; filename="${encodeURIComponent(file.originalName)}"`, "Cache-Control": "private, no-store" } }) } catch { return NextResponse.json({ success: false, error: "文件不存在" }, { status: 404 }) }
}
