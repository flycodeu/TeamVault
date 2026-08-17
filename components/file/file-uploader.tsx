"use client"

import { Folder, LoaderCircle, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { uploadAccept } from "@/lib/file/kinds"

export function FileUploader({
  resourceId,
  currentFolder = "/",
}: {
  resourceId: string
  currentFolder?: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")

  const displayFolder = currentFolder === "/" ? "根目录" : currentFolder.replace(/^\//, "")

  async function upload() {
    const selectedFiles = Array.from(inputRef.current?.files ?? [])
    if (!selectedFiles.length) return
    setPending(true)
    setMessage(`正在上传 1/${selectedFiles.length}`)
    const failures: string[] = []
    let succeeded = 0
    for (const [index, file] of selectedFiles.entries()) {
      setMessage(`正在上传 ${index + 1}/${selectedFiles.length} · ${file.name}`)
      try {
        const form = new FormData()
        form.set("resourceId", resourceId)
        form.set("folder", currentFolder)
        form.set("file", file)
        const response = await fetch("/api/files/upload", { method: "POST", body: form })
        const result = (await response.json()) as { success: boolean; error?: string }
        if (result.success) succeeded += 1
        else failures.push(`${file.name}：${result.error ?? "上传失败"}`)
      } catch {
        failures.push(`${file.name}：网络错误`)
      }
    }
    if (inputRef.current) inputRef.current.value = ""
    setPending(false)
    setMessage(failures.length ? `成功 ${succeeded} 个；${failures.slice(0, 2).join("；")}` : `已上传 ${succeeded} 个文件至 [${displayFolder}]`)
    if (succeeded) router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        accept={uploadAccept}
        onChange={upload}
      />
      <Button
        type="button"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="h-8 text-xs font-medium"
        title={`上传文件至当前文件夹（${displayFolder}）`}
      >
        {pending ? <LoaderCircle className="size-3.5 animate-spin mr-1.5" /> : <Upload className="size-3.5 mr-1.5" />}
        <span>{pending ? "上传中..." : `上传至 ${displayFolder}`}</span>
      </Button>
      {message ? <span className="basis-full text-right text-xs text-muted-foreground">{message}</span> : null}
    </div>
  )
}
