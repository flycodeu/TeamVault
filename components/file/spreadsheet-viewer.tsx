"use client"

import { FileWarning, LoaderCircle, Rows3 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { WorkBook } from "xlsx"

import { cn } from "@/lib/utils"

const MAX_SPREADSHEET_BYTES = 25 * 1024 * 1024
const MAX_ROWS = 500
const MAX_COLUMNS = 50

type SheetModel = {
  columns: number
  rows: string[][]
  totalColumns: number
  totalRows: number
}

function columnLabel(index: number) {
  let value = index + 1
  let label = ""
  while (value > 0) {
    value -= 1
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26)
  }
  return label
}

export function SpreadsheetViewer({ name, size, url }: { name: string; size: number; url: string }) {
  const workbookRef = useRef<WorkBook | null>(null)
  const xlsxRef = useRef<typeof import("xlsx") | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState("")
  const [sheet, setSheet] = useState<SheetModel | null>(null)
  const [error, setError] = useState("")
  const sizeError = size > MAX_SPREADSHEET_BYTES
    ? "表格文件超过 25MB，为避免浏览器卡顿，请下载后查看。"
    : ""

  function showSheet(sheetName: string) {
    const workbook = workbookRef.current
    const XLSX = xlsxRef.current
    const worksheet = workbook?.Sheets[sheetName]
    if (!workbook || !XLSX || !worksheet) return

    const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1")
    const totalRows = range.e.r + 1
    const totalColumns = range.e.c + 1
    const visibleEndRow = Math.min(range.e.r, MAX_ROWS - 1)
    const visibleEndColumn = Math.min(range.e.c, MAX_COLUMNS - 1)
    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      defval: "",
      header: 1,
      raw: false,
      range: { s: { c: 0, r: 0 }, e: { c: visibleEndColumn, r: visibleEndRow } },
    })
    setActiveSheet(sheetName)
    setSheet({
      columns: Math.max(1, Math.min(totalColumns, MAX_COLUMNS)),
      rows: rows.map(row => row.map(value => String(value ?? ""))),
      totalColumns,
      totalRows,
    })
  }

  useEffect(() => {
    let cancelled = false
    if (size > MAX_SPREADSHEET_BYTES) return

    async function load() {
      setError("")
      try {
        const response = await fetch(url, { cache: "no-store" })
        if (!response.ok) throw new Error("无法读取表格文件")
        const XLSX = await import("xlsx")
        const workbook = XLSX.read(await response.arrayBuffer(), { cellDates: true, cellStyles: true })
        if (!workbook.SheetNames.length) throw new Error("工作簿中没有可显示的工作表")
        if (cancelled) return
        workbookRef.current = workbook
        xlsxRef.current = XLSX
        setSheetNames(workbook.SheetNames)

        const firstName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstName]
        const range = XLSX.utils.decode_range(worksheet?.["!ref"] ?? "A1")
        const totalRows = range.e.r + 1
        const totalColumns = range.e.c + 1
        const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, {
          defval: "",
          header: 1,
          raw: false,
          range: {
            s: { c: 0, r: 0 },
            e: { c: Math.min(range.e.c, MAX_COLUMNS - 1), r: Math.min(range.e.r, MAX_ROWS - 1) },
          },
        })
        setActiveSheet(firstName)
        setSheet({
          columns: Math.max(1, Math.min(totalColumns, MAX_COLUMNS)),
          rows: rows.map(row => row.map(value => String(value ?? ""))),
          totalColumns,
          totalRows,
        })
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Excel 解析失败")
      }
    }

    void load()
    return () => {
      cancelled = true
      workbookRef.current = null
      xlsxRef.current = null
    }
  }, [size, url])

  if (sizeError || error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <FileWarning className="size-7 text-amber-500" />
        <p className="text-sm font-semibold">表格无法预览</p>
        <p className="max-w-lg text-xs leading-5 text-muted-foreground">{sizeError || error}</p>
      </div>
    )
  }

  if (!sheet) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <LoaderCircle className="size-6 animate-spin text-emerald-500" />
        <p className="text-sm font-semibold">正在解析工作簿</p>
        <p className="max-w-md truncate text-xs text-muted-foreground">{name}</p>
      </div>
    )
  }

  const truncated = sheet.totalRows > MAX_ROWS || sheet.totalColumns > MAX_COLUMNS

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center justify-between border-b bg-emerald-50/60 px-4 dark:bg-emerald-950/15">
        <div className="flex min-w-0 items-center gap-2">
          <Rows3 className="size-4 shrink-0 text-emerald-600" />
          <span className="truncate text-xs font-semibold">只读工作簿</span>
        </div>
        <span className="text-[11px] text-muted-foreground">{sheet.totalRows} 行 × {sheet.totalColumns} 列</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-white dark:bg-zinc-950">
        <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 h-7 min-w-12 border-b border-r bg-zinc-100 dark:bg-zinc-900" />
              {Array.from({ length: sheet.columns }, (_, index) => (
                <th key={index} className="h-7 min-w-28 border-b border-r bg-zinc-100 px-2 text-center text-[10px] font-semibold text-zinc-500 dark:bg-zinc-900">
                  {columnLabel(index)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th className="sticky left-0 z-10 h-8 min-w-12 border-b border-r bg-zinc-100 px-2 text-right text-[10px] font-medium text-zinc-500 dark:bg-zinc-900">
                  {rowIndex + 1}
                </th>
                {Array.from({ length: sheet.columns }, (_, columnIndex) => (
                  <td key={columnIndex} className="h-8 max-w-80 border-b border-r border-zinc-200 px-2 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
                    <div className="max-w-72 truncate" title={row[columnIndex] ?? ""}>{row[columnIndex] ?? ""}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex min-h-10 shrink-0 items-center gap-1 overflow-x-auto border-t bg-muted/40 px-2">
        {sheetNames.map(sheetName => (
          <button
            key={sheetName}
            type="button"
            onClick={() => showSheet(sheetName)}
            className={cn(
              "h-8 shrink-0 border-b-2 px-3 text-[11px] font-medium transition",
              activeSheet === sheetName ? "border-emerald-500 text-emerald-700 dark:text-emerald-300" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {sheetName}
          </button>
        ))}
        {truncated ? <span className="ml-auto shrink-0 px-2 text-[10px] text-amber-600">大表格仅显示前 {MAX_ROWS} 行、{MAX_COLUMNS} 列</span> : null}
      </div>
    </div>
  )
}
