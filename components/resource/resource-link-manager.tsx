"use client"

import { ExternalLink, FileText, Globe2, Link2, Plus, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ResourceLink } from "@/lib/db/schema"
import { createResourceLink, deleteResourceLink } from "@/lib/resource/link-actions"

const kindMeta = {
  WEBSITE: { label: "网站", icon: Globe2 },
  EXTERNAL_DOCUMENT: { label: "外部文档", icon: FileText },
  OTHER: { label: "其他链接", icon: Link2 },
} as const

export function ResourceLinkManager({ resourceId, links, mayEdit }: { resourceId: string; links: ResourceLink[]; mayEdit: boolean }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function add(formData: FormData) {
    setPending(true)
    setError("")
    const result = await createResourceLink(resourceId, { kind: formData.get("kind") as ResourceLink["kind"], title: String(formData.get("title") ?? ""), url: String(formData.get("url") ?? ""), description: String(formData.get("description") ?? "") })
    if (!result.success) setError(result.error)
    else router.refresh()
    setPending(false)
  }

  async function remove(id: string) {
    const result = await deleteResourceLink(id)
    if (!result.success) setError(result.error)
    else router.refresh()
  }

  return (
    <section>
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">链接与外部文档</h2>{links.length ? <span className="text-xs text-muted-foreground">{links.length} 项</span> : null}</div>
      {links.length ? <div className="mt-3 grid gap-3 lg:grid-cols-2">{links.map(link => { const meta = kindMeta[link.kind]; const Icon = meta.icon; return <article key={link.id} className="group flex items-start gap-3 rounded-lg border bg-card p-4"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><a href={link.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium hover:text-primary">{link.title}</a><ExternalLink className="size-3 shrink-0 text-muted-foreground" /></div><p className="mt-0.5 text-xs text-muted-foreground">{meta.label}</p>{link.description ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{link.description}</p> : null}</div>{mayEdit ? <Button type="button" variant="ghost" size="icon" onClick={() => remove(link.id)} aria-label={`删除 ${link.title}`} title="删除"><Trash2 /></Button> : null}</article> })}</div> : null}
      {mayEdit ? <details className="mt-3 rounded-lg border border-dashed bg-card"><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium"><Plus className="size-4" />添加网站或外部文档</summary><form action={add} className="grid gap-4 border-t p-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="link-kind">类型</Label><select id="link-kind" name="kind" defaultValue="WEBSITE" className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="WEBSITE">网站</option><option value="EXTERNAL_DOCUMENT">外部文档</option><option value="OTHER">其他链接</option></select></div><div className="space-y-2"><Label htmlFor="link-title">名称</Label><Input id="link-title" name="title" required /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="link-url">链接</Label><Input id="link-url" name="url" type="url" placeholder="https://" required /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="link-description">说明</Label><Input id="link-description" name="description" /></div>{error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}<Button className="sm:col-span-2 sm:justify-self-start" disabled={pending}>{pending ? "保存中" : "添加"}</Button></form></details> : null}
    </section>
  )
}
