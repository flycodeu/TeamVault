import { and, count, desc, eq, inArray, isNull, like, or } from "drizzle-orm"
import {
  BookOpen,
  Boxes,
  FolderKanban,
  Globe2,
  Plus,
  Search,
  UserRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { ResourceCard } from "@/components/resource/resource-card"
import { WebsiteCard } from "@/components/website/website-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { credentials, files, resourceFavorites, resourceLinks, resources, type Resource } from "@/lib/db/schema"
import { canViewCredential, canViewFile, listPermittedResourceIds } from "@/lib/permission"
import { cn } from "@/lib/utils"

const pageSize = 12

const kindTabs: Array<{ key: string; label: string; icon: LucideIcon }> = [
  { key: "ALL", label: "全部资产", icon: Boxes },
  { key: "WEBSITE", label: "网站系统", icon: Globe2 },
  { key: "PROJECT", label: "项目", icon: FolderKanban },
  { key: "TOOL", label: "工具 / 系统", icon: Wrench },
  { key: "KNOWLEDGE", label: "知识 / 文档", icon: BookOpen },
  { key: "PERSONAL", label: "个人空间", icon: UserRound },
  { key: "OTHER", label: "其他", icon: Boxes },
]

function countByResource(rows: { resourceId: string }[]) {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.resourceId, (counts.get(row.resourceId) ?? 0) + 1)
  return counts
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; kind?: string }>
}) {
  const [currentUser, permittedIds, query] = await Promise.all([
    getCurrentUser(),
    listPermittedResourceIds("VIEW"),
    searchParams,
  ])
  const q = query.q?.trim() ?? ""
  const currentKind = query.kind?.trim() || "ALL"
  const requestedPage = Number.parseInt(query.page ?? "1", 10)

  const search = q
    ? or(
        like(resources.name, `%${q}%`),
        like(resources.category, `%${q}%`),
        like(resources.description, `%${q}%`),
        like(resources.tags, `%${q}%`),
      )
    : undefined

  const kindFilter =
    currentKind !== "ALL"
      ? eq(resources.moduleKind, currentKind as Resource["moduleKind"])
      : undefined

  const where = permittedIds.length
    ? and(
        inArray(resources.id, permittedIds),
        eq(resources.status, "ACTIVE"),
        isNull(resources.deletedAt),
        kindFilter,
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

  const pageIds = rows.map(resource => resource.id)
  const fileAccess = new Map(
    await Promise.all(rows.map(async resource => [resource.id, await canViewFile(resource.id)] as const)),
  )
  const fileResourceIds = pageIds.filter(resourceId => fileAccess.get(resourceId))

  const [links, credentialRows, fileRows, favoriteRows] = pageIds.length
    ? await Promise.all([
        db.query.resourceLinks.findMany({ where: inArray(resourceLinks.resourceId, pageIds) }),
        db.query.credentials.findMany({ where: inArray(credentials.resourceId, pageIds) }),
        fileResourceIds.length ? db.query.files.findMany({ where: inArray(files.resourceId, fileResourceIds) }) : [],
        currentUser
          ? db
              .select({ resourceId: resourceFavorites.resourceId })
              .from(resourceFavorites)
              .where(
                and(
                  eq(resourceFavorites.userId, currentUser.id),
                  inArray(resourceFavorites.resourceId, pageIds),
                ),
              )
          : [],
      ])
    : [[], [], [], []]

  const visibleCredentials = (
    await Promise.all(
      credentialRows.map(async credential => ({
        credential,
        allowed: await canViewCredential(credential.id),
      })),
    )
  )
    .filter(item => item.allowed)
    .map(item => item.credential)

  const linkCounts = countByResource(links)
  const credentialCounts = countByResource(visibleCredentials)
  const fileCounts = countByResource(fileRows)
  const favoriteIds = new Set(favoriteRows.map(row => row.resourceId))

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      {/* Compact Header & Filter Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: Kind Pills & Total Badge */}
        <div className="flex items-center gap-3">
          <div className="flex overflow-x-auto gap-1.5 pb-1 md:pb-0 scrollbar-none">
            {kindTabs.map(tab => {
              const Icon = tab.icon
              const active = currentKind === tab.key
              return (
                <Link
                  key={tab.key}
                  href={`/resources?${new URLSearchParams({
                    ...(tab.key !== "ALL" ? { kind: tab.key } : {}),
                    ...(q ? { q } : {}),
                  }).toString()}`}
                  className={cn(
                    "inline-flex h-8.5 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition duration-150 border",
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card text-muted-foreground border-border/80 hover:bg-accent/40 hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                </Link>
              )
            })}
          </div>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground shrink-0 hidden sm:inline-block">
            共 {total} 项
          </span>
        </div>

        {/* Right: Search Input Form & New Button */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <form className="flex gap-2 flex-1 md:w-[320px]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="搜索模块名称、分类或标签..."
                className="h-9 border-border/80 bg-card pl-9 text-xs shadow-xs w-full"
              />
              {currentKind !== "ALL" ? <input type="hidden" name="kind" value={currentKind} /> : null}
            </div>
            {q ? (
              <Button variant="ghost" size="sm" className="h-9 text-xs px-2.5" asChild>
                <Link href={currentKind !== "ALL" ? `/resources?kind=${currentKind}` : "/resources"}>
                  <X className="size-3.5" />
                </Link>
              </Button>
            ) : null}
          </form>

          <div className="h-4 w-[1px] bg-border mx-1 hidden sm:block"></div>

          <Button asChild className="h-9 gap-1.5 font-medium shadow-xs shrink-0">
            <Link href={currentKind === "WEBSITE" ? "/websites/new" : "/resources/new"}>
              <Plus className="size-4" />
              <span className="hidden sm:inline-block">{currentKind === "WEBSITE" ? "新建网站" : "新建资源"}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid or Empty State */}
      {rows.length ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5 md:gap-6">
            {rows.map(resource => {
              const mayDelete = Boolean(currentUser?.isAdmin || currentUser?.id === resource.ownerId)
              const isFavorite = favoriteIds.has(resource.id)

              if (resource.moduleKind === "WEBSITE") {
                const websCeds = visibleCredentials.filter(c => c.resourceId === resource.id)
                return (
                  <div key={resource.id}>
                    <WebsiteCard
                      website={{ ...resource, credentials: websCeds }}
                      mayDelete={mayDelete}
                      isFavorite={isFavorite}
                    />
                  </div>
                )
              }

              return (
                <div key={resource.id}>
                  <ResourceCard
                    resource={resource}
                    mayDelete={mayDelete}
                    isFavorite={isFavorite}
                    counts={{
                      links: linkCounts.get(resource.id) ?? 0,
                      credentials: credentialCounts.get(resource.id) ?? 0,
                      files: fileCounts.get(resource.id) ?? 0,
                    }}
                  />
                </div>
              )
            })}
          </div>
          <Pagination
            pathname="/resources"
            currentPage={currentPage}
            pageSize={pageSize}
            total={total}
            query={{ ...(q ? { q } : {}), ...(currentKind !== "ALL" ? { kind: currentKind } : {}) }}
          />
        </>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center">
          <Boxes className="size-8 text-muted-foreground/60 mb-2" />
          <h2 className="text-base font-bold text-foreground">{q ? "没有找到匹配的模块" : "暂无共享模块"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {q ? "尝试更换搜索关键词或切换上方模块类型筛选" : "创建团队第一个共享模块，整理项目、工具与相关文件"}
          </p>
          {!q ? (
            <Button asChild className="mt-5 h-8.5 text-xs font-medium" size="sm">
              <Link href={currentKind === "WEBSITE" ? "/websites/new" : "/resources/new"}>
                <Plus className="size-3.5 mr-1" /> {currentKind === "WEBSITE" ? "新建网站" : "新建资源"}
              </Link>
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

