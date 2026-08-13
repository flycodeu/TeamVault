import { count, desc, eq } from "drizzle-orm"
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { requireAdminUser } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { auditLogs, users } from "@/lib/db/schema"

const pageSize = 20
const actionLabels: Record<string, string> = {
  LOGIN: "登录",
  LOGOUT: "退出",
  RESOURCE_CREATE: "创建模块",
  RESOURCE_EDIT: "编辑模块",
  RESOURCE_DELETE: "删除模块",
  SECRET_VIEW: "查看密钥",
  SECRET_COPY: "复制密钥",
  FILE_UPLOAD: "上传文件",
  FILE_PREVIEW: "预览文件",
  FILE_DOWNLOAD: "下载文件",
  FILE_DELETE: "删除文件",
  SHARE_CREATE: "创建分享",
  SHARE_REVOKE: "撤销分享",
  PERMISSION_CHANGE: "修改权限",
}
const targetLabels: Record<string, string> = { SESSION: "会话", RESOURCE: "模块", CREDENTIAL: "凭据", FILE: "文件", SHARE: "分享" }

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminUser()
  const query = await searchParams
  const requestedPage = Number.parseInt(query.page ?? "1", 10)
  const [{ value: total }] = await db.select({ value: count() }).from(auditLogs)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages)
  const rows = await db.select({ log: auditLogs, displayName: users.displayName }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).orderBy(desc(auditLogs.createdAt)).limit(pageSize).offset((currentPage - 1) * pageSize)
  const firstItem = total ? (currentPage - 1) * pageSize + 1 : 0
  const lastItem = Math.min(currentPage * pageSize, total)

  return <div className="mx-auto max-w-6xl px-4 py-8 md:px-8"><header className="flex items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-medium text-primary"><ScrollText className="size-4" />安全与操作记录</div><h1 className="mt-2 text-2xl font-semibold tracking-tight">审计日志</h1><p className="mt-2 text-sm text-muted-foreground">按时间倒序记录登录、资源、文件、凭据与权限操作。</p></div><div className="shrink-0 text-right"><p className="text-2xl font-semibold tabular-nums">{total}</p><p className="text-xs text-muted-foreground">累计记录</p></div></header>{rows.length ? <><div className="mt-7 overflow-hidden rounded-lg border bg-card"><div className="hidden grid-cols-[1.1fr_1fr_1.1fr_1fr] gap-4 border-b bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground md:grid"><span>时间</span><span>用户</span><span>操作</span><span>对象</span></div>{rows.map(({ log, displayName }) => <article key={log.id} className="border-b p-4 last:border-b-0 md:grid md:grid-cols-[1.1fr_1fr_1.1fr_1fr] md:items-center md:gap-4 md:py-3"><div className="text-xs text-muted-foreground md:text-foreground">{log.createdAt.toLocaleString("zh-CN")}</div><div className="mt-2 truncate text-sm font-medium md:mt-0 md:text-xs">{displayName ?? "系统"}</div><div className="mt-2 md:mt-0"><span className="inline-flex rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">{actionLabels[log.action] ?? log.action}</span></div><div className="mt-2 truncate text-xs text-muted-foreground md:mt-0">{log.targetType ? targetLabels[log.targetType] ?? log.targetType : log.resourceId ? "模块" : "—"}</div></article>)}</div><footer className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">显示 {firstItem}–{lastItem} 条，共 {total} 条</p><div className="flex items-center gap-2"><PaginationButton page={currentPage - 1} disabled={currentPage <= 1} label="上一页"><ChevronLeft /></PaginationButton><span className="min-w-20 text-center text-xs tabular-nums text-muted-foreground">{currentPage} / {totalPages}</span><PaginationButton page={currentPage + 1} disabled={currentPage >= totalPages} label="下一页" iconAfter><ChevronRight /></PaginationButton></div></footer></> : <div className="mt-7 flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed bg-card text-center"><ScrollText className="size-6 text-muted-foreground" /><h2 className="mt-3 text-sm font-semibold">暂无审计记录</h2><p className="mt-1 text-xs text-muted-foreground">产生操作后会在这里显示。</p></div>}</div>
}

function PaginationButton({ page, disabled, label, iconAfter = false, children }: { page: number; disabled: boolean; label: string; iconAfter?: boolean; children: ReactNode }) {
  const content = iconAfter ? <>{label}{children}</> : <>{children}{label}</>
  if (disabled) return <Button variant="outline" size="sm" disabled>{content}</Button>
  return <Button variant="outline" size="sm" asChild><Link href={`/audit?page=${page}`}>{content}</Link></Button>
}
