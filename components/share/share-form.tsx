"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createFileShare, createResourceShare } from "@/lib/share/actions"

export function ShareForm({ resourceId, files }: { resourceId: string; files: Array<{ id: string; name: string }> }) {
  const [url, setUrl] = useState("")
  const [error, setError] = useState("")
  async function submit(form: FormData) {
    setError(""); setUrl("")
    const target = String(form.get("target")); const expires = String(form.get("expiresAt") ?? "")
    const options = { password: String(form.get("password") ?? "") || undefined, expiresAt: expires ? new Date(`${expires}T23:59:59`) : undefined, allowPreview: form.get("allowPreview") === "on", allowDownload: form.get("allowDownload") === "on", maxViews: form.get("maxViews") ? Number(form.get("maxViews")) : undefined }
    const result = target === "resource" ? await createResourceShare({ resourceId, ...options }) : await createFileShare({ fileId: target, ...options })
    if (!result.success) setError(result.error); else setUrl(`${window.location.origin}/s/${result.data.token}`)
  }
  return <form action={submit} className="space-y-3"><select name="target" className="h-9 w-full rounded-md border bg-background px-2 text-xs"><option value="resource">整个模块</option>{files.map(file => <option key={file.id} value={file.id}>{file.name}</option>)}</select><Input name="password" type="password" placeholder="访问密码（可选）" /><div className="grid grid-cols-2 gap-3"><Input name="expiresAt" type="date" aria-label="过期日期" /><Input name="maxViews" type="number" min="1" placeholder="最大访问次数" /></div><div className="flex gap-4 text-xs"><label className="flex items-center gap-2"><input name="allowPreview" type="checkbox" defaultChecked />允许预览</label><label className="flex items-center gap-2"><input name="allowDownload" type="checkbox" />允许下载</label></div><Button size="sm">创建分享</Button>{error ? <p className="text-xs text-destructive">{error}</p> : null}{url ? <div className="rounded-md bg-muted p-3"><p className="text-[11px] text-muted-foreground">链接仅在本次创建后显示，请妥善保存。</p><p className="mt-1 break-all font-mono text-xs">{url}</p></div> : null}</form>
}
