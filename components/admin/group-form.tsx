"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createGroup } from "@/lib/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function GroupForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  async function submit(form: FormData) { const result = await createGroup({ name: String(form.get("name") ?? ""), description: String(form.get("description") ?? "") }); if (!result.success) setError(result.error); else router.refresh() }
  return <form action={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="group-name">小组名称</Label><Input id="group-name" name="name" required /></div><div className="space-y-2"><Label htmlFor="group-description">说明</Label><Input id="group-description" name="description" /></div>{error ? <p className="text-sm text-destructive">{error}</p> : null}<Button>创建小组</Button></form>
}
