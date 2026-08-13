import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ResourceForm } from "@/components/resource/resource-form"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { resources } from "@/lib/db/schema"
import { and, eq, isNull } from "drizzle-orm"
import { canEditResource } from "@/lib/permission"

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resource = await db.query.resources.findFirst({ where: and(eq(resources.id, id), isNull(resources.deletedAt)) })
  if (!resource || !(await canEditResource(id))) notFound()
  return <div className="mx-auto max-w-3xl px-4 py-7 md:px-8 md:py-9"><Button variant="ghost" size="sm" asChild><Link href={`/resources/${id}`}><ChevronLeft />模块详情</Link></Button><div className="mt-6"><h1 className="text-2xl font-semibold">编辑模块</h1></div><div className="mt-7 rounded-lg border bg-card p-5 md:p-7"><ResourceForm resource={resource} /></div></div>
}
