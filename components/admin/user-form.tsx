"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUser } from "@/lib/admin/actions"

export function UserForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  async function submit(form: FormData) {
    const result = await createUser({ username: String(form.get("username") ?? ""), displayName: String(form.get("displayName") ?? ""), password: String(form.get("password") ?? ""), isAdmin: form.get("isAdmin") === "on" })
    if (!result.success) setError(result.error); else router.refresh()
  }
  return <form action={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="new-username">用户名</Label><Input id="new-username" name="username" required /></div><div className="space-y-2"><Label htmlFor="display-name">显示名称</Label><Input id="display-name" name="displayName" required /></div><div className="space-y-2"><Label htmlFor="new-password">初始密码</Label><Input id="new-password" name="password" type="password" minLength={10} required /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isAdmin" />设为管理员</label>{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button>创建成员</Button></form>
}
