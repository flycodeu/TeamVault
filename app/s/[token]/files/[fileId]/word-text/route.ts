import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { getShareAccess } from "@/lib/share/access"
import { isShareFileAllowed } from "@/lib/share/file-access"
import { safeStoragePath } from "@/lib/storage/files"
import { extractLegacyWord } from "@/lib/word/extract"

export async function GET(_request: Request, { params }: { params: Promise<{ token: string; fileId: string }> }) {
  const { token, fileId } = await params
  const access = await getShareAccess(token)
  const file = await db.query.files.findFirst({ where: eq(files.id, fileId) })
  if (!access || !file || !isShareFileAllowed(access.share, file, "preview")) {
    return NextResponse.json({ success: false, error: "分享无效或不允许预览" }, { status: 403 })
  }
  if (file.extension?.toLowerCase() !== "doc") {
    return NextResponse.json({ success: false, error: "该接口仅用于旧版 .doc 预览" }, { status: 400 })
  }

  try {
    const data = await extractLegacyWord(safeStoragePath(file.storagePath), file.size)
    return NextResponse.json(
      { success: true, data },
      { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } },
    )
  } catch (reason) {
    const error = reason instanceof Error && reason.message.startsWith("旧版 Word 文件超过")
      ? reason.message
      : "旧版 Word 文档解析失败，文件可能已损坏或不是有效的 .doc 格式。"
    return NextResponse.json({ success: false, error }, { status: 422 })
  }
}
