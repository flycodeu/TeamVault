import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files, resources } from "@/lib/db/schema"
import { canViewFile } from "@/lib/permission"
import { safeStoragePath } from "@/lib/storage/files"
import { extractLegacyWord } from "@/lib/word/extract"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 })

  const { id } = await params
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
  if (row.file.extension?.toLowerCase() !== "doc") {
    return NextResponse.json({ success: false, error: "该接口仅用于旧版 .doc 预览" }, { status: 400 })
  }

  try {
    const data = await extractLegacyWord(safeStoragePath(row.file.storagePath), row.file.size)
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
