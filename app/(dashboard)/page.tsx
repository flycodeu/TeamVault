import { and, count, desc, eq, inArray, isNull } from "drizzle-orm"
import {
  ArrowRight,
  Boxes,
  FileText,
  FolderKey,
  Globe2,
  Heart,
  Plus,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

import { ResourceCard } from "@/components/resource/resource-card"
import { WebsiteCard } from "@/components/website/website-card"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { credentials, files, resourceFavorites, resourceLinks, resources } from "@/lib/db/schema"
import { canViewCredential, canViewFile, listPermittedCredentialIds, listPermittedResourceIds } from "@/lib/permission"
import { cn } from "@/lib/utils"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const [viewIds, fileIds, credentialIds] = await Promise.all([
    listPermittedResourceIds("VIEW"),
    listPermittedResourceIds("VIEW_FILE"),
    listPermittedCredentialIds(),
  ])

  const [
    [resourceCount],
    [websiteCount],
    [fileCount],
    favoriteRows,
    recentResources,
  ] = await Promise.all([
    viewIds.length
      ? db
          .select({ value: count() })
          .from(resources)
          .where(and(inArray(resources.id, viewIds), isNull(resources.deletedAt)))
      : Promise.resolve([{ value: 0 }]),
    viewIds.length
      ? db
          .select({ value: count() })
          .from(resources)
          .where(and(inArray(resources.id, viewIds), eq(resources.moduleKind, "WEBSITE"), isNull(resources.deletedAt)))
      : Promise.resolve([{ value: 0 }]),
    fileIds.length
      ? db.select({ value: count() }).from(files).where(inArray(files.resourceId, fileIds))
      : Promise.resolve([{ value: 0 }]),
    user && viewIds.length
      ? db
          .select({ resourceId: resourceFavorites.resourceId })
          .from(resourceFavorites)
          .where(and(eq(resourceFavorites.userId, user.id), inArray(resourceFavorites.resourceId, viewIds)))
      : [],
    viewIds.length
      ? db.query.resources.findMany({
          where: and(inArray(resources.id, viewIds), isNull(resources.deletedAt)),
          orderBy: [desc(resources.updatedAt)],
          limit: 12,
        })
      : [],
  ])

  const favoriteIds = new Set(favoriteRows.map(row => row.resourceId))

  // Fetch count stats for recent resources
  const recentIds = recentResources.map(r => r.id)
  const fileAccess = new Map(await Promise.all(recentResources.map(async r => [r.id, await canViewFile(r.id)] as const)))
  const fileResourceIds = recentIds.filter(id => fileAccess.get(id))

  const [recentLinks, recentCreds, recentFileRows] = recentIds.length
    ? await Promise.all([
        db.query.resourceLinks.findMany({ where: inArray(resourceLinks.resourceId, recentIds) }),
        db.query.credentials.findMany({ where: inArray(credentials.resourceId, recentIds) }),
        fileResourceIds.length ? db.query.files.findMany({ where: inArray(files.resourceId, fileResourceIds) }) : [],
      ])
    : [[], [], []]

  const visibleCredentials = (
    await Promise.all(recentCreds.map(async c => ({ cred: c, allowed: await canViewCredential(c.id) })))
  )
    .filter(i => i.allowed)
    .map(i => i.cred)

  const linkCounts = new Map<string, number>()
  for (const l of recentLinks) linkCounts.set(l.resourceId, (linkCounts.get(l.resourceId) ?? 0) + 1)
  const credCounts = new Map<string, number>()
  for (const c of visibleCredentials) credCounts.set(c.resourceId, (credCounts.get(c.resourceId) ?? 0) + 1)
  const fCounts = new Map<string, number>()
  for (const f of recentFileRows) fCounts.set(f.resourceId, (fCounts.get(f.resourceId) ?? 0) + 1)

  const metrics = [
    {
      label: "全部资产",
      value: resourceCount.value,
      href: "/resources",
      icon: Boxes,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 border-blue-200/50 dark:border-blue-900/30",
    },
    {
      label: "网站系统",
      value: websiteCount.value,
      href: "/resources?kind=WEBSITE",
      icon: Globe2,
      color: "text-teal-600 dark:text-teal-400",
      bg: "bg-teal-500/10 border-teal-200/50 dark:border-teal-900/30",
    },
    {
      label: "文件资料",
      value: fileCount.value,
      href: "/files",
      icon: FileText,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-900/30",
    },
    {
      label: "账号凭据",
      value: credentialIds.length,
      href: "/credentials",
      icon: FolderKey,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 border-amber-200/50 dark:border-amber-900/30",
    },
    {
      label: "我的收藏",
      value: favoriteRows.length,
      href: "/favorites",
      icon: Heart,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10 border-rose-200/50 dark:border-rose-900/30",
    },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/30 to-background p-6 md:p-7 shadow-xs">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <Sparkles className="size-4" />
              <span>TeamVault 团队工作空间</span>
            </div>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              你好，{user?.displayName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 font-medium" asChild>
              <Link href="/websites/new">
                <Globe2 className="size-4" />
                <span>新增网站</span>
              </Link>
            </Button>
            <Button size="sm" className="h-9 gap-1.5 font-medium shadow-xs" asChild>
              <Link href="/resources/new">
                <Plus className="size-4" />
                <span>新建模块</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <section aria-label="工作区统计">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map(metric => {
            const Icon = metric.icon
            return (
              <Link
                key={metric.label}
                href={metric.href}
                className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4.5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                    {metric.label}
                  </span>
                  <span className={cn("grid size-8 place-items-center rounded-lg border", metric.bg, metric.color)}>
                    <Icon className="size-4" />
                  </span>
                </div>
                <div className="mt-4 flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
                    {metric.value}
                  </span>
                  <span className="text-[11px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-0.5 font-medium">
                    查看 <ArrowRight className="size-3" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="flex flex-col gap-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-foreground">最近更新资产</h2>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground" asChild>
              <Link href="/resources">
                <span>全部资源</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {recentResources.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recentResources.map(resource => {
                const isFavorite = favoriteIds.has(resource.id)
                const mayDelete = Boolean(user?.isAdmin || user?.id === resource.ownerId)

                if (resource.moduleKind === "WEBSITE") {
                  const websCeds = visibleCredentials.filter(c => c.resourceId === resource.id)
                  return (
                    <WebsiteCard
                      key={resource.id}
                      website={{ ...resource, credentials: websCeds }}
                      mayDelete={mayDelete}
                      isFavorite={isFavorite}
                    />
                  )
                }

                return (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    isFavorite={isFavorite}
                    mayDelete={mayDelete}
                    counts={{
                      links: linkCounts.get(resource.id) ?? 0,
                      credentials: credCounts.get(resource.id) ?? 0,
                      files: fCounts.get(resource.id) ?? 0,
                    }}
                  />
                )
              })}
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed bg-card p-6 text-center">
              <Boxes className="size-8 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-semibold text-foreground">还没有资产记录</p>
              <Button asChild className="mt-4 h-8 text-xs font-medium" size="sm">
                <Link href="/resources/new">新建资源</Link>
              </Button>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

