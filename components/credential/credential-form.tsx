"use client"

import {
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  User,
  Users,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCredential } from "@/lib/credential/actions"
import { cn } from "@/lib/utils"
import { CredentialSubjectPicker, type CredentialSubjectGrant } from "./credential-subject-picker"

type Subject = { id: string; label: string; type: "USER" | "GROUP" }

const credentialTypeOptions = [
  { value: "PASSWORD", label: "账号密码 (Password)" },
  { value: "API_KEY", label: "API 密钥 (API Key)" },
  { value: "TOKEN", label: "访问 Token (Token)" },
  { value: "SSH", label: "SSH 证书/私钥" },
  { value: "DATABASE", label: "数据库连接凭据" },
  { value: "ACCESS_KEY", label: "云平台 Access Key" },
  { value: "TOTP", label: "二次验证秘钥 (TOTP)" },
  { value: "OTHER", label: "其他凭据" },
]

export function CredentialForm({
  resourceId,
  subjects,
  onDone,
}: {
  resourceId: string
  subjects: Subject[]
  onDone?: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [accessMode, setAccessMode] = useState<"RESOURCE" | "RESTRICTED">("RESOURCE")
  const [selectedSubjects, setSelectedSubjects] = useState<CredentialSubjectGrant[]>([])

  async function submit(formData: FormData) {
    setPending(true)
    setError("")
    const result = await createCredential(resourceId, {
      name: String(formData.get("name") ?? "").trim(),
      type: (formData.get("type") as "PASSWORD") || "PASSWORD",
      username: String(formData.get("username") ?? "").trim(),
      secret: String(formData.get("secret") ?? "").trim(),
      extra: String(formData.get("extra") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      accessMode,
      subjects: accessMode === "RESTRICTED" ? selectedSubjects : [],
    })

    if (!result.success) {
      setError(result.error)
      setPending(false)
      return
    }

    if (onDone) onDone()
    router.refresh()
  }

  return (
    <form
      action={submit}
      className="rounded-2xl border border-border/80 bg-background/50 p-4 md:p-5 shadow-xs space-y-4 transition"
    >
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <span className="grid size-7.5 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <KeyRound className="size-4" />
        </span>
        <h3 className="text-xs font-bold tracking-tight text-foreground">录入新账号与加密凭据</h3>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="credential-name" className="text-xs font-semibold">
            凭据名称 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="credential-name"
            name="name"
            placeholder="例如：主系统管理员账号、生产环境 DB"
            required
            className="h-9 text-xs bg-card"
          />
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <Label htmlFor="credential-type" className="text-xs font-semibold">
            凭据类型
          </Label>
          <select
            id="credential-type"
            name="type"
            defaultValue="PASSWORD"
            className="flex h-9 w-full rounded-xl border border-input bg-card px-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {credentialTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <Label htmlFor="credential-username" className="text-xs font-semibold">
            用户名 / 账号 (Username)
          </Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="credential-username"
              name="username"
              placeholder="例如：admin / developer@team.com"
              className="h-9 pl-8.5 text-xs bg-card font-mono"
            />
          </div>
        </div>

        {/* Secret Password */}
        <div className="space-y-1.5">
          <Label htmlFor="credential-secret" className="text-xs font-semibold">
            密码 / 密钥 (Secret) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="credential-secret"
              name="secret"
              type={showSecret ? "text" : "password"}
              placeholder="输入安全密码或 Secret"
              required
              autoComplete="new-password"
              className="h-9 pl-8.5 pr-8.5 text-xs bg-card font-mono"
            />
            <button
              type="button"
              onClick={() => setShowSecret(prev => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              title={showSecret ? "隐藏密码" : "显示密码"}
            >
              {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Access Mode */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <Label className="text-xs font-semibold">凭据可见范围控制</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAccessMode("RESOURCE")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition",
              accessMode === "RESOURCE"
                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                : "border-border/60 bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            <Users className="size-3.5" />
            <span>沿用模块权限</span>
          </button>
          <button
            type="button"
            onClick={() => setAccessMode("RESTRICTED")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition",
              accessMode === "RESTRICTED"
                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                : "border-border/60 bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            <ShieldAlert className="size-3.5" />
            <span>指定人员可见</span>
          </button>
        </div>

        {accessMode === "RESTRICTED" ? (
          <div className="pt-2">
            <CredentialSubjectPicker
              subjects={subjects}
              value={selectedSubjects}
              onChange={setSelectedSubjects}
            />
          </div>
        ) : null}
      </div>

      {/* Accordion Extra Fields */}
      <details className="group rounded-xl border border-border/60 bg-card/60 p-3 transition open:bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground">
          <span>附加配置与说明备注（端口、参数、环境等）</span>
          <span className="text-[11px] text-primary group-open:hidden">+ 展开</span>
        </summary>
        <div className="mt-3 grid gap-2.5 pt-2 border-t border-border/50">
          <Input
            name="extra"
            placeholder="附加信息：如 Port: 3306, DB: production_v2, Region: ap-east-1"
            className="h-8.5 text-xs bg-background"
          />
          <Input
            name="description"
            placeholder="用途说明：如 仅用于月度数据备份，日常操作请勿使用"
            className="h-8.5 text-xs bg-background"
          />
        </div>
      </details>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive font-medium"
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 pt-1">
        {onDone ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDone}
            className="h-8 text-xs font-medium"
          >
            取消
          </Button>
        ) : null}
        <Button
          type="submit"
          size="sm"
          disabled={pending}
          className="h-8 text-xs font-bold gap-1.5 shadow-xs"
        >
          {pending ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              <span>保存中...</span>
            </>
          ) : (
            <>
              <Plus className="size-3.5" />
              <span>确认保存凭据</span>
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
