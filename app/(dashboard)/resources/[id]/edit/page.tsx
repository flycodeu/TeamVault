import { ChevronLeft, Edit3, Globe2 } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ResourceForm } from "@/components/resource/resource-form"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { resources } from "@/lib/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { canEditResource } from "@/lib/permission"

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resource = await db.query.resources.findFirst({
    where: and(eq(resources.id, id), isNull(resources.deletedAt)),
  })

  if (!resource || !(await canEditResource(id))) notFound()

  const isWebsite = resource.moduleKind === "WEBSITE"

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 -ml-2 text-muted-foreground hover:text-foreground" asChild>
            <Link href={isWebsite ? "/websites" : `/resources/${id}`}>
              <ChevronLeft className="size-3.5" />
              <span>{isWebsite ? "网站导航" : "返回详情"}</span>
            </Link>
          </Button>
          <span>/</span>
          <span className="font-semibold text-foreground">
            编辑{isWebsite ? "网站" : "模块"} · {resource.name}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <span className="grid size-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30 shadow-xs">
            {isWebsite ? <Globe2 className="size-5" /> : <Edit3 className="size-5" />}
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
              编辑{isWebsite ? "网站资料" : "共享模块"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              修改基本信息、所属分类、访问权限或安全敏感等级
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Body */}
      <ResourceForm resource={resource} />
    </div>
  )
}
