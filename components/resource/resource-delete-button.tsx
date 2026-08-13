"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { deleteResource } from "@/lib/resource/actions"

export function ResourceDeleteButton({ resourceId, resourceName, compact = false }: { resourceId: string; resourceName: string; compact?: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function remove() {
    if (!window.confirm(`删除模块“${resourceName}”？模块将从列表隐藏，相关外部分享会立即失效。`)) return
    setPending(true)
    const result = await deleteResource(resourceId)
    if (result.success) { router.push("/resources"); router.refresh() }
    else { window.alert(result.error); setPending(false) }
  }

  return <Button type="button" variant="ghost" size={compact ? "icon" : "sm"} onClick={remove} disabled={pending} className="text-destructive hover:text-destructive" title={`删除 ${resourceName}`} aria-label={`删除 ${resourceName}`}><Trash2 />{compact ? null : pending ? "删除中" : "删除"}</Button>
}
