"use client"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileArchive,
  FolderOpen,
  HardDrive,
  HardDriveDownload,
  HardDriveUpload,
  Info,
  KeyRound,
  Layers,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  Users,
} from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { BackupInspectionResult, BackupManifest, SystemStats } from "@/lib/system/backup"
import { cn } from "@/lib/utils"

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

export function SystemMigrationPanel({ initialStats }: { initialStats: SystemStats }) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isInspecting, setIsInspecting] = useState(false)
  const [inspection, setInspection] = useState<BackupInspectionResult | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [restoreSuccess, setRestoreSuccess] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 处理全量导出
  async function handleExport() {
    setIsExporting(true)
    setExportError(null)
    setExportSuccess(null)

    try {
      const response = await fetch("/api/system/export", { credentials: "include" })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `导出失败 (${response.status})`)
      }

      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = "teamvault-backup.zip"
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match?.[1]) filename = match[1]
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExportSuccess(`全量备份包 ${filename} 导出成功并已开始下载！`)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "导出发生异常")
    } finally {
      setIsExporting(false)
    }
  }

  // 处理文件选择与预检
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setIsInspecting(true)
    setRestoreError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("action", "inspect")

      const res = await fetch("/api/system/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const data = await res.json()
      if (!res.ok || !data.valid) {
        throw new Error(data.error || "无效或损坏的备份包")
      }

      setInspection(data as BackupInspectionResult)
      setIsImportModalOpen(true)
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "预检备份文件失败")
    } finally {
      setIsInspecting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // 执行恢复操作
  async function handleConfirmRestore() {
    if (!selectedFile) return

    setIsRestoring(true)
    setRestoreError(null)

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("action", "restore")

      const res = await fetch("/api/system/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "导入恢复失败")
      }

      setRestoreSuccess(true)
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : "执行恢复发生异常")
      setIsRestoring(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="size-4 text-blue-500" />
            <span className="text-xs font-medium">资源项目</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">{initialStats.resourcesCount}</p>
          <span className="text-[11px] text-muted-foreground">包含业务系统与站点</span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FolderOpen className="size-4 text-emerald-500" />
            <span className="text-xs font-medium">文件资料</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">{initialStats.filesCount}</p>
          <span className="text-[11px] text-muted-foreground">占用 {formatBytes(initialStats.storageTotalBytes)}</span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <KeyRound className="size-4 text-amber-500" />
            <span className="text-xs font-medium">机密凭据</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">{initialStats.credentialsCount}</p>
          <span className="text-[11px] text-muted-foreground">AES-256 加密信封保护</span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="size-4 text-indigo-500" />
            <span className="text-xs font-medium">团队成员</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">{initialStats.usersCount}</p>
          <span className="text-[11px] text-muted-foreground">账户与权限策略</span>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Export Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-xs transition duration-200 hover:border-primary/40">
          <div>
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <HardDriveDownload className="size-5" />
              </span>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                完整快照归档
              </span>
            </div>

            <h3 className="mt-4 text-base font-bold text-foreground">一键全量导出</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              打包当前 SQLite 数据库快照、物理文件（<code className="font-mono font-medium">data/files</code>）与配置元数据。
            </p>

            <ul className="mt-3.5 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                <span>包含全部资源、凭据、外链、便签与用户权限</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                <span>包含完整物理附件与层级目录，确保无缝迁移</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                <span>在线一致性备份，导出期间不影响系统正常运行</span>
              </li>
            </ul>

            {exportSuccess ? (
              <div className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 border border-emerald-500/20">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{exportSuccess}</span>
              </div>
            ) : null}

            {exportError ? (
              <div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 border border-rose-500/20">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{exportError}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-6 pt-4 border-t border-border/60">
            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full gap-2 font-medium"
            >
              {isExporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>正在打包生成备份归档...</span>
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  <span>导出并下载全量备份包 (.zip)</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Import Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-6 shadow-xs transition duration-200 hover:border-primary/40">
          <div>
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <HardDriveUpload className="size-5" />
              </span>
              <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                跨机还原恢复
              </span>
            </div>

            <h3 className="mt-4 text-base font-bold text-foreground">一键全量导入 / 恢复</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              上传原服务器导出的备份归档包（<code className="font-mono font-medium">.zip</code>），一键还原全部数据与文件。
            </p>

            <div className="mt-4 rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-center transition hover:bg-muted/40">
              <input
                type="file"
                ref={fileInputRef}
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
                id="backup-file-upload"
              />
              <label
                htmlFor="backup-file-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-2"
              >
                <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  {isInspecting ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {isInspecting ? "正在预检解析备份包..." : "点击选择或拖拽备份包 (.zip) 到此处"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    仅支持 TeamVault 导出的标准全量备份压缩包
                  </p>
                </div>
              </label>
            </div>

            {restoreError ? (
              <div className="mt-4 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 border border-rose-500/20">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{restoreError}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-6 pt-4 border-t border-border/60">
            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>防灾保护机制：</strong>系统在执行恢复覆盖前，会自动对当前现有数据做一次应急本地备份。
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Migration Best Practice Guide */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-primary shrink-0" />
          <h3 className="text-sm font-bold text-foreground">跨服务器平滑迁移指南 (A 机 ➔ B 机)</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 relative">
            <span className="text-xs font-bold text-primary font-mono">01. 导出备份</span>
            <h4 className="mt-1 text-xs font-semibold text-foreground">在服务器 A 导出</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              在源服务器登录管理员，点击上方“全量导出”，下载获得 <code className="font-mono text-foreground">teamvault-backup-xxx.zip</code>。
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 relative">
            <span className="text-xs font-bold text-amber-500 font-mono">02. 密钥对齐 (关键)</span>
            <h4 className="mt-1 text-xs font-semibold text-foreground">同步 ENCRYPTION_KEY</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              将服务器 A 的 <code className="font-mono text-foreground font-semibold">.env</code> 中的 <code className="font-mono text-foreground font-semibold">ENCRYPTION_KEY</code> 复制到服务器 B 的 <code className="font-mono text-foreground">.env</code>，确保凭据能够解密。
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 relative">
            <span className="text-xs font-bold text-purple-500 font-mono">03. 上传恢复</span>
            <h4 className="mt-1 text-xs font-semibold text-foreground">在服务器 B 导入</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              在服务器 B 启动 TeamVault，以管理员账号登录进入系统设置，上传备份包并确认导入。
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 relative">
            <span className="text-xs font-bold text-emerald-500 font-mono">04. 迁移完成</span>
            <h4 className="mt-1 text-xs font-semibold text-foreground">自动生效重载</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              导入完成后页面自动刷新，所有用户、资源项目、文件与凭据在服务器 B 上全部恢复就绪！
            </p>
          </div>
        </div>
      </div>

      {/* Inspection & Confirmation Dialog */}
      <Dialog open={isImportModalOpen} onOpenChange={open => !isRestoring && setIsImportModalOpen(open)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <FileArchive className="size-5 text-primary" />
              <span>确认恢复备份数据</span>
            </DialogTitle>
            <DialogDescription>
              已成功解析备份归档包，请核对以下内容后确认恢复。
            </DialogDescription>
          </DialogHeader>

          {inspection?.manifest ? (
            <div className="space-y-3 py-2">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">备份生成时间:</span>
                  <span className="font-mono font-medium text-foreground">
                    {new Date(inspection.manifest.exportedAt).toLocaleString("zh-CN")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">归档包大小:</span>
                  <span className="font-mono font-medium text-foreground">
                    {formatBytes(inspection.archiveSizeBytes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">系统版本:</span>
                  <span className="font-mono font-medium text-foreground">
                    v{inspection.manifest.appVersion}
                  </span>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/80 bg-card p-2.5">
                  <span className="text-[11px] text-muted-foreground">资源项目</span>
                  <p className="font-mono text-base font-bold text-foreground mt-0.5">
                    {inspection.manifest.stats.resourcesCount} 个
                  </p>
                </div>
                <div className="rounded-lg border border-border/80 bg-card p-2.5">
                  <span className="text-[11px] text-muted-foreground">物理文件</span>
                  <p className="font-mono text-base font-bold text-foreground mt-0.5">
                    {inspection.manifest.stats.filesCount} 个 ({formatBytes(inspection.manifest.stats.storageTotalBytes)})
                  </p>
                </div>
                <div className="rounded-lg border border-border/80 bg-card p-2.5">
                  <span className="text-[11px] text-muted-foreground">机密凭据</span>
                  <p className="font-mono text-base font-bold text-foreground mt-0.5">
                    {inspection.manifest.stats.credentialsCount} 条
                  </p>
                </div>
                <div className="rounded-lg border border-border/80 bg-card p-2.5">
                  <span className="text-[11px] text-muted-foreground">团队成员</span>
                  <p className="font-mono text-base font-bold text-foreground mt-0.5">
                    {inspection.manifest.stats.usersCount} 位
                  </p>
                </div>
              </div>

              {/* Warning box */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>重要提示与覆盖须知</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90 pl-5">
                  导入将使用备份中的数据完全覆盖当前系统的数据库和文件。系统会在执行前自动将当前现有数据保存到应急快照目录。请确保当前服务器的 <code className="font-mono font-bold">ENCRYPTION_KEY</code> 与源服务器一致。
                </p>
              </div>

              {restoreError ? (
                <div className="rounded-lg bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 border border-rose-500/20">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{restoreError}</span>
                </div>
              ) : null}

              {restoreSuccess ? (
                <div className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 border border-emerald-500/20">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>恢复成功！正在重新加载系统...</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportModalOpen(false)}
              disabled={isRestoring}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmRestore}
              disabled={isRestoring || restoreSuccess}
              className="gap-2 font-medium"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>正在还原数据与文件...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  <span>确认导入并替换数据</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
