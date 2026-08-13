"use client"

import { Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { deleteFile } from "@/lib/file/actions"

export function FileActions({ id, name }: { id: string; name: string }) {
  async function remove() { if (window.confirm(`删除 ${name}？`)) { const result = await deleteFile(id); if (result.success) window.location.reload(); else window.alert(result.error) } }
  return <div className="flex shrink-0 gap-1"><Button asChild variant="ghost" size="icon" title="预览文件" aria-label={`预览 ${name}`}><Link href={`/files/${id}/preview`}><Eye /></Link></Button><Button type="button" variant="ghost" size="icon" title="删除文件" aria-label={`删除 ${name}`} onClick={remove}><Trash2 /></Button></div>
}
