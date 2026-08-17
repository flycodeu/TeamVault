"use client"

import { useState, useMemo } from "react"
import { Check, ShieldCheck, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { updateResourcePermissions } from "@/lib/permission/actions"
import { updateResourceVisibility } from "@/lib/resource/actions"
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
  visibility,
  subjects,
  initial,
}: {
  resourceId: string
  visibility?: "TEAM" | "GROUP" | "PRIVATE" | "PUBLIC"
  subjects: Subject[]
  initial: Grant[]
}) {
  const [grants, setGrants] = useState(initial)
  const [currentVis, setCurrentVis] = useState(visibility ?? "PRIVATE")
  const [message, setMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isVisSaving, setIsVisSaving] = useState(false)

  const [activeSubjectIds, setActiveSubjectIds] = useState<Set<string>>(() => {
    const active = new Set<string>()
    initial.forEach((grant) => {
      if (
        grant.canView ||
        grant.canViewSecret ||
        grant.canViewFile ||
        grant.canDownload ||
        grant.canEdit ||
        grant.canShare
      ) {
        active.add(`${grant.subjectType}-${grant.subjectId}`)
      }
    })
    return active
  })

  const [selectedNewSubject, setSelectedNewSubject] = useState<string>("")

  const activeSubjects = useMemo(
    () => subjects.filter((s) => activeSubjectIds.has(`${s.type}-${s.id}`)),
    [subjects, activeSubjectIds],
  )
  const inactiveSubjects = useMemo(
    () => subjects.filter((s) => !activeSubjectIds.has(`${s.type}-${s.id}`)),
    [subjects, activeSubjectIds],
  )

  function addSubject() {
    if (!selectedNewSubject) return
    setActiveSubjectIds((prev) => {
      const next = new Set(prev)
      next.add(selectedNewSubject)
      return next
    })
    setSelectedNewSubject("")
  }

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

  async function toggleVisibility() {
    setIsVisSaving(true)
    setMessage("")
    try {
      const nextVis = currentVis === "TEAM" ? "PRIVATE" : "TEAM"
      const result = await updateResourceVisibility(resourceId, nextVis)
      if (result.success) {
        setCurrentVis(nextVis)
        setMessage(`✅ 已切换为${nextVis === "TEAM" ? "「全员可见」" : "「私有专属」"}`)
        setTimeout(() => setMessage(""), 3000)
      } else {
        setMessage(`❌ 切换失败: ${result.error}`)
      }
    } finally {
      setIsVisSaving(false)
    }
  }

  const isGlobalView = currentVis === "TEAM" || currentVis === "PUBLIC"

  function renderMatrix(title: string, items: Subject[]) {
    if (items.length === 0) return null
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-foreground pl-2 border-l-2 border-primary">{title}</h3>
        <div className="overflow-x-auto rounded-xl border border-border/80 shadow-xs">
          <div className="min-w-[700px]">
            {/* Matrix Header */}
            <div className="grid grid-cols-[180px_repeat(6,1fr)] bg-muted/40 px-4 py-3 border-b border-border/80">
              <div className="flex items-center text-xs font-bold text-foreground">
                授权主体
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
              {items.map((subject) => {
                const grant = grantFor(subject)
                return (
                  <div
                    key={`${subject.type}-${subject.id}`}
                    className="grid grid-cols-[180px_repeat(6,1fr)] items-center px-4 py-3.5 transition-colors hover:bg-accent/20"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {subject.label}
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
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Global Visibility Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            全员基础查阅权限
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", isGlobalView ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
              {isGlobalView ? "已开启" : "已关闭"}
            </span>
          </h4>
        </div>
        <Button
          variant={isGlobalView ? "default" : "outline"}
          onClick={toggleVisibility}
          disabled={isVisSaving}
          className="shrink-0 h-8 text-xs font-semibold"
        >
          {isGlobalView ? "关闭全员查阅" : "开启全员查阅"}
        </Button>
      </div>

      {/* Add Subject Section */}
      <div className="flex items-center gap-3 bg-card p-4 rounded-xl border border-border/80 shadow-xs">
        <div className="flex-1 max-w-sm">
          <select
            value={selectedNewSubject}
            onChange={(e) => setSelectedNewSubject(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">-- 选择要授权的群组或成员 --</option>
            {inactiveSubjects.filter(s => s.type === "GROUP").length > 0 && (
              <optgroup label="👥 群组">
                {inactiveSubjects.filter(s => s.type === "GROUP").map(s => (
                  <option key={`${s.type}-${s.id}`} value={`${s.type}-${s.id}`}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            )}
            {inactiveSubjects.filter(s => s.type === "USER").length > 0 && (
              <optgroup label="👤 成员">
                {inactiveSubjects.filter(s => s.type === "USER").map(s => (
                  <option key={`${s.type}-${s.id}`} value={`${s.type}-${s.id}`}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <Button size="sm" onClick={addSubject} disabled={!selectedNewSubject} className="h-9 gap-1.5 shadow-xs">
          <Plus className="size-4" />
          <span>添加至矩阵</span>
        </Button>
      </div>

      {activeSubjects.length === 0 ? (
        <div className="rounded-xl border border-border/80 border-dashed p-10 text-center text-sm text-muted-foreground shadow-xs">
          暂无可授权的人员或群组
        </div>
      ) : (
        <div className="space-y-6">
          {renderMatrix("👥 团队群组授权", activeSubjects.filter(s => s.type === "GROUP"))}
          {renderMatrix("👤 独立成员授权", activeSubjects.filter(s => s.type === "USER"))}
        </div>
      )}

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
