"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { disableUser, enableUser } from "@/lib/admin/actions"

export function UserStatusButton({ userId, active, disabled }: { userId: string; active: boolean; disabled?: boolean }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function updateStatus() {
    setPending(true)
    setError("")
    const result = active ? await disableUser(userId) : await enableUser(userId)
    if (!result.success) setError(result.error)
    else router.refresh()
    setPending(false)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="ghost" size="sm" disabled={disabled || pending} onClick={updateStatus}>
        {pending ? "处理中" : active ? "禁用" : "启用"}
      </Button>
      {error ? <span className="text-[11px] text-destructive">{error}</span> : null}
    </div>
  )
}
