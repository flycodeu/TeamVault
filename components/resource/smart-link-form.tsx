"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createResourceLink, updateResourceLink } from "@/lib/resource/link-actions"
import type { ResourceLink } from "@/lib/db/schema"
import { CredentialSubjectPicker, type CredentialSubjectGrant } from "@/components/credential/credential-subject-picker"

export function SmartLinkForm({
  resourceId,
  link,
  subjects,
  onSuccess,
}: {
  resourceId: string
  link?: ResourceLink
  subjects: { id: string; label: string; type: "USER" | "GROUP" }[]
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [accessMode, setAccessMode] = useState<"RESOURCE" | "RESTRICTED">(link?.accessMode as any ?? "RESOURCE")
  const [selectedSubjects, setSelectedSubjects] = useState<CredentialSubjectGrant[]>([])

  async function submit(formData: FormData) {
    setPending(true)
    setError("")
    
    const payload = {
      kind: (formData.get("kind") as any) || "WEBSITE",
      title: String(formData.get("title") ?? "").trim(),
      url: String(formData.get("url") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      accessMode,
      subjects: accessMode === "RESTRICTED" ? selectedSubjects : [],
    }

    const result = link
      ? await updateResourceLink(link.id, payload)
      : await createResourceLink(resourceId, payload)
      
    if (!result.success) {
      setError(result.error)
    } else {
      router.refresh()
      onSuccess?.()
    }
    setPending(false)
  }

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2 mt-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">环境类型</Label>
        <select
          name="kind"
          defaultValue={link?.kind ?? "WEBSITE"}
          className="flex h-9 w-full rounded-xl border border-input bg-card px-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1"
        >
          <option value="WEBSITE">网站 / 分站</option>
          <option value="EXTERNAL_DOCUMENT">在线文档 / 接口文档</option>
          <option value="OTHER">其他</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">名称标识</Label>
        <Input
          name="title"
          defaultValue={link?.title}
          placeholder="如：生产环境 / Prod"
          className="h-9 text-xs bg-card"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs font-semibold">环境访问地址 (URL)</Label>
        <Input
          name="url"
          type="text"
          defaultValue={link?.url}
          placeholder="https://..."
          className="h-9 text-xs bg-card"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs font-semibold">内容备注 (非必填)</Label>
        <textarea
          name="description"
          defaultValue={link?.description ?? ""}
          placeholder="该地址的具体用途，如：测试服内网穿透地址、账号需要发票申请..."
          className="flex min-h-[60px] w-full rounded-xl border border-input bg-card px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label className="text-xs font-semibold">可见范围控制</Label>
        <select
          value={accessMode}
          onChange={e => setAccessMode(e.target.value as any)}
          className="flex h-9 w-full rounded-xl border border-input bg-card px-3 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1"
        >
          <option value="RESOURCE">继承模块权限 (全局可见)</option>
          <option value="RESTRICTED">受限访问 (仅选中成员可见该环境及绑定的密码)</option>
        </select>
        
        {accessMode === "RESTRICTED" && (
          <div className="mt-3">
            <CredentialSubjectPicker
              subjects={subjects}
              value={selectedSubjects}
              onChange={setSelectedSubjects}
            />
          </div>
        )}
      </div>

      {error && <div className="sm:col-span-2 text-xs text-destructive font-medium">{error}</div>}

      <div className="sm:col-span-2 flex items-center justify-end gap-3 mt-2">
        {onSuccess && (
          <Button type="button" variant="outline" onClick={onSuccess}>取消</Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "保存中..." : link ? "保存更改" : "添加环境"}
        </Button>
      </div>
    </form>
  )
}
