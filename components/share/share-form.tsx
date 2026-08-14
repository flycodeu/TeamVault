"use client"

import {
  Check,
  Copy,
  Dices,
  ExternalLink,
  FileText,
  Globe2,
  KeyRound,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createFileShare,
  createResourceShare,
  revokeShare,
} from "@/lib/share/actions"
import { cn } from "@/lib/utils"

export type ActiveShareItem = {
  id: string
  type: string
  targetId: string
  expiresAt: Date | null
  allowPreview: boolean
  allowDownload: boolean
  allowCredentials: boolean
  credentialIds: string | null
  fileIds: string | null
  viewCount: number
  maxViews: number | null
  createdAt: Date
  hasPassword: boolean
  creatorName: string | null
  isExpired?: boolean
}

export function ShareForm({
  resourceId,
  resourceName,
  files,
  credentials = [],
  activeShares = [],
}: {
  resourceId: string
  resourceName: string
  files: Array<{ id: string; name: string }>
  credentials?: Array<{ id: string; name: string; type: string; username: string | null }>
  activeShares?: ActiveShareItem[]
}) {
  const router = useRouter()
  const [shareTarget, setShareTarget] = useState<"package" | "file">("package")
  const [selectedFileId, setSelectedFileId] = useState<string>(files[0]?.id ?? "")

  // Handover package options
  const [includeCredentials, setIncludeCredentials] = useState(true)
  const [selectedCredentialIds, setSelectedCredentialIds] = useState<string[]>(
    credentials.map(c => c.id),
  )
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>(files.map(f => f.id))
  const [allowPreview, setAllowPreview] = useState(true)
  const [allowDownload, setAllowDownload] = useState(true)

  // Security options
  const [password, setPassword] = useState("")
  const [expiryDays, setExpiryDays] = useState<number | "custom" | "never">(7)
  const [customExpiryDate, setCustomExpiryDate] = useState("")
  const [maxViews, setMaxViews] = useState("")

  // Submission state
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [generatedResult, setGeneratedResult] = useState<{
    token: string
    url: string
    password?: string
  } | null>(null)
  const [copiedHandover, setCopiedHandover] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  function generateRandomPassword() {
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"
    let res = ""
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(res)
  }

  function toggleCredential(id: string) {
    setSelectedCredentialIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
    )
  }

  function toggleAllCredentials() {
    if (selectedCredentialIds.length === credentials.length) {
      setSelectedCredentialIds([])
    } else {
      setSelectedCredentialIds(credentials.map(c => c.id))
    }
  }

  function toggleFile(id: string) {
    setSelectedFileIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
    )
  }

  function toggleAllFiles() {
    if (selectedFileIds.length === files.length) {
      setSelectedFileIds([])
    } else {
      setSelectedFileIds(files.map(f => f.id))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError("")
    setGeneratedResult(null)

    let expiresAt: Date | undefined
    if (expiryDays === "never") {
      expiresAt = undefined
    } else if (expiryDays === "custom" && customExpiryDate) {
      expiresAt = new Date(`${customExpiryDate}T23:59:59`)
    } else if (typeof expiryDays === "number") {
      const d = new Date()
      d.setDate(d.getDate() + expiryDays)
      d.setHours(23, 59, 59, 999)
      expiresAt = d
    }

    const views = maxViews ? Number(maxViews) : undefined

    if (shareTarget === "file") {
      if (!selectedFileId) {
        setError("请选择要分享的文件")
        setPending(false)
        return
      }
      const result = await createFileShare({
        fileId: selectedFileId,
        password: password.trim() || undefined,
        expiresAt,
        allowPreview,
        allowDownload,
        maxViews: views,
      })
      if (!result.success) {
        setError(result.error)
      } else {
        const fullUrl = `${window.location.origin}/s/${result.data.token}`
        setGeneratedResult({
          token: result.data.token,
          url: fullUrl,
          password: password.trim() || undefined,
        })
        router.refresh()
      }
    } else {
      const result = await createResourceShare({
        resourceId,
        password: password.trim() || undefined,
        expiresAt,
        allowPreview,
        allowDownload,
        allowCredentials: includeCredentials,
        credentialIds: includeCredentials ? selectedCredentialIds : [],
        fileIds: selectedFileIds,
        maxViews: views,
      })
      if (!result.success) {
        setError(result.error)
      } else {
        const fullUrl = `${window.location.origin}/s/${result.data.token}`
        setGeneratedResult({
          token: result.data.token,
          url: fullUrl,
          password: password.trim() || undefined,
        })
        router.refresh()
      }
    }
    setPending(false)
  }

  async function copyHandoverText() {
    if (!generatedResult) return
    const text = [
      `【${resourceName} - 协作交付包】`,
      `访问链接: ${generatedResult.url}`,
      generatedResult.password ? `提取密码: ${generatedResult.password}` : `提取密码: 无需密码 (直接打开)`,
      expiryDays !== "never"
        ? `有效期至: ${expiryDays === "custom" ? customExpiryDate : `${expiryDays} 天内有效`}`
        : `有效期: 长期有效`,
      `说明: 包含系统访问地址、配套操作手册与登录凭据`,
    ].join("\n")

    await navigator.clipboard.writeText(text)
    setCopiedHandover(true)
    setTimeout(() => setCopiedHandover(false), 2000)
  }

  async function handleRevoke(id: string) {
    if (!window.confirm("确定撤销该分享链接？撤销后外部人员将立即无法访问。")) return
    setRevokingId(id)
    const result = await revokeShare(id, resourceId)
    if (result.success) {
      router.refresh()
    } else {
      alert(result.error)
    }
    setRevokingId(null)
  }

  return (
    <div className="space-y-6">
      {/* Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Target Type Selector */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">交付模式</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShareTarget("package")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-semibold transition",
                shareTarget === "package"
                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                  : "border-border/80 bg-background text-muted-foreground hover:bg-accent/40",
              )}
            >
              <Globe2 className="size-3.5" />
              <span>一站式协作交付包 (网站+手册+账号)</span>
            </button>
            <button
              type="button"
              onClick={() => setShareTarget("file")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-lg border p-2.5 text-xs font-semibold transition",
                shareTarget === "file"
                  ? "border-primary bg-primary/10 text-primary shadow-xs"
                  : "border-border/80 bg-background text-muted-foreground hover:bg-accent/40",
              )}
            >
              <FileText className="size-3.5" />
              <span>单文件外链</span>
            </button>
          </div>
        </div>

        {shareTarget === "file" ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">选择要分享的文件</Label>
            <select
              value={selectedFileId}
              onChange={e => setSelectedFileId(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs shadow-xs"
            >
              {files.map(file => (
                <option key={file.id} value={file.id}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-3.5 rounded-xl border border-border/80 bg-card/60 p-4">
            {/* Include Credentials Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeCredentials}
                    onChange={e => setIncludeCredentials(e.target.checked)}
                    className="size-3.5 rounded border-input text-primary accent-primary"
                  />
                  <KeyRound className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span>包含登录账号与密码凭据</span>
                </label>
                {includeCredentials && credentials.length > 1 ? (
                  <button
                    type="button"
                    onClick={toggleAllCredentials}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    {selectedCredentialIds.length === credentials.length ? "取消全选" : "全选全部"}
                  </button>
                ) : null}
              </div>

              {includeCredentials ? (
                credentials.length ? (
                  <div className="grid gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {credentials.map(c => {
                      const checked = selectedCredentialIds.includes(c.id)
                      return (
                        <label
                          key={c.id}
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition",
                            checked
                              ? "border-primary/40 bg-accent/30 font-medium text-foreground"
                              : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40",
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCredential(c.id)}
                              className="size-3 rounded border-input text-primary accent-primary"
                            />
                            <span className="truncate">{c.name}</span>
                          </div>
                          {c.username ? (
                            <span className="font-mono text-[11px] text-muted-foreground truncate max-w-36">
                              {c.username}
                            </span>
                          ) : null}
                        </label>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded">
                    本模块暂未添加任何账号密码，如需交付请先在「账号凭据」添加。
                  </p>
                )
              ) : null}
            </div>

            {/* Include Files Picker */}
            {files.length ? (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <FileText className="size-3.5 text-blue-600 dark:text-blue-400" />
                    <span>配套手册与文件资料</span>
                  </div>
                  {files.length > 1 ? (
                    <button
                      type="button"
                      onClick={toggleAllFiles}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      {selectedFileIds.length === files.length ? "取消全选" : "全选全部"}
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {files.map(f => {
                    const checked = selectedFileIds.includes(f.id)
                    return (
                      <label
                        key={f.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs cursor-pointer transition",
                          checked
                            ? "border-primary/40 bg-accent/30 font-medium text-foreground"
                            : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFile(f.id)}
                            className="size-3 rounded border-input text-primary accent-primary"
                          />
                          <span className="truncate">{f.name}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* File Permissions */}
        <div className="flex flex-wrap gap-4 text-xs font-medium pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowPreview}
              onChange={e => setAllowPreview(e.target.checked)}
              className="size-3.5 rounded border-input text-primary accent-primary"
            />
            <span>允许免登录在线查阅/预览</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={e => setAllowDownload(e.target.checked)}
              className="size-3.5 rounded border-input text-primary accent-primary"
            />
            <span>允许直接下载源文件</span>
          </label>
        </div>

        {/* Security: Password & Expiry */}
        <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/60">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">访问提取码（可选）</Label>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
              >
                <Dices className="size-3" />
                <span>生成 6 位安全码</span>
              </button>
            </div>
            <Input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="留空则为无密码直接访问"
              className="h-9 text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">有效期设置</Label>
            <div className="flex gap-1">
              {[
                { label: "1天", val: 1 },
                { label: "7天", val: 7 },
                { label: "30天", val: 30 },
                { label: "自定义", val: "custom" as const },
                { label: "永久", val: "never" as const },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setExpiryDays(item.val)}
                  className={cn(
                    "flex-1 rounded-lg border py-1.5 text-xs font-medium transition",
                    expiryDays === item.val
                      ? "border-primary bg-primary text-primary-foreground shadow-xs"
                      : "border-border/80 bg-background text-muted-foreground hover:bg-accent/40",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {expiryDays === "custom" ? (
              <Input
                type="date"
                value={customExpiryDate}
                onChange={e => setCustomExpiryDate(e.target.value)}
                className="mt-1.5 h-8 text-xs"
              />
            ) : null}
          </div>
        </div>

        {/* Optional Max Views */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            value={maxViews}
            onChange={e => setMaxViews(e.target.value)}
            placeholder="最大访问次数（可选，例如 5 次后失效）"
            className="h-8.5 text-xs max-w-xs"
          />
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Button disabled={pending} className="w-full h-9 text-xs font-semibold gap-1.5 shadow-xs">
          {pending ? (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              <span>正在生成加密交付包...</span>
            </>
          ) : (
            <>
              <Share2 className="size-3.5" />
              <span>生成外部协作分享链接</span>
            </>
          )}
        </Button>
      </form>

      {/* Generated Result Card */}
      {generatedResult ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <Check className="size-4" />
              交付包链接已生成
            </span>
            <Button
              type="button"
              size="sm"
              className="h-7.5 gap-1.5 text-xs font-medium shadow-xs"
              onClick={copyHandoverText}
            >
              {copiedHandover ? <Check className="size-3" /> : <Copy className="size-3" />}
              <span>{copiedHandover ? "已复制完整交付信息" : "一键复制链接与提取码"}</span>
            </Button>
          </div>

          <div className="rounded-lg bg-background/90 p-3 border border-border/60 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">分享链接:</span>
              <a
                href={generatedResult.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-mono truncate max-w-sm inline-flex items-center gap-1"
              >
                <span>{generatedResult.url}</span>
                <ExternalLink className="size-3 shrink-0" />
              </a>
            </div>
            {generatedResult.password ? (
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <span className="text-muted-foreground text-[11px]">提取密码:</span>
                <span className="font-mono font-bold text-foreground text-sm tracking-wider">
                  {generatedResult.password}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-1 border-t border-border/40">
                <span className="text-muted-foreground text-[11px]">提取密码:</span>
                <span className="text-muted-foreground text-xs">无密码 (凭链接访问)</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Active Shares Management List */}
      {activeShares.length ? (
        <div className="space-y-3 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              当前生效的分享链接 ({activeShares.length})
            </h3>
          </div>

          <div className="space-y-2">
            {activeShares.map(share => {
              const isExpired = Boolean(share.isExpired)
              const isRevoking = revokingId === share.id
              return (
                <div
                  key={share.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/80 bg-background/60 p-3 text-xs transition",
                    isExpired && "opacity-60 bg-muted/30",
                  )}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-primary/10 px-1.5 py-0.2 font-semibold text-[10px] text-primary">
                        {share.type === "FILE" ? "单文件" : "交付包"}
                      </span>
                      {share.allowCredentials ? (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.2 font-semibold text-[10px] text-amber-700 dark:text-amber-300">
                          含账号密码
                        </span>
                      ) : null}
                      {share.hasPassword ? (
                        <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                          有提取码
                        </span>
                      ) : null}
                      {isExpired ? (
                        <span className="rounded bg-destructive/10 px-1.5 py-0.2 text-[10px] font-semibold text-destructive">
                          已过期
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>已访问: {share.viewCount} 次</span>
                      {share.expiresAt ? (
                        <span>到期: {new Date(share.expiresAt).toLocaleDateString("zh-CN")}</span>
                      ) : (
                        <span>永久有效</span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isRevoking}
                    onClick={() => handleRevoke(share.id)}
                    className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 self-end sm:self-center"
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    <span>{isRevoking ? "撤销中..." : "撤销失效"}</span>
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

