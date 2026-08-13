"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserMinus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { addGroupMember, removeGroupMember } from "@/lib/admin/actions"

type Member = { userId: string; displayName: string; username: string }
type User = { id: string; displayName: string; username: string }

export function MemberEditor({ groupId, members, users }: { groupId: string; members: Member[]; users: User[] }) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const memberIds = new Set(members.map(member => member.userId))
  const availableUsers = users.filter(user => !memberIds.has(user.id))

  async function add(form: FormData) {
    setPending(true)
    const result = await addGroupMember(groupId, String(form.get("userId")))
    setMessage(result.success ? "" : result.error)
    if (result.success) router.refresh()
    setPending(false)
  }

  async function remove(userId: string) {
    setPending(true)
    const result = await removeGroupMember(groupId, userId)
    setMessage(result.success ? "" : result.error)
    if (result.success) router.refresh()
    setPending(false)
  }

  return (
    <div>
      <div className="space-y-2">
        {members.map(member => (
          <div key={member.userId} className="flex items-center gap-3 rounded-md border px-3 py-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold">{member.displayName.slice(0, 2)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
            </div>
            <Button type="button" variant="ghost" size="icon" disabled={pending} onClick={() => remove(member.userId)} aria-label={`移除 ${member.displayName}`} title="移出小组">
              <UserMinus />
            </Button>
          </div>
        ))}
        {!members.length ? <p className="rounded-md border border-dashed px-3 py-5 text-center text-xs text-muted-foreground">未添加成员</p> : null}
      </div>
      {availableUsers.length ? (
        <form action={add} className="mt-3 flex gap-2">
          <select name="userId" className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm" required defaultValue="">
            <option value="" disabled>选择成员</option>
            {availableUsers.map(user => <option key={user.id} value={user.id}>{user.displayName} @{user.username}</option>)}
          </select>
          <Button size="sm" disabled={pending}>加入</Button>
        </form>
      ) : null}
      {message ? <p className="mt-2 text-xs text-destructive">{message}</p> : null}
    </div>
  )
}
