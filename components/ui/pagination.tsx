import { ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

export function Pagination({ pathname, currentPage, pageSize, total, query = {} }: { pathname: string; currentPage: number; pageSize: number; total: number; query?: Record<string, string | undefined> }) {
  if (!total) return null
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const firstItem = (currentPage - 1) * pageSize + 1
  const lastItem = Math.min(currentPage * pageSize, total)
  const href = (page: number) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
    if (page > 1) params.set("page", String(page))
    const value = params.toString()
    return value ? `${pathname}?${value}` : pathname
  }

  return (
    <footer className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">显示 {firstItem}–{lastItem} 条，共 {total} 条</p>
      {totalPages > 1 ? <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage <= 1} asChild={currentPage > 1}>{currentPage > 1 ? <Link href={href(currentPage - 1)}><ChevronLeft />上一页</Link> : <span><ChevronLeft />上一页</span>}</Button><span className="min-w-20 text-center text-xs tabular-nums text-muted-foreground">{currentPage} / {totalPages}</span><Button variant="outline" size="sm" disabled={currentPage >= totalPages} asChild={currentPage < totalPages}>{currentPage < totalPages ? <Link href={href(currentPage + 1)}>下一页<ChevronRight /></Link> : <span>下一页<ChevronRight /></span>}</Button></div> : null}
    </footer>
  )
}
