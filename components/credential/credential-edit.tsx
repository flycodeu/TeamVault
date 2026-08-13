"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateCredential } from "@/lib/credential/actions"

export function CredentialEdit({ credential, onDone }: { credential: { id: string; name: string; type: string; username: string | null; description: string | null }; onDone: () => void }) {
  const [error, setError] = useState("")
  async function submit(form: FormData) { const result = await updateCredential(credential.id, { name: String(form.get("name") ?? ""), type: form.get("type") as "PASSWORD", username: String(form.get("username") ?? ""), secret: String(form.get("secret") ?? "") || undefined, extra: String(form.get("extra") ?? "") || undefined, description: String(form.get("description") ?? "") }); if (result.success) onDone(); else setError(result.error) }
  return <form action={submit} className="mt-4 space-y-3"><Input name="name" defaultValue={credential.name} placeholder="名称" required /><select name="type" defaultValue={credential.type} className="h-9 w-full rounded-md border bg-background px-2 text-xs"><option value="PASSWORD">Password</option><option value="API_KEY">API Key</option><option value="TOKEN">Token</option><option value="SSH">SSH</option><option value="DATABASE">Database</option><option value="ACCESS_KEY">Access Key</option><option value="TOTP">TOTP</option><option value="OTHER">其他</option></select><Input name="username" defaultValue={credential.username ?? ""} placeholder="用户名" /><Input name="secret" type="password" placeholder="留空则保留当前 Secret" autoComplete="new-password" /><Input name="extra" placeholder="额外信息（留空则保留）" /><Input name="description" defaultValue={credential.description ?? ""} placeholder="说明" />{error ? <p className="text-xs text-destructive">{error}</p> : null}<div className="flex gap-2"><Button size="sm">保存</Button><Button type="button" variant="ghost" size="sm" onClick={onDone}>取消</Button></div></form>
}
