import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import { Heart, Plus } from "lucide-react"
import Link from "next/link"

import { ResourceCard } from "@/components/resource/resource-card"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { resourceFavorites, resources } from "@/lib/db/schema"
import { canViewResource } from "@/lib/permission"

export default async function FavoritesPage() {
  const user = await getCurrentUser()
  const favoriteRows = user ? await db.select({ resourceId: resourceFavorites.resourceId }).from(resourceFavorites).where(eq(resourceFavorites.userId, user.id)).orderBy(desc(resourceFavorites.createdAt)) : []
  const rows = favoriteRows.length ? await db.query.resources.findMany({ where: and(inArray(resources.id, favoriteRows.map(row => row.resourceId)), isNull(resources.deletedAt)) }) : []
  const visible = (await Promise.all(rows.map(async resource => ({ resource, allowed: await canViewResource(resource.id) })))).filter(item => item.allowed).map(item => item.resource)
  const order = new Map(favoriteRows.map((row, index) => [row.resourceId, index]))
  visible.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-7">
      <div className="flex items-center justify-between gap-4"><h1 className="text-2xl font-semibold tracking-tight">收藏</h1><Button asChild><Link href="/resources"><Plus />添加收藏</Link></Button></div>
      {visible.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map(resource => <ResourceCard key={resource.id} resource={resource} isFavorite mayDelete={Boolean(user?.isAdmin || user?.id === resource.ownerId)} />)}</div> : <div className="mt-7 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 text-center"><span className="grid size-12 place-items-center rounded-full bg-accent text-primary"><Heart className="size-5" /></span><h2 className="mt-4 text-sm font-semibold">还没有收藏</h2><p className="mt-1 text-xs text-muted-foreground">在模块或网站卡片上点击心形按钮，即可固定到这里。</p><Button asChild className="mt-5" size="sm"><Link href="/resources">浏览内容</Link></Button></div>}
    </div>
  )
}
