"use client"

import { Globe2, RefreshCw, Share2, X } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"

import { ShareForm } from "./share-form"
import { getResourceShareData, type ResourceShareData } from "@/lib/share/actions"

const emptySubscribe = () => () => {}

export function QuickShareDialog({
  open,
  onClose,
  resourceId,
  resourceName,
  resourceUrl,
  initialCredentials,
}: {
  open: boolean
  onClose: () => void
  resourceId: string
  resourceName: string
  resourceUrl?: string | null
  initialCredentials?: Array<{ id: string; name: string; type: string; username: string | null; linkId?: string | null }>
}) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ResourceShareData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch full data whenever dialog opens
  useEffect(() => {
    if (!open) return
    let active = true

    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const res = await getResourceShareData(resourceId)
        if (!active) return
        if (res.success) {
          setData(res.data)
        } else {
          setError(res.error)
        }
      } catch {
        if (active) setError("加载分享数据失败，请重试")
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [open, resourceId])

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity animate-in fade-in-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl transition-all animate-in zoom-in-95 fade-in-0 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 shrink-0 bg-card/90">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary shadow-2xs">
              <Share2 className="size-4.5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2 py-0.5 text-[10px] font-semibold">
                  外部安全协作
                </span>
                {resourceUrl ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground truncate max-w-56" title={resourceUrl}>
                    <Globe2 className="size-3 shrink-0 text-primary" />
                    <span className="truncate">{resourceUrl}</span>
                  </span>
                ) : null}
              </div>
              <h2 className="truncate text-base font-bold text-foreground mt-0.5">
                对外分享 · {resourceName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition ml-2"
            aria-label="关闭"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p className="text-xs font-medium">正在获取该资产的分享权限与数据...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-center text-xs text-destructive font-medium">
              {error}
            </div>
          ) : data ? (
            <ShareForm
              resourceId={resourceId}
              resourceName={data.resourceName}
              resourceUrl={data.resourceUrl || resourceUrl}
              links={data.links}
              files={data.files}
              credentials={data.credentials}
              activeShares={data.activeShares}
            />
          ) : (
            <ShareForm
              resourceId={resourceId}
              resourceName={resourceName}
              resourceUrl={resourceUrl}
              files={[]}
              credentials={initialCredentials ?? []}
              activeShares={[]}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
