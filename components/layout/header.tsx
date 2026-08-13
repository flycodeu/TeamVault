import { LogOut } from "lucide-react"

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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6 lg:ml-60">
      <MobileNav isAdmin={user.isAdmin} />
      <div className="flex-1" />
      <ThemeToggle />
      <div className="hidden items-center gap-2 border-l pl-3 sm:flex">
        <div className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {initials}
        </div>
        <div className="hidden min-w-0 xl:block">
          <p className="max-w-32 truncate text-xs font-medium">{user.displayName}</p>
          <p className="text-[10px] text-muted-foreground">{user.isAdmin ? "管理员" : "成员"}</p>
        </div>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="icon" title="退出登录" aria-label="退出登录">
          <LogOut />
        </Button>
      </form>
    </header>
  )
}
