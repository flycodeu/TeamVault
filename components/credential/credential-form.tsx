"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCredential } from "@/lib/credential/actions"
import { CredentialSubjectPicker, type CredentialSubjectGrant } from "./credential-subject-picker"

type Subject = { id: string; label: string; type: "USER" | "GROUP" }

export function CredentialForm({ resourceId, subjects }: { resourceId: string; subjects: Subject[] }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [accessMode, setAccessMode] = useState<"RESOURCE" | "RESTRICTED">("RESOURCE")
  const [selectedSubjects, setSelectedSubjects] = useState<CredentialSubjectGrant[]>([])

  async function submit(formData: FormData) {
    setPending(true)
    setError("")
    const result = await createCredential(resourceId, {
      name: String(formData.get("name") ?? ""),
      type: formData.get("type") as "PASSWORD",
      username: String(formData.get("username") ?? ""),
      secret: String(formData.get("secret") ?? ""),
      extra: String(formData.get("extra") ?? ""),
      description: String(formData.get("description") ?? ""),
      accessMode,
      subjects: accessMode === "RESTRICTED" ? selectedSubjects : [],
    })
    if (!result.success) {
      setError(result.error)
      setPending(false)
      return
    }
    router.refresh()
  }

  return (
    <form action={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="credential-name">名称</Label><Input id="credential-name" name="name" placeholder="例如：运营账号" required /></div>
        <div className="space-y-2"><Label htmlFor="credential-type">类型</Label><select id="credential-type" name="type" defaultValue="PASSWORD" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="PASSWORD">密码</option><option value="API_KEY">API Key</option><option value="TOKEN">Token</option><option value="SSH">SSH</option><option value="DATABASE">数据库</option><option value="ACCESS_KEY">Access Key</option><option value="TOTP">TOTP</option><option value="OTHER">其他</option></select></div>
        <div className="space-y-2"><Label htmlFor="credential-username">用户名</Label><Input id="credential-username" name="username" /></div>
        <div className="space-y-2"><Label htmlFor="credential-secret">密码 / Secret</Label><Input id="credential-secret" name="secret" type="password" required autoComplete="new-password" /></div>
      </div>
      <div className="space-y-2">
        <Label>可见范围</Label>
        <div className="grid grid-cols-2 gap-2"><Button type="button" variant={accessMode === "RESOURCE" ? "default" : "outline"} onClick={() => setAccessMode("RESOURCE")}>沿用模块权限</Button><Button type="button" variant={accessMode === "RESTRICTED" ? "default" : "outline"} onClick={() => setAccessMode("RESTRICTED")}>指定成员</Button></div>
        {accessMode === "RESTRICTED" ? <CredentialSubjectPicker subjects={subjects} value={selectedSubjects} onChange={setSelectedSubjects} /> : null}
      </div>
      <details className="rounded-md border px-3 py-2"><summary className="cursor-pointer text-xs font-medium">更多字段</summary><div className="mt-3 grid gap-3"><Input name="extra" placeholder="额外信息" /><Input name="description" placeholder="说明" /></div></details>
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "保存中" : "添加账号"}</Button>
    </form>
  )
}
