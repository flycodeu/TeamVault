import { BookOpen, Boxes, FolderKanban, UserRound, Wrench } from "lucide-react"
import Link from "next/link"

import type { Resource } from "@/lib/db/schema"
import { ResourceDeleteButton } from "@/components/resource/resource-delete-button"

const kindMeta: Record<Resource["moduleKind"], { label: string; icon: typeof Boxes }> = {
  PROJECT: { label: "项目", icon: FolderKanban },
  TOOL: { label: "工具 / 系统", icon: Wrench },
  KNOWLEDGE: { label: "知识 / 文档", icon: BookOpen },
  PERSONAL: { label: "个人", icon: UserRound },
  OTHER: { label: "其他", icon: Boxes },
}

export function ResourceCard({ resource, counts, mayDelete = false }: { resource: Resource; counts?: { links: number; credentials: number; files: number }; mayDelete?: boolean }) {
  const meta = kindMeta[resource.moduleKind]
  const Icon = meta.icon
  const contentCount = (counts?.links ?? 0) + (counts?.credentials ?? 0) + (counts?.files ?? 0)
  return (
    <article className="relative rounded-lg border bg-card transition-colors hover:border-primary/50 hover:bg-accent/20">
      {mayDelete ? <div className="absolute right-3 top-3 z-10"><ResourceDeleteButton resourceId={resource.id} resourceName={resource.name} compact /></div> : null}
      <Link href={`/resources/${resource.id}`} className="group flex min-h-44 flex-col p-5 pr-20">
        <span className="grid size-10 place-items-center rounded-md bg-accent text-accent-foreground"><Icon className="size-5" /></span>
        <div className="mt-5 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold">{resource.name}</h3><span className="shrink-0 text-[10px] text-muted-foreground">{meta.label}</span></div>{resource.description ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{resource.description}</p> : null}</div>
        {counts ? <div className="mt-4 text-[11px] text-muted-foreground">{contentCount ? `${counts.links} 链接 · ${counts.credentials} 账号 · ${counts.files} 文件` : "仅说明"}</div> : null}
      </Link>
    </article>
  )
}
