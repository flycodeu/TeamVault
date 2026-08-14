"use client"

import {
  Check,
  Laptop,
  Moon,
  Palette,
  Sun,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type AccentTheme = "forest" | "obsidian" | "ocean" | "violet"

const accentThemes: Array<{
  id: AccentTheme
  name: string
  color: string
  badgeClass: string
}> = [
  {
    id: "forest",
    name: "翡翠森林",
    color: "#0e6553",
    badgeClass: "bg-emerald-600",
  },
  {
    id: "obsidian",
    name: "极夜黑曜",
    color: "#0f172a",
    badgeClass: "bg-slate-800 dark:bg-slate-300",
  },
  {
    id: "ocean",
    name: "蔚蓝科技",
    color: "#2563eb",
    badgeClass: "bg-blue-600",
  },
  {
    id: "violet",
    name: "典雅紫罗兰",
    color: "#7c3aed",
    badgeClass: "bg-purple-600",
  },
]

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [accent, setAccent] = useState<AccentTheme>("forest")
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Sync DOM data-accent attribute once mounted
  useEffect(() => {
    const saved = localStorage.getItem("teamvault-accent") as AccentTheme | null
    if (saved && ["forest", "obsidian", "ocean", "violet"].includes(saved)) {
      document.documentElement.setAttribute("data-accent", saved)
    } else {
      document.documentElement.setAttribute("data-accent", "forest")
    }
  }, [])

  function handleSelectAccent(newAccent: AccentTheme) {
    setAccent(newAccent)
    localStorage.setItem("teamvault-accent", newAccent)
    document.documentElement.setAttribute("data-accent", newAccent)
  }

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(prev => !prev)}
        className="size-8.5 text-muted-foreground hover:text-foreground transition"
        title="切换主题与配色方案"
        aria-label="切换主题与配色方案"
      >
        {resolvedTheme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border/80 bg-card p-3.5 shadow-xl transition-all animate-in fade-in-0 zoom-in-95 duration-150 space-y-3.5">
          {/* Mode Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              <span>明暗模式</span>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1">
              {[
                { key: "light", label: "浅色", icon: Sun },
                { key: "dark", label: "深色", icon: Moon },
                { key: "system", label: "系统", icon: Laptop },
              ].map(mode => {
                const Icon = mode.icon
                const active = theme === mode.key
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => {
                      setTheme(mode.key)
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold transition",
                      active
                        ? "bg-card text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span>{mode.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Accent Color Selector */}
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              <Palette className="size-3.5 text-primary" />
              <span>主题色彩方案</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {accentThemes.map(item => {
                const active = accent === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectAccent(item.id)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border p-2 text-xs font-semibold transition text-left",
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40 hover:bg-accent/20",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("size-3 rounded-full shadow-xs shrink-0", item.badgeClass)} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {active ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
