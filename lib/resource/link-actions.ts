"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { ActionResult } from "@/lib/action-result"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { resourceLinks } from "@/lib/db/schema"
import { canEditResource } from "@/lib/permission"

const resourceLinkSchema = z.object({
  kind: z.enum(["WEBSITE", "EXTERNAL_DOCUMENT", "OTHER"]),
  title: z.string().trim().min(1, "请输入名称").max(100),
  url: z.url("请输入有效链接").max(1000),
  description: z.string().trim().max(500).optional(),
})

export async function createResourceLink(resourceId: string, input: z.infer<typeof resourceLinkSchema>): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser()
  if (!user || !(await canEditResource(resourceId))) return { success: false, error: "无权编辑该模块" }
  const parsed = resourceLinkSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "链接信息无效" }
  const [link] = await db.insert(resourceLinks).values({ resourceId, createdBy: user.id, ...parsed.data }).returning({ id: resourceLinks.id })
  revalidatePath(`/resources/${resourceId}`)
  revalidatePath("/resources")
  return { success: true, data: link }
}

export async function updateResourceLink(id: string, input: z.infer<typeof resourceLinkSchema>): Promise<ActionResult> {
  const link = await db.query.resourceLinks.findFirst({ where: eq(resourceLinks.id, id) })
  if (!link || !(await canEditResource(link.resourceId))) return { success: false, error: "无权编辑该内容" }
  const parsed = resourceLinkSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "链接信息无效" }
  await db.update(resourceLinks).set({ ...parsed.data, updatedAt: new Date() }).where(eq(resourceLinks.id, id))
  revalidatePath(`/resources/${link.resourceId}`)
  revalidatePath("/resources")
  return { success: true, data: undefined }
}

export async function deleteResourceLink(id: string): Promise<ActionResult> {
  const link = await db.query.resourceLinks.findFirst({ where: eq(resourceLinks.id, id) })
  if (!link || !(await canEditResource(link.resourceId))) return { success: false, error: "无权删除该内容" }
  await db.delete(resourceLinks).where(eq(resourceLinks.id, id))
  revalidatePath(`/resources/${link.resourceId}`)
  revalidatePath("/resources")
  return { success: true, data: undefined }
}
