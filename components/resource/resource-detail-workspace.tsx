"use client"

import { FileText, FolderOpen, Info, KeyRound, Link2, ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"

export type ResourceDetailPanel = {
  id: "links" | "credentials" | "files" | "overview" | "access"
  label: string
  count?: number
  description: string
  content: ReactNode
}

const icons = {
  links: Link2,
  credentials: KeyRound,
  files: FolderOpen,
  overview: Info,
  access: ShieldCheck,
} satisfies Record<ResourceDetailPanel["id"], typeof FileText>

export function ResourceDetailWorkspace({ panels }: { panels: ResourceDetailPanel[] }) {
  const [activeId, setActiveId] = useState(panels[0]?.id)
  const activePanel = panels.find(panel => panel.id === activeId) ?? panels[0]
  if (!activePanel) return null

  return <div className="pb-12"><nav aria-label="模块内容" className="sticky top-16 z-10 mt-5 overflow-x-auto rounded-xl border bg-card/95 p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] backdrop-blur"><div role="tablist" aria-label="模块功能" className="flex min-w-max gap-1 md:min-w-0">{panels.map(panel => { const Icon = icons[panel.id]; const active = panel.id === activePanel.id; return <button key={panel.id} type="button" role="tab" id={`tab-${panel.id}`} aria-selected={active} aria-controls={`panel-${panel.id}`} onClick={() => setActiveId(panel.id)} className={`flex h-11 min-w-24 items-center justify-center gap-2 rounded-lg px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-w-0 md:flex-1 ${active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-4" /><span>{panel.label}</span>{typeof panel.count === "number" ? <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? "bg-primary-foreground/15" : "bg-muted"}`}>{panel.count}</span> : null}</button> })}</div></nav><section role="tabpanel" id={`panel-${activePanel.id}`} aria-labelledby={`tab-${activePanel.id}`} className="pt-6"><p className="mb-4 px-1 text-sm text-muted-foreground">{activePanel.description}</p>{activePanel.content}</section></div>
}
