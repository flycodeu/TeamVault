import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { auditLogs, users } from "@/lib/db/schema"
import { requireAdminUser } from "@/lib/auth/guards"

export default async function AuditPage() {
  await requireAdminUser()
  const rows = await db.select({ log: auditLogs, displayName: users.displayName }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).orderBy(desc(auditLogs.createdAt)).limit(200)
  return <div className="mx-auto max-w-6xl px-4 py-8 md:px-8"><h1 className="text-2xl font-semibold">审计日志</h1><div className="mt-7 overflow-hidden rounded-lg border bg-card"><div className="grid grid-cols-[1fr_1fr_1.3fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground"><span>时间</span><span>用户</span><span>操作</span></div>{rows.map(({ log, displayName }) => <div key={log.id} className="grid grid-cols-[1fr_1fr_1.3fr] gap-4 border-b px-4 py-3 text-xs last:border-b-0"><span>{log.createdAt.toLocaleString("zh-CN")}</span><span>{displayName ?? "系统"}</span><span className="font-mono">{log.action}</span></div>)}</div></div>
}
