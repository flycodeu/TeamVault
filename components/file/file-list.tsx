"use client"

import {
  Archive,
  Check,
  CheckSquare,
  ChevronRight,
  Download,
  Eye,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Film,
  Folder,
  FolderOpen,
  FolderPlus,
  MoveRight,
  Music,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { FileRecord } from "@/lib/db/schema"
import { batchDeleteFiles, deleteFile, deleteFolder, moveFiles, renameFolder } from "@/lib/file/actions"
import { fileKindMeta, fileKindOrder, getFileKind, getPreviewKind } from "@/lib/file/kinds"
import { cn, formatDate } from "@/lib/utils"
import { FileActions } from "./file-actions"
import { FilePreviewModal } from "./file-preview-modal"
import { FileUploader } from "./file-uploader"

function getExtensionBadge(ext: string | null) {
  const e = ext?.toLowerCase() ?? ""
  if (e === "pdf") return { label: "PDF", bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/30", icon: FileText }
  if (["ppt", "pptx"].includes(e)) return { label: "PPT", bg: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-900/30", icon: FileText }
  if (["doc", "docx"].includes(e)) return { label: "DOC", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30", icon: FileText }
  if (["xls", "xlsx", "csv"].includes(e)) return { label: "EXCEL", bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30", icon: FileSpreadsheet }
  if (["txt", "md", "json", "yaml", "yml", "sql"].includes(e)) return { label: e.toUpperCase(), bg: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200/50 dark:border-teal-900/30", icon: FileCode2 }
  if (["mp4", "webm", "mov"].includes(e)) return { label: "VIDEO", bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-900/30", icon: Film }
  if (["mp3", "wav"].includes(e)) return { label: "AUDIO", bg: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200/50 dark:border-violet-900/30", icon: Music }
  if (["zip", "7z", "tar", "gz"].includes(e)) return { label: "ZIP", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30", icon: Archive }
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(e)) return { label: "IMG", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-900/30", icon: FileImage }
  return { label: "FILE", bg: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/30", icon: FileText }
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function normalizeFolderName(name: string) {
  const clean = name.trim().replace(/^[/\\]+/, "").replace(/[/\\]+$/, "")
  return clean === "" ? "/" : `/${clean}`
}

export function FileList({
  files,
  resourceId,
  mayEdit = false,
}: {
  files: (FileRecord & { folder?: string | null })[]
  resourceId?: string
  mayEdit?: boolean
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeFolder, setActiveFolder] = useState<string>("ALL")
  const [customFolders, setCustomFolders] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null)

  // Dialog States
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [showRenameFolderDialog, setShowRenameFolderDialog] = useState(false)
  const [renameTarget, setRenameTarget] = useState("")
  const [renameTargetNewName, setRenameTargetNewName] = useState("")
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false)
  const [deleteFolderTarget, setDeleteFolderTarget] = useState("")

  // Move Files Dialog
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [moveTargetFolder, setMoveTargetFolder] = useState("/")
  const [customMoveFolder, setCustomMoveFolder] = useState("")

  // Compute all available folders
  const allFolders = useMemo(() => {
    const set = new Set<string>()
    set.add("/")
    for (const f of files) {
      if (f.folder) set.add(normalizeFolderName(f.folder))
    }
    for (const cf of customFolders) {
      set.add(normalizeFolderName(cf))
    }
    return Array.from(set).sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)))
  }, [files, customFolders])

  // Filtered files according to active folder
  const displayedFiles = useMemo(() => {
    if (activeFolder === "ALL") return files
    return files.filter(f => normalizeFolderName(f.folder || "/") === activeFolder)
  }, [files, activeFolder])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === displayedFiles.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayedFiles.map(f => f.id)))
    }
  }

  async function handleBatchExport() {
    if (!selectedIds.size) return
    try {
      setExporting(true)
      const res = await fetch("/api/files/batch-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: Array.from(selectedIds) }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        alert(errorData.error || "导出失败，请重试")
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
      a.download = `teamvault-files-${timestamp}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (err) {
      console.error(err)
      alert("批量下载异常，请重试")
    } finally {
      setExporting(false)
    }
  }

  async function handleBatchDelete() {
    await batchDeleteFiles(Array.from(selectedIds))
    setSelectedIds(new Set())
    setShowBatchDeleteConfirm(false)
    router.refresh()
  }

  function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim()) return
    const normalized = normalizeFolderName(newFolderName)
    if (!customFolders.includes(normalized)) {
      setCustomFolders(prev => [...prev, normalized])
    }
    setActiveFolder(normalized)
    setNewFolderName("")
    setShowNewFolderDialog(false)
  }

  async function handleRenameFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!resourceId || !renameTarget || !renameTargetNewName.trim()) return
    const normalizedNew = normalizeFolderName(renameTargetNewName)
    const res = await renameFolder(resourceId, renameTarget, normalizedNew)
    if (res.success) {
      setCustomFolders(prev => prev.map(f => (f === renameTarget ? normalizedNew : f)))
      if (activeFolder === renameTarget) setActiveFolder(normalizedNew)
      setShowRenameFolderDialog(false)
      router.refresh()
    } else {
      alert(res.error)
    }
  }

  async function handleDeleteFolderConfirm() {
    if (!resourceId || !deleteFolderTarget) return
    const res = await deleteFolder(resourceId, deleteFolderTarget)
    if (res.success) {
      setCustomFolders(prev => prev.filter(f => f !== deleteFolderTarget))
      if (activeFolder === deleteFolderTarget) setActiveFolder("ALL")
      setShowDeleteFolderConfirm(false)
      router.refresh()
    } else {
      alert(res.error)
    }
  }

  async function handleExecuteMove() {
    const finalTarget = customMoveFolder.trim() ? normalizeFolderName(customMoveFolder) : moveTargetFolder
    const res = await moveFiles(Array.from(selectedIds), finalTarget)
    if (res.success) {
      setSelectedIds(new Set())
      setShowMoveDialog(false)
      setCustomMoveFolder("")
      if (!allFolders.includes(finalTarget)) {
        setCustomFolders(prev => [...prev, finalTarget])
      }
      router.refresh()
    } else {
      alert(res.error)
    }
  }

  const groups = fileKindOrder
    .map(kind => ({ kind, files: displayedFiles.filter(file => getFileKind(file) === kind) }))
    .filter(group => group.files.length)

  const isAllSelected = selectedIds.size === displayedFiles.length && displayedFiles.length > 0
  const currentUploadFolder = activeFolder === "ALL" ? "/" : activeFolder

  return (
    <div className="space-y-5">
      {/* Folder Navigation & Actions Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-accent/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              setActiveFolder("ALL")
              setSelectedIds(new Set())
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              activeFolder === "ALL"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-border/60",
            )}
          >
            <FolderOpen className="size-3.5" />
            <span>全部文件</span>
            <span className="ml-1 rounded-full bg-black/10 dark:bg-white/15 px-1.5 py-0.2 text-[10px]">
              {files.length}
            </span>
          </button>

          {allFolders.map(folder => {
            const count = files.filter(f => normalizeFolderName(f.folder || "/") === folder).length
            const isRoot = folder === "/"
            const label = isRoot ? "根目录 /" : folder.replace(/^\//, "")
            const isActive = activeFolder === folder

            return (
              <button
                key={folder}
                type="button"
                onClick={() => {
                  setActiveFolder(folder)
                  setSelectedIds(new Set())
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background/80 text-muted-foreground hover:text-foreground hover:bg-accent/40 border border-border/60",
                )}
              >
                <Folder className="size-3.5" />
                <span>{label}</span>
                <span className="ml-1 rounded-full bg-black/10 dark:bg-white/15 px-1.5 py-0.2 text-[10px]">
                  {count}
                </span>
              </button>
            )
          })}

          {mayEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNewFolderDialog(true)}
              className="h-8 px-2.5 text-xs gap-1 border-dashed border-primary/40 text-primary hover:bg-primary/5"
              title="新建分类文件夹"
            >
              <Plus className="size-3.5" />
              <span>新建文件夹</span>
            </Button>
          ) : null}
        </div>

        {/* Right side: Folder actions or upload button */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {mayEdit && activeFolder !== "ALL" && activeFolder !== "/" ? (
            <div className="flex items-center gap-1 mr-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setRenameTarget(activeFolder)
                  setRenameTargetNewName(activeFolder.replace(/^\//, ""))
                  setShowRenameFolderDialog(true)
                }}
                title="重命名当前文件夹"
              >
                <Pencil className="size-3.5 mr-1" />
                <span>重命名</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setDeleteFolderTarget(activeFolder)
                  setShowDeleteFolderConfirm(true)
                }}
                title="删除当前文件夹及内部文件"
              >
                <Trash2 className="size-3.5 mr-1" />
                <span>删除文件夹</span>
              </Button>
            </div>
          ) : null}

          {resourceId && mayEdit ? (
            <FileUploader resourceId={resourceId} currentFolder={currentUploadFolder} />
          ) : null}
        </div>
      </div>

      {!displayedFiles.length ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground bg-muted/10">
          <FolderOpen className="mx-auto size-8 text-muted-foreground/50 mb-2.5" />
          <p className="font-semibold text-foreground text-sm">当前文件夹暂无文件</p>
          <p className="text-xs text-muted-foreground mt-1">
            您可以点击右上角按钮直接上传文件至当前文件夹 [{activeFolder === "ALL" ? "全部" : activeFolder === "/" ? "根目录" : activeFolder.replace(/^\//, "")}]
          </p>
        </div>
      ) : (
        <>
          {/* Batch Operations Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 p-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition"
              >
                {isAllSelected ? (
                  <CheckSquare className="size-4 text-primary" />
                ) : (
                  <Square className="size-4 text-muted-foreground" />
                )}
                <span>{isAllSelected ? "取消全选" : "全选当前列表"}</span>
              </button>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                当前显示 {displayedFiles.length} 个文件
                {selectedIds.size > 0 ? (
                  <span className="ml-1.5 font-bold text-primary">已勾选 {selectedIds.size} 项</span>
                ) : null}
              </span>
            </div>

            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-2">
                {mayEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMoveTargetFolder(activeFolder !== "ALL" ? activeFolder : "/")
                      setShowMoveDialog(true)
                    }}
                    className="h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <MoveRight className="size-3.5" />
                    <span>移动到文件夹 ({selectedIds.size})</span>
                  </Button>
                ) : null}

                <Button
                  type="button"
                  size="sm"
                  onClick={handleBatchExport}
                  disabled={exporting}
                  className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      <span>打包中...</span>
                    </>
                  ) : (
                    <>
                      <Package className="size-3.5" />
                      <span>批量导出 ({selectedIds.size})</span>
                    </>
                  )}
                </Button>

                {mayEdit ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBatchDeleteConfirm(true)}
                    disabled={exporting}
                    className="h-8 text-xs font-medium text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    <span>批量删除</span>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* File Groups */}
          {groups.map(group => (
            <section key={group.kind} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {fileKindMeta[group.kind].label}
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {group.files.length}
                </span>
              </div>
              {group.kind === "IMAGE" ? (
                <ImageGrid
                  files={group.files}
                  mayEdit={mayEdit}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onPreview={setPreviewFile}
                />
              ) : (
                <DocumentList
                  files={group.files}
                  mayEdit={mayEdit}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onPreview={setPreviewFile}
                />
              )}
            </section>
          ))}
        </>
      )}

      {/* New Folder Modal */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleCreateFolder}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <FolderPlus className="size-4 text-primary" />
                <span>新建文件夹</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                创建文件夹后，您可以将文件直接上传至该目录，或批量移动现有文件。
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="folder-name" className="text-xs font-semibold">
                文件夹名称
              </Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="例如：设计稿、测试报告、A文件夹"
                className="h-9 text-xs"
                autoFocus
                required
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowNewFolderDialog(false)}>
                取消
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs font-medium">
                创建并进入
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Modal */}
      <Dialog open={showRenameFolderDialog} onOpenChange={setShowRenameFolderDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleRenameFolder}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Pencil className="size-4 text-primary" />
                <span>重命名文件夹</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                重命名后，该文件夹内的所有文件将自动更新目录归属。
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <Label htmlFor="rename-folder-name" className="text-xs font-semibold">
                新文件夹名称
              </Label>
              <Input
                id="rename-folder-name"
                value={renameTargetNewName}
                onChange={e => setRenameTargetNewName(e.target.value)}
                placeholder="输入新的文件夹名称"
                className="h-9 text-xs"
                autoFocus
                required
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowRenameFolderDialog(false)}>
                取消
              </Button>
              <Button type="submit" size="sm" className="h-8 text-xs font-medium">
                确认重命名
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move Files Modal */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <MoveRight className="size-4 text-primary" />
              <span>移动选中的文件 ({selectedIds.size})</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              选择目标文件夹，或直接输入新文件夹名称。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">选择现有文件夹</Label>
              <select
                value={moveTargetFolder}
                onChange={e => {
                  setMoveTargetFolder(e.target.value)
                  setCustomMoveFolder("")
                }}
                className="h-9 w-full rounded-md border bg-background px-3 text-xs"
              >
                {allFolders.map(f => (
                  <option key={f} value={f}>
                    {f === "/" ? "根目录 /" : f.replace(/^\//, "")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">或者输入新文件夹名称</Label>
              <Input
                value={customMoveFolder}
                onChange={e => setCustomMoveFolder(e.target.value)}
                placeholder="例如：B文件夹 (留空则使用上方选择)"
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowMoveDialog(false)}>
              取消
            </Button>
            <Button type="button" size="sm" onClick={handleExecuteMove} className="h-8 text-xs font-medium">
              确认移动
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Modal */}
      <ConfirmDialog
        open={showBatchDeleteConfirm}
        onClose={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleBatchDelete}
        title="确定批量删除选中的文件？"
        description={`您正在删除 ${selectedIds.size} 个文件。删除后这些源文件及所有预览缩略图将永久销毁。`}
        confirmText={`确认删除 (${selectedIds.size}) 项`}
        variant="danger"
      />

      {/* Delete Folder Modal */}
      <ConfirmDialog
        open={showDeleteFolderConfirm}
        onClose={() => setShowDeleteFolderConfirm(false)}
        onConfirm={handleDeleteFolderConfirm}
        title={`确定删除文件夹 “${deleteFolderTarget.replace(/^\//, "")}” 吗？`}
        description="删除文件夹将同时销毁该文件夹下的所有文件及预览数据，此操作不可撤回！"
        confirmText="确认删除文件夹"
        variant="danger"
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        files={displayedFiles.filter(f => getPreviewKind(f) !== "NONE")}
        open={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        onSelectFile={f => setPreviewFile(f as FileRecord)}
      />
    </div>
  )
}

function ImageGrid({
  files,
  mayEdit,
  selectedIds,
  onToggleSelect,
  onPreview,
}: {
  files: (FileRecord & { folder?: string | null })[]
  mayEdit: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onPreview: (file: FileRecord) => void
}) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {files.map(file => {
        const isSelected = selectedIds.has(file.id)
        const folderLabel = file.folder && file.folder !== "/" ? file.folder.replace(/^\//, "") : null

        return (
          <article
            key={file.id}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-card shadow-xs transition duration-200 hover:shadow-md",
              isSelected
                ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                : "border-border/80 hover:border-primary/40",
            )}
          >
            {/* Selection Checkbox */}
            <button
              type="button"
              onClick={() => onToggleSelect(file.id)}
              className="absolute left-2.5 top-2.5 z-20 grid size-6 place-items-center rounded-lg bg-background/80 backdrop-blur border border-border/80 shadow-xs hover:border-primary transition"
              aria-label="选择文件"
            >
              {isSelected ? (
                <Check className="size-3.5 text-primary stroke-[3]" />
              ) : (
                <div className="size-3 rounded-sm border border-muted-foreground/50" />
              )}
            </button>

            {/* Folder Badge */}
            {folderLabel ? (
              <span className="absolute right-2.5 top-2.5 z-20 inline-flex items-center gap-1 rounded-md bg-background/90 backdrop-blur px-2 py-0.5 text-[10px] font-semibold text-foreground border border-border/80 shadow-xs">
                <Folder className="size-2.5 text-primary" />
                <span>{folderLabel}</span>
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => onPreview(file)}
              className="relative block aspect-[4/3] w-full overflow-hidden bg-muted/60 text-left focus:outline-none cursor-pointer"
            >
              <Image
                src={`/api/files/${file.id}/thumbnail`}
                alt={file.originalName}
                fill
                unoptimized
                loading="lazy"
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur font-medium">
                  <Eye className="size-3.5" /> 查看大图
                </span>
              </div>
            </button>

            <div className="p-3">
              <p className="truncate text-xs font-semibold text-foreground" title={file.originalName}>
                {file.originalName}
              </p>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{formatSize(file.size)}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPreview(file)}
                    className="hover:text-primary transition font-medium cursor-pointer"
                    title="预览大图"
                  >
                    预览
                  </button>
                  <a
                    href={`/api/files/${file.id}/download`}
                    className="hover:text-primary transition font-medium"
                    title="下载原图"
                  >
                    下载
                  </a>
                  {mayEdit ? <FileActions id={file.id} name={file.originalName} mayDelete /> : null}
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function DocumentList({
  files,
  mayEdit,
  selectedIds,
  onToggleSelect,
  onPreview,
}: {
  files: (FileRecord & { folder?: string | null })[]
  mayEdit: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onPreview: (file: FileRecord) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card divide-y divide-border/60">
      {files.map(file => {
        const badge = getExtensionBadge(file.extension)
        const BadgeIcon = badge.icon
        const previewKind = getPreviewKind({ extension: file.extension, mimeType: file.mimeType })
        const isSelected = selectedIds.has(file.id)
        const folderLabel = file.folder && file.folder !== "/" ? file.folder.replace(/^\//, "") : null

        return (
          <article
            key={file.id}
            className={cn(
              "group flex items-center justify-between p-3 transition duration-150",
              isSelected ? "bg-primary/5" : "hover:bg-accent/20",
            )}
          >
            <div className="flex min-w-0 items-center gap-3 pr-4">
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => onToggleSelect(file.id)}
                className="grid size-5 shrink-0 place-items-center rounded border border-border bg-background hover:border-primary transition"
                aria-label="选择文件"
              >
                {isSelected ? (
                  <Check className="size-3.5 text-primary stroke-[3]" />
                ) : (
                  <div className="size-2 rounded-xs" />
                )}
              </button>

              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg border font-bold text-[10px]",
                  badge.bg,
                )}
              >
                <BadgeIcon className="size-4.5" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (previewKind !== "NONE") onPreview(file)
                    }}
                    className={cn(
                      "truncate text-xs font-semibold text-foreground transition text-left",
                      previewKind !== "NONE" ? "hover:text-primary cursor-pointer" : "cursor-default",
                    )}
                    title={file.originalName}
                  >
                    {file.originalName}
                  </button>
                  {folderLabel ? (
                    <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <Folder className="size-2.5" />
                      <span>{folderLabel}</span>
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                  <span>{formatSize(file.size)}</span>
                  <span>·</span>
                  <span>{formatDate(file.createdAt)}</span>
                  {file.previewStatus === "PROCESSING" ? (
                    <span className="text-amber-500 font-sans font-medium flex items-center gap-1">
                      <RefreshCw className="size-2.5 animate-spin" /> 生成预览中
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {previewKind !== "NONE" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onPreview(file)}
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                  title="在线预览"
                >
                  <Eye className="size-3.5 mr-1" />
                  <span>预览</span>
                </Button>
              ) : null}

              <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground">
                <a href={`/api/files/${file.id}/download`}>
                  <Download className="size-3.5 mr-1" />
                  <span>下载</span>
                </a>
              </Button>

              {mayEdit ? (
                <FileActions id={file.id} name={file.originalName} mayDelete showPreview={false} />
              ) : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}
