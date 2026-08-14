import { BookOpen, Boxes, ExternalLink, FolderKanban, Globe2, UserRound, Wrench } from "lucide-react"
import Link from "next/link"

import type { Resource } from "@/lib/db/schema"
import { ResourceDeleteButton } from "@/components/resource/resource-delete-button"
import { ResourceFavoriteButton } from "@/components/resource/resource-favorite-button"

const kindMeta: Record<Resource["moduleKind"], { label: string; icon: typeof Boxes }> = {
  PROJECT: { label: "项目", icon: FolderKanban },
  TOOL: { label: "工具 / 系统", icon: Wrench },
  KNOWLEDGE: { label: "知识 / 文档", icon: BookOpen },
  WEBSITE: { label: "独立网站", icon: Globe2 },
  PERSONAL: { label: "个人", icon: UserRound },
  OTHER: { label: "其他", icon: Boxes },
}

export function ResourceCard({ resource, counts, mayDelete = false, isFavorite = false }: { resource: Resource; counts?: { links: number; credentials: number; files: number }; mayDelete?: boolean; isFavorite?: boolean }) {
  const meta = kindMeta[resource.moduleKind]
  const Icon = meta.icon
  const isWebsite = resource.moduleKind === "WEBSITE" && Boolean(resource.url)
  const contentCount = (counts?.links ?? 0) + (counts?.credentials ?? 0) + (counts?.files ?? 0)
  return (
    <article className="relative rounded-xl border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1"><ResourceFavoriteButton resourceId={resource.id} resourceName={resource.name} initialFavorite={isFavorite} compact />{mayDelete ? <ResourceDeleteButton resourceId={resource.id} resourceName={resource.name} compact /> : null}</div>
      <Link href={`/resources/${resource.id}`} className={`group flex flex-col p-5 pr-20 ${isWebsite ? "min-h-36" : "min-h-44"}`}>
        <span className="grid size-10 place-items-center rounded-md bg-accent text-accent-foreground"><Icon className="size-5" /></span>
        <div className="mt-5 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold">{resource.name}</h3><span className="shrink-0 text-[10px] text-muted-foreground">{meta.label}</span></div>{isWebsite ? <p className="mt-1 truncate text-xs text-primary">{resource.url}</p> : resource.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{resource.description}</p> : null}</div>
        {counts && !isWebsite && contentCount ? <div className="mt-4 text-[11px] text-muted-foreground">{counts.links} 链接 · {counts.credentials} 账号 · {counts.files} 文件</div> : null}
      </Link>
      {isWebsite ? <a href={resource.url!} target="_blank" rel="noreferrer" className="absolute bottom-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:border-primary/40 hover:text-primary" title="打开网站" aria-label={`打开 ${resource.name}`}><ExternalLink className="size-4" /></a> : null}
    </article>
  )
}
