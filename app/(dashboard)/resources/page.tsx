import { and, desc, eq, isNull } from "drizzle-orm"
import { Boxes, Plus, Search } from "lucide-react"
import Link from "next/link"

import { ResourceCard } from "@/components/resource/resource-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { resources } from "@/lib/db/schema"
import { canViewCredential, canViewFile, canViewResource } from "@/lib/permission"

const kinds = [["", "全部场景"], ["PROJECT", "项目"], ["TOOL", "工具 / 系统"], ["KNOWLEDGE", "知识 / 文档"], ["WEBSITE", "独立网站"], ["PERSONAL", "个人"], ["OTHER", "其他"]]

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string }> }) {
  const currentUser = await getCurrentUser()
  const query = await searchParams
  const q = query.q?.trim() ?? ""
  const kind = query.kind ?? ""
  const conditions = [eq(resources.status, "ACTIVE"), isNull(resources.deletedAt)]
  if (kind) conditions.push(eq(resources.moduleKind, kind as typeof resources.moduleKind.enumValues[number]))
  const rows = await db.query.resources.findMany({ where: and(...conditions), orderBy: [desc(resources.updatedAt)] })
  const permitted = (await Promise.all(rows.map(async resource => ({ resource, allowed: await canViewResource(resource.id) })))).filter(item => item.allowed).map(item => item.resource)
  const filtered = q ? permitted.filter(resource => [resource.name, resource.description, resource.tags].some(value => value?.toLowerCase().includes(q.toLowerCase()))) : permitted
  const [links, credentials, files] = await Promise.all([db.query.resourceLinks.findMany(), db.query.credentials.findMany(), db.query.files.findMany()])
  const visibleCredentialIds = new Set((await Promise.all(credentials.map(async credential => ({ id: credential.id, allowed: await canViewCredential(credential.id) })))).filter(item => item.allowed).map(item => item.id))
  const fileAccess = new Map((await Promise.all(permitted.map(async resource => [resource.id, await canViewFile(resource.id)] as const))))

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 md:px-8 md:py-9">
      <div className="flex items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold">模块</h1><p className="mt-1 text-sm text-muted-foreground">集中管理项目资料，也可以直接保存不属于任何项目的网站地址。</p></div><Button asChild><Link href="/resources/new"><Plus />新建</Link></Button></div>
      <form className="mt-6 flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={q} placeholder="搜索模块" className="pl-9" /></div><select name="kind" defaultValue={kind} className="h-10 rounded-md border bg-background px-3 text-sm md:w-44">{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Button type="submit" variant="outline">筛选</Button></form>
      {filtered.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(resource => <ResourceCard key={resource.id} resource={resource} mayDelete={Boolean(currentUser?.isAdmin || currentUser?.id === resource.ownerId)} counts={{ links: links.filter(link => link.resourceId === resource.id).length, credentials: credentials.filter(credential => credential.resourceId === resource.id && visibleCredentialIds.has(credential.id)).length, files: fileAccess.get(resource.id) ? files.filter(file => file.resourceId === resource.id).length : 0 }} />)}</div> : <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 text-center"><Boxes className="size-6 text-muted-foreground" /><h2 className="mt-3 text-sm font-semibold">{q || kind ? "没有匹配的模块" : "还没有模块"}</h2>{!q && !kind ? <Button asChild className="mt-4" size="sm"><Link href="/resources/new"><Plus />新建模块</Link></Button> : null}</div>}
    </div>
  )
}
