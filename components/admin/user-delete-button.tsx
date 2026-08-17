"use client"

import { useState, useTransition } from "react"
import { LoaderCircle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { deleteUser } from "@/lib/admin/actions"

export function UserDeleteButton({
  userId,
  userName,
  disabled = false,
}: {
  userId: string
  userName: string
  disabled?: boolean
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  async function handleDelete() {
    setError("")
    startTransition(async () => {
      const res = await deleteUser(userId)
      if (!res.success) {
        setError(res.error)
      } else {
        setShowConfirm(false)
      }
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled || isPending}
        onClick={() => setShowConfirm(true)}
        className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title={disabled ? "不能删除当前账户" : "删除成员"}
      >
        <Trash2 className="size-3.5 mr-1" />
        <span>删除</span>
      </Button>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title={`确定要删除成员 “${userName}” 吗？`}
        description="删除成员后，该用户的所有直接授权、群组关系和活动会话将被立即注销，其创建的资产将安全转移给管理员。此操作不可恢复。"
        confirmText="确认删除"
        variant="danger"
        onConfirm={handleDelete}
      />
    </>
  )
}
