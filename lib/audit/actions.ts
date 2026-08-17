"use server"

import { lt } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/action-result"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { auditLogs } from "@/lib/db/schema"
import { writeAudit } from "@/lib/audit/log"

export async function clearAuditLogs(days: number): Promise<ActionResult<{ deleted: number }>> {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    return { success: false, error: "无权执行此操作" }
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  try {
    const result = db.delete(auditLogs).where(lt(auditLogs.createdAt, cutoff)).run()
    
    // Log this action itself
    await writeAudit({
      userId: user.id,
      action: "RESOURCE_DELETE",
      targetType: "AUDIT_LOGS",
      targetId: `older_than_${days}_days`,
    })

    revalidatePath("/audit")
    return { success: true, data: { deleted: result.changes } }
  } catch (error) {
    console.error("Failed to clear audit logs:", error)
    return { success: false, error: "清理审计日志失败" }
  }
}
