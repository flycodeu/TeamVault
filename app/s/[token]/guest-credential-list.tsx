"use client"

import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Lock,
  Sparkles,
  User,
} from "lucide-react"
import { useState } from "react"

import { copyToClipboard } from "@/lib/utils"

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
  targetUrl?: string | null
  targetUrlTitle?: string | null
}

export function GuestCredentialList({
  credentials,
}: {
  credentials: DecryptedGuestCredential[]
}) {
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
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1600)
    }
  }

  async function copyAllCredInfo(cred: DecryptedGuestCredential) {
    const lines = [`【${cred.name}】`]
    if (cred.targetUrl) {
      lines.push(`登录网址: ${cred.targetUrl}`)
    }
    if (cred.username) {
      lines.push(`用户名: ${cred.username}`)
    }
    lines.push(`密码: ${cred.secret}`)
    if (cred.extra) {
      lines.push(`附加配置: ${cred.extra}`)
    }
    if (cred.description) {
      lines.push(`说明: ${cred.description}`)
    }
    const ok = await copyToClipboard(lines.join("\n"))
    if (ok) {
      setCopiedKey(`all-${cred.id}`)
      setTimeout(() => setCopiedKey(null), 2000)
    }
  }

  return (
    <div className="space-y-3.5">
      {credentials.map(cred => {
        const isRevealed = showSecretIds.has(cred.id)
        const isUsernameCopied = copiedKey === `user-${cred.id}`
        const isSecretCopied = copiedKey === `secret-${cred.id}`
        const isExtraCopied = copiedKey === `extra-${cred.id}`
        const isUrlCopied = copiedKey === `url-${cred.id}`
        const isAllCopied = copiedKey === `all-${cred.id}`

        return (
          <article
            key={cred.id}
            className="rounded-2xl border border-border/80 bg-background/80 p-4.5 shadow-xs space-y-3.5 transition duration-150 hover:border-primary/40 hover:shadow-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <KeyRound className="size-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-foreground">{cred.name}</h3>
                  {cred.targetUrlTitle ? (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      适用: {cred.targetUrlTitle}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => copyAllCredInfo(cred)}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition"
                  title="一键复制该凭据的全部信息（含网址、账号、密码）"
                >
                  {isAllCopied ? <Check className="size-3 text-emerald-600" /> : <Sparkles className="size-3" />}
                  <span>{isAllCopied ? "已复制完整登录信息" : "一键复制账号信息"}</span>
                </button>
                <span className="rounded-lg bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {typeLabels[cred.type] ?? cred.type}
                </span>
              </div>
            </div>

            {/* Target Login URL */}
            {cred.targetUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Globe2 className="size-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground text-[11px] shrink-0 font-medium">
                    {cred.targetUrlTitle ? `${cred.targetUrlTitle}:` : "登录地址:"}
                  </span>
                  <a
                    href={cred.targetUrl.startsWith("http") ? cred.targetUrl : `https://${cred.targetUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-primary truncate hover:underline font-semibold"
                    title={cred.targetUrl}
                  >
                    {cred.targetUrl}
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => copyText(`url-${cred.id}`, cred.targetUrl!)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition"
                    title="复制访问网址"
                  >
                    {isUrlCopied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    <span>{isUrlCopied ? "已复制" : "复制网址"}</span>
                  </button>
                  <a
                    href={cred.targetUrl.startsWith("http") ? cred.targetUrl : `https://${cred.targetUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground shadow-2xs hover:bg-primary/90 transition"
                  >
                    <span>直达登录</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              </div>
            ) : null}

            {/* Username Field */}
            {cred.username ? (
              <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <User className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground text-[11px]">用户名 / 账号:</span>
                  <span className="font-mono font-bold text-foreground truncate select-all">{cred.username}</span>
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
                  <span>{isUsernameCopied ? "已复制" : "复制账号"}</span>
                </button>
              </div>
            ) : null}

            {/* Password / Secret Field */}
            <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="size-3.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground text-[11px]">密码 / 访问密钥:</span>
                <span className="font-mono font-bold text-foreground truncate select-all">
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
              <div className="rounded-xl bg-muted/30 p-3 text-xs space-y-1.5 border border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground font-semibold">附加配置与参数:</span>
                  <button
                    type="button"
                    onClick={() => copyText(`extra-${cred.id}`, cred.extra!)}
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary font-medium"
                  >
                    {isExtraCopied ? <Check className="size-2.5 text-emerald-600" /> : <Copy className="size-2.5" />}
                    <span>{isExtraCopied ? "已复制配置" : "复制配置"}</span>
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground bg-background/80 rounded-lg p-2 border border-border/40 select-all">
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
