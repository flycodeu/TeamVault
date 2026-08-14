"use server"

import { and, eq, inArray, isNull, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/action-result"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files, resourceFavorites, resources, shares } from "@/lib/db/schema"
import { writeAudit } from "@/lib/audit/log"
import { canEditResource, canViewResource } from "@/lib/permission"

import { resourceSchema, type ResourceInput } from "./schemas"

async function currentAdmin() {
  const user = await getCurrentUser()
  return user?.isAdmin ? user : null
}

export async function createResource(input: ResourceInput): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser()
  const parsed = resourceSchema.safeParse(input)
  if (!user) return { success: false, error: "请先登录" }
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "资源信息无效" }

  const [resource] = await db.insert(resources).values({
    name: parsed.data.name,
    category: parsed.data.moduleKind === "WEBSITE" ? null : parsed.data.category || null,
    moduleKind: parsed.data.moduleKind,
    type: parsed.data.moduleKind === "WEBSITE" ? "WEBSITE" : "OTHER",
    url: parsed.data.moduleKind === "WEBSITE" ? parsed.data.url : null,
    description: parsed.data.description,
    visibility: parsed.data.visibility,
    sensitivity: parsed.data.sensitivity,
    tags: JSON.stringify(parsed.data.tags),
    ownerId: user.id,
    createdBy: user.id,
  }).returning({ id: resources.id })
  revalidatePath("/")
  revalidatePath("/resources")
  revalidatePath("/websites")
  await writeAudit({ userId: user.id, action: "RESOURCE_CREATE", resourceId: resource.id, targetType: "RESOURCE", targetId: resource.id })
  return { success: true, data: { id: resource.id } }
}

export async function updateResource(id: string, input: ResourceInput): Promise<ActionResult> {
  const user = await getCurrentUser()
  const parsed = resourceSchema.safeParse(input)
  if (!user) return { success: false, error: "请先登录" }
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "资源信息无效" }
  const resource = await db.query.resources.findFirst({ where: and(eq(resources.id, id), isNull(resources.deletedAt)) })
  if (!resource) return { success: false, error: "资源不存在" }
  if (!(await canEditResource(id))) return { success: false, error: "无权编辑该资源" }
  await db.update(resources).set({ name: parsed.data.name, category: parsed.data.moduleKind === "WEBSITE" ? null : parsed.data.category || null, moduleKind: parsed.data.moduleKind, type: parsed.data.moduleKind === "WEBSITE" ? "WEBSITE" : "OTHER", url: parsed.data.moduleKind === "WEBSITE" ? parsed.data.url : null, description: parsed.data.description, visibility: parsed.data.visibility, sensitivity: parsed.data.sensitivity, tags: JSON.stringify(parsed.data.tags), updatedAt: new Date() }).where(eq(resources.id, id))
  revalidatePath("/")
  revalidatePath("/resources")
  revalidatePath("/websites")
  revalidatePath("/favorites")
  revalidatePath(`/resources/${id}`)
  await writeAudit({ userId: user.id, action: "RESOURCE_EDIT", resourceId: id, targetType: "RESOURCE", targetId: id })
  return { success: true, data: undefined }
}

export async function toggleFavorite(id: string): Promise<ActionResult<{ favorited: boolean }>> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  const resource = await db.query.resources.findFirst({ where: and(eq(resources.id, id), isNull(resources.deletedAt)) })
  if (!resource) return { success: false, error: "资源不存在" }
  if (!(await canViewResource(id))) return { success: false, error: "无权访问该资源" }
  const favorite = await db.query.resourceFavorites.findFirst({ where: and(eq(resourceFavorites.userId, user.id), eq(resourceFavorites.resourceId, id)) })
  if (favorite) await db.delete(resourceFavorites).where(and(eq(resourceFavorites.userId, user.id), eq(resourceFavorites.resourceId, id)))
  else await db.insert(resourceFavorites).values({ userId: user.id, resourceId: id })
  revalidatePath("/")
  revalidatePath("/resources")
  revalidatePath("/websites")
  revalidatePath("/favorites")
  revalidatePath(`/resources/${id}`)
  return { success: true, data: { favorited: !favorite } }
}

export async function deleteResource(id: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  const resource = await db.query.resources.findFirst({ where: and(eq(resources.id, id), isNull(resources.deletedAt)) })
  if (!resource) return { success: false, error: "资源不存在" }
  if (!user.isAdmin && resource.ownerId !== user.id) return { success: false, error: "无权删除该资源" }
  const moduleFiles = await db.select({ id: files.id }).from(files).where(eq(files.resourceId, id))
  const deletedAt = new Date()
  db.transaction(tx => {
    tx.update(resources).set({ status: "ARCHIVED", deletedAt, updatedAt: deletedAt }).where(eq(resources.id, id)).run()
    const shareTarget = moduleFiles.length
      ? or(and(eq(shares.type, "RESOURCE"), eq(shares.targetId, id)), and(eq(shares.type, "FILE"), inArray(shares.targetId, moduleFiles.map(file => file.id))))
      : and(eq(shares.type, "RESOURCE"), eq(shares.targetId, id))
    tx.update(shares).set({ revokedAt: deletedAt }).where(and(shareTarget, isNull(shares.revokedAt))).run()
  })
  revalidatePath("/")
  revalidatePath("/resources")
  revalidatePath("/websites")
  revalidatePath("/favorites")
  await writeAudit({ userId: user.id, action: "RESOURCE_DELETE", resourceId: id, targetType: "RESOURCE", targetId: id })
  return { success: true, data: undefined }
}

export async function restoreResource(id: string): Promise<ActionResult> {
  const user = await currentAdmin()
  if (!user) return { success: false, error: "仅管理员可以恢复资源" }
  await db.update(resources).set({ status: "ACTIVE", deletedAt: null, updatedAt: new Date() }).where(eq(resources.id, id))
  revalidatePath("/resources")
  revalidatePath("/websites")
  revalidatePath("/favorites")
  return { success: true, data: undefined }
}
