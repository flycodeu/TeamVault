"use client"

import { FileText, FolderOpen, Info, KeyRound, Link2, ShieldCheck, Network, Lock, Share2 } from "lucide-react"
import type { ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"

export type ResourceDetailPanel = {
  id: "overview" | "credentials" | "files" | "links" | "access" | "environments" | "permissions" | "shares"
  label: string
  count?: number
  description?: string
  content: ReactNode
}

const icons: Record<ResourceDetailPanel["id"], typeof Info> = {
  links: Link2,
  credentials: KeyRound,
  files: FolderOpen,
  overview: Info,
  access: ShieldCheck,
  environments: Network,
  permissions: ShieldCheck,
  shares: Share2,
}

export function ResourceDetailWorkspace({
  panels,
  initialTab,
}: {
  panels: ResourceDetailPanel[]
  initialTab?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentTabFromUrl = (searchParams.get("tab") || initialTab) as ResourceDetailPanel["id"] | null
  const activePanel = panels.find(panel => panel.id === currentTabFromUrl) ?? panels[0]

  if (!activePanel) return null

  function handleSelectTab(id: ResourceDetailPanel["id"]) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", id)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  if (panels.length === 1) {
    return (
      <section role="region" aria-label={activePanel.label} className="pb-10 pt-4">
        {activePanel.content}
      </section>
    )
  }

  return (
    <div className="pb-14">
      {/* Sticky Tab Bar */}
      <nav
        aria-label="模块内容选项卡"
        className="sticky top-16 z-10 mt-5 overflow-x-auto rounded-xl border border-border/80 bg-card/90 p-1.5 shadow-sm backdrop-blur-md"
      >
        <div role="tablist" aria-label="模块功能" className="flex min-w-max gap-1.5 md:min-w-0">
          {panels.map(panel => {
            const Icon = icons[panel.id]
            const active = panel.id === activePanel.id
            return (
              <button
                key={panel.id}
                type="button"
                role="tab"
                id={`tab-${panel.id}`}
                aria-selected={active}
                aria-controls={`panel-${panel.id}`}
                onClick={() => handleSelectTab(panel.id)}
                className={cn(
                  "flex h-9.5 min-w-24 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-w-0 md:flex-1 cursor-pointer",
                  active
                    ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                <span>{panel.label}</span>
                {typeof panel.count === "number" ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] tabular-nums font-bold",
                      active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {panel.count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Active Panel Content */}
      <section role="tabpanel" id={`panel-${activePanel.id}`} aria-labelledby={`tab-${activePanel.id}`} className="pt-5">
        {activePanel.content}
      </section>
    </div>
  )
}
