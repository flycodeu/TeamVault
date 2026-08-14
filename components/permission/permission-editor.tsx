"use client"

import { useState } from "react"
import { Check, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { updateResourcePermissions } from "@/lib/permission/actions"
import { cn } from "@/lib/utils"

type Subject = { id: string; label: string; type: "USER" | "GROUP" }
type Grant = {
  subjectType: "USER" | "GROUP"
  subjectId: string
  canView: boolean
  canViewSecret: boolean
  canViewFile: boolean
  canDownload: boolean
  canEdit: boolean
  canShare: boolean
}

const keys = [
  { key: "canView", label: "基础查看", desc: "查看元数据" },
  { key: "canViewFile", label: "附件文件", desc: "浏览普通文件" },
  { key: "canDownload", label: "下载附件", desc: "下载源文件" },
  { key: "canViewSecret", label: "密码/凭据", desc: "解密高敏账号" },
  { key: "canEdit", label: "修改编辑", desc: "更新模块信息" },
  { key: "canShare", label: "共享管理", desc: "生成分享链接" },
] as const

export function PermissionEditor({
  resourceId,
  subjects,
  initial,
}: {
  resourceId: string
  subjects: Subject[]
  initial: Grant[]
}) {
  const [grants, setGrants] = useState(initial)
  const [message, setMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  function grantFor(subject: Subject) {
    return grants.find(
      (item) => item.subjectType === subject.type && item.subjectId === subject.id,
    )
  }

  function toggle(subject: Subject, key: typeof keys[number]["key"]) {
    const existing = grantFor(subject) ?? {
      subjectType: subject.type,
      subjectId: subject.id,
      canView: false,
      canViewSecret: false,
      canViewFile: false,
      canDownload: false,
      canEdit: false,
      canShare: false,
    }
    const next = { ...existing, [key]: !existing[key] }

    // Downward cascade: if canView is turned off, turn off EVERYTHING.
    if (key === "canView" && !next.canView) {
      next.canViewSecret = false
      next.canViewFile = false
      next.canDownload = false
      next.canEdit = false
      next.canShare = false
    }

    // Upward cascade: If they are given any advanced permission, they must have canView.
    if (key !== "canView" && next[key]) {
      next.canView = true
    }

    // Specific upward cascade: If given Edit, they should also be able to view secrets and files.
    if (key === "canEdit" && next.canEdit) {
      next.canViewSecret = true
      next.canViewFile = true
      next.canDownload = true
    }

    setGrants([
      ...grants.filter(
        (item) => !(item.subjectType === subject.type && item.subjectId === subject.id),
      ),
      next,
    ])
  }

  async function save() {
    setIsSaving(true)
    setMessage("")
    try {
      const activeGrants = grants.filter((item) =>
        Object.values(item).some((value) => value === true),
      )
      const result = await updateResourcePermissions(resourceId, activeGrants)
      setMessage(result.success ? "✅ 权限设置已成功保存并生效" : `❌ 保存失败: ${result.error}`)
      if (result.success) {
        setTimeout(() => setMessage(""), 3000)
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-border/80 shadow-xs">
        <div className="min-w-[700px]">
          {/* Matrix Header */}
          <div className="grid grid-cols-[180px_repeat(6,1fr)] bg-muted/40 px-4 py-3 border-b border-border/80">
            <div className="flex items-center text-xs font-bold text-foreground">
              授权主体 (成员/群组)
            </div>
            {keys.map(({ key, label, desc }) => (
              <div key={key} className="flex flex-col items-center justify-center text-center">
                <span className="text-xs font-bold text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">{desc}</span>
              </div>
            ))}
          </div>

          {/* Matrix Body */}
          <div className="divide-y divide-border/60">
            {subjects.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                暂无可授权的人员或群组
              </div>
            ) : null}

            {subjects.map((subject) => {
              const grant = grantFor(subject)
              const isGroup = subject.type === "GROUP"

              return (
                <div
                  key={`${subject.type}-${subject.id}`}
                  className="grid grid-cols-[180px_repeat(6,1fr)] items-center px-4 py-3.5 transition-colors hover:bg-accent/20"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {subject.label}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground mt-0.5">
                      {isGroup ? "👥 权限群组" : "👤 团队成员"}
                    </span>
                  </div>

                  {keys.map(({ key }) => {
                    const isChecked = grant?.[key] ?? false
                    return (
                      <div key={key} className="flex justify-center">
                        <label
                          className={cn(
                            "relative flex size-6 cursor-pointer items-center justify-center rounded-md border transition-all duration-200",
                            isChecked
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-input bg-card text-transparent hover:border-primary/50 hover:bg-accent/40",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isChecked}
                            onChange={() => toggle(subject, key)}
                            aria-label={`${subject.label} ${key}`}
                          />
                          <Check className="size-3.5" />
                        </label>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="flex flex-wrap items-center gap-4 bg-accent/20 p-4 rounded-xl border border-border/50">
        <Button size="sm" onClick={save} disabled={isSaving} className="gap-1.5 shadow-xs h-9">
          <ShieldCheck className="size-4" />
          <span>{isSaving ? "保存中..." : "保存权限设置"}</span>
        </Button>
        {message ? (
          <span className="text-xs font-medium text-foreground animate-in fade-in slide-in-from-left-2">
            {message}
          </span>
        ) : null}
      </div>
    </div>
  )
}
