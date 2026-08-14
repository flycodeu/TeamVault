"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { deleteResource } from "@/lib/resource/actions"

export function ResourceDeleteButton({ resourceId, resourceName, compact = false, redirectTo = "/resources", noun = "模块" }: { resourceId: string; resourceName: string; compact?: boolean; redirectTo?: string; noun?: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function remove() {
    if (!window.confirm(`删除${noun}“${resourceName}”？删除后将从列表隐藏，相关外部分享会立即失效。`)) return
    setPending(true)
    const result = await deleteResource(resourceId)
    if (result.success) { router.push(redirectTo); router.refresh() }
    else { window.alert(result.error); setPending(false) }
  }

  return <Button type="button" variant="ghost" size={compact ? "icon" : "sm"} onClick={remove} disabled={pending} className="text-destructive hover:text-destructive" title={`删除 ${resourceName}`} aria-label={`删除 ${resourceName}`}><Trash2 />{compact ? null : pending ? "删除中" : "删除"}</Button>
}
