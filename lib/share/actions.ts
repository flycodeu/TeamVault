"use server"

import { and, desc, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/action-result"
import { hashPassword } from "@/lib/auth/password"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files, resources, shares, users } from "@/lib/db/schema"
import { canResource } from "@/lib/permission"
import { createShareToken } from "./token"

export type CreateResourceShareInput = {
  resourceId: string
  password?: string
  expiresAt?: Date
  allowPreview: boolean
  allowDownload: boolean
  allowCredentials: boolean
  credentialIds?: string[]
  fileIds?: string[]
  maxViews?: number
}

export async function createResourceShare(
  input: CreateResourceShareInput,
): Promise<ActionResult<{ token: string; id: string }>> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  const resource = await db.query.resources.findFirst({
    where: and(eq(resources.id, input.resourceId), isNull(resources.deletedAt)),
  })
  if (!resource || resource.sensitivity === "SECRET") {
    return { success: false, error: "高度机密资源禁止外部分享" }
  }
  if (!(await canResource(input.resourceId, "SHARE")) && !user.isAdmin) {
    return { success: false, error: "无权分享该模块" }
  }

  const { token, hash } = createShareToken()
  const [share] = await db
    .insert(shares)
    .values({
      type: "RESOURCE",
      targetId: input.resourceId,
      tokenHash: hash,
      passwordHash: input.password ? await hashPassword(input.password) : null,
      expiresAt: input.expiresAt,
      allowPreview: input.allowPreview,
      allowDownload: input.allowDownload,
      allowCredentials: input.allowCredentials,
      credentialIds: input.credentialIds && input.credentialIds.length ? JSON.stringify(input.credentialIds) : null,
      fileIds: input.fileIds && input.fileIds.length ? JSON.stringify(input.fileIds) : null,
      maxViews: input.maxViews,
      createdBy: user.id,
    })
    .returning({ id: shares.id })

  revalidatePath(`/resources/${input.resourceId}`)
  return { success: true, data: { token, id: share.id } }
}

export async function createFileShare(input: {
  fileId: string
  password?: string
  expiresAt?: Date
  allowPreview: boolean
  allowDownload: boolean
  maxViews?: number
}): Promise<ActionResult<{ token: string; id: string }>> {
  const user = await getCurrentUser()
  const file = await db.query.files.findFirst({ where: eq(files.id, input.fileId) })
  if (!user || !file) return { success: false, error: "文件不存在或未登录" }
  const resource = await db.query.resources.findFirst({ where: eq(resources.id, file.resourceId) })
  if (!resource || resource.sensitivity === "SECRET") {
    return { success: false, error: "高度机密资源禁止外部分享" }
  }
  if (!(await canResource(resource.id, "SHARE")) && !user.isAdmin) {
    return { success: false, error: "无权分享该文件" }
  }
  const { token, hash } = createShareToken()
  const [share] = await db
    .insert(shares)
    .values({
      type: "FILE",
      targetId: file.id,
      tokenHash: hash,
      passwordHash: input.password ? await hashPassword(input.password) : null,
      expiresAt: input.expiresAt,
      allowPreview: input.allowPreview,
      allowDownload: input.allowDownload,
      allowCredentials: false,
      maxViews: input.maxViews,
      createdBy: user.id,
    })
    .returning({ id: shares.id })

  revalidatePath(`/resources/${resource.id}`)
  return { success: true, data: { token, id: share.id } }
}

export async function getResourceActiveShares(resourceId: string) {
  const activeShares = await db
    .select({
      id: shares.id,
      type: shares.type,
      targetId: shares.targetId,
      expiresAt: shares.expiresAt,
      allowPreview: shares.allowPreview,
      allowDownload: shares.allowDownload,
      allowCredentials: shares.allowCredentials,
      credentialIds: shares.credentialIds,
      fileIds: shares.fileIds,
      maxViews: shares.maxViews,
      viewCount: shares.viewCount,
      createdAt: shares.createdAt,
      hasPassword: shares.passwordHash,
      creatorName: users.displayName,
      createdBy: shares.createdBy,
    })
    .from(shares)
    .leftJoin(users, eq(shares.createdBy, users.id))
    .where(and(eq(shares.targetId, resourceId), isNull(shares.revokedAt)))
    .orderBy(desc(shares.createdAt))

  const now = Date.now()
  return activeShares.map(share => ({
    ...share,
    hasPassword: Boolean(share.hasPassword),
    isExpired: Boolean(share.expiresAt && share.expiresAt.getTime() < now),
  }))
}

export async function revokeShare(id: string, resourceId?: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  const share = await db.query.shares.findFirst({ where: eq(shares.id, id) })
  if (!share || (!user.isAdmin && share.createdBy !== user.id)) {
    return { success: false, error: "无权撤销该分享" }
  }
  await db.update(shares).set({ revokedAt: new Date() }).where(eq(shares.id, id))
  if (resourceId) {
    revalidatePath(`/resources/${resourceId}`)
  }
  return { success: true, data: undefined }
}

