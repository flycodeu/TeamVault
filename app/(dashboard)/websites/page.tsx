import { and, count, desc, eq, inArray, isNull, like, or } from "drizzle-orm"
import { Globe2, Plus, Search, X } from "lucide-react"
import Link from "next/link"

import { ResourceCard } from "@/components/resource/resource-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { resourceFavorites, resources } from "@/lib/db/schema"
import { listPermittedResourceIds } from "@/lib/permission"

const pageSize = 18

export default async function WebsitesPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const [currentUser, permittedIds, query] = await Promise.all([getCurrentUser(), listPermittedResourceIds("VIEW"), searchParams])
  const q = query.q?.trim() ?? ""
  const requestedPage = Number.parseInt(query.page ?? "1", 10)
  const search = q ? or(like(resources.name, `%${q}%`), like(resources.url, `%${q}%`), like(resources.description, `%${q}%`)) : undefined
  const where = permittedIds.length ? and(inArray(resources.id, permittedIds), eq(resources.moduleKind, "WEBSITE"), eq(resources.status, "ACTIVE"), isNull(resources.deletedAt), search) : undefined
  const [{ value: total }] = where ? await db.select({ value: count() }).from(resources).where(where) : [{ value: 0 }]
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages)
  const rows = where ? await db.query.resources.findMany({ where, orderBy: [desc(resources.updatedAt)], limit: pageSize, offset: (currentPage - 1) * pageSize }) : []
  const favoriteRows = currentUser && rows.length ? await db.select({ resourceId: resourceFavorites.resourceId }).from(resourceFavorites).where(and(eq(resourceFavorites.userId, currentUser.id), inArray(resourceFavorites.resourceId, rows.map(resource => resource.id)))) : []
  const favoriteIds = new Set(favoriteRows.map(row => row.resourceId))

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">常用网站</h1>
          <span className="rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2.5 py-0.5 text-xs font-semibold">
            {total}
          </span>
        </div>
        <Button asChild className="h-9 gap-1.5 font-medium shadow-xs shrink-0">
          <Link href="/websites/new">
            <Plus className="size-4" />
            <span>新增网站</span>
          </Link>
        </Button>
      </div>

      <form className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="搜索网站名称、网址 (URL) 或备注说明..."
            className="h-9 border-border/80 bg-card pl-9 text-xs shadow-xs"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9 text-xs font-medium">
          搜索
        </Button>
        {q ? (
          <Button variant="ghost" size="sm" className="h-9 text-xs" asChild>
            <Link href="/websites">
              <X className="size-3.5 mr-1" /> 清除
            </Link>
          </Button>
        ) : null}
      </form>

      {rows.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(resource => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                mayDelete={Boolean(currentUser?.isAdmin || currentUser?.id === resource.ownerId)}
                isFavorite={favoriteIds.has(resource.id)}
              />
            ))}
          </div>
          <Pagination pathname="/websites" currentPage={currentPage} pageSize={pageSize} total={total} query={{ q }} />
        </>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center">
          <Globe2 className="size-8 text-muted-foreground/60 mb-2" />
          <h2 className="text-base font-bold text-foreground">{q ? "没有匹配的网站" : "还没有添加网站"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {q ? "尝试更换搜索词" : "添加常用的开发系统、运维平台或业务工具网站"}
          </p>
          {!q ? (
            <Button asChild className="mt-5 h-8.5 text-xs font-medium" size="sm">
              <Link href="/websites/new">
                <Plus className="size-3.5 mr-1" /> 新增网站
              </Link>
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

