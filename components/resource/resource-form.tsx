"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Resource } from "@/lib/db/schema"
import { createResource, updateResource } from "@/lib/resource/actions"

const kinds = [["PROJECT", "项目"], ["TOOL", "工具 / 系统"], ["KNOWLEDGE", "知识 / 文档"], ["WEBSITE", "独立网站"], ["PERSONAL", "个人"], ["OTHER", "其他"]] as const
const visibilityOptions = [["PRIVATE", "仅自己和管理员"], ["TEAM", "团队可见"], ["GROUP", "按授权可见"], ["PUBLIC", "公开"]] as const
const sensitivityOptions = [["NORMAL", "普通"], ["INTERNAL", "内部"], ["CONFIDENTIAL", "机密"], ["SECRET", "高度机密"]] as const

export function ResourceForm({ resource }: { resource?: Resource }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [moduleKind, setModuleKind] = useState<Resource["moduleKind"]>(resource?.moduleKind ?? "PROJECT")
  const [tags, setTags] = useState(() => { try { return (JSON.parse(resource?.tags ?? "[]") as string[]).join(", ") } catch { return "" } })

  async function submit(formData: FormData) {
    setPending(true)
    setError("")
    const input = {
      name: String(formData.get("name") ?? ""),
      moduleKind,
      url: String(formData.get("url") ?? ""),
      description: String(formData.get("description") ?? ""),
      visibility: String(formData.get("visibility") ?? "PRIVATE") as Resource["visibility"],
      sensitivity: String(formData.get("sensitivity") ?? "NORMAL") as Resource["sensitivity"],
      tags: tags.split(",").map(tag => tag.trim()).filter(Boolean),
    }
    if (resource) {
      const result = await updateResource(resource.id, input)
      if (!result.success) { setError(result.error); setPending(false); return }
      router.push(`/resources/${resource.id}`)
    } else {
      const result = await createResource(input)
      if (!result.success) { setError(result.error); setPending(false); return }
      router.push(`/resources/${result.data.id}`)
    }
    router.refresh()
  }

  return (
    <form action={submit} className="space-y-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="name">{moduleKind === "WEBSITE" ? "网站名称" : "模块名称"}</Label><Input id="name" name="name" defaultValue={resource?.name} placeholder={moduleKind === "WEBSITE" ? "例如：Label Studio" : "例如：入炉项目、技术文档"} required /></div>
        <div className="space-y-2"><Label htmlFor="moduleKind">场景</Label><select id="moduleKind" name="moduleKind" value={moduleKind} onChange={event => setModuleKind(event.target.value as Resource["moduleKind"])} className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="visibility">可见范围</Label><select id="visibility" name="visibility" defaultValue={resource?.visibility ?? "PRIVATE"} className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">{visibilityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {moduleKind === "WEBSITE" ? <><div className="space-y-2 sm:col-span-2"><Label htmlFor="url">网站地址</Label><Input id="url" name="url" type="url" defaultValue={resource?.url ?? ""} placeholder="https://example.com" required /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="description">备注（可选）</Label><textarea id="description" name="description" defaultValue={resource?.description ?? ""} rows={3} placeholder="简单记录网站用途" className="flex w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div><input type="hidden" name="sensitivity" value="NORMAL" /></> : <><div className="space-y-2 sm:col-span-2"><Label htmlFor="description">说明</Label><textarea id="description" name="description" defaultValue={resource?.description ?? ""} rows={5} placeholder="记录用途、操作方式或需要记住的信息" className="flex w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div><details className="sm:col-span-2 rounded-md border px-3 py-2"><summary className="cursor-pointer text-xs font-medium">更多设置</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="sensitivity">敏感级别</Label><select id="sensitivity" name="sensitivity" defaultValue={resource?.sensitivity ?? "NORMAL"} className="flex h-10 w-full rounded-md border bg-background px-3 text-sm">{sensitivityOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div className="space-y-2"><Label htmlFor="tags">标签</Label><Input id="tags" value={tags} onChange={event => setTags(event.target.value)} placeholder="多个标签用逗号分隔" /></div></div></details></>}
      </div>
      {error ? <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => router.back()}>取消</Button><Button type="submit" disabled={pending}>{pending ? "保存中" : resource ? "保存修改" : moduleKind === "WEBSITE" ? "保存网站" : "创建模块"}</Button></div>
    </form>
  )
}
