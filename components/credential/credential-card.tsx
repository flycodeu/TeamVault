"use client"

import {
  Check,
  Clipboard,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Pencil,
  ShieldAlert,
  Trash2,
  User,
  UsersRound,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { deleteCredential, revealCredential } from "@/lib/credential/actions"
import { cn } from "@/lib/utils"
import { CredentialAccessEditor } from "./credential-access-editor"
import { CredentialEdit } from "./credential-edit"
import type { CredentialSubjectGrant } from "./credential-subject-picker"

type Subject = { id: string; label: string; type: "USER" | "GROUP" }
type CredentialCardProps = {
  credential: {
    id: string
    name: string
    type: string
    username: string | null
    description: string | null
    accessMode: "RESOURCE" | "RESTRICTED"
  }
  mayEdit: boolean
  subjects: Subject[]
  accessGrants: CredentialSubjectGrant[]
}

const typeLabels: Record<string, string> = {
  PASSWORD: "账号密码",
  API_KEY: "API 密钥",
  TOKEN: "Token 访问凭据",
  SSH: "SSH 秘钥 / 主机",
  DATABASE: "数据库连接凭据",
  ACCESS_KEY: "Access Key / Secret",
  TOTP: "动态二次验证码",
  OTHER: "通用凭据",
}

export function CredentialCard({ credential, mayEdit, subjects, accessGrants }: CredentialCardProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingAccess, setEditingAccess] = useState(false)
  const [secret, setSecret] = useState("")
  const [extra, setExtra] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedUsername, setCopiedUsername] = useState(false)
  const [copiedExtra, setCopiedExtra] = useState(false)
  const [error, setError] = useState("")

  async function reveal() {
    setPending(true)
    setError("")
    const result = await revealCredential(credential.id)
    if (result.success) {
      setSecret(result.data.secret)
      setExtra(result.data.extra)
      setVisible(true)
    } else {
      setError(result.error)
    }
    setPending(false)
  }

  async function copySecret() {
    const result = await revealCredential(credential.id, true)
    if (result.success) {
      await navigator.clipboard.writeText(result.data.secret)
      setSecret(result.data.secret)
      setExtra(result.data.extra)
      setVisible(true)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 1600)
    } else {
      setError(result.error)
    }
  }

  async function copyUsername() {
    if (!credential.username) return
    await navigator.clipboard.writeText(credential.username)
    setCopiedUsername(true)
    setTimeout(() => setCopiedUsername(false), 1600)
  }

  async function copyExtra() {
    if (!extra) return
    await navigator.clipboard.writeText(extra)
    setCopiedExtra(true)
    setTimeout(() => setCopiedExtra(false), 1600)
  }

  async function remove() {
    if (!window.confirm(`确定删除凭据「${credential.name}」吗？`)) return
    const result = await deleteCredential(credential.id)
    if (result.success) {
      router.refresh()
    } else {
      setError(result.error)
    }
  }

  return (
    <article className="relative rounded-xl border border-border/80 bg-card p-4.5 shadow-xs transition duration-200 hover:border-primary/40 hover:shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9.5 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30">
            <KeyRound className="size-4.5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="truncate text-sm font-bold text-foreground">{credential.name}</h3>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {typeLabels[credential.type] ?? credential.type}
              </span>
              {credential.accessMode === "RESTRICTED" ? (
                <span className="flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
                  <ShieldAlert className="size-2.5" />
                  指定可见
                </span>
              ) : null}
            </div>

            {credential.username ? (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="size-3 text-muted-foreground/70" />
                <span className="font-mono">{credential.username}</span>
                <button
                  type="button"
                  onClick={copyUsername}
                  className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-primary hover:bg-accent/50 transition font-medium"
                  title="复制用户名"
                >
                  {copiedUsername ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                  <span>{copiedUsername ? "已复制" : "复制"}</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {mayEdit ? (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setEditingAccess(value => !value)
                setEditing(false)
              }}
              title="设置可见范围"
              aria-label="设置可见范围"
            >
              <UsersRound className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setEditing(value => !value)
                setEditingAccess(false)
              }}
              title="编辑凭据"
              aria-label="编辑凭据"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={remove}
              title="删除凭据"
              aria-label="删除凭据"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3 pt-3 border-t">
          <CredentialEdit
            credential={credential}
            onDone={() => {
              setEditing(false)
              router.refresh()
            }}
          />
        </div>
      ) : editingAccess ? (
        <div className="mt-3 pt-3 border-t">
          <CredentialAccessEditor
            credentialId={credential.id}
            initialMode={credential.accessMode}
            initialSubjects={accessGrants}
            subjects={subjects}
            onDone={() => setEditingAccess(false)}
          />
        </div>
      ) : (
        <>
          {/* Secret Display Box */}
          <div className="mt-3.5 flex items-center justify-between rounded-lg border border-border/80 bg-muted/40 px-3 py-2">
            <div className="min-w-0 flex-1 font-mono text-xs font-medium text-foreground truncate pr-2">
              {visible ? secret : "••••••••••••••••"}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={
                  visible
                    ? () => {
                        setVisible(false)
                        setSecret("")
                        setExtra(null)
                      }
                    : reveal
                }
                disabled={pending}
              >
                {pending ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : visible ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
                <span>{visible ? "隐藏" : "查看"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 px-2.5 text-xs gap-1 font-medium bg-background",
                  copiedSecret && "text-primary border-primary",
                )}
                onClick={copySecret}
                disabled={pending}
              >
                {copiedSecret ? <Check className="size-3.5 text-primary" /> : <Clipboard className="size-3.5" />}
                <span>{copiedSecret ? "已复制密码" : "复制密码"}</span>
              </Button>
            </div>
          </div>

          {/* Extra Info Box if visible */}
          {visible && extra ? (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
              <div className="min-w-0 flex-1 font-mono text-muted-foreground truncate pr-2">
                <span className="font-semibold text-foreground mr-1.5">附加信息:</span>
                {extra}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] gap-1 shrink-0"
                onClick={copyExtra}
              >
                {copiedExtra ? <Check className="size-3 text-primary" /> : <Copy className="size-3" />}
                <span>{copiedExtra ? "已复制" : "复制"}</span>
              </Button>
            </div>
          ) : null}

          {credential.description ? (
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{credential.description}</p>
          ) : null}

          {error ? (
            <p className="mt-2 text-xs text-destructive rounded bg-destructive/10 px-2.5 py-1 font-medium">{error}</p>
          ) : null}
        </>
      )}
    </article>
  )
}

