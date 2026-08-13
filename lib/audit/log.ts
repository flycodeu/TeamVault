import "server-only"

import { headers } from "next/headers"

import { db } from "@/lib/db"
import { auditLogs } from "@/lib/db/schema"

type AuditAction = typeof auditLogs.$inferInsert.action

export async function writeAudit(input: { userId: string; action: AuditAction; resourceId?: string; targetType?: string; targetId?: string }) {
  try {
    const requestHeaders = await headers()
    await db.insert(auditLogs).values({
      ...input,
      ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: requestHeaders.get("user-agent")?.slice(0, 500),
    })
  } catch (error) {
    console.error("Audit write failed", error instanceof Error ? error.message : error)
  }
}
