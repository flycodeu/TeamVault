"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { removeGroupResourceAccess, setGroupResourceAccess } from "@/lib/admin/actions"

type ResourceOption = { id: string; name: string; type: string }
type Grant = { resourceId: string; canViewSecret: boolean; canViewFile: boolean; canDownload: boolean; canEdit: boolean; canShare: boolean }
type AccessLevel = "VIEW" | "FILES" | "SECRETS" | "MANAGE"

const levels: Array<[AccessLevel, string]> = [["VIEW", "仅查看"], ["FILES", "查看文件"], ["SECRETS", "文件与凭据"], ["MANAGE", "管理模块"]]
const typeLabels: Record<string, string> = { PROJECT: "项目", TOOL: "工具 / 系统", KNOWLEDGE: "知识 / 文档", PERSONAL: "个人", OTHER: "其他" }

function levelOf(grant: Grant): AccessLevel {
  if (grant.canEdit || grant.canShare) return "MANAGE"
  if (grant.canViewSecret) return "SECRETS"
  if (grant.canViewFile || grant.canDownload) return "FILES"
  return "VIEW"
}

export function GroupResourceEditor({ groupId, resources, grants }: { groupId: string; resources: ResourceOption[]; grants: Grant[] }) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const assignedIds = new Set(grants.map(grant => grant.resourceId))
  const availableResources = resources.filter(resource => !assignedIds.has(resource.id))
  const resourceById = new Map(resources.map(resource => [resource.id, resource]))

  async function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setPending(true)
    setMessage("")
    const result = await action()
    if (!result.success) setMessage(result.error ?? "操作失败")
    else router.refresh()
    setPending(false)
  }

  async function assign(form: FormData) {
    await run(() => setGroupResourceAccess(groupId, String(form.get("resourceId")), form.get("level") as AccessLevel))
  }

  return (
    <div>
      <div className="space-y-2">
        {grants.map(grant => {
          const resource = resourceById.get(grant.resourceId)
          if (!resource) return null
          return (
            <div key={grant.resourceId} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_130px_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{resource.name}</p>
                <p className="text-xs text-muted-foreground">{typeLabels[resource.type] ?? resource.type}</p>
              </div>
              <select value={levelOf(grant)} disabled={pending} onChange={event => run(() => setGroupResourceAccess(groupId, grant.resourceId, event.target.value as AccessLevel))} className="h-8 rounded-md border bg-background px-2 text-xs">
                {levels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <Button type="button" variant="ghost" size="icon" disabled={pending} onClick={() => run(() => removeGroupResourceAccess(groupId, grant.resourceId))} aria-label={`移除 ${resource.name}`} title="取消授权"><X /></Button>
            </div>
          )
        })}
        {!grants.length ? <p className="rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">未分配模块</p> : null}
      </div>
      {availableResources.length ? (
        <form action={assign} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px_auto]">
          <select name="resourceId" className="h-9 min-w-0 rounded-md border bg-background px-2 text-sm" required defaultValue="">
            <option value="" disabled>选择模块</option>
            {availableResources.map(resource => <option key={resource.id} value={resource.id}>{resource.name}</option>)}
          </select>
          <select name="level" defaultValue="VIEW" className="h-9 rounded-md border bg-background px-2 text-xs">
            {levels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <Button size="sm" disabled={pending}>授权</Button>
        </form>
      ) : null}
      {message ? <p className="mt-2 text-xs text-destructive">{message}</p> : null}
    </div>
  )
}
