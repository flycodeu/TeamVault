"use client"

import { AlertTriangle, Info, RefreshCw, Trash2, X } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  description?: React.ReactNode
  targetName?: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info"
}

const emptySubscribe = () => () => {}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  targetName,
  confirmText = "确认删除",
  cancelText = "取消",
  variant = "danger",
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, loading, onClose])

  if (!mounted || !open) return null

  async function handleConfirm() {
    try {
      setLoading(true)
      await onConfirm()
    } finally {
      setLoading(false)
      onClose()
    }
  }

  const iconConfig = {
    danger: {
      icon: Trash2,
      iconBg: "bg-destructive/10 text-destructive",
      confirmBtn: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white",
    },
    info: {
      icon: Info,
      iconBg: "bg-primary/10 text-primary",
      confirmBtn: "bg-primary hover:bg-primary/90 text-primary-foreground",
    },
  }[variant]

  const IconComponent = iconConfig.icon

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity animate-in fade-in-0"
        onClick={() => {
          if (!loading) onClose()
        }}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-50 w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-xl transition-all animate-in zoom-in-95 fade-in-0 duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition disabled:opacity-50"
          aria-label="关闭"
        >
          <X className="size-4" />
        </button>

        {/* Content Header */}
        <div className="flex items-start gap-4">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", iconConfig.iconBg)}>
            <IconComponent className="size-5" />
          </span>
          <div className="min-w-0 flex-1 pr-4">
            <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
            {targetName ? (
              <div className="mt-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 font-mono text-xs font-semibold text-foreground truncate select-all">
                {targetName}
              </div>
            ) : null}
            {description ? (
              <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</div>
            ) : null}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-border/50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
            className="h-8.5 text-xs font-medium"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className={cn("h-8.5 text-xs font-medium gap-1.5 shadow-xs", iconConfig.confirmBtn)}
          >
            {loading ? (
              <>
                <RefreshCw className="size-3.5 animate-spin" />
                <span>处理中...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
