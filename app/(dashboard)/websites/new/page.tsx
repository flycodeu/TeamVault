import { ChevronLeft, Globe2 } from "lucide-react"
import Link from "next/link"

import { ResourceForm } from "@/components/resource/resource-form"
import { Button } from "@/components/ui/button"

export default function NewWebsitePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 -ml-2 text-muted-foreground hover:text-foreground" asChild>
            <Link href="/websites">
              <ChevronLeft className="size-3.5" />
              <span>网站导航</span>
            </Link>
          </Button>
          <span>/</span>
          <span className="font-semibold text-foreground">添加常用网站</span>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <span className="grid size-10 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30 shadow-xs">
            <Globe2 className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">添加常用网站</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              录入团队高频使用的外部平台、运维控制台、开发工具或业务系统
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Body */}
      <ResourceForm mode="WEBSITE" />
    </div>
  )
}
