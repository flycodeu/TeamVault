"use client"

import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  User,
  Users2,
} from "lucide-react"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { revealCredential } from "@/lib/credential/actions"
import type { Credential } from "@/lib/db/schema"

export type WebsiteCredentialDetail = Credential & {
  isPermitted: boolean
  subjectLabels: string[]
}

export function WebsiteCredentialItem({
  credential,
}: {
  credential: WebsiteCredentialDetail
}) {
  const [copiedUser, setCopiedUser] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  async function handleCopyUser() {
    if (!credential.username) return
    await navigator.clipboard.writeText(credential.username)
    setCopiedUser(true)
    setTimeout(() => setCopiedUser(false), 1500)
  }

  async function handleCopyPass() {
    startTransition(async () => {
      let secret = revealedSecret
      if (!secret) {
        const res = await revealCredential(credential.id, true)
        if (res.success && res.data.secret) {
          secret = res.data.secret
          setRevealedSecret(secret)
        }
      }
      if (secret) {
        await navigator.clipboard.writeText(secret)
        setCopiedPass(true)
        setTimeout(() => setCopiedPass(false), 1500)
      }
    })
  }

  async function toggleReveal() {
    if (revealedSecret) {
      setRevealedSecret(null)
      return
    }

    startTransition(async () => {
      const res = await revealCredential(credential.id, false)
      if (res.success && res.data.secret) {
        setRevealedSecret(res.data.secret)
      }
    })
  }

  const isRestricted = credential.accessMode === "RESTRICTED"

  if (!credential.isPermitted) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-3.5 text-xs">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">{credential.name}</span>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          🔒 账号密码已受保护（仅白名单授权人员可见）
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          <span className="font-bold text-xs text-foreground">{credential.name}</span>
          {isRestricted ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              <ShieldCheck className="size-3" />
              <span>白名单授权（已对您开放）</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              <Users2 className="size-3" />
              <span>全员公开</span>
            </span>
          )}
        </div>

        {credential.description ? (
          <span className="text-[11px] text-muted-foreground">{credential.description}</span>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Username */}
        <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 p-2.5 font-mono text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <User className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-[11px] shrink-0">账号:</span>
            <span className="font-bold text-foreground truncate">
              {credential.username || "（无用户名）"}
            </span>
          </div>
          {credential.username ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyUser}
              className="h-6 px-2 text-[11px] gap-1 font-sans text-muted-foreground hover:text-foreground"
            >
              {copiedUser ? (
                <>
                  <Check className="size-3 text-emerald-500" />
                  <span className="text-emerald-500">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>复制</span>
                </>
              )}
            </Button>
          ) : null}
        </div>

        {/* Password */}
        <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background/60 p-2.5 font-mono text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="size-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-[11px] shrink-0">密码:</span>
            <span className="font-bold text-foreground truncate">
              {revealedSecret || "••••••••"}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleReveal}
              className="h-6 px-1.5 text-muted-foreground hover:text-foreground"
              title={revealedSecret ? "隐藏密码" : "显示密码"}
            >
              {revealedSecret ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyPass}
              className="h-6 px-2 text-[11px] gap-1 font-sans text-primary hover:text-primary/80"
            >
              {copiedPass ? (
                <>
                  <Check className="size-3 text-emerald-500" />
                  <span className="text-emerald-500">已复制</span>
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <span>复制密码</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Authorized Subject Badges if Restricted */}
      {isRestricted && credential.subjectLabels.length ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-muted-foreground font-medium">授权白名单:</span>
          {credential.subjectLabels.map(label => (
            <span
              key={label}
              className="rounded-md bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 font-semibold text-blue-700 dark:text-blue-300"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
