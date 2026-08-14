"use client"

import {
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  Users,
  Users2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { CredentialSubjectPicker, type CredentialSubjectGrant } from "@/components/credential/credential-subject-picker"
import { ResourceDeleteButton } from "@/components/resource/resource-delete-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Resource } from "@/lib/db/schema"
import { createWebsiteWithCredential, updateWebsiteWithCredential } from "@/lib/resource/actions"
import { cn } from "@/lib/utils"

type Subject = { id: string; label: string; type: "USER" | "GROUP" }

export type WebsiteFormCredentialItem = {
  id?: string
  name?: string | null
  username?: string | null
  description?: string | null
  accessMode: "RESOURCE" | "RESTRICTED"
  subjects: CredentialSubjectGrant[]
}

type AccountItemState = {
  tempId: string
  id?: string
  name: string
  username: string
  password: string
  description: string
  showPassword?: boolean
  accessMode: "RESOURCE" | "RESTRICTED"
  selectedSubjects: CredentialSubjectGrant[]
}

const commonCategories = [
  "研发平台",
  "运维系统",
  "业务后台",
  "监控看板",
  "设计工具",
  "文档知识",
  "常用办公",
]

const visibilityOptions: {
  value: "TEAM" | "GROUP" | "PRIVATE" | "PUBLIC"
  label: string
  desc: string
  icon: typeof Users
}[] = [
  {
    value: "TEAM",
    label: "团队可见",
    desc: "所有团队成员可见",
    icon: Users,
  },
  {
    value: "GROUP",
    label: "指定群组",
    desc: "仅授权群组成员可见",
    icon: Shield,
  },
  {
    value: "PRIVATE",
    label: "私有专属",
    desc: "仅您个人可见",
    icon: Lock,
  },
  {
    value: "PUBLIC",
    label: "全员公开",
    desc: "对外开放访问",
    icon: Globe2,
  },
]

export function WebsiteForm({
  website,
  initialCredentials = [],
  subjects = [],
  mayDelete = false,
}: {
  website?: Resource
  initialCredentials?: WebsiteFormCredentialItem[]
  subjects?: Subject[]
  mayDelete?: boolean
}) {
  const router = useRouter()
  const isEdit = Boolean(website?.id)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")

  // Website base fields
  const [name, setName] = useState(website?.name ?? "")
  const [url, setUrl] = useState(website?.url ?? "")
  const [category, setCategory] = useState(website?.category ?? "")
  const [description, setDescription] = useState(website?.description ?? "")
  const [visibility, setVisibility] = useState<"TEAM" | "GROUP" | "PRIVATE" | "PUBLIC">(
    website?.visibility ?? "TEAM",
  )

  // Multiple Accounts state
  const [accounts, setAccounts] = useState<AccountItemState[]>(() => {
    if (initialCredentials.length > 0) {
      return initialCredentials.map((c, idx) => ({
        tempId: `init-${c.id || idx}`,
        id: c.id,
        name: c.name || `账号 #${idx + 1}`,
        username: c.username || "",
        password: "",
        description: c.description || "",
        showPassword: false,
        accessMode: c.accessMode,
        selectedSubjects: c.subjects || [],
      }))
    }
    return []
  })

  // Quick Batch Subjects state for bulk apply
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [batchSubjects, setBatchSubjects] = useState<CredentialSubjectGrant[]>([])

  function handleAddAccount() {
    setAccounts(prev => [
      ...prev,
      {
        tempId: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: prev.length === 0 ? "主管理员账号" : `账号 #${prev.length + 1}`,
        username: "",
        password: "",
        description: "",
        showPassword: false,
        accessMode: "RESOURCE",
        selectedSubjects: [],
      },
    ])
  }

  function handleRemoveAccount(tempId: string) {
    setAccounts(prev => prev.filter(a => a.tempId !== tempId))
  }

  function updateAccount(tempId: string, updates: Partial<AccountItemState>) {
    setAccounts(prev =>
      prev.map(a => (a.tempId === tempId ? { ...a, ...updates } : a)),
    )
  }

  // Bulk / All Authorization Actions
  function handleMakeAllPublic() {
    setAccounts(prev =>
      prev.map(a => ({
        ...a,
        accessMode: "RESOURCE",
      })),
    )
  }

  function handleApplyBatchWhitelist() {
    if (!batchSubjects.length) return
    setAccounts(prev =>
      prev.map(a => ({
        ...a,
        accessMode: "RESTRICTED",
        selectedSubjects: [...batchSubjects],
      })),
    )
    setShowBatchModal(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("请输入网站名称")
      return
    }
    if (!url.trim()) {
      setError("请输入网站访问地址 (URL)")
      return
    }

    setError("")
    startTransition(async () => {
      const credentialsPayload = accounts
        .filter(a => a.username.trim() || a.password.trim() || a.name.trim() || a.id)
        .map(a => ({
          id: a.id,
          name: a.name.trim() || undefined,
          username: a.username.trim() || undefined,
          password: a.password.trim() || undefined,
          description: a.description.trim() || undefined,
          accessMode: a.accessMode,
          subjects: a.accessMode === "RESTRICTED" ? a.selectedSubjects : undefined,
        }))

      if (isEdit && website) {
        const res = await updateWebsiteWithCredential({
          id: website.id,
          name,
          url,
          category: category.trim() || undefined,
          description: description.trim() || undefined,
          visibility,
          credentials: credentialsPayload,
        })

        if (!res.success) {
          setError(res.error)
          return
        }
        router.push(`/websites/${website.id}`)
        router.refresh()
      } else {
        const res = await createWebsiteWithCredential({
          name,
          url,
          category: category.trim() || undefined,
          description: description.trim() || undefined,
          visibility,
          credentials: credentialsPayload,
        })

        if (!res.success) {
          setError(res.error)
          return
        }
        router.push(`/websites/${res.data.id}`)
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12">
        {/* ========================================================= */}
        {/* Left Column (8 cols): Website Info + Multi-Account Cards */}
        {/* ========================================================= */}
        <div className="space-y-5 lg:col-span-8">
          {/* Card 1: Website Basic Info */}
          <section className="rounded-2xl border border-border/80 bg-card p-4.5 md:p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <span className="grid size-7 place-items-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Globe2 className="size-4" />
              </span>
              <h2 className="text-sm font-bold text-foreground">基础信息</h2>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {/* Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="web-name" className="text-xs font-semibold text-foreground">
                  网站 / 系统名称 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="web-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="例如：阿里云控制台、GitLab 代码托管"
                  className="h-9 text-xs md:text-sm bg-background/70 placeholder:text-muted-foreground/50"
                  required
                />
              </div>

              {/* URL */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="web-url" className="text-xs font-semibold text-foreground">
                  直达网址 (URL) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <ExternalLink className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
                  <Input
                    id="web-url"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://console.aliyun.com"
                    className="h-9 pl-8.5 font-mono text-xs md:text-sm bg-background/70 placeholder:text-muted-foreground/50"
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="web-category" className="text-xs font-semibold text-foreground">
                  业务分类
                </Label>
                <Input
                  id="web-category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="例如：研发平台、运维系统、财务系统"
                  className="h-9 text-xs md:text-sm bg-background/70 placeholder:text-muted-foreground/50"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {commonCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "rounded-md border px-2 py-0.5 text-[11px] transition",
                        category === cat
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="web-desc" className="text-xs font-semibold text-foreground">
                  网站简介与说明（可选）
                </Label>
                <textarea
                  id="web-desc"
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="简要描述该网站的用途或使用注意事项..."
                  className="w-full rounded-xl border border-input bg-background/70 p-2.5 text-xs md:text-sm text-foreground shadow-2xs transition focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/50 resize-none"
                />
              </div>
            </div>
          </section>

          {/* ========================================================= */}
          {/* Card 2: Multiple Accounts & Individual/Batch Authorization*/}
          {/* ========================================================= */}
          <section className="rounded-2xl border border-border/80 bg-card p-4.5 md:p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <KeyRound className="size-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    登录账号与密码
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    支持绑定多个账号（如管理员、测试、只读），支持各个账号单独授权或一键批量授权
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAccount}
                  className="h-8 px-2.5 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Plus className="size-3.5" />
                  <span>添加账号密码</span>
                </Button>
              </div>
            </div>

            {/* Bulk Authorization Toolbar (When multiple accounts exist) */}
            {accounts.length > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs">
                <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-semibold">
                  <ShieldCheck className="size-4" />
                  <span>快捷批量授权：</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMakeAllPublic}
                    className="h-7 px-2 text-[11px] font-medium bg-card text-foreground hover:bg-accent/40"
                    title="将所有账号设为全员公开"
                  >
                    <Users2 className="size-3 text-muted-foreground" />
                    <span>全部设为全员公开</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBatchModal(true)}
                    className="h-7 px-2 text-[11px] font-medium bg-card text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                    title="一键将选定人员应用到所有账号"
                  >
                    <Shield className="size-3" />
                    <span>统一应用授权白名单...</span>
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Batch Whitelist Selector Modal Box */}
            {showBatchModal ? (
              <div className="rounded-xl border border-blue-500/30 bg-card p-4 space-y-3 shadow-md animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <ShieldCheck className="size-4 text-blue-500" />
                    <span>批量设置所有账号的查看白名单</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="text-xs text-muted-foreground hover:text-foreground p-1"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  勾选后将一键把以下白名单同时应用到当前所有 ({accounts.length}) 个账号：
                </p>
                <CredentialSubjectPicker
                  subjects={subjects}
                  value={batchSubjects}
                  onChange={setBatchSubjects}
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBatchModal(false)}
                    className="h-7 px-2 text-xs"
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApplyBatchWhitelist}
                    disabled={!batchSubjects.length}
                    className="h-7 px-3 text-xs font-bold"
                  >
                    应用到所有账号
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Account List */}
            {accounts.length > 0 ? (
              <div className="space-y-4">
                {accounts.map((acc, index) => {
                  return (
                    <div
                      key={acc.tempId}
                      className="group relative rounded-2xl border border-border/80 bg-background/50 p-4 space-y-3.5 transition hover:border-primary/40 shadow-2xs"
                    >
                      {/* Account Card Header */}
                      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                            {index + 1}
                          </span>
                          <Input
                            value={acc.name}
                            onChange={e => updateAccount(acc.tempId, { name: e.target.value })}
                            placeholder={`账号 #${index + 1}（例如：主管理员、测试账号）`}
                            className="h-7 w-48 font-bold text-xs bg-card placeholder:text-muted-foreground/50"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAccount(acc.tempId)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="移除此账号"
                        >
                          <Trash2 className="size-3.5" />
                          <span>移除</span>
                        </Button>
                      </div>

                      {/* Account Inputs */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {/* Username */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            登录用户名 / 账号
                          </Label>
                          <div className="relative">
                            <User className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
                            <Input
                              value={acc.username}
                              onChange={e => updateAccount(acc.tempId, { username: e.target.value })}
                              placeholder="admin@company.com"
                              className="h-8.5 pl-8.5 text-xs bg-card font-mono placeholder:text-muted-foreground/50"
                            />
                          </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-muted-foreground">
                            登录密码
                          </Label>
                          <div className="relative">
                            <Lock className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
                            <Input
                              type={acc.showPassword ? "text" : "password"}
                              value={acc.password}
                              onChange={e => updateAccount(acc.tempId, { password: e.target.value })}
                              placeholder={acc.id ? "留空不修改已有密码" : "输入密码"}
                              className="h-8.5 pl-8.5 pr-8.5 text-xs bg-card font-mono placeholder:text-muted-foreground/50"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updateAccount(acc.tempId, { showPassword: !acc.showPassword })
                              }
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                              title={acc.showPassword ? "隐藏密码" : "显示密码"}
                            >
                              {acc.showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs font-medium text-muted-foreground">
                            用途说明（可选）
                          </Label>
                          <Input
                            value={acc.description}
                            onChange={e => updateAccount(acc.tempId, { description: e.target.value })}
                            placeholder="例如：具有全站主控权限、仅用于联调测试"
                            className="h-8 text-xs bg-card placeholder:text-muted-foreground/50"
                          />
                        </div>
                      </div>

                      {/* Individual Authorization Box for THIS Account */}
                      <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="size-3.5 text-primary" />
                            <span className="text-xs font-bold text-foreground">
                              该账号独立授权范围
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateAccount(acc.tempId, { accessMode: "RESOURCE" })}
                              className={cn(
                                "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                                acc.accessMode === "RESOURCE"
                                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                                  : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground",
                              )}
                            >
                              全员公开
                            </button>
                            <button
                              type="button"
                              onClick={() => updateAccount(acc.tempId, { accessMode: "RESTRICTED" })}
                              className={cn(
                                "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                                acc.accessMode === "RESTRICTED"
                                  ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30"
                                  : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground",
                              )}
                            >
                              指定人员白名单
                            </button>
                          </div>
                        </div>

                        {/* Individual Subject Picker */}
                        {acc.accessMode === "RESTRICTED" ? (
                          <div className="pt-2 border-t border-border/50">
                            <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
                              勾选有权查看此【{acc.name || `账号 #${index + 1}`}】的群组或成员（管理员始终享有全局查看权）：
                            </p>
                            <CredentialSubjectPicker
                              subjects={subjects}
                              value={acc.selectedSubjects}
                              onChange={selectedSubjects =>
                                updateAccount(acc.tempId, { selectedSubjects })
                              }
                            />
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground/70">
                            该账号跟随网站全员公开，所有能访问该网站的成员均可查看与使用。
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-6 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  当前尚未绑定账号密码（纯网址直达模式）
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAccount}
                  className="h-8 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Plus className="size-3.5" />
                  <span>添加首个登录账号与密码</span>
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* ========================================================= */}
        {/* Right Column (4 cols): Website Visibility & Save Action   */}
        {/* ========================================================= */}
        <div className="space-y-5 lg:col-span-4">
          {/* Card 3: Website Visibility */}
          <section className="rounded-2xl border border-border/80 bg-card p-4.5 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 border-b border-border/60 pb-2.5">
              <Shield className="size-3.5 text-primary" />
              <h2 className="text-xs font-bold text-foreground">网站可见范围</h2>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {visibilityOptions.map(option => {
                const Icon = option.icon
                const active = visibility === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-2 text-left transition",
                      active
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                        : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className={cn("size-3.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                      <span className={cn("text-xs font-semibold", active ? "text-foreground" : "text-foreground/80")}>
                        {option.label}
                      </span>
                    </div>
                    {active ? <Check className="size-3 text-primary shrink-0" /> : null}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Card 4: Submission Action */}
          <section className="rounded-2xl border border-border/80 bg-card p-4.5 shadow-xs space-y-3">
            <Button
              type="submit"
              disabled={isPending}
              className="h-9.5 w-full font-bold text-xs md:text-sm shadow-xs gap-1.5"
            >
              {isPending ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Globe2 className="size-3.5" />
                  <span>{isEdit ? "保存网站与账号修改" : "添加常用网站"}</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(isEdit && website ? `/websites/${website.id}` : "/websites")}
              className="h-8.5 w-full text-xs font-medium"
            >
              取消
            </Button>

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive font-medium"
              >
                {error}
              </div>
            ) : null}
          </section>

          {/* Danger Zone: Delete Website */}
          {isEdit && website && mayDelete ? (
            <section className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-destructive">危险操作</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                删除后该网站及其关联的全部账号密码将永久移除，无法恢复。
              </p>
              <div className="pt-1">
                <ResourceDeleteButton
                  resourceId={website.id}
                  resourceName={website.name}
                  redirectTo="/websites"
                  noun="网站"
                />
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </form>
  )
}
