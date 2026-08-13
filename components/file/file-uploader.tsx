"use client"

import { Upload, LoaderCircle } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"

export function FileUploader({ resourceId }: { resourceId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState("")
  async function upload() {
    const file = inputRef.current?.files?.[0]
    if (!file) return
    setPending(true); setMessage("")
    const form = new FormData(); form.set("resourceId", resourceId); form.set("file", file)
    const response = await fetch("/api/files/upload", { method: "POST", body: form })
    const result = (await response.json()) as { success: boolean; error?: string }
    setMessage(result.success ? "上传成功" : result.error ?? "上传失败")
    setPending(false)
    if (result.success) window.location.reload()
  }
  return <div className="flex flex-wrap items-center gap-3"><input ref={inputRef} type="file" className="sr-only" onChange={upload} /><Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Upload />}{pending ? "上传中" : "上传文件"}</Button>{message ? <span className="text-xs text-muted-foreground">{message}</span> : null}</div>
}
