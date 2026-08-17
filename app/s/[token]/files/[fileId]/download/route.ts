import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getShareAccess } from "@/lib/share/access"
import { safeStoragePath } from "@/lib/storage/files"

export async function GET(request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const access = await getShareAccess(token)
  const file = await db.query.files.findFirst({ where: eq(files.id, fileId) })
  if (!access || !file || !access.share.allowDownload) return NextResponse.json({ success: false, error: "分享无效或不允许下载" }, { status: 403 })

  if (access.share.type === "FILE") {
    if (access.share.targetId !== fileId) return NextResponse.json({ success: false, error: "无权下载此文件" }, { status: 403 })
  } else {
    if (access.share.targetId !== file.resourceId) return NextResponse.json({ success: false, error: "文件不属于该资源" }, { status: 403 })
    if (access.share.fileIds) {
      try {
        const allowed = JSON.parse(access.share.fileIds) as string[]
        if (Array.isArray(allowed) && !allowed.includes(fileId)) {
          return NextResponse.json({ success: false, error: "该文件不在分享列表中" }, { status: 403 })
        }
      } catch {
        // Ignore parse error
      }
    }
  }

  try {
    const body = await fs.readFile(safeStoragePath(file.storagePath))
    return new Response(body, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.size),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch {
    return NextResponse.json({ success: false, error: "文件不存在" }, { status: 404 })
  }
}
