import { and, desc, eq, inArray, like, or } from "drizzle-orm"
import { Heart, Plus, Search, X } from "lucide-react"
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

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const [user, permittedIds, query] = await Promise.all([
    getCurrentUser(),
    listPermittedResourceIds("VIEW"),
    searchParams,
  ])
  const q = query.q?.trim() ?? ""
  const requestedPage = Number.parseInt(query.page ?? "1", 10)

  const searchFilter = q
    ? or(
        like(resources.name, `%${q}%`),
        like(resources.category, `%${q}%`),
        like(resources.description, `%${q}%`),
        like(resources.url, `%${q}%`),
      )
    : undefined

  const where =
    user && permittedIds.length
      ? and(
          eq(resourceFavorites.userId, user.id),
          inArray(resourceFavorites.resourceId, permittedIds),
          searchFilter,
        )
      : undefined

  const allFavorites = where
    ? await db
        .select({
          resource: resources,
          favoritedAt: resourceFavorites.createdAt,
        })
        .from(resourceFavorites)
        .innerJoin(resources, eq(resourceFavorites.resourceId, resources.id))
        .where(where)
        .orderBy(desc(resourceFavorites.createdAt))
    : []

  const total = allFavorites.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages)
  const pageRows = allFavorites.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">我的收藏</h1>
          <span className="rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-300 px-2.5 py-0.5 text-xs font-semibold">
            {total}
          </span>
        </div>
        <Button asChild className="h-9 gap-1.5 font-medium shadow-xs shrink-0">
          <Link href="/resources">
            <Plus className="size-4" />
            <span>浏览并添加收藏</span>
          </Link>
        </Button>
      </div>

      <form className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder="搜索收藏的名称、分类或说明..."
            className="h-9 border-border/80 bg-card pl-9 text-xs shadow-xs"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9 text-xs font-medium">
          搜索
        </Button>
        {q ? (
          <Button variant="ghost" size="sm" className="h-9 text-xs" asChild>
            <Link href="/favorites">
              <X className="size-3.5 mr-1" /> 清除
            </Link>
          </Button>
        ) : null}
      </form>

      {pageRows.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pageRows.map(({ resource }) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                isFavorite
                mayDelete={Boolean(user?.isAdmin || user?.id === resource.ownerId)}
              />
            ))}
          </div>
          <Pagination
            pathname="/favorites"
            currentPage={currentPage}
            pageSize={pageSize}
            total={total}
            query={{ ...(q ? { q } : {}) }}
          />
        </>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-3">
            <Heart className="size-6" />
          </span>
          <h2 className="text-base font-bold text-foreground">{q ? "没有找到匹配的收藏" : "暂无收藏内容"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {q ? "尝试更换搜索词" : "点击任何模块或网站卡片右上角的心形按钮即可收藏到这里"}
          </p>
          <Button asChild className="mt-5 h-8.5 text-xs font-medium" size="sm">
            <Link href="/resources">浏览全部模块</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

