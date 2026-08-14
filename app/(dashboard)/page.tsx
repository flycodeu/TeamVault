import { and, count, desc, eq, inArray } from "drizzle-orm"
import { Boxes, FileText, Heart, KeyRound, Plus } from "lucide-react"
import Link from "next/link"

import { ResourceCard } from "@/components/resource/resource-card"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { credentials, files, resourceFavorites, resources } from "@/lib/db/schema"
import { canViewCredential, listPermittedResourceIds } from "@/lib/permission"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const [viewIds, fileIds] = await Promise.all([listPermittedResourceIds("VIEW"), listPermittedResourceIds("VIEW_FILE")])
  const credentialRows = viewIds.length ? await db.query.credentials.findMany({ where: inArray(credentials.resourceId, viewIds) }) : []
  const visibleCredentials = (await Promise.all(credentialRows.map(async credential => ({ credential, allowed: await canViewCredential(credential.id) })))).filter(item => item.allowed)
  const [[resourceCount], [fileCount], favoriteRows, recentResources] = await Promise.all([
    viewIds.length ? db.select({ value: count() }).from(resources).where(inArray(resources.id, viewIds)) : Promise.resolve([{ value: 0 }]),
    fileIds.length ? db.select({ value: count() }).from(files).where(inArray(files.resourceId, fileIds)) : Promise.resolve([{ value: 0 }]),
    user && viewIds.length ? db.select({ resourceId: resourceFavorites.resourceId }).from(resourceFavorites).where(and(eq(resourceFavorites.userId, user.id), inArray(resourceFavorites.resourceId, viewIds))) : [],
    viewIds.length ? db.query.resources.findMany({ where: inArray(resources.id, viewIds), orderBy: [desc(resources.updatedAt)], limit: 3 }) : [],
  ])
  const favoriteIds = new Set(favoriteRows.map(row => row.resourceId))
  const metrics = [
    { label: "模块", value: resourceCount.value, icon: Boxes },
    { label: "文件", value: fileCount.value, icon: FileText },
    { label: "凭据", value: visibleCredentials.length, icon: KeyRound },
    { label: "收藏", value: favoriteRows.length, icon: Heart },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 md:px-8 md:py-9">
      <div className="flex items-center justify-between gap-4"><h1 className="text-2xl font-semibold">你好，{user?.displayName}</h1><Button asChild><Link href="/resources/new"><Plus />新建模块</Link></Button></div>
      <section className="mt-7 grid gap-px overflow-hidden rounded-lg border bg-border grid-cols-2 xl:grid-cols-4" aria-label="工作区统计">{metrics.map(metric => <div key={metric.label} className="bg-card p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{metric.label}</span><metric.icon className="size-4 text-muted-foreground" /></div><p className="mt-4 text-3xl font-semibold tabular-nums">{metric.value}</p></div>)}</section>
      {recentResources.length ? <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">最近更新</h2><Button variant="ghost" size="sm" asChild><Link href="/resources">查看全部</Link></Button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{recentResources.map(resource => <ResourceCard key={resource.id} resource={resource} isFavorite={favoriteIds.has(resource.id)} mayDelete={Boolean(user?.isAdmin || user?.id === resource.ownerId)} />)}</div></section> : null}
    </div>
  )
}
