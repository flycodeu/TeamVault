import { NextResponse } from "next/server"
import fs from "node:fs/promises"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { getShareAccess } from "@/lib/share/access"
import { isShareFileAllowed } from "@/lib/share/file-access"
import { safeStoragePath } from "@/lib/storage/files"

export async function GET(request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const access = await getShareAccess(token)
  const file = await db.query.files.findFirst({ where: eq(files.id, fileId) })
  if (!access || !file || !isShareFileAllowed(access.share, file, "download")) {
    return NextResponse.json({ success: false, error: "分享无效或不允许下载" }, { status: 403 })
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
