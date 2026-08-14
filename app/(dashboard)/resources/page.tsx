import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import { Boxes, Plus, Search } from "lucide-react"
import Link from "next/link"

import { ResourceCard } from "@/components/resource/resource-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { credentials, files, resourceFavorites, resourceLinks, resources } from "@/lib/db/schema"
import { canViewCredential, canViewFile, canViewResource } from "@/lib/permission"

const kinds = [["", "全部场景"], ["PROJECT", "项目"], ["TOOL", "工具 / 系统"], ["KNOWLEDGE", "知识 / 文档"], ["WEBSITE", "独立网站"], ["PERSONAL", "个人"], ["OTHER", "其他"]]

function countByResource(rows: { resourceId: string }[]) {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row.resourceId, (counts.get(row.resourceId) ?? 0) + 1)
  return counts
}

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const currentUser = await getCurrentUser()
  const query = await searchParams
  const q = query.q?.trim() ?? ""
  const kind = query.kind ?? ""
  const conditions = [eq(resources.status, "ACTIVE"), isNull(resources.deletedAt)]
  if (kind) conditions.push(eq(resources.moduleKind, kind as typeof resources.moduleKind.enumValues[number]))
  const rows = await db.query.resources.findMany({ where: and(...conditions), orderBy: [desc(resources.updatedAt)] })
  const permitted = (await Promise.all(rows.map(async resource => ({ resource, allowed: await canViewResource(resource.id) })))).filter(item => item.allowed).map(item => item.resource)
  const normalizedQuery = q.toLowerCase()
  const filtered = q ? permitted.filter(resource => [resource.name, resource.url, resource.description, resource.tags].some(value => value?.toLowerCase().includes(normalizedQuery))) : permitted
  const permittedIds = permitted.map(resource => resource.id)
  const fileAccess = new Map((await Promise.all(permitted.map(async resource => [resource.id, await canViewFile(resource.id)] as const))))
  const fileResourceIds = permittedIds.filter(resourceId => fileAccess.get(resourceId))
  const [links, credentialRows, fileRows, favoriteRows] = permittedIds.length ? await Promise.all([
    db.query.resourceLinks.findMany({ where: inArray(resourceLinks.resourceId, permittedIds) }),
    db.query.credentials.findMany({ where: inArray(credentials.resourceId, permittedIds) }),
    fileResourceIds.length ? db.query.files.findMany({ where: inArray(files.resourceId, fileResourceIds) }) : [],
    currentUser ? db.select({ resourceId: resourceFavorites.resourceId }).from(resourceFavorites).where(and(eq(resourceFavorites.userId, currentUser.id), inArray(resourceFavorites.resourceId, permittedIds))) : [],
  ]) : [[], [], [], []]
  const visibleCredentialRows = (await Promise.all(credentialRows.map(async credential => ({ credential, allowed: await canViewCredential(credential.id) })))).filter(item => item.allowed).map(item => item.credential)
  const linkCounts = countByResource(links)
  const credentialCounts = countByResource(visibleCredentialRows)
  const fileCounts = countByResource(fileRows)
  const favoriteIds = new Set(favoriteRows.map(row => row.resourceId))
  const sections = kind ? [{ key: kind, label: "", items: filtered }] : [
    { key: "websites", label: "独立网站", items: filtered.filter(resource => resource.moduleKind === "WEBSITE") },
    { key: "modules", label: "业务模块", items: filtered.filter(resource => resource.moduleKind !== "WEBSITE") },
  ].filter(section => section.items.length)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-7">
      <div className="flex items-center justify-between gap-4"><h1 className="text-2xl font-semibold tracking-tight">模块与网站</h1><Button asChild><Link href="/resources/new"><Plus />新建内容</Link></Button></div>
      <form className="mt-5 flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)] md:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={q} placeholder="搜索名称、网址、说明或标签" className="border-0 bg-transparent pl-9 shadow-none" /></div><select name="kind" defaultValue={kind} className="h-10 rounded-lg border bg-background px-3 text-sm md:w-44">{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Button type="submit" variant="outline">筛选</Button></form>
      {filtered.length ? <div className="mt-6 space-y-7">{sections.map(section => <section key={section.key}>{section.label ? <div className="mb-3 flex items-center justify-between border-b pb-2"><h2 className="text-sm font-semibold">{section.label}</h2><span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{section.items.length}</span></div> : null}<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{section.items.map(resource => <ResourceCard key={resource.id} resource={resource} mayDelete={Boolean(currentUser?.isAdmin || currentUser?.id === resource.ownerId)} isFavorite={favoriteIds.has(resource.id)} counts={{ links: linkCounts.get(resource.id) ?? 0, credentials: credentialCounts.get(resource.id) ?? 0, files: fileCounts.get(resource.id) ?? 0 }} />)}</div></section>)}</div> : <div className="mt-7 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 text-center"><Boxes className="size-6 text-muted-foreground" /><h2 className="mt-3 text-sm font-semibold">{q || kind ? "没有匹配的内容" : "还没有内容"}</h2>{!q && !kind ? <Button asChild className="mt-4" size="sm"><Link href="/resources/new"><Plus />新建</Link></Button> : null}</div>}
    </div>
  )
}
