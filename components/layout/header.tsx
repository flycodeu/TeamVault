import { Globe2, LogOut, Plus, ShieldCheck } from "lucide-react"
import Link from "next/link"

import { MobileNav } from "@/components/layout/mobile-nav"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/lib/auth/actions"

type HeaderProps = {
  user: {
    displayName: string
    username: string
    isAdmin: boolean
  }
}

export function Header({ user }: HeaderProps) {
  const initials = user.displayName.slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur-md md:px-6 lg:ml-60 shadow-xs">
      <MobileNav isAdmin={user.isAdmin} />
      
      <div className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:flex">
        <span className="flex items-center gap-1.5 rounded-full bg-accent/80 px-2.5 py-1 text-accent-foreground font-semibold text-[11px]">
          <ShieldCheck className="size-3.5 text-primary" />
          团队安全空间
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden sm:inline-flex h-8 gap-1.5 text-xs font-medium" asChild>
          <Link href="/websites/new">
            <Globe2 className="size-3.5" />
            <span>添加网站</span>
          </Link>
        </Button>
        <Button size="sm" className="h-8 gap-1.5 text-xs font-medium shadow-xs" asChild>
          <Link href="/resources/new">
            <Plus className="size-3.5" />
            <span>新建模块</span>
          </Link>
        </Button>
      </div>

      <div className="h-4 w-px bg-border/80 mx-1" />

      <ThemeToggle />

      <div className="flex items-center gap-2.5 rounded-full border border-border/80 bg-background/80 py-1 pl-1 pr-3 shadow-xs">
        <div className="grid size-7.5 place-items-center rounded-full bg-gradient-to-br from-primary to-emerald-700 text-xs font-bold text-primary-foreground">
          {initials}
        </div>
        <div className="hidden min-w-0 text-left sm:block">
          <p className="max-w-28 truncate text-xs font-semibold leading-tight">{user.displayName}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{user.isAdmin ? "管理员" : "成员"}</p>
        </div>
      </div>

      <form action={logoutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          className="size-8.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
          title="退出登录"
          aria-label="退出登录"
        >
          <LogOut className="size-4" />
        </Button>
      </form>
    </header>
  )
}

