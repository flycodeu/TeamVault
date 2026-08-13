"use client"

import {
  Activity,
  Boxes,
  FileText,
  FolderKey,
  Heart,
  LayoutDashboard,
  Settings,
  UsersRound,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Brand } from "@/components/layout/brand"
import { cn } from "@/lib/utils"

const navigation = [
  { label: "概览", href: "/", icon: LayoutDashboard },
  { label: "模块", href: "/resources", icon: Boxes },
  { label: "文件", href: "/files", icon: FileText },
  { label: "凭据", href: "/credentials", icon: FolderKey },
  { label: "收藏", href: "/favorites", icon: Heart },
]

const administration = [
  { label: "小组与授权", href: "/groups", icon: UsersRound },
  { label: "成员", href: "/users", icon: Users },
  { label: "审计", href: "/audit", icon: Activity },
  { label: "设置", href: "/settings", icon: Settings },
]

type SidebarProps = {
  mobile?: boolean
  isAdmin: boolean
}

function NavGroup({ title, items }: { title?: string; items: typeof navigation }) {
  const pathname = usePathname()
  return (
    <div>
      {title ? <p className="mb-2 px-3 text-[11px] font-semibold uppercase text-muted-foreground">{title}</p> : null}
      <nav className="space-y-1" aria-label={title ?? "主导航"}>
        {items.map((item) => (
          (() => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
            return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-9 items-center gap-3 rounded-md px-3 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
            {item.label}
          </Link>
            )
          })()
        ))}
      </nav>
    </div>
  )
}

export function Sidebar({ mobile = false, isAdmin }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-r bg-card",
        mobile ? "w-full border-r-0" : "fixed inset-y-0 left-0 z-30 hidden lg:flex",
      )}
    >
      <div className="flex h-16 items-center border-b px-5">
        <Brand />
      </div>
      <div className="flex-1 space-y-7 overflow-y-auto px-3 py-5">
        <NavGroup items={navigation} />
        {isAdmin ? <NavGroup title="管理" items={administration} /> : null}
      </div>
    </aside>
  )
}
