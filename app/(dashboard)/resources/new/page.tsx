import { ChevronLeft, FolderPlus } from "lucide-react"
import Link from "next/link"

import { ResourceForm } from "@/components/resource/resource-form"
import { Button } from "@/components/ui/button"

export default function NewResourcePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 -ml-2 text-muted-foreground hover:text-foreground" asChild>
            <Link href="/resources">
              <ChevronLeft className="size-3.5" />
              <span>模块列表</span>
            </Link>
          </Button>
          <span>/</span>
          <span className="font-semibold text-foreground">新建共享模块</span>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <FolderPlus className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">新建共享模块</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              创建用于存放项目资料、操作手册、文件与加密凭据的专属共享空间
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Body */}
      <ResourceForm />
    </div>
  )
}
