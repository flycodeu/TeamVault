"use client"

import { ArrowRight, LoaderCircle } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction } from "@/lib/auth/actions"

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined)

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div className="space-y-2">
        <Label htmlFor="username">用户名</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="name"
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="输入登录密码"
          required
        />
      </div>
      {state && !state.success ? (
        <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/8 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="h-10 w-full justify-between" disabled={pending}>
        <span>{pending ? "正在验证" : "进入资料库"}</span>
        {pending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
      </Button>
    </form>
  )
}
