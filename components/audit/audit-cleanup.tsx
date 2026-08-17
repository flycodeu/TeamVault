"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

import { clearAuditLogs } from "@/lib/audit/actions"
import { Button } from "@/components/ui/button"

export function AuditCleanup() {
  const [isClearing, setIsClearing] = useState(false)

  async function handleClear(days: number) {
    if (!confirm(`确认清理 ${days} 天前的审计日志？此操作不可恢复。`)) return
    setIsClearing(true)
    try {
      const res = await clearAuditLogs(days)
      if (res.success) {
        alert(`成功清理了 ${res.data?.deleted} 条日志`)
      } else {
        alert(res.error)
      }
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="h-8 rounded-lg border border-input bg-card px-2 text-xs shadow-xs focus-visible:outline-none"
        onChange={(e) => {
          if (e.target.value) {
            handleClear(Number(e.target.value))
            e.target.value = "" // reset select
          }
        }}
        disabled={isClearing}
      >
        <option value="">空间清理...</option>
        <option value="30">清理 30 天前日志</option>
        <option value="90">清理 90 天前日志</option>
        <option value="180">清理半年前日志</option>
        <option value="0">⚠️ 清空所有日志</option>
      </select>
    </div>
  )
}
