"use client"

import { Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { deleteFile } from "@/lib/file/actions"

export function FileActions({ id, name, mayDelete = false, showPreview = true }: { id: string; name: string; mayDelete?: boolean; showPreview?: boolean }) {
  async function remove() { if (window.confirm(`删除 ${name}？`)) { const result = await deleteFile(id); if (result.success) window.location.reload(); else window.alert(result.error) } }
  if (!showPreview && !mayDelete) return null
  return <div className="flex shrink-0 gap-1">{showPreview ? <Button asChild variant="ghost" size="icon" title="预览文件" aria-label={`预览 ${name}`}><Link href={`/files/${id}/preview`}><Eye /></Link></Button> : null}{mayDelete ? <Button type="button" variant="ghost" size="icon" title="删除文件" aria-label={`删除 ${name}`} onClick={remove} className="text-destructive hover:text-destructive"><Trash2 /></Button> : null}</div>
}
