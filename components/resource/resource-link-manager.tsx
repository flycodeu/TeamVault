"use client"

import { Check, Copy, ExternalLink, FileText, Globe2, Link2, Pencil, Plus, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ResourceLink } from "@/lib/db/schema"
import { createResourceLink, deleteResourceLink, updateResourceLink } from "@/lib/resource/link-actions"
import { cn } from "@/lib/utils"

const kindMeta = {
  WEBSITE: {
    label: "网站",
    icon: Globe2,
    bgClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200/50 dark:border-teal-900/30",
  },
  EXTERNAL_DOCUMENT: {
    label: "外部文档",
    icon: FileText,
    bgClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30",
  },
  OTHER: {
    label: "其他链接",
    icon: Link2,
    bgClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/30",
  },
} as const

type LinkInput = Pick<ResourceLink, "kind" | "title" | "url"> & { description?: string }

export function ResourceLinkManager({
  resourceId,
  links,
  mayEdit,
}: {
  resourceId: string
  links: ResourceLink[]
  mayEdit: boolean
}) {
  const router = useRouter()
  const [editor, setEditor] = useState<"new" | string | null>(null)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function save(input: LinkInput, id?: string) {
    setPending(true)
    setError("")
    const result = id ? await updateResourceLink(id, input) : await createResourceLink(resourceId, input)
    if (!result.success) {
      setError(result.error)
    } else {
      setEditor(null)
      router.refresh()
    }
    setPending(false)
  }

  const [deletingLink, setDeletingLink] = useState<{ id: string; title: string } | null>(null)

  async function copyUrl(id: string, url: string) {
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1600)
  }

  async function handleConfirmDelete() {
    if (!deletingLink) return
    const result = await deleteResourceLink(deletingLink.id)
    if (!result.success) setError(result.error)
    else router.refresh()
  }

  return (
    <section className="rounded-xl border border-border/80 bg-card p-5 shadow-xs md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground">链接与相关入口</h2>
          {links.length ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {links.length}
            </span>
          ) : null}
        </div>

        {mayEdit ? (
          <Button
            type="button"
            size="sm"
            className="h-8.5 gap-1.5 text-xs font-medium"
            onClick={() => {
              setError("")
              setEditor(editor === "new" ? null : "new")
            }}
          >
            {editor === "new" ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            <span>{editor === "new" ? "取消添加" : "新增链接"}</span>
          </Button>
        ) : null}
      </div>

      {editor === "new" ? (
        <div className="rounded-xl border border-primary/20 bg-accent/20 p-4">
          <p className="text-xs font-semibold text-primary mb-3">添加新链接或文档</p>
          <LinkEditor pending={pending} error={error} onSubmit={input => save(input)} />
        </div>
      ) : null}

      {links.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {links.map(link => {
            const meta = kindMeta[link.kind] ?? kindMeta.OTHER
            const Icon = meta.icon
            const isCopied = copiedId === link.id
            return (
              <article
                key={link.id}
                className={cn(
                  "group relative flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition duration-200 hover:border-primary/40 hover:shadow-xs",
                  editor === link.id && "lg:col-span-2 border-primary/30 bg-accent/15",
                )}
              >
                {editor === link.id ? (
                  <LinkEditor
                    link={link}
                    pending={pending}
                    error={error}
                    onSubmit={input => save(input, link.id)}
                    onCancel={() => setEditor(null)}
                  />
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border", meta.bgClass)}>
                        <Icon className="size-4.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-sm font-semibold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                          >
                            <span>{link.title}</span>
                            <ExternalLink className="size-3 text-muted-foreground/80 shrink-0" />
                          </a>
                          <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                            {meta.label}
                          </span>
                        </div>

                        <p className="mt-1 truncate font-mono text-xs text-muted-foreground/80">{link.url}</p>

                        {link.description ? (
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{link.description}</p>
                        ) : null}
                      </div>

                      {mayEdit ? (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7.5 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setError("")
                              setEditor(link.id)
                            }}
                            aria-label={`编辑 ${link.title}`}
                            title="编辑"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingLink({ id: link.id, title: link.title })}
                            aria-label={`删除 ${link.title}`}
                            title="删除"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => copyUrl(link.id, link.url)}
                        className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition font-medium"
                      >
                        {isCopied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                        <span>{isCopied ? "已复制链接" : "复制链接"}</span>
                      </button>

                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                      >
                        <span>直接访问</span>
                        <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <Link2 className="mx-auto size-6 text-muted-foreground/60 mb-2" />
          <p className="font-medium text-foreground">暂无关联链接或外部文档</p>
          <p className="text-xs text-muted-foreground mt-0.5">可添加常用的开发平台、API 文档、项目原型等访问地址</p>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deletingLink)}
        onClose={() => setDeletingLink(null)}
        onConfirm={handleConfirmDelete}
        title="确定删除该链接？"
        targetName={deletingLink?.title}
        description="删除后该外链将从当前模块中移除。"
        confirmText="确认删除链接"
        variant="danger"
      />
    </section>
  )
}

function LinkEditor({
  link,
  pending,
  error,
  onSubmit,
  onCancel,
}: {
  link?: ResourceLink
  pending: boolean
  error: string
  onSubmit: (input: LinkInput) => void | Promise<void>
  onCancel?: () => void
}) {
  async function submit(formData: FormData) {
    await onSubmit({
      kind: formData.get("kind") as ResourceLink["kind"],
      title: String(formData.get("title") ?? "").trim(),
      url: String(formData.get("url") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
    })
  }
  const suffix = link?.id ?? "new"
  return (
    <form action={submit} className="grid gap-3.5 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor={`link-kind-${suffix}`} className="text-xs font-medium">
          链接类型
        </Label>
        <select
          id={`link-kind-${suffix}`}
          name="kind"
          defaultValue={link?.kind ?? "WEBSITE"}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs shadow-xs"
        >
          <option value="WEBSITE">网站站点</option>
          <option value="EXTERNAL_DOCUMENT">外部在线文档</option>
          <option value="OTHER">其他平台入口</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`link-title-${suffix}`} className="text-xs font-medium">
          名称 / 标题
        </Label>
        <Input
          id={`link-title-${suffix}`}
          name="title"
          defaultValue={link?.title}
          placeholder="例如：Grafana 监控看板"
          required
          className="h-9 text-xs"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`link-url-${suffix}`} className="text-xs font-medium">
          链接地址 (URL)
        </Label>
        <Input
          id={`link-url-${suffix}`}
          name="url"
          type="url"
          defaultValue={link?.url}
          placeholder="https://"
          required
          className="h-9 text-xs"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor={`link-description-${suffix}`} className="text-xs font-medium">
          说明备注（可选）
        </Label>
        <Input
          id={`link-description-${suffix}`}
          name="description"
          defaultValue={link?.description ?? ""}
          placeholder="简要说明链接用途或登录提示"
          className="h-9 text-xs"
        />
      </div>

      {error ? (
        <p className="text-xs text-destructive rounded bg-destructive/10 px-2.5 py-1 sm:col-span-2 font-medium">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 sm:col-span-2 pt-1">
        <Button size="sm" className="h-8 text-xs min-w-20" disabled={pending}>
          {pending ? "保存中..." : "保存链接"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onCancel}>
            取消
          </Button>
        ) : null}
      </div>
    </form>
  )
}

