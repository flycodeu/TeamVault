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
  StickyNote,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Brand } from "@/components/layout/brand"
import { cn } from "@/lib/utils"

const navigation = [
  { label: "工作台概览", href: "/", icon: LayoutDashboard },
  { label: "统一资源库", href: "/resources", icon: Boxes },
  { label: "文件资料", href: "/files", icon: FileText },
  { label: "账号密码", href: "/credentials", icon: FolderKey },
  { label: "极简备忘", href: "/memos", icon: StickyNote },
  { label: "我的收藏", href: "/favorites", icon: Heart },
]

const administration = [
  { label: "小组与授权", href: "/groups", icon: UsersRound },
  { label: "成员管理", href: "/users", icon: Users },
  { label: "安全审计", href: "/audit", icon: Activity },
  { label: "系统设置", href: "/settings", icon: Settings },
]

type SidebarProps = {
  mobile?: boolean
  isAdmin: boolean
}

function NavGroup({ title, items }: { title?: string; items: typeof navigation }) {
  const pathname = usePathname()
  return (
    <div>
      {title ? (
        <p className="mb-2 px-3 text-[11px] font-bold tracking-wider uppercase text-muted-foreground/80">
          {title}
        </p>
      ) : null}
      <nav className="space-y-1" aria-label={title ?? "主导航"}>
        {items.map(item => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex h-9.5 items-center gap-3 rounded-lg px-3 text-sm font-medium transition duration-200",
                active
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition duration-200",
                  active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                )}
                strokeWidth={active ? 2.2 : 1.8}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function Sidebar({ mobile = false, isAdmin }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-r bg-card/95 backdrop-blur shadow-[1px_0_10px_rgba(0,0,0,0.02)]",
        mobile ? "w-full border-r-0" : "fixed inset-y-0 left-0 z-30 hidden lg:flex",
      )}
    >
      <div className="flex h-16 items-center border-b px-5">
        <Brand />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-3.5 py-5">
        <NavGroup items={navigation} />
        {isAdmin ? <NavGroup title="管理控制台" items={administration} /> : null}
      </div>
      <div className="border-t p-3 text-center">
        <p className="text-[11px] text-muted-foreground/70">
          TeamVault v0.1 · 安全加密共享
        </p>
      </div>
    </aside>
  )
}

