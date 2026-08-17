"use client"

import {
  BookOpen,
  Boxes,
  Check,
  ExternalLink,
  FolderKanban,
  Globe2,
  Lock,
  Shield,
  ShieldAlert,
  Sparkles,
  Tag,
  UserRound,
  Users,
  Wrench,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Resource } from "@/lib/db/schema"
import { createResource, updateResource } from "@/lib/resource/actions"
import { cn } from "@/lib/utils"

const sensitivityOptions: Array<{
  value: Resource["sensitivity"]
  label: string
  badge: string
}> = [
  { value: "NORMAL", label: "普通公开 (Normal)", badge: "bg-muted text-muted-foreground" },
  { value: "INTERNAL", label: "团队内部 (Internal)", badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  { value: "CONFIDENTIAL", label: "机密等级 (Confidential)", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { value: "SECRET", label: "高度机密 (Secret)", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
]

const moduleKindOptions: Array<{
  value: Resource["moduleKind"]
  label: string
  desc: string
  icon: typeof Boxes
  color: string
}> = [
  {
    value: "PROJECT",
    label: "项目研发",
    desc: "业务系统、工程专项或研发资料",
    icon: FolderKanban,
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  },
  {
    value: "TOOL",
    label: "工具平台",
    desc: "运维管理、后台平台、常用小工具",
    icon: Wrench,
    color: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  {
    value: "KNOWLEDGE",
    label: "知识手册",
    desc: "技术规范、操作手册、交付知识库",
    icon: BookOpen,
    color: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
  },
  {
    value: "PERSONAL",
    label: "个人空间",
    desc: "个人私有文档、临时备忘或测试资料",
    icon: UserRound,
    color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  },
  {
    value: "OTHER",
    label: "通用归档",
    desc: "团队其他杂项或未归类共享资源",
    icon: Boxes,
    color: "text-slate-600 dark:text-slate-400 bg-slate-500/10",
  },
]

export function ResourceForm({
  resource,
  mode = "MODULE",
}: {
  resource?: Resource
  mode?: "MODULE" | "WEBSITE"
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  const [tags, setTags] = useState(() => {
    try {
      return (JSON.parse(resource?.tags ?? "[]") as string[]).join(", ")
    } catch {
      return ""
    }
  })

  const isWebsite = resource ? resource.moduleKind === "WEBSITE" : mode === "WEBSITE"
  const [selectedKind, setSelectedKind] = useState<Resource["moduleKind"]>(
    resource?.moduleKind ?? (isWebsite ? "WEBSITE" : "PROJECT"),
  )
  const [websiteUrl, setWebsiteUrl] = useState(resource?.url ?? "")

  async function submit(formData: FormData) {
    setPending(true)
    setError("")
    const input = {
      name: String(formData.get("name") ?? "").trim(),
      category: resource?.category ?? "",
      moduleKind: isWebsite ? ("WEBSITE" as const) : selectedKind,
      url: isWebsite ? websiteUrl.trim() : String(formData.get("url") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      visibility: resource?.visibility ?? "PRIVATE",
      sensitivity: String(formData.get("sensitivity") ?? "NORMAL") as Resource["sensitivity"],
      tags: tags
        .split(/[,，]/)
        .map(tag => tag.trim())
        .filter(Boolean),
    }

    if (!input.name) {
      setError(isWebsite ? "请输入网站名称" : "请输入模块名称")
      setPending(false)
      return
    }

    if (isWebsite && !input.url) {
      setError("请输入网站访问地址 (URL)")
      setPending(false)
      return
    }

    let resourceId: string
    if (resource) {
      const result = await updateResource(resource.id, input)
      if (!result.success) {
        setError(result.error)
        setPending(false)
        return
      }
      resourceId = resource.id
    } else {
      const result = await createResource(input)
      if (!result.success) {
        setError(result.error)
        setPending(false)
        return
      }
      resourceId = result.data.id
    }
    router.push(isWebsite ? "/websites" : `/resources/${resourceId}`)
    router.refresh()
  }

  return (
    <form action={submit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Primary Column (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Module Kind Selector Card */}
          {!isWebsite ? (
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs md:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary" />
                <h2 className="text-xs font-bold tracking-tight text-foreground">模块类型定位</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {moduleKindOptions.map(option => {
                  const Icon = option.icon
                  const active = selectedKind === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedKind(option.value)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-3 text-left transition relative duration-200",
                        active
                          ? "border-primary bg-primary/10 ring-1 ring-primary/40 shadow-xs text-foreground"
                          : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/40 hover:bg-accent/20 hover:text-foreground",
                      )}
                    >
                      <span className={cn("grid size-8.5 shrink-0 place-items-center rounded-xl", option.color)}>
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={cn("text-xs font-bold", active ? "text-primary" : "text-foreground")}>
                            {option.label}
                          </p>
                          {active ? <Check className="size-3.5 text-primary stroke-[3]" /> : null}
                        </div>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground/70 line-clamp-2">
                          {option.desc}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          {/* Core Info Card */}
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs md:p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <span className="size-2 rounded-full bg-primary" />
              <h2 className="text-xs font-bold tracking-tight text-foreground">
                {isWebsite ? "网站基础资料" : "基本信息与说明"}
              </h2>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-foreground">
                  {isWebsite ? "网站名称" : "模块名称"}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={resource?.name}
                  placeholder={
                    isWebsite
                      ? "例如：Label Studio 标注平台、Grafana 监控"
                      : "例如：核心系统升级项目、现场巡检规范手册"
                  }
                  required
                  className="h-9 text-xs md:text-sm bg-background/80 placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Website URL Input */}
              {isWebsite ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="url" className="text-xs font-bold text-foreground">
                      网站直达访问地址 (URL) <span className="text-destructive">*</span>
                    </Label>
                    {websiteUrl ? (
                      <a
                        href={websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <span>测试直达</span>
                        <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                  <div className="relative">
                    <Globe2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="url"
                      name="url"
                      type="url"
                      value={websiteUrl}
                      onChange={e => setWebsiteUrl(e.target.value)}
                      placeholder="https://console.example.com"
                      required
                      className="h-10 pl-9 text-xs md:text-sm bg-background/80 font-mono"
                    />
                  </div>
                </div>
              ) : null}

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs font-bold text-foreground">
                  {isWebsite ? "使用说明与登录指引（可选）" : "模块详细介绍与协作注意事项（可选）"}
                </Label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={resource?.description ?? ""}
                  rows={isWebsite ? 3 : 4}
                  placeholder={
                    isWebsite
                      ? "记录该平台的用途、默认账号说明、内网访问要求或配置说明..."
                      : "详细说明本模块包含的资料文件、账号分类、适用人群与维护注意事项..."
                  }
                  className="flex w-full rounded-xl border border-input bg-background/80 px-3 py-2.5 text-xs md:text-sm shadow-xs transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right Secondary / Settings Column (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Visibility & Security Card */}
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs md:p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3.5">
              <Shield className="size-4 text-primary" />
              <h2 className="text-sm font-bold tracking-tight text-foreground">权限与安全设置</h2>
            </div>

            {/* Sensitivity */}
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <Label htmlFor="sensitivity" className="text-xs font-bold text-foreground">
                安全保密级别
              </Label>
              <select
                id="sensitivity"
                name="sensitivity"
                defaultValue={resource?.sensitivity ?? "NORMAL"}
                className="flex h-9 w-full rounded-xl border border-input bg-background/80 px-3 text-xs shadow-xs transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {sensitivityOptions.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <Tag className="size-3.5 text-muted-foreground" />
                <Label htmlFor="tags" className="text-xs font-bold text-foreground">
                  检索标签 (Tags)
                </Label>
              </div>
              <Input
                id="tags"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="以逗号隔开，如：前端, 交付, 2026"
                className="h-9 text-xs bg-background/80"
              />
            </div>
          </section>

          {/* Action Submission Card */}
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs md:p-6 space-y-4">
            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive font-medium"
              >
                {error}
              </div>
            ) : null}

            <div className="space-y-2">
              <Button
                type="submit"
                disabled={pending}
                className="w-full h-10 text-xs md:text-sm font-bold shadow-xs gap-2"
              >
                <Sparkles className="size-4" />
                <span>
                  {pending
                    ? "正在处理中..."
                    : resource
                      ? "保存修改内容"
                      : isWebsite
                        ? "立即添加网站"
                        : "立即创建模块"}
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="w-full h-9 text-xs font-medium"
              >
                取消并返回
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed text-center px-1">
              创建后即可在详情中继续上传配套文件、录入加密账号密码及生成外部交付包。
            </p>
          </section>
        </div>
      </div>
    </form>
  )
}
