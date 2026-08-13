import { and, desc, eq, isNull } from "drizzle-orm"
import { ResourceCard } from "@/components/resource/resource-card"
import { db } from "@/lib/db"
import { resources } from "@/lib/db/schema"
import { canViewResource } from "@/lib/permission"

export default async function FavoritesPage() {
  const rows = await db.query.resources.findMany({ where: and(eq(resources.isFavorite, true), isNull(resources.deletedAt)), orderBy: [desc(resources.updatedAt)] })
  const visible = (await Promise.all(rows.map(async resource => ({ resource, allowed: await canViewResource(resource.id) })))).filter(item => item.allowed).map(item => item.resource)
  return <div className="mx-auto max-w-7xl px-4 py-8 md:px-8"><h1 className="text-2xl font-semibold">收藏</h1>{visible.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(resource => <ResourceCard key={resource.id} resource={resource} />)}</div> : null}</div>
}
