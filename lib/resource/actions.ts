"use server"

import { and, eq, inArray, isNull, or } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/action-result"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { credentialPermissions, credentials, files, resourceFavorites, resources, shares } from "@/lib/db/schema"
import { writeAudit } from "@/lib/audit/log"
import { encryptSecret } from "@/lib/crypto/secret"
import { canEditResource, canViewResource } from "@/lib/permission"

import { resourceSchema, type ResourceInput } from "./schemas"

export type BatchImportWebsiteItem = {
  name: string
  url: string
  category?: string
  description?: string
  username?: string
  password?: string
  visibility?: "TEAM" | "GROUP" | "PRIVATE" | "PUBLIC"
}

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
    category: parsed.data.category || null,
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

export type WebsiteCredentialItemInput = {
  id?: string
  name?: string
  username?: string
  password?: string
  description?: string
  accessMode: "RESOURCE" | "RESTRICTED"
  subjects?: {
    subjectType: "USER" | "GROUP"
    subjectId: string
  }[]
}

export type CreateWebsiteInput = {
  name: string
  url: string
  category?: string
  description?: string
  visibility: "TEAM" | "GROUP" | "PRIVATE" | "PUBLIC"
  credentials?: WebsiteCredentialItemInput[]
}

export async function createWebsiteWithCredential(
  input: CreateWebsiteInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  if (!input.name.trim()) return { success: false, error: "请输入网站名称" }
  if (!input.url.trim()) return { success: false, error: "请输入网站访问地址 (URL)" }

  let websiteId = ""
  db.transaction(tx => {
    const res = tx
      .insert(resources)
      .values({
        name: input.name.trim(),
        category: input.category?.trim() || null,
        moduleKind: "WEBSITE",
        type: "WEBSITE",
        url: input.url.trim(),
        description: input.description?.trim() || null,
        visibility: input.visibility,
        sensitivity: "NORMAL",
        tags: "[]",
        ownerId: user.id,
        createdBy: user.id,
      })
      .returning({ id: resources.id })
      .get()

    websiteId = res.id

    if (input.credentials?.length) {
      for (const credItem of input.credentials) {
        if (!credItem.username?.trim() && !credItem.password?.trim() && !credItem.name?.trim()) {
          continue
        }

        const cred = tx
          .insert(credentials)
          .values({
            resourceId: websiteId,
            name: credItem.name?.trim() || `${input.name.trim()} 登录凭据`,
            type: "PASSWORD",
            username: credItem.username?.trim() || null,
            secretCipher: encryptSecret(credItem.password?.trim() || "N/A"),
            description: credItem.description?.trim() || null,
            accessMode: credItem.accessMode,
            createdBy: user.id,
          })
          .returning({ id: credentials.id })
          .get()

        if (
          credItem.accessMode === "RESTRICTED" &&
          credItem.subjects?.length
        ) {
          tx.insert(credentialPermissions)
            .values(
              credItem.subjects.map(s => ({
                credentialId: cred.id,
                ...s,
              })),
            )
            .run()
        }
      }
    }
  })

  revalidatePath("/")
  revalidatePath("/websites")
  revalidatePath("/resources")
  revalidatePath("/credentials")

  await writeAudit({
    userId: user.id,
    action: "RESOURCE_CREATE",
    resourceId: websiteId,
    targetType: "RESOURCE",
    targetId: websiteId,
  })

  return { success: true, data: { id: websiteId } }
}

export type UpdateWebsiteInput = CreateWebsiteInput & {
  id: string
}

export async function updateWebsiteWithCredential(
  input: UpdateWebsiteInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  if (!(await canEditResource(input.id))) return { success: false, error: "无权编辑该网站" }
  if (!input.name.trim()) return { success: false, error: "请输入网站名称" }
  if (!input.url.trim()) return { success: false, error: "请输入网站访问地址 (URL)" }

  const existingCredentials = await db.query.credentials.findMany({
    where: eq(credentials.resourceId, input.id),
  })
  const existingMap = new Map(existingCredentials.map(c => [c.id, c]))

  db.transaction(tx => {
    // 1. Update website resource
    tx.update(resources)
      .set({
        name: input.name.trim(),
        category: input.category?.trim() || null,
        url: input.url.trim(),
        description: input.description?.trim() || null,
        visibility: input.visibility,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, input.id))
      .run()

    // 2. Handle multiple credentials
    const keptCredIds = new Set<string>()

    if (input.credentials?.length) {
      for (const item of input.credentials) {
        if (!item.username?.trim() && !item.password?.trim() && !item.name?.trim() && !item.id) {
          continue
        }

        if (item.id && existingMap.has(item.id)) {
          // Update existing credential
          const existing = existingMap.get(item.id)!
          keptCredIds.add(item.id)

          const secretCipher = item.password?.trim()
            ? encryptSecret(item.password.trim())
            : existing.secretCipher

          tx.update(credentials)
            .set({
              name: item.name?.trim() || `${input.name.trim()} 登录凭据`,
              username: item.username?.trim() || null,
              secretCipher,
              description: item.description?.trim() || null,
              accessMode: item.accessMode,
              updatedAt: new Date(),
            })
            .where(eq(credentials.id, item.id))
            .run()

          tx.delete(credentialPermissions)
            .where(eq(credentialPermissions.credentialId, item.id))
            .run()

          if (item.accessMode === "RESTRICTED" && item.subjects?.length) {
            tx.insert(credentialPermissions)
              .values(
                item.subjects.map(s => ({
                  credentialId: item.id!,
                  ...s,
                })),
              )
              .run()
          }
        } else {
          // Insert new credential
          const cred = tx
            .insert(credentials)
            .values({
              resourceId: input.id,
              name: item.name?.trim() || `${input.name.trim()} 登录凭据`,
              type: "PASSWORD",
              username: item.username?.trim() || null,
              secretCipher: encryptSecret(item.password?.trim() || "N/A"),
              description: item.description?.trim() || null,
              accessMode: item.accessMode,
              createdBy: user.id,
            })
            .returning({ id: credentials.id })
            .get()

          keptCredIds.add(cred.id)

          if (item.accessMode === "RESTRICTED" && item.subjects?.length) {
            tx.insert(credentialPermissions)
              .values(
                item.subjects.map(s => ({
                  credentialId: cred.id,
                  ...s,
                })),
              )
              .run()
          }
        }
      }
    }

    // Delete credentials that were removed
    for (const existing of existingCredentials) {
      if (!keptCredIds.has(existing.id)) {
        tx.delete(credentialPermissions)
          .where(eq(credentialPermissions.credentialId, existing.id))
          .run()
        tx.delete(credentials)
          .where(eq(credentials.id, existing.id))
          .run()
      }
    }
  })

  revalidatePath("/")
  revalidatePath("/websites")
  revalidatePath(`/websites/${input.id}`)
  revalidatePath(`/websites/${input.id}/edit`)
  revalidatePath("/resources")
  revalidatePath("/credentials")
  revalidatePath("/websites")
  revalidatePath(`/websites/${input.id}`)
  revalidatePath("/resources")
  revalidatePath("/credentials")

  await writeAudit({
    userId: user.id,
    action: "RESOURCE_EDIT",
    resourceId: input.id,
    targetType: "RESOURCE",
    targetId: input.id,
  })

  return { success: true, data: { id: input.id } }
}

export async function batchImportWebsites(
  items: BatchImportWebsiteItem[],
): Promise<ActionResult<{ count: number }>> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  if (!items.length) return { success: false, error: "导入列表为空" }

  let count = 0
  const createdIds: string[] = []

  db.transaction(tx => {
    for (const item of items) {
      const name = item.name.trim()
      const url = item.url.trim()
      if (!name || !url) continue

      const res = tx
        .insert(resources)
        .values({
          name,
          category: item.category?.trim() || null,
          moduleKind: "WEBSITE",
          type: "WEBSITE",
          url,
          description: item.description?.trim() || null,
          visibility: item.visibility || "TEAM",
          sensitivity: "NORMAL",
          tags: "[]",
          ownerId: user.id,
          createdBy: user.id,
        })
        .returning({ id: resources.id })
        .get()

      createdIds.push(res.id)
      count++

      if (item.username?.trim() || item.password?.trim()) {
        tx.insert(credentials)
          .values({
            resourceId: res.id,
            name: `${name} 账号凭据`,
            type: "PASSWORD",
            username: item.username?.trim() || null,
            secretCipher: encryptSecret(item.password?.trim() || "N/A"),
            description: "批量导入时自动初始化的关联账号",
            accessMode: "RESOURCE",
            createdBy: user.id,
          })
          .run()
      }
    }
  })

  revalidatePath("/")
  revalidatePath("/websites")
  revalidatePath("/resources")
  revalidatePath("/credentials")

  for (const id of createdIds) {
    await writeAudit({
      userId: user.id,
      action: "RESOURCE_CREATE",
      resourceId: id,
      targetType: "RESOURCE",
      targetId: id,
    })
  }

  return { success: true, data: { count } }
}

export async function updateResource(id: string, input: ResourceInput): Promise<ActionResult> {
  const user = await getCurrentUser()
  const parsed = resourceSchema.safeParse(input)
  if (!user) return { success: false, error: "请先登录" }
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "资源信息无效" }
  const resource = await db.query.resources.findFirst({ where: and(eq(resources.id, id), isNull(resources.deletedAt)) })
  if (!resource) return { success: false, error: "资源不存在" }
  if (!(await canEditResource(id))) return { success: false, error: "无权编辑该资源" }
  await db.update(resources).set({ name: parsed.data.name, category: parsed.data.category || null, moduleKind: parsed.data.moduleKind, type: parsed.data.moduleKind === "WEBSITE" ? "WEBSITE" : "OTHER", url: parsed.data.moduleKind === "WEBSITE" ? parsed.data.url : null, description: parsed.data.description, visibility: parsed.data.visibility, sensitivity: parsed.data.sensitivity, tags: JSON.stringify(parsed.data.tags), updatedAt: new Date() }).where(eq(resources.id, id))
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
  const isWebsite = resource.moduleKind === "WEBSITE" || resource.type === "WEBSITE"
  const canDelete =
    user.isAdmin ||
    resource.ownerId === user.id ||
    (isWebsite && (resource.visibility === "TEAM" || resource.visibility === "PUBLIC"))

  if (!canDelete) return { success: false, error: "无权删除该资源" }
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
