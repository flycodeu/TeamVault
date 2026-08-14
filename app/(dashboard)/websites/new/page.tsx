import { eq } from "drizzle-orm"
import { ChevronLeft, Globe2 } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { WebsiteForm } from "@/components/website/website-form"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

export default async function NewWebsitePage() {
  const [workspaceUsers, workspaceGroups] = await Promise.all([
    db.query.users.findMany({ where: eq(users.status, "ACTIVE") }),
    db.query.groups.findMany(),
  ])

  const subjects = [
    ...workspaceUsers.map(user => ({
      id: user.id,
      label: `${user.displayName} (${user.username})`,
      type: "USER" as const,
    })),
    ...workspaceGroups.map(group => ({
      id: group.id,
      label: `群组: ${group.name}`,
      type: "GROUP" as const,
    })),
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 -ml-2 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/websites">
              <ChevronLeft className="size-3.5" />
              <span>常用网站</span>
            </Link>
          </Button>
          <span>/</span>
          <span className="font-semibold text-foreground">添加常用网站</span>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <span className="grid size-9 place-items-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-xs">
            <Globe2 className="size-4.5" />
          </span>
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            添加常用网站
          </h1>
        </div>
      </div>

      {/* Main Specialized Website Form Body */}
      <WebsiteForm subjects={subjects} />
    </div>
  )
}
