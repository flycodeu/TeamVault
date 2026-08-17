"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { deleteGroup } from "@/lib/admin/actions"

export function GroupDeleteButton({
  groupId,
  groupName,
}: {
  groupId: string
  groupName: string
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  async function handleDelete() {
    setError("")
    startTransition(async () => {
      const res = await deleteGroup(groupId)
      if (!res.success) {
        setError(res.error)
      } else {
        setShowConfirm(false)
        router.push("/groups")
        router.refresh()
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => setShowConfirm(true)}
        className="h-8 px-2.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
        title="删除此小组"
      >
        <Trash2 className="size-3.5 mr-1" />
        <span>删除小组</span>
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={`确定要删除小组 “${groupName}” 吗？`}
        description="删除小组后，该小组下的所有成员绑定以及针对各模块/凭据的内容授权将被全部同步注销。此操作不可撤回！"
        confirmText="确认删除小组"
        variant="danger"
        onConfirm={handleDelete}
      />
    </>
  )
}
