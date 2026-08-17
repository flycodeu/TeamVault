"use client"

import { useState } from "react"
import { LoaderCircle, Pencil, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateGroup } from "@/lib/admin/actions"

export function GroupEditDialog({
  group,
}: {
  group: {
    id: string
    name: string
    description: string | null
  }
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description ?? "")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      setName(group.name)
      setDescription(group.description ?? "")
      setError("")
    }
    setOpen(newOpen)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError("")

    try {
      const res = await updateGroup(group.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      })

      if (res.success) {
        setOpen(false)
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新小组信息失败")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          title="修改小组名称与描述"
        >
          <Pencil className="size-3.5 mr-1" />
          <span>编辑小组</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Users className="size-4 text-primary" />
              <span>编辑小组信息</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              修改小组的名称和说明，关联的内容权限与成员关系将保持同步。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error ? (
              <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
                {error}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="edit-group-name" className="text-xs font-semibold">
                小组名称
              </Label>
              <Input
                id="edit-group-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例如：前端开发组、运维团队"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-group-desc" className="text-xs font-semibold">
                说明 / 职责 <span className="text-[11px] font-normal text-muted-foreground">(可选)</span>
              </Label>
              <Input
                id="edit-group-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="简短描述该小组职责"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              取消
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-xs font-medium"
              disabled={pending}
            >
              {pending ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin mr-1.5" />
                  <span>保存中...</span>
                </>
              ) : (
                "保存修改"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
