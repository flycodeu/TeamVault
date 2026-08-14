"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import { Check, Edit3, Globe2, Lock, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createMemo, deleteMemo, updateMemo } from "@/lib/memo/actions"
import { cn } from "@/lib/utils"

export type Memo = {
  id: string
  content: string
  color: string
  visibility: "PRIVATE" | "TEAM"
  createdBy: string
  createdAt: Date
  updatedAt: Date
  authorName?: string
}

const colors = [
  { id: "bg-card", name: "默认 (白/黑)" },
  { id: "bg-amber-100 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900", name: "琥珀黄" },
  { id: "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900", name: "翡翠绿" },
  { id: "bg-blue-100 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900", name: "海天蓝" },
  { id: "bg-rose-100 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900", name: "玫瑰红" },
  { id: "bg-purple-100 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900", name: "丁香紫" },
]

export function MemoBoard({ initialMemos, currentUserId }: { initialMemos: Memo[]; currentUserId: string }) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [color, setColor] = useState(colors[0].id)
  const [visibility, setVisibility] = useState<"PRIVATE" | "TEAM">("PRIVATE")
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if ((adding || editingId) && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [adding, editingId, content])

  function resetForm() {
    setAdding(false)
    setEditingId(null)
    setContent("")
    setColor(colors[0].id)
    setVisibility("PRIVATE")
  }

  function handleEdit(memo: Memo) {
    setEditingId(memo.id)
    setContent(memo.content)
    setColor(memo.color)
    setVisibility(memo.visibility)
    setAdding(false)
  }

  async function handleSave() {
    if (!content.trim()) return
    startTransition(async () => {
      if (editingId) {
        await updateMemo(editingId, { content, color, visibility })
      } else {
        await createMemo({ content, color, visibility })
      }
      resetForm()
    })
  }

  async function handleDelete(id: string) {
    if (confirm("确定要删除这条备忘录吗？此操作不可恢复。")) {
      startTransition(async () => {
        await deleteMemo(id)
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">全部备忘录</h2>
        <Button onClick={() => { resetForm(); setAdding(true) }} size="sm" className="gap-1.5 h-8.5 font-medium shadow-xs" disabled={adding}>
          <Plus className="size-3.5" /> 新增备忘录
        </Button>
      </div>

      {/* Memo Grid / Masonry Layout */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {/* New/Edit Form Card (Prepend if active) */}
        {adding || editingId ? (
          <div className={cn("break-inside-avoid rounded-2xl border p-4 shadow-md transition-all", color)}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入备忘录内容..."
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none focus:ring-0 mb-3"
              rows={3}
            />
            
            <div className="flex flex-col gap-3 border-t border-border/50 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {colors.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setColor(c.id)}
                      className={cn(
                        "size-5 rounded-full border shadow-sm transition-transform hover:scale-110",
                        c.id.split(" ")[0], // Extract the base bg class for the button
                        color === c.id ? "ring-2 ring-primary ring-offset-1 dark:ring-offset-background" : ""
                      )}
                      title={c.name}
                    />
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setVisibility(v => v === "PRIVATE" ? "TEAM" : "PRIVATE")}
                >
                  {visibility === "PRIVATE" ? <><Lock className="size-3 mr-1"/> 仅自己可见</> : <><Globe2 className="size-3 mr-1"/> 团队可见</>}
                </Button>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={resetForm} disabled={isPending} className="h-7.5 text-xs">取消</Button>
                <Button size="sm" onClick={handleSave} disabled={isPending || !content.trim()} className="h-7.5 text-xs font-medium">
                  {isPending ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Existing Memos */}
        {initialMemos.map((memo) => {
          if (editingId === memo.id) return null // Hide the original if being edited
          
          const isOwner = memo.createdBy === currentUserId
          
          return (
            <div
              key={memo.id}
              className={cn(
                "group relative break-inside-avoid rounded-2xl border p-4 shadow-xs transition-all hover:shadow-md hover:-translate-y-0.5",
                memo.color || "bg-card"
              )}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {memo.content}
              </div>
              
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                  {memo.visibility === "PRIVATE" ? <Lock className="size-3" /> : <Globe2 className="size-3" />}
                  <span>{memo.authorName}</span>
                </div>
                
                {isOwner ? (
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                    <button onClick={() => handleEdit(memo)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-accent/50 transition-colors">
                      <Edit3 className="size-3.5" />
                    </button>
                    <button onClick={() => handleDelete(memo.id)} disabled={isPending} className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-md hover:bg-accent/50 transition-colors">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      
      {initialMemos.length === 0 && !adding && !editingId ? (
        <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed rounded-2xl">
          <p className="text-sm font-medium text-muted-foreground">还没有备忘录，记录一下灵感吧！</p>
          <Button onClick={() => setAdding(true)} variant="outline" size="sm" className="mt-4 gap-1.5 h-8">
            <Plus className="size-3.5" /> 写便签
          </Button>
        </div>
      ) : null}
    </div>
  )
}
