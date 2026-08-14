"use client"

import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  User,
} from "lucide-react"
import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction } from "@/lib/auth/actions"

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction} className="space-y-4">
      {/* Username Field */}
      <div className="space-y-1.5">
        <Label htmlFor="username" className="text-xs font-bold text-foreground">
          账号 / 用户名
        </Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="输入用户名"
            required
            autoFocus
            className="h-10 pl-9 text-xs md:text-sm bg-background/80"
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-bold text-foreground">
          登录密码
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="输入登录密码"
            required
            className="h-10 pl-9 pr-9 text-xs md:text-sm bg-background/80 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition"
            title={showPassword ? "隐藏密码" : "显示密码"}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {state && !state.success ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive animate-in fade-in-0 duration-150"
        >
          {state.error}
        </div>
      ) : null}

      {/* Submit Button */}
      <Button
        type="submit"
        className="h-10 w-full font-bold text-xs md:text-sm shadow-xs transition duration-200 mt-2"
        disabled={pending}
      >
        {pending ? (
          <>
            <RefreshCw className="size-4 animate-spin mr-1.5" />
            <span>正在验证中...</span>
          </>
        ) : (
          <>
            <span>登录系统</span>
            <ArrowRight className="size-4 ml-1" />
          </>
        )}
      </Button>
    </form>
  )
}
