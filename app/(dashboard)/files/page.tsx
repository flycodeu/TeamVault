import { and, desc, eq, inArray, like, or } from "drizzle-orm"
import {
  FileArchive,
  FileCode2,
  FileImage,
  FileText,
  FolderOpen,
  Search,
  X,
} from "lucide-react"
import Link from "next/link"

import { FileList } from "@/components/file/file-list"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import { db } from "@/lib/db"
import { files, resources } from "@/lib/db/schema"
import { getFileKind, type FileKind } from "@/lib/file/kinds"
import { listPermittedResourceIds } from "@/lib/permission"
import { cn } from "@/lib/utils"

const pageSize = 24

const fileKindTabs: Array<{ key: string; label: string; icon: typeof FileText }> = [
  { key: "ALL", label: "全部文件", icon: FolderOpen },
  { key: "IMAGE", label: "图片与视觉", icon: FileImage },
  { key: "DOCUMENT", label: "文档与演示", icon: FileText },
  { key: "TEXT", label: "代码与数据", icon: FileCode2 },
  { key: "ARCHIVE", label: "压缩包与媒体", icon: FileArchive },
]

export default async function FilesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; page?: string }>
}) {
  const [permittedIds, query] = await Promise.all([listPermittedResourceIds("VIEW_FILE"), searchParams])
  const q = query.q?.trim() ?? ""
  const currentKind = query.kind?.trim() || "ALL"
  const requestedPage = Number.parseInt(query.page ?? "1", 10)

  const searchFilter = q
    ? or(
        like(files.originalName, `%${q}%`),
        like(files.extension, `%${q}%`),
        like(resources.name, `%${q}%`),
      )
    : undefined

  const where = permittedIds.length
    ? and(inArray(files.resourceId, permittedIds), searchFilter)
    : undefined

  const allRows = where
    ? await db
        .select({
          file: files,
          resourceId: resources.id,
          resourceName: resources.name,
        })
        .from(files)
        .innerJoin(resources, eq(files.resourceId, resources.id))
        .where(where)
        .orderBy(desc(files.createdAt))
    : []

  const filteredRows =
    currentKind === "ALL"
      ? allRows
      : allRows.filter(row => getFileKind(row.file) === (currentKind as FileKind))

  const total = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages)
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Group by resource
  const groupsMap = new Map<string, { resourceId: string; resourceName: string; files: (typeof files.$inferSelect)[] }>()
  for (const row of pageRows) {
    const existing = groupsMap.get(row.resourceId) ?? {
      resourceId: row.resourceId,
      resourceName: row.resourceName,
      files: [],
    }
    existing.files.push(row.file)
    groupsMap.set(row.resourceId, existing)
  }
  const groups = Array.from(groupsMap.values())

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">文件资料</h1>
          <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-semibold">
            {total}
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex overflow-x-auto gap-1.5 pb-1 md:pb-0 scrollbar-none">
          {fileKindTabs.map(tab => {
            const Icon = tab.icon
            const active = currentKind === tab.key
            return (
              <Link
                key={tab.key}
                href={`/files?${new URLSearchParams({
                  ...(tab.key !== "ALL" ? { kind: tab.key } : {}),
                  ...(q ? { q } : {}),
                }).toString()}`}
                className={cn(
                  "inline-flex h-8.5 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition duration-150 border",
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card text-muted-foreground border-border/80 hover:bg-accent/40 hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>

        <form className="flex gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="搜索文件名、扩展名或所属模块..."
              className="h-9 border-border/80 bg-card pl-9 text-xs shadow-xs"
            />
            {currentKind !== "ALL" ? <input type="hidden" name="kind" value={currentKind} /> : null}
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-9 text-xs font-medium">
            搜索
          </Button>
          {q ? (
            <Button variant="ghost" size="sm" className="h-9 text-xs" asChild>
              <Link href={currentKind !== "ALL" ? `/files?kind=${currentKind}` : "/files"}>
                <X className="size-3.5 mr-1" /> 清除
              </Link>
            </Button>
          ) : null}
        </form>
      </div>

      {groups.length ? (
        <>
          <div className="space-y-7">
            {groups.map(group => (
              <section
                key={group.resourceId}
                className="rounded-xl border border-border/80 bg-card p-5 shadow-xs md:p-6 space-y-4"
              >
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground">{group.resourceName}</h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {group.files.length} 个文件
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:underline" asChild>
                    <Link href={`/resources/${group.resourceId}`}>进入模块</Link>
                  </Button>
                </div>
                <FileList files={group.files} />
              </section>
            ))}
          </div>
          <Pagination
            pathname="/files"
            currentPage={currentPage}
            pageSize={pageSize}
            total={total}
            query={{ ...(q ? { q } : {}), ...(currentKind !== "ALL" ? { kind: currentKind } : {}) }}
          />
        </>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60 px-6 py-12 text-center">
          <FolderOpen className="size-8 text-muted-foreground/60 mb-2" />
          <h2 className="text-base font-bold text-foreground">{q ? "没有找到匹配的文件" : "暂无可访问的文件"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {q ? "尝试更换搜索词或重置筛选" : "在模块详情页中上传文件资料即可在此统一检索"}
          </p>
        </div>
      )}
    </div>
  )
}

