"use client"

import { BookOpen, Boxes, FolderKanban, Globe2, UserRound, Wrench } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Resource } from "@/lib/db/schema"
import { createResource, updateResource } from "@/lib/resource/actions"
import { cn } from "@/lib/utils"

const visibilityOptions = [
  ["TEAM", "团队可见（小组内所有人可查看）"],
  ["GROUP", "按授权可见（仅指定成员/小组可访问）"],
  ["PRIVATE", "仅自己和管理员"],
  ["PUBLIC", "全员公开"],
] as const

const sensitivityOptions = [
  ["NORMAL", "普通公开级别"],
  ["INTERNAL", "团队内部使用"],
  ["CONFIDENTIAL", "机密级别（严格控制）"],
  ["SECRET", "高度机密（禁止匿名外链分享）"],
] as const

const moduleKindOptions: Array<{
  value: Resource["moduleKind"]
  label: string
  desc: string
  icon: typeof Boxes
}> = [
  { value: "PROJECT", label: "项目", desc: "业务开发、团队专项或研发项目资料", icon: FolderKanban },
  { value: "TOOL", label: "工具 / 系统", desc: "内部运维、常用工具、后台平台", icon: Wrench },
  { value: "KNOWLEDGE", label: "知识 / 文档", desc: "技术规范、使用手册、工作流知识库", icon: BookOpen },
  { value: "PERSONAL", label: "个人", desc: "个人临时笔记、备忘或私有空间", icon: UserRound },
  { value: "OTHER", label: "其他", desc: "通用资源归档或杂项共享", icon: Boxes },
]

export function ResourceForm({ resource, mode = "MODULE" }: { resource?: Resource; mode?: "MODULE" | "WEBSITE" }) {
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

  async function submit(formData: FormData) {
    setPending(true)
    setError("")
    const input = {
      name: String(formData.get("name") ?? "").trim(),
      category: isWebsite ? "" : String(formData.get("category") ?? "").trim(),
      moduleKind: isWebsite ? ("WEBSITE" as const) : selectedKind,
      url: String(formData.get("url") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      visibility: String(formData.get("visibility") ?? "TEAM") as Resource["visibility"],
      sensitivity: String(formData.get("sensitivity") ?? "NORMAL") as Resource["sensitivity"],
      tags: tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
    }

    if (!input.name) {
      setError(isWebsite ? "请输入网站名称" : "请输入模块名称")
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
    <form action={submit} className="space-y-7">
      {!isWebsite ? (
        <div className="space-y-3">
          <Label className="text-sm font-medium">模块类型</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {moduleKindOptions.map(option => {
              const Icon = option.icon
              const active = selectedKind === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedKind(option.value)}
                  className={cn(
                    "flex flex-col items-start rounded-xl border p-3 text-left transition",
                    active
                      ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-sm"
                      : "border-border bg-card/60 hover:border-primary/40 hover:bg-accent/40 text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-lg transition",
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <p className={cn("mt-2 text-xs font-semibold", active ? "text-primary" : "text-foreground")}>
                    {option.label}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{option.desc}</p>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">{isWebsite ? "网站名称" : "模块名称"}</Label>
          <Input
            id="name"
            name="name"
            defaultValue={resource?.name}
            placeholder={isWebsite ? "例如：Label Studio 标注平台" : "例如：入炉资料、现场巡检数据、核心架构文档"}
            required
            className="h-10 text-sm"
          />
        </div>

        {isWebsite ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="url">网站地址 (URL)</Label>
            <div className="relative">
              <Globe2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="url"
                name="url"
                type="url"
                defaultValue={resource?.url ?? ""}
                placeholder="https://example.com"
                required
                className="h-10 pl-9 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="category">自定义分类（可选）</Label>
            <Input
              id="category"
              name="category"
              defaultValue={resource?.category ?? ""}
              placeholder="例如：文档库、图片库、数据分析"
              className="h-10 text-sm"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="visibility">可见范围</Label>
          <select
            id="visibility"
            name="visibility"
            defaultValue={resource?.visibility ?? "TEAM"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {visibilityOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">{isWebsite ? "网站备注（可选）" : "模块介绍与说明（可选）"}</Label>
          <textarea
            id="description"
            name="description"
            defaultValue={resource?.description ?? ""}
            rows={isWebsite ? 3 : 4}
            placeholder={isWebsite ? "记录网站的主要用途、登录方式或注意事项" : "详细描述该模块的用途、包含内容与协作注意事项"}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {isWebsite ? (
          <input type="hidden" name="sensitivity" value="NORMAL" />
        ) : (
          <details className="group sm:col-span-2 rounded-xl border border-border/80 bg-muted/20 p-4 transition open:bg-muted/30">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground">
              <span>高级设置（敏感级别与标签）</span>
              <span className="text-[11px] text-primary group-open:hidden">+ 展开</span>
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 pt-2 border-t">
              <div className="space-y-2">
                <Label htmlFor="sensitivity">敏感级别</Label>
                <select
                  id="sensitivity"
                  name="sensitivity"
                  defaultValue={resource?.sensitivity ?? "NORMAL"}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                >
                  {sensitivityOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">自定义标签</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={event => setTags(event.target.value)}
                  placeholder="标签间用逗号分隔，如：前端, 生产, 2026"
                  className="h-10 text-sm"
                />
              </div>
            </div>
          </details>
        )}
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
        <Button type="submit" disabled={pending} className="min-w-28 shadow-sm">
          {pending ? "保存中..." : resource ? "保存修改" : isWebsite ? "保存网站" : "立即创建模块"}
        </Button>
      </div>
    </form>
  )
}
