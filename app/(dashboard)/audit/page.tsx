import { count, desc, eq } from "drizzle-orm"
import { History } from "lucide-react"

import { Pagination } from "@/components/ui/pagination"
import { requireAdminUser } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { auditLogs, users } from "@/lib/db/schema"
import { cn } from "@/lib/utils"
import { AuditCleanup } from "@/components/audit/audit-cleanup"

const pageSize = 20

const actionMeta: Record<string, { label: string; badge: string }> = {
  LOGIN: { label: "用户登录", badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  LOGOUT: { label: "退出登录", badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  RESOURCE_CREATE: { label: "创建模块", badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  RESOURCE_EDIT: { label: "编辑模块", badge: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  RESOURCE_DELETE: { label: "删除模块", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  SECRET_VIEW: { label: "查看密钥", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  SECRET_COPY: { label: "复制密钥", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  FILE_UPLOAD: { label: "上传文件", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  FILE_PREVIEW: { label: "预览文件", badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300" },
  FILE_DOWNLOAD: { label: "下载文件", badge: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
  FILE_DELETE: { label: "删除文件", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  SHARE_CREATE: { label: "创建分享", badge: "bg-purple-500/10 text-purple-700 dark:text-purple-300" },
  SHARE_REVOKE: { label: "撤销分享", badge: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
  PERMISSION_CHANGE: { label: "修改权限", badge: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
}

const targetLabels: Record<string, string> = {
  SESSION: "用户会话",
  RESOURCE: "共享模块",
  CREDENTIAL: "账号凭据",
  FILE: "模块文件",
  SHARE: "分享链接",
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminUser()
  const query = await searchParams
  const requestedPage = Number.parseInt(query.page ?? "1", 10)
  const [{ value: total }] = await db.select({ value: count() }).from(auditLogs)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages)
  const rows = await db
    .select({ log: auditLogs, displayName: users.displayName })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize)
    .offset((currentPage - 1) * pageSize)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">安全审计日志</h1>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
            {total} 条记录
          </span>
        </div>
        <AuditCleanup />
      </header>

      {rows.length ? (
        <>
          <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
            <div className="hidden grid-cols-[1.3fr_1fr_1fr_1fr_1.5fr] gap-4 border-b border-border/80 bg-muted/40 px-5 py-3 text-xs font-semibold text-muted-foreground md:grid">
              <span>时间戳</span>
              <span>操作用户</span>
              <span>动作类型</span>
              <span>目标对象</span>
              <span>详情与IP</span>
            </div>
            <div className="divide-y divide-border/60">
              {rows.map(({ log, displayName }) => {
                const meta = actionMeta[log.action] ?? {
                  label: log.action,
                  badge: "bg-muted text-muted-foreground",
                }
                return (
                  <article
                    key={log.id}
                    className="p-4 transition hover:bg-muted/20 md:grid md:grid-cols-[1.3fr_1fr_1fr_1fr_1.5fr] md:items-center md:gap-4 md:px-5 md:py-3.5"
                  >
                    <div className="font-mono text-xs text-muted-foreground">
                      {log.createdAt.toLocaleString("zh-CN")}
                    </div>
                    <div className="mt-2 text-xs font-semibold text-foreground md:mt-0">
                      {displayName ?? "未知或系统"}
                    </div>
                    <div className="mt-2 md:mt-0">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold",
                          meta.badge,
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground md:mt-0 font-medium">
                      {log.targetType ? targetLabels[log.targetType] ?? log.targetType : "模块"}
                    </div>
                    <div className="mt-2 truncate font-mono text-[11px] text-muted-foreground/80 md:mt-0">
                      {log.ip ? `IP: ${log.ip}` : "本地会话"}
                      {log.userAgent ? ` · ${log.userAgent.slice(0, 32)}` : ""}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
          <Pagination pathname="/audit" currentPage={currentPage} pageSize={pageSize} total={total} />
        </>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center">
          <History className="size-8 text-muted-foreground/60 mb-2" />
          <h2 className="text-base font-bold text-foreground">暂无审计操作记录</h2>
          <p className="mt-1 text-xs text-muted-foreground">当团队成员登录、查看凭据或下载文件时，将在此留存审计日志</p>
        </div>
      )}
    </div>
  )
}

