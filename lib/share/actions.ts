"use server"

import { and, desc, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/action-result"
import { writeAudit } from "@/lib/audit/log"
import { hashPassword } from "@/lib/auth/password"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { credentials, files, resources, shares, users } from "@/lib/db/schema"
import { canResource, canViewCredential, canViewFile } from "@/lib/permission"
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

  // Permission check for credentials: user cannot share credentials they are not authorized to view
  let validatedCredentialIds: string[] | null = null
  if (input.allowCredentials) {
    if (Array.isArray(input.credentialIds)) {
      if (input.credentialIds.length) {
        const allowed: string[] = []
        for (const credId of input.credentialIds) {
          if (user.isAdmin || (await canViewCredential(credId))) {
            allowed.push(credId)
          }
        }
        if (!allowed.length) {
          return { success: false, error: "您没有所选凭据的查看权限，无法分享" }
        }
        validatedCredentialIds = allowed
      } else {
        // 显式空选：不分享任何凭据
        validatedCredentialIds = []
      }
    } else {
      // 未指定特定凭据列表（请求全量）：非管理员必须限制为自身有权查看的凭据子集，防止越权泄露
      if (!user.isAdmin) {
        const allResCreds = await db.query.credentials.findMany({ where: eq(credentials.resourceId, input.resourceId) })
        const allowed = (
          await Promise.all(allResCreds.map(async c => ((await canViewCredential(c.id)) ? c.id : null)))
        ).filter(Boolean) as string[]
        validatedCredentialIds = allowed
      }
    }
  }

  // Permission check for files: user cannot share files if they do not have view file permission
  let validatedFileIds: string[] | null = null
  if (input.allowPreview || input.allowDownload) {
    if (!user.isAdmin && !(await canViewFile(input.resourceId))) {
      return { success: false, error: "您没有该资源文件的访问权限，无法分享文件" }
    }
    if (Array.isArray(input.fileIds)) {
      validatedFileIds = input.fileIds
    }
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
      credentialIds: validatedCredentialIds ? JSON.stringify(validatedCredentialIds) : null,
      fileIds: validatedFileIds ? JSON.stringify(validatedFileIds) : null,
      maxViews: input.maxViews,
      createdBy: user.id,
    })
    .returning({ id: shares.id })

  revalidatePath(`/resources/${input.resourceId}`)
  await writeAudit({ userId: user.id, action: "SHARE_CREATE", resourceId: input.resourceId, targetType: "SHARE", targetId: share.id })
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
  // 单文件分享同样要求分享者具备该文件的查看权限，防止越权外泄
  if (!user.isAdmin && !(await canViewFile(resource.id))) {
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
  await writeAudit({ userId: user.id, action: "SHARE_CREATE", resourceId: resource.id, targetType: "SHARE", targetId: share.id })
  return { success: true, data: { token, id: share.id } }
}

export async function getResourceActiveShares(resourceId: string) {
  // 鉴权：仅资源所有者/具备 SHARE 权限的用户（或管理员）可查看该资源的分享列表，
  // 防止任意登录用户枚举任意资源的分享元数据（IDOR）。
  const user = await getCurrentUser()
  if (!user) return []
  if (!user.isAdmin && !(await canResource(resourceId, "SHARE"))) return []

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
  await writeAudit({ userId: user.id, action: "SHARE_REVOKE", resourceId: share.type === "RESOURCE" ? share.targetId : undefined, targetType: "SHARE", targetId: id })
  if (resourceId) {
    revalidatePath(`/resources/${resourceId}`)
  }
  return { success: true, data: undefined }
}

