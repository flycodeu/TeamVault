"use client"

import { useState } from "react"
import { LoaderCircle, Pencil, Shield, User } from "lucide-react"

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
import { updateUser } from "@/lib/admin/actions"

export function UserEditDialog({
  user,
}: {
  user: {
    id: string
    username: string
    displayName: string
    isAdmin: boolean
  }
}) {
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [username, setUsername] = useState(user.username)
  const [password, setPassword] = useState("")
  const [isAdmin, setIsAdmin] = useState(user.isAdmin)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  function handleOpenChange(newOpen: boolean) {
    if (newOpen) {
      setDisplayName(user.displayName)
      setUsername(user.username)
      setPassword("")
      setIsAdmin(user.isAdmin)
      setError("")
    }
    setOpen(newOpen)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError("")

    try {
      const res = await updateUser(user.id, {
        displayName: displayName.trim(),
        username: username.trim(),
        isAdmin,
        password: password.trim() ? password.trim() : undefined,
      })

      if (res.success) {
        setOpen(false)
      } else {
        setError(res.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新成员信息失败")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          title="编辑成员信息与权限"
        >
          <Pencil className="size-3.5 mr-1" />
          <span>编辑</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <User className="size-4 text-primary" />
              <span>编辑成员资料</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              修改成员显示名、登录名、分配管理员权限或重置登录密码。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error ? (
              <div className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
                {error}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="edit-displayName" className="text-xs font-semibold">
                显示姓名
              </Label>
              <Input
                id="edit-displayName"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="例如：张三"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-username" className="text-xs font-semibold">
                登录用户名
              </Label>
              <Input
                id="edit-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="例如：zhangsan"
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-password" className="text-xs font-semibold">
                重置密码 <span className="text-[11px] font-normal text-muted-foreground">(留空则保持不变)</span>
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="输入新密码 (至少 6 位)"
                className="h-9 text-xs"
                autoComplete="new-password"
              />
            </div>

            <div className="pt-2 border-t">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={e => setIsAdmin(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Shield className="size-3.5 text-primary" />
                    <span>系统管理员权限</span>
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    管理员拥有所有资产、人员、群组与安全审计日志的全局管理权。
                  </p>
                </div>
              </label>
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
