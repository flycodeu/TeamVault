"use client"

import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { deleteResource } from "@/lib/resource/actions"

export function ResourceDeleteButton({
  resourceId,
  resourceName,
  compact = false,
  redirectTo = "/resources",
  noun = "模块",
}: {
  resourceId: string
  resourceName: string
  compact?: boolean
  redirectTo?: string
  noun?: string
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleConfirmDelete() {
    setPending(true)
    const result = await deleteResource(resourceId)
    if (result.success) {
      router.push(redirectTo)
      router.refresh()
    } else {
      alert(result.error)
      setPending(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={compact ? "icon" : "sm"}
        onClick={() => setShowConfirm(true)}
        disabled={pending}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 transition"
        title={`删除 ${resourceName}`}
        aria-label={`删除 ${resourceName}`}
      >
        <Trash2 className="size-4" />
        {compact ? null : <span>删除</span>}
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmDelete}
        title={`确定删除${noun}？`}
        targetName={resourceName}
        description={`删除该${noun}后将从列表中移除，关联的所有外部分享链接与临时凭据将立即失效。`}
        confirmText={`确认删除${noun}`}
        variant="danger"
      />
    </>
  )
}

