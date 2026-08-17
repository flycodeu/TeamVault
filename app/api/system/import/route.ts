import { type NextRequest, NextResponse } from "next/server"

import { writeAudit } from "@/lib/audit/log"
import { requireAdminUser } from "@/lib/auth/guards"
import { inspectBackupArchive, restoreFromBackupArchive } from "@/lib/system/backup"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser()
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const action = (formData.get("action") as string) || "restore"

    if (!file) {
      return NextResponse.json({ error: "请上传备份压缩包文件 (.zip)" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (action === "inspect") {
      const inspection = await inspectBackupArchive(buffer)
      if (!inspection.valid) {
        return NextResponse.json({ error: inspection.error || "无效的备份文件" }, { status: 400 })
      }
      return NextResponse.json(inspection)
    }

    // 执行全量恢复
    const result = await restoreFromBackupArchive(buffer, { backupCurrentFirst: true })
    if (!result.success) {
      return NextResponse.json({ error: result.error || "导入恢复失败" }, { status: 500 })
    }

    await writeAudit({
      userId: admin.id,
      action: "RESOURCE_EDIT",
      targetType: "SYSTEM_RESTORE",
      targetId: result.manifest?.exportedAt || "backup",
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("System import error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "恢复系统备份失败" },
      { status: 500 },
    )
  }
}
