"use client"

import { ExternalLink, FileText, Globe2, Link2, Pencil, Plus, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ResourceLink } from "@/lib/db/schema"
import { createResourceLink, deleteResourceLink, updateResourceLink } from "@/lib/resource/link-actions"

const kindMeta = {
  WEBSITE: { label: "网站", icon: Globe2 },
  EXTERNAL_DOCUMENT: { label: "外部文档", icon: FileText },
  OTHER: { label: "其他链接", icon: Link2 },
} as const

type LinkInput = Pick<ResourceLink, "kind" | "title" | "url"> & { description?: string }

export function ResourceLinkManager({ resourceId, links, mayEdit }: { resourceId: string; links: ResourceLink[]; mayEdit: boolean }) {
  const router = useRouter()
  const [editor, setEditor] = useState<"new" | string | null>(null)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function save(input: LinkInput, id?: string) {
    setPending(true)
    setError("")
    const result = id ? await updateResourceLink(id, input) : await createResourceLink(resourceId, input)
    if (!result.success) setError(result.error)
    else { setEditor(null); router.refresh() }
    setPending(false)
  }

  async function remove(id: string) {
    if (!window.confirm("删除这个链接？")) return
    const result = await deleteResourceLink(id)
    if (!result.success) setError(result.error)
    else router.refresh()
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] md:p-6">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">链接与外部文档</h2>{links.length ? <span className="text-xs text-muted-foreground">{links.length}</span> : null}</div>{mayEdit ? <Button type="button" size="sm" onClick={() => { setError(""); setEditor(editor === "new" ? null : "new") }}>{editor === "new" ? <X /> : <Plus />}{editor === "new" ? "取消" : "新增"}</Button> : null}</div>
      {editor === "new" ? <LinkEditor pending={pending} error={error} onSubmit={input => save(input)} /> : null}
      {links.length ? <div className="mt-4 grid gap-2 lg:grid-cols-2">{links.map(link => { const meta = kindMeta[link.kind]; const Icon = meta.icon; return <article key={link.id} className={`rounded-md border bg-background p-3 ${editor === link.id ? "lg:col-span-2" : ""}`}>{editor === link.id ? <LinkEditor link={link} pending={pending} error={error} onSubmit={input => save(input, link.id)} onCancel={() => setEditor(null)} /> : <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><a href={link.url} target="_blank" rel="noreferrer" className="truncate text-sm font-medium hover:text-primary">{link.title}</a><ExternalLink className="size-3 shrink-0 text-muted-foreground" /></div><p className="mt-0.5 text-xs text-muted-foreground">{meta.label}</p>{link.description ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{link.description}</p> : null}</div>{mayEdit ? <div className="flex"><Button type="button" variant="ghost" size="icon" onClick={() => { setError(""); setEditor(link.id) }} aria-label={`编辑 ${link.title}`} title="编辑"><Pencil /></Button><Button type="button" variant="ghost" size="icon" onClick={() => remove(link.id)} aria-label={`删除 ${link.title}`} title="删除" className="text-destructive hover:text-destructive"><Trash2 /></Button></div> : null}</div>}</article> })}</div> : null}
    </section>
  )
}

function LinkEditor({ link, pending, error, onSubmit, onCancel }: { link?: ResourceLink; pending: boolean; error: string; onSubmit: (input: LinkInput) => void | Promise<void>; onCancel?: () => void }) {
  async function submit(formData: FormData) {
    await onSubmit({ kind: formData.get("kind") as ResourceLink["kind"], title: String(formData.get("title") ?? ""), url: String(formData.get("url") ?? ""), description: String(formData.get("description") ?? "") })
  }
  const suffix = link?.id ?? "new"
  return <form action={submit} className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`link-kind-${suffix}`}>类型</Label><select id={`link-kind-${suffix}`} name="kind" defaultValue={link?.kind ?? "WEBSITE"} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="WEBSITE">网站</option><option value="EXTERNAL_DOCUMENT">外部文档</option><option value="OTHER">其他链接</option></select></div><div className="space-y-2"><Label htmlFor={`link-title-${suffix}`}>名称</Label><Input id={`link-title-${suffix}`} name="title" defaultValue={link?.title} required /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor={`link-url-${suffix}`}>链接</Label><Input id={`link-url-${suffix}`} name="url" type="url" defaultValue={link?.url} placeholder="https://" required /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor={`link-description-${suffix}`}>说明</Label><Input id={`link-description-${suffix}`} name="description" defaultValue={link?.description ?? ""} /></div>{error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}<div className="flex gap-2 sm:col-span-2"><Button disabled={pending}>{pending ? "保存中" : "保存"}</Button>{onCancel ? <Button type="button" variant="ghost" onClick={onCancel}>取消</Button> : null}</div></form>
}
