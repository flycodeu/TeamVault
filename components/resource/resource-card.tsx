"use client"

import {
  BookOpen,
  Boxes,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe2,
  KeyRound,
  Link2,
  Lock,
  Share2,
  Shield,
  UserRound,
  Users2,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import type { Resource } from "@/lib/db/schema"
import { ResourceDeleteButton } from "@/components/resource/resource-delete-button"
import { ResourceFavoriteButton } from "@/components/resource/resource-favorite-button"
import { QuickShareDialog } from "@/components/share/quick-share-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const kindMeta: Record<
  Resource["moduleKind"],
  { label: string; icon: typeof Boxes; colorClass: string; bgClass: string }
> = {
  PROJECT: {
    label: "项目",
    icon: FolderKanban,
    colorClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-900/40",
  },
  TOOL: {
    label: "工具/系统",
    icon: Wrench,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-900/40",
  },
  KNOWLEDGE: {
    label: "知识文档",
    icon: BookOpen,
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/40",
  },
  WEBSITE: {
    label: "独立网站",
    icon: Globe2,
    colorClass: "text-teal-600 dark:text-teal-400",
    bgClass: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200/50 dark:border-teal-900/40",
  },
  PERSONAL: {
    label: "个人空间",
    icon: UserRound,
    colorClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-900/40",
  },
  OTHER: {
    label: "共享模块",
    icon: Boxes,
    colorClass: "text-slate-600 dark:text-slate-400",
    bgClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/40",
  },
}

const visibilityMeta: Record<Resource["visibility"], { label: string; icon: typeof Users2 }> = {
  TEAM: { label: "团队", icon: Users2 },
  GROUP: { label: "群组", icon: Shield },
  PRIVATE: { label: "私有", icon: Lock },
  PUBLIC: { label: "公开", icon: Globe2 },
}

export function ResourceCard({
  resource,
  counts,
  mayDelete = false,
  isFavorite = false,
}: {
  resource: Resource
  counts?: { links: number; credentials: number; files: number }
  mayDelete?: boolean
  isFavorite?: boolean
}) {
  const meta = kindMeta[resource.moduleKind] ?? kindMeta.OTHER
  const Icon = meta.icon
  const isWebsite = resource.moduleKind === "WEBSITE" && Boolean(resource.url)
  const category = resource.category || meta.label
  const visibility = visibilityMeta[resource.visibility] ?? visibilityMeta.TEAM
  const VisIcon = visibility.icon

  const [showShareModal, setShowShareModal] = useState(false)

  let parsedTags: string[] = []
  try {
    parsedTags = JSON.parse(resource.tags ?? "[]") as string[]
  } catch {
    parsedTags = []
  }

  return (
    <article className="h-full group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4.5 md:p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5">
      {/* Top right quick actions */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        <ResourceFavoriteButton resourceId={resource.id} resourceName={resource.name} initialFavorite={isFavorite} compact />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowShareModal(true)}
          className="size-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
          title="对外分享协作包"
        >
          <Share2 className="size-3.5" />
        </Button>
        {mayDelete ? (
          <ResourceDeleteButton
            resourceId={resource.id}
            resourceName={resource.name}
            compact
            redirectTo={isWebsite ? "/resources?kind=WEBSITE" : "/resources"}
            noun={isWebsite ? "网站" : "模块"}
          />
        ) : null}
      </div>

      <QuickShareDialog
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        resourceId={resource.id}
        resourceName={resource.name}
        resourceUrl={resource.url}
      />

      <Link href={`/resources/${resource.id}`} className="block flex-1 pr-14">
        {/* Header Badges & Icon */}
        <div className="flex items-center gap-2.5">
          <span className={cn("grid size-10 place-items-center rounded-xl border transition group-hover:scale-105", meta.bgClass)}>
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {category}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-medium">
                <VisIcon className="size-2.5" />
                {visibility.label}
              </span>
            </div>
          </div>
        </div>

        {/* Title & Desc */}
        <div className="mt-3.5">
          <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary transition-colors">
            {resource.name}
          </h3>
          {isWebsite ? (
            <p className="mt-1 truncate text-xs font-mono text-primary/80 group-hover:underline">
              {resource.url}
            </p>
          ) : resource.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {resource.description}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground/60 italic">暂无详细描述</p>
          )}
        </div>

        {/* Tags */}
        {!isWebsite && parsedTags.length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {parsedTags.slice(0, 3).map(tag => (
              <span key={tag} className="rounded bg-accent/40 px-1.5 py-0.5 text-[10px] text-accent-foreground font-medium">
                #{tag}
              </span>
            ))}
            {parsedTags.length > 3 ? (
              <span className="text-[10px] text-muted-foreground">+{parsedTags.length - 3}</span>
            ) : null}
          </div>
        ) : null}
      </Link>

      {/* Footer statistics or website action */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
        {isWebsite && resource.url ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-[11px] text-muted-foreground">独立访问站点</span>
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>直达网站</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        ) : counts ? (
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1" title={`${counts.links} 个链接`}>
              <Link2 className="size-3 text-muted-foreground/70" />
              <span>{counts.links}</span>
            </span>
            <span className="flex items-center gap-1" title={`${counts.credentials} 个账号密码`}>
              <KeyRound className="size-3 text-muted-foreground/70" />
              <span>{counts.credentials}</span>
            </span>
            <span className="flex items-center gap-1" title={`${counts.files} 个文件资料`}>
              <FileText className="size-3 text-muted-foreground/70" />
              <span>{counts.files}</span>
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">点击查看详情与资料</span>
        )}
      </div>
    </article>
  )
}

