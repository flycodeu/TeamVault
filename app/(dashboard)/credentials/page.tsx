import { and, desc, eq, inArray, isNull, like, or } from "drizzle-orm"
import { ArrowRight, FolderKey, KeyRound, Search, User, X } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import { db } from "@/lib/db"
import { credentials, resources } from "@/lib/db/schema"
import { listPermittedCredentialIds } from "@/lib/permission"

const pageSize = 18

const typeLabels: Record<string, string> = {
  PASSWORD: "账号密码",
  API_KEY: "API 密钥",
  TOKEN: "Token",
  SSH: "SSH 主机",
  DATABASE: "数据库",
  ACCESS_KEY: "Access Key",
  TOTP: "二次验证",
  OTHER: "通用凭据",
}

export default async function CredentialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const [permittedIds, query] = await Promise.all([listPermittedCredentialIds(), searchParams])
  const q = query.q?.trim() ?? ""
  const requestedPage = Number.parseInt(query.page ?? "1", 10)

  const searchFilter = q
    ? or(
        like(credentials.name, `%${q}%`),
        like(credentials.username, `%${q}%`),
        like(credentials.description, `%${q}%`),
        like(resources.name, `%${q}%`),
      )
    : undefined

  const where = permittedIds.length
    ? and(inArray(credentials.id, permittedIds), isNull(resources.deletedAt), searchFilter)
    : undefined

  const allFiltered = where
    ? await db
        .select({
          id: credentials.id,
          resourceId: credentials.resourceId,
          name: credentials.name,
          type: credentials.type,
          username: credentials.username,
          description: credentials.description,
          resourceName: resources.name,
          moduleKind: resources.moduleKind,
        })
        .from(credentials)
        .innerJoin(resources, eq(credentials.resourceId, resources.id))
        .where(where)
        .orderBy(desc(credentials.createdAt))
    : []

  const total = allFiltered.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages)
  const pageRows = allFiltered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      {/* Compact Header & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <span className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 text-[11px] font-semibold shrink-0">
          共 {total} 项
        </span>

        <form className="flex gap-2 max-w-lg w-full md:w-[320px]">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="搜索凭据名称、账号用户名、所属模块或说明..."
              className="h-9 border-border/80 bg-card pl-9 text-xs shadow-xs w-full"
            />
          </div>
          {q ? (
            <Button variant="ghost" size="sm" className="h-9 text-xs px-2.5" asChild>
              <Link href="/credentials">
                <X className="size-3.5" />
              </Link>
            </Button>
          ) : null}
        </form>
      </div>

      {pageRows.length ? (
        <>
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {pageRows.map(cred => (
              <Link
                key={cred.id}
                href={`/resources/${cred.resourceId}`}
                className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9.5 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30">
                    <KeyRound className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {cred.name}
                      </h3>
                      <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                        {typeLabels[cred.type] ?? cred.type}
                      </span>
                    </div>

                    {cred.username ? (
                      <p className="mt-1 flex items-center gap-1 text-xs font-mono text-muted-foreground">
                        <User className="size-3" />
                        <span className="truncate">{cred.username}</span>
                      </p>
                    ) : null}

                    <p className="mt-2 truncate text-xs text-primary/80 font-medium">
                      所属模块: {cred.resourceName}
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  <span>点击进入模块解密查看</span>
                  <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
          <Pagination
            pathname="/credentials"
            currentPage={currentPage}
            pageSize={pageSize}
            total={total}
            query={{ ...(q ? { q } : {}) }}
          />
        </>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center">
          <FolderKey className="size-8 text-muted-foreground/60 mb-2" />
          <h2 className="text-base font-bold text-foreground">{q ? "没有匹配的凭据" : "暂无可访问的账号凭据"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {q ? "尝试更换搜索词" : "在模块详情页中添加账号密码或向管理员申请对应模块权限"}
          </p>
        </div>
      )}
    </div>
  )
}

