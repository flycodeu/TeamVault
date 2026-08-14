"use client"

import { RefreshCw, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUser } from "@/lib/admin/actions"

export function UserForm() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function submit(form: FormData) {
    setPending(true)
    setError("")
    const result = await createUser({
      username: String(form.get("username") ?? "").trim(),
      displayName: String(form.get("displayName") ?? "").trim(),
      password: String(form.get("password") ?? "").trim(),
      isAdmin: form.get("isAdmin") === "on",
    })

    if (!result.success) {
      setError(result.error)
      setPending(false)
    } else {
      router.refresh()
      setPending(false)
    }
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="new-username" className="text-xs font-semibold">
          用户名 (Username) <span className="text-destructive">*</span>
        </Label>
        <Input
          id="new-username"
          name="username"
          minLength={2}
          placeholder="至少 2 个字符，如：ty, admin, dev_01"
          required
          className="h-9 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="display-name" className="text-xs font-semibold">
          显示昵称 / 姓名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="display-name"
          name="displayName"
          placeholder="例如：张三、前端负责人"
          required
          className="h-9 text-xs"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="new-password" className="text-xs font-semibold">
          初始登录密码 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          minLength={6}
          placeholder="初始密码（至少 6 位）"
          required
          className="h-9 text-xs font-mono"
        />
      </div>

      <div className="pt-1">
        <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            name="isAdmin"
            className="size-4 rounded border-border text-primary focus:ring-primary"
          />
          <span>设为空间超级管理员（拥有所有权限）</span>
        </label>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive font-medium"
        >
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={pending} className="h-8.5 text-xs font-bold gap-1.5 shadow-xs">
        {pending ? (
          <>
            <RefreshCw className="size-3.5 animate-spin" />
            <span>创建中...</span>
          </>
        ) : (
          <>
            <UserPlus className="size-3.5" />
            <span>创建成员账号</span>
          </>
        )}
      </Button>
    </form>
  )
}
