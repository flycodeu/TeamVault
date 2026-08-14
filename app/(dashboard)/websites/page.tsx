import { and, count, desc, eq, inArray, isNull, like, or } from "drizzle-orm"
import { Globe2, Search, X } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import {
  WebsiteListView,
} from "@/components/website/website-list-view"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { credentials, resourceFavorites, resources } from "@/lib/db/schema"
import { canViewCredential, listPermittedResourceIds } from "@/lib/permission"

const pageSize = 18

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const [currentUser, permittedIds, query] = await Promise.all([
    getCurrentUser(),
    listPermittedResourceIds("VIEW"),
    searchParams,
  ])
  const q = query.q?.trim() ?? ""
  const requestedPage = Number.parseInt(query.page ?? "1", 10)
  const search = q
    ? or(
        like(resources.name, `%${q}%`),
        like(resources.url, `%${q}%`),
        like(resources.category, `%${q}%`),
        like(resources.description, `%${q}%`),
      )
    : undefined

  const where = permittedIds.length
    ? and(
        inArray(resources.id, permittedIds),
        eq(resources.moduleKind, "WEBSITE"),
        eq(resources.status, "ACTIVE"),
        isNull(resources.deletedAt),
        search,
      )
    : undefined

  const [{ value: total }] = where
    ? await db.select({ value: count() }).from(resources).where(where)
    : [{ value: 0 }]
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages)
  const rows = where
    ? await db.query.resources.findMany({
        where,
        orderBy: [desc(resources.updatedAt)],
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      })
    : []

  const favoriteRows =
    currentUser && rows.length
      ? await db
          .select({ resourceId: resourceFavorites.resourceId })
          .from(resourceFavorites)
          .where(
            and(
              eq(resourceFavorites.userId, currentUser.id),
              inArray(
                resourceFavorites.resourceId,
                rows.map(resource => resource.id),
              ),
            ),
          )
      : []
  const favoriteIds = favoriteRows.map(row => row.resourceId)

  // Fetch associated credentials for the websites
  const websiteIds = rows.map(r => r.id)
  const allWebCredentials = websiteIds.length
    ? await db.query.credentials.findMany({
        where: inArray(credentials.resourceId, websiteIds),
      })
    : []

  // Check visibility for each credential
  const permittedCredMap = new Map<string, typeof allWebCredentials>()
  for (const cred of allWebCredentials) {
    const allowed = currentUser?.isAdmin || (await canViewCredential(cred.id))
    if (allowed) {
      const list = permittedCredMap.get(cred.resourceId) || []
      list.push(cred)
      permittedCredMap.set(cred.resourceId, list)
    }
  }

  const websitesWithCredentials = rows.map(row => ({
    ...row,
    credentials: permittedCredMap.get(row.id) || [],
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-6 space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Globe2 className="size-5" />
          </span>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              常用网站
            </h1>
            <span className="rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2 py-0.2 text-xs font-semibold">
              {total}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <form className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="搜索网站、网址 (URL)、分类或备注..."
            className="h-8.5 border-border/80 bg-card pl-8.5 text-xs shadow-xs"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-8.5 text-xs font-medium">
          搜索
        </Button>
        {q ? (
          <Button variant="ghost" size="sm" className="h-8.5 text-xs" asChild>
            <Link href="/websites">
              <X className="size-3.5 mr-1" /> 清除
            </Link>
          </Button>
        ) : null}
      </form>

      {/* Website List View with Grid / Dense Table Toggle & Batch Import */}
      {rows.length ? (
        <>
          <WebsiteListView
            websites={websitesWithCredentials}
            favoriteIds={favoriteIds}
            currentUserId={currentUser?.id}
            isAdmin={Boolean(currentUser?.isAdmin)}
          />
          <Pagination
            pathname="/websites"
            currentPage={currentPage}
            pageSize={pageSize}
            total={total}
            query={{ q }}
          />
        </>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center">
          <Globe2 className="size-8 text-muted-foreground/60 mb-2" />
          <h2 className="text-base font-bold text-foreground">
            {q ? "没有匹配的网站" : "还没有添加常用网站"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {q ? "尝试更换搜索词或清除过滤条件" : "支持批量导入或单个添加研发、运维与业务系统网站"}
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            <WebsiteListView
              websites={[]}
              favoriteIds={[]}
              currentUserId={currentUser?.id}
              isAdmin={Boolean(currentUser?.isAdmin)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
