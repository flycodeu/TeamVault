"use client"

import {
  Check,
  Download,
  FileCode,
  FileSpreadsheet,
  FileUp,
  Globe2,
  KeyRound,
  Plus,
  RefreshCw,
  Sparkles,
  Upload,
  User,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  batchImportWebsites,
  type BatchImportWebsiteItem,
} from "@/lib/resource/actions"
import { cn } from "@/lib/utils"

export function WebsiteImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [importMode, setImportMode] = useState<"paste" | "file">("paste")
  const [inputText, setInputText] = useState("")
  const [parsedItems, setParsedItems] = useState<
    (BatchImportWebsiteItem & { selected: boolean; valid: boolean; errorMsg?: string })[]
  >([])
  const [serverError, setServerError] = useState("")
  const [successCount, setSuccessCount] = useState<number | null>(null)

  function parseText(text: string) {
    const raw = text.trim()
    if (!raw) {
      setParsedItems([])
      return
    }

    // Try parsing as JSON first
    if (raw.startsWith("[") && raw.endsWith("]")) {
      try {
        const json = JSON.parse(raw) as Record<string, unknown>[]
        const items = json.map(item => {
          const name = String(item.name || item.title || "").trim()
          const url = String(item.url || item.link || "").trim()
          const valid = Boolean(name && url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")))
          return {
            name: name || "未命名网站",
            url,
            category: String(item.category || item.tag || "").trim() || undefined,
            description: String(item.description || item.desc || "").trim() || undefined,
            username: String(item.username || item.user || item.account || "").trim() || undefined,
            password: String(item.password || item.pass || item.secret || "").trim() || undefined,
            visibility: (["TEAM", "GROUP", "PRIVATE", "PUBLIC"].includes(String(item.visibility)) ? item.visibility : "TEAM") as BatchImportWebsiteItem["visibility"],
            selected: valid,
            valid,
            errorMsg: valid ? undefined : "缺少名称或网址格式不正确",
          }
        })
        setParsedItems(items)
        return
      } catch {
        // Continue to CSV / TSV fallback
      }
    }

    // CSV / TSV / Comma-separated lines parsing
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean)
    const items: typeof parsedItems = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Skip header line if detected
      if (i === 0 && (line.includes("网站名称") || line.includes("名称") || line.toLowerCase().includes("name,url"))) {
        continue
      }

      // Split by tab or comma (handling quoted strings)
      const delimiter = line.includes("\t") ? "\t" : ","
      const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ""))

      const name = parts[0] || ""
      const url = parts[1] || ""
      const category = parts[2] || undefined
      const username = parts[3] || undefined
      const password = parts[4] || undefined
      const description = parts[5] || undefined

      const valid = Boolean(name && url)
      items.push({
        name: name || "未命名网站",
        url,
        category,
        username,
        password,
        description,
        visibility: "TEAM",
        selected: valid,
        valid,
        errorMsg: valid ? undefined : "缺少网站名称或 URL",
      })
    }

    setParsedItems(items)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
      const content = String(event.target?.result ?? "")
      
      // Check if it's HTML Bookmarks (e.g. Netscape bookmark format)
      if (content.includes("<!DOCTYPE NETSCAPE-Bookmark-file-1>") || content.includes("<A HREF=")) {
        parseBookmarksHtml(content)
      } else {
        setInputText(content)
        parseText(content)
      }
    }
    reader.readAsText(file)
  }

  function parseBookmarksHtml(html: string) {
    const regex = /<A\s+HREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi
    const items: typeof parsedItems = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(html)) !== null) {
      const url = match[1]?.trim() || ""
      const name = match[2]?.trim() || ""
      if (url.startsWith("http://") || url.startsWith("https://")) {
        items.push({
          name: name || url,
          url,
          category: "书签导入",
          visibility: "TEAM",
          selected: true,
          valid: true,
        })
      }
    }

    setParsedItems(items)
  }

  function fillSample() {
    const sample = `GitLab 内部代码库,https://gitlab.company.local,研发平台,developer,GitLab#Pass2026,公司统一研发代码托管
Jenkins 自动化构建,https://ci.company.local,运维系统,admin,JenkinsSecretKey,CI/CD 自动化流水线
Confluence 知识库,https://wiki.company.local,文档手册,member,WikiPass8899,团队协同与项目规范
Grafana 监控看板,https://grafana.company.local,监控平台,viewer,Viewer2026,生产环境基础设施与服务指标`

    setInputText(sample)
    parseText(sample)
  }

  function downloadCsvTemplate() {
    const csvContent = "\uFEFF网站名称,网站URL,业务分类,登录用户名(可选),登录密码(可选),描述说明(可选)\n" +
      "生产监控大屏,https://monitor.example.com,监控平台,ops_admin,SafePass2026,生产环境集群指标\n" +
      "内部知识库,https://wiki.example.com,文档手册,editor,WikiPass123,团队产品与业务文档"

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "TeamVault_网站批量导入模板.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const toImport = parsedItems.filter(item => item.selected && item.valid)
    if (!toImport.length) {
      setServerError("请至少选择一个有效的网站条目")
      return
    }

    setServerError("")
    startTransition(async () => {
      const res = await batchImportWebsites(toImport)
      if (!res.success) {
        setServerError(res.error)
      } else {
        setSuccessCount(res.data.count)
        setTimeout(() => {
          onOpenChange(false)
          setSuccessCount(null)
          setParsedItems([])
          setInputText("")
          router.refresh()
        }, 1200)
      }
    })
  }

  if (!open) return null

  const selectedCount = parsedItems.filter(item => item.selected && item.valid).length

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8.5 place-items-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Globe2 className="size-4.5" />
            </span>
            <h2 className="text-base font-bold text-foreground">批量导入常用网站</h2>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent/40 hover:text-foreground transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Action Row: Mode Toggles & Templates */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl border border-border/80 bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setImportMode("paste")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition",
                  importMode === "paste"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FileCode className="size-3.5" />
                <span>批量粘贴</span>
              </button>
              <button
                type="button"
                onClick={() => setImportMode("file")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition",
                  importMode === "file"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FileSpreadsheet className="size-3.5" />
                <span>文件上传</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fillSample}
                className="h-8 text-xs font-medium gap-1"
              >
                <Sparkles className="size-3.5 text-amber-500" />
                <span>示例数据</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCsvTemplate}
                className="h-8 text-xs font-medium gap-1"
              >
                <Download className="size-3.5" />
                <span>CSV 模板</span>
              </Button>
            </div>
          </div>

          {/* Import Area */}
          {importMode === "paste" ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground/80">
                <span>每行一个：名称, URL, 分类(可选), 账号(可选), 密码(可选)</span>
                <span>支持 Excel 直接粘贴</span>
              </div>
              <textarea
                rows={5}
                value={inputText}
                onChange={e => {
                  setInputText(e.target.value)
                  parseText(e.target.value)
                }}
                placeholder="例如：&#10;GitLab, https://gitlab.company.local, 研发平台, dev_user, Pass123&#10;Grafana 监控, https://grafana.company.local, 运维平台, ops_admin, SecretKey"
                className="w-full rounded-xl border border-input bg-card p-3 text-xs font-mono shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed placeholder:text-muted-foreground/40"
              />
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-border/80 bg-muted/10 p-8 text-center hover:border-primary/40 transition">
              <FileUp className="size-8 text-muted-foreground/70 mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground">选择或拖拽文件到此处</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                支持 .csv 表格、.json 数据或从 Chrome/Edge 导出的 bookmarks.html 书签文件
              </p>
              <label className="mt-4 inline-flex items-center gap-1.5 cursor-pointer rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition">
                <Upload className="size-3.5" />
                <span>选择本地文件</span>
                <input
                  type="file"
                  accept=".csv,.json,.html,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}

          {/* Parsed Verification Table */}
          {parsedItems.length ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-foreground">
                    解析结果预览 ({selectedCount}/{parsedItems.length} 项)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = parsedItems.every(i => i.selected)
                      setParsedItems(prev => prev.map(i => ({ ...i, selected: !allSelected })))
                    }}
                    className="text-[11px] text-primary hover:underline font-semibold"
                  >
                    {parsedItems.every(i => i.selected) ? "取消全选" : "全选全部"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 overflow-hidden bg-card">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-muted/80 text-[11px] font-semibold text-muted-foreground uppercase border-b border-border/60">
                      <tr>
                        <th className="p-2.5 w-10 text-center">选择</th>
                        <th className="p-2.5 min-w-32">网站名称</th>
                        <th className="p-2.5 min-w-44">URL 地址</th>
                        <th className="p-2.5 min-w-24">业务分类</th>
                        <th className="p-2.5 min-w-36">携带账号密码</th>
                        <th className="p-2.5 min-w-32">说明备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-normal">
                      {parsedItems.map((item, idx) => (
                        <tr
                          key={idx}
                          className={cn(
                            "hover:bg-accent/20 transition",
                            !item.valid && "bg-destructive/5 text-destructive",
                          )}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              disabled={!item.valid}
                              onChange={e => {
                                const checked = e.target.checked
                                setParsedItems(prev =>
                                  prev.map((it, i) => (i === idx ? { ...it, selected: checked } : it)),
                                )
                              }}
                              className="size-3.5 rounded border-border text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="p-2.5 font-bold text-foreground truncate max-w-36">
                            {item.name}
                          </td>
                          <td className="p-2.5 font-mono text-[11px] text-muted-foreground truncate max-w-56">
                            {item.url}
                          </td>
                          <td className="p-2.5 text-muted-foreground">
                            {item.category ? (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
                                {item.category}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {item.username || item.password ? (
                              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                                {item.username ? (
                                  <span className="inline-flex items-center gap-0.5 text-foreground">
                                    <User className="size-2.5 text-muted-foreground" />
                                    {item.username}
                                  </span>
                                ) : null}
                                {item.password ? (
                                  <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                                    <KeyRound className="size-2.5 text-amber-500" />
                                    ••••••
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50 text-[11px]">无账号</span>
                            )}
                          </td>
                          <td className="p-2.5 text-muted-foreground text-[11px] truncate max-w-44">
                            {item.description || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {/* Status Message */}
          {serverError ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium"
            >
              {serverError}
            </div>
          ) : null}

          {successCount !== null ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
              <Check className="size-4" />
              <span>成功导入 {successCount} 个常用网站与关联凭据！正在刷新...</span>
            </div>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border/80 px-6 py-3.5 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            已选择 <strong className="text-foreground">{selectedCount}</strong> 项准备导入
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8.5 text-xs font-medium"
            >
              取消
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending || selectedCount === 0 || successCount !== null}
              onClick={handleImport}
              className="h-8.5 text-xs font-bold gap-1.5 shadow-xs"
            >
              {isPending ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>正在批量写入...</span>
                </>
              ) : (
                <>
                  <Plus className="size-3.5" />
                  <span>确认批量导入 ({selectedCount})</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
