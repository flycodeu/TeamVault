"use client"

import { Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { deleteFile } from "@/lib/file/actions"

export function FileActions({
  id,
  name,
  mayDelete = false,
  showPreview = true,
}: {
  id: string
  name: string
  mayDelete?: boolean
  showPreview?: boolean
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleConfirmDelete() {
    const result = await deleteFile(id)
    if (result.success) {
      router.refresh()
    } else {
      alert(result.error)
    }
  }

  if (!showPreview && !mayDelete) return null

  return (
    <>
      <div className="flex shrink-0 gap-1">
        {showPreview ? (
          <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" title="预览文件" aria-label={`预览 ${name}`}>
            <Link href={`/files/${id}/preview`}>
              <Eye className="size-4" />
            </Link>
          </Button>
        ) : null}
        {mayDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="删除文件"
            aria-label={`删除 ${name}`}
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="确定删除该文件？"
        targetName={name}
        description="删除后该文件源文件及生成的所有预览缩略图将永久销毁。"
        confirmText="确认删除文件"
        variant="danger"
      />
    </>
  )
}

