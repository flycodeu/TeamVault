"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { updateResourcePermissions } from "@/lib/permission/actions"

type Subject = { id: string; label: string; type: "USER" | "GROUP" }
type Grant = { subjectType: "USER" | "GROUP"; subjectId: string; canView: boolean; canViewSecret: boolean; canViewFile: boolean; canDownload: boolean; canEdit: boolean; canShare: boolean }
const keys = [["canView", "查看"], ["canViewSecret", "Secret"], ["canViewFile", "文件"], ["canDownload", "下载"], ["canEdit", "编辑"], ["canShare", "分享"]] as const

export function PermissionEditor({ resourceId, subjects, initial }: { resourceId: string; subjects: Subject[]; initial: Grant[] }) {
  const [grants, setGrants] = useState(initial)
  const [message, setMessage] = useState("")
  function grantFor(subject: Subject) { return grants.find(item => item.subjectType === subject.type && item.subjectId === subject.id) }
  function toggle(subject: Subject, key: typeof keys[number][0]) {
    const existing = grantFor(subject) ?? { subjectType: subject.type, subjectId: subject.id, canView: false, canViewSecret: false, canViewFile: false, canDownload: false, canEdit: false, canShare: false }
    const next = { ...existing, [key]: !existing[key] }
    if (key !== "canView" && next[key]) next.canView = true
    setGrants([...grants.filter(item => !(item.subjectType === subject.type && item.subjectId === subject.id)), next])
  }
  async function save() { const result = await updateResourcePermissions(resourceId, grants.filter(item => Object.values(item).some(value => value === true))); setMessage(result.success ? "权限已保存" : result.error) }
  return <div><div className="overflow-x-auto rounded-lg border"><div className="grid min-w-[640px] grid-cols-[180px_repeat(6,1fr)] bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground"><span>用户 / 小组</span>{keys.map(([, label]) => <span key={label} className="text-center">{label}</span>)}</div>{subjects.map(subject => { const grant = grantFor(subject); return <div key={`${subject.type}-${subject.id}`} className="grid min-w-[640px] grid-cols-[180px_repeat(6,1fr)] items-center border-t px-3 py-3 text-xs"><span className="truncate font-medium">{subject.label}<small className="ml-1 text-muted-foreground">{subject.type === "GROUP" ? "组" : "用户"}</small></span>{keys.map(([key]) => <label key={key} className="flex justify-center"><input type="checkbox" checked={grant?.[key] ?? false} onChange={() => toggle(subject, key)} aria-label={`${subject.label} ${key}`} /></label>)}</div> })}</div><div className="mt-3 flex items-center gap-3"><Button size="sm" onClick={save}>保存权限</Button>{message ? <span className="text-xs text-muted-foreground">{message}</span> : null}</div></div>
}
