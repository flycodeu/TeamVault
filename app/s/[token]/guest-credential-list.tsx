"use client"

import { Check, Copy, Eye, EyeOff, KeyRound, Lock, User } from "lucide-react"
import { useState } from "react"

const typeLabels: Record<string, string> = {
  PASSWORD: "账号密码",
  API_KEY: "API 密钥",
  TOKEN: "Token",
  SSH: "SSH 主机",
  DATABASE: "数据库",
  ACCESS_KEY: "Access Key",
  TOTP: "二次验证",
  OTHER: "通用凭据",
}

export type DecryptedGuestCredential = {
  id: string
  name: string
  type: string
  username: string | null
  secret: string
  extra: string | null
  description: string | null
}

export function GuestCredentialList({ credentials }: { credentials: DecryptedGuestCredential[] }) {
  const [showSecretIds, setShowSecretIds] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  function toggleSecret(id: string) {
    setShowSecretIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1600)
  }

  return (
    <div className="space-y-3">
      {credentials.map(cred => {
        const isRevealed = showSecretIds.has(cred.id)
        const isUsernameCopied = copiedKey === `user-${cred.id}`
        const isSecretCopied = copiedKey === `secret-${cred.id}`
        const isExtraCopied = copiedKey === `extra-${cred.id}`

        return (
          <article
            key={cred.id}
            className="rounded-xl border border-border/80 bg-background/80 p-4 shadow-xs space-y-3 transition duration-150 hover:border-primary/40"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <KeyRound className="size-3.5" />
                </span>
                <h3 className="truncate text-xs font-bold text-foreground">{cred.name}</h3>
              </div>
              <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shrink-0">
                {typeLabels[cred.type] ?? cred.type}
              </span>
            </div>

            {/* Username Field */}
            {cred.username ? (
              <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-[11px]">用户名:</span>
                  <span className="font-mono font-medium text-foreground truncate select-all">{cred.username}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(`user-${cred.id}`, cred.username!)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition shrink-0 ml-2"
                  title="复制用户名"
                >
                  {isUsernameCopied ? (
                    <Check className="size-3 text-emerald-600" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  <span>{isUsernameCopied ? "已复制" : "复制"}</span>
                </button>
              </div>
            ) : null}

            {/* Password / Secret Field */}
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-[11px]">密码/密钥:</span>
                <span className="font-mono font-medium text-foreground truncate select-all">
                  {isRevealed ? cred.secret : "••••••••••••"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => toggleSecret(cred.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition"
                  title={isRevealed ? "隐藏明文" : "显示明文"}
                >
                  {isRevealed ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                  <span>{isRevealed ? "隐藏" : "显示"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => copyText(`secret-${cred.id}`, cred.secret)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline transition"
                  title="复制密码"
                >
                  {isSecretCopied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>{isSecretCopied ? "已复制" : "复制密码"}</span>
                </button>
              </div>
            </div>

            {/* Extra Parameters Field */}
            {cred.extra ? (
              <div className="rounded-lg bg-muted/30 p-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-medium">附加配置与参数:</span>
                  <button
                    type="button"
                    onClick={() => copyText(`extra-${cred.id}`, cred.extra!)}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary font-medium"
                  >
                    {isExtraCopied ? <Check className="size-2.5 text-emerald-600" /> : <Copy className="size-2.5" />}
                    <span>{isExtraCopied ? "已复制配置" : "复制配置"}</span>
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground bg-background/60 rounded p-1.5 border border-border/40 select-all">
                  {cred.extra}
                </pre>
              </div>
            ) : null}

            {cred.description ? (
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">{cred.description}</p>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
