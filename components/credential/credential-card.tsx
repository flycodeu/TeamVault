"use client"

import { Check, Clipboard, Eye, EyeOff, KeyRound, LoaderCircle, Pencil, Trash2, UsersRound } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { deleteCredential, revealCredential } from "@/lib/credential/actions"
import { CredentialAccessEditor } from "./credential-access-editor"
import { CredentialEdit } from "./credential-edit"
import type { CredentialSubjectGrant } from "./credential-subject-picker"

type Subject = { id: string; label: string; type: "USER" | "GROUP" }
type CredentialCardProps = {
  credential: { id: string; name: string; type: string; username: string | null; description: string | null; accessMode: "RESOURCE" | "RESTRICTED" }
  mayEdit: boolean
  subjects: Subject[]
  accessGrants: CredentialSubjectGrant[]
}

export function CredentialCard({ credential, mayEdit, subjects, accessGrants }: CredentialCardProps) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingAccess, setEditingAccess] = useState(false)
  const [secret, setSecret] = useState("")
  const [extra, setExtra] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  async function reveal() {
    setPending(true)
    setError("")
    const result = await revealCredential(credential.id)
    if (result.success) { setSecret(result.data.secret); setExtra(result.data.extra); setVisible(true) }
    else setError(result.error)
    setPending(false)
  }

  async function copy() {
    const result = await revealCredential(credential.id, true)
    if (result.success) {
      await navigator.clipboard.writeText(result.data.secret)
      setSecret(result.data.secret)
      setVisible(true)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } else setError(result.error)
  }

  async function remove() {
    if (!window.confirm("删除这个凭据？")) return
    const result = await deleteCredential(credential.id)
    if (result.success) router.refresh()
    else setError(result.error)
  }

  return (
    <article className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><KeyRound className="size-4" /></span><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-medium">{credential.name}</h3>{credential.accessMode === "RESTRICTED" ? <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">指定可见</span> : null}</div><p className="text-xs text-muted-foreground">{credential.type.replaceAll("_", " ")}{credential.username ? ` · ${credential.username}` : ""}</p></div></div>
        {mayEdit ? <div className="flex"><Button variant="ghost" size="icon" onClick={() => { setEditingAccess(value => !value); setEditing(false) }} title="可见范围" aria-label="设置可见范围"><UsersRound /></Button><Button variant="ghost" size="icon" onClick={() => { setEditing(value => !value); setEditingAccess(false) }} title="编辑凭据" aria-label="编辑凭据"><Pencil /></Button><Button variant="ghost" size="icon" onClick={remove} title="删除凭据" aria-label="删除凭据"><Trash2 /></Button></div> : null}
      </div>
      {editing ? <CredentialEdit credential={credential} onDone={() => { setEditing(false); router.refresh() }} /> : editingAccess ? <CredentialAccessEditor credentialId={credential.id} initialMode={credential.accessMode} initialSubjects={accessGrants} subjects={subjects} onDone={() => setEditingAccess(false)} /> : <><p className="mt-4 rounded-md bg-muted px-3 py-2 font-mono text-xs">{visible ? secret : "••••••••••••"}</p>{visible && extra ? <p className="mt-2 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">{extra}</p> : null}<div className="mt-3 flex items-center gap-2"><Button variant="outline" size="sm" onClick={visible ? () => { setVisible(false); setSecret(""); setExtra(null) } : reveal} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : visible ? <EyeOff /> : <Eye />}{visible ? "隐藏" : "显示"}</Button><Button variant="ghost" size="sm" onClick={copy} disabled={pending}>{copied ? <Check className="text-primary" /> : <Clipboard />}{copied ? "已复制" : "复制"}</Button></div>{credential.description ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{credential.description}</p> : null}{error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}</>}
    </article>
  )
}
