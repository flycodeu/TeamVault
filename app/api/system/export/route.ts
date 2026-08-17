import { NextResponse } from "next/server"

import { writeAudit } from "@/lib/audit/log"
import { requireAdminUser } from "@/lib/auth/guards"
import { createFullBackupArchive } from "@/lib/system/backup"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const admin = await requireAdminUser()
    const { buffer, filename, stats } = await createFullBackupArchive()

    await writeAudit({
      userId: admin.id,
      action: "RESOURCE_CREATE",
      targetType: "SYSTEM_BACKUP",
      targetId: filename,
    })

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "X-Total-Files": stats.filesCount.toString(),
        "X-Total-Resources": stats.resourcesCount.toString(),
      },
    })
  } catch (error) {
    console.error("System export error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "导出全量备份失败" },
      { status: 500 },
    )
  }
}
