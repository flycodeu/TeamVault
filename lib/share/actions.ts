"use server"

import { and, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/action-result"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files, resources, shares } from "@/lib/db/schema"
import { canResource } from "@/lib/permission"
import { hashPassword } from "@/lib/auth/password"
import { createShareToken } from "./token"

export async function createResourceShare(input: { resourceId: string; password?: string; expiresAt?: Date; allowPreview: boolean; allowDownload: boolean; maxViews?: number }): Promise<ActionResult<{ token: string; id: string }>> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  const resource = await db.query.resources.findFirst({ where: and(eq(resources.id, input.resourceId), isNull(resources.deletedAt)) })
  if (!resource || resource.sensitivity === "SECRET") return { success: false, error: "该资源禁止匿名分享" }
  if (!(await canResource(input.resourceId, "SHARE")) && !user.isAdmin) return { success: false, error: "无权分享该资源" }
  const { token, hash } = createShareToken()
  const [share] = await db.insert(shares).values({ type: "RESOURCE", targetId: input.resourceId, tokenHash: hash, passwordHash: input.password ? await hashPassword(input.password) : null, expiresAt: input.expiresAt, allowPreview: input.allowPreview, allowDownload: input.allowDownload, maxViews: input.maxViews, createdBy: user.id }).returning({ id: shares.id })
  revalidatePath(`/resources/${input.resourceId}`)
  return { success: true, data: { token, id: share.id } }
}

export async function createFileShare(input: { fileId: string; password?: string; expiresAt?: Date; allowPreview: boolean; allowDownload: boolean; maxViews?: number }): Promise<ActionResult<{ token: string; id: string }>> {
  const user = await getCurrentUser()
  const file = await db.query.files.findFirst({ where: eq(files.id, input.fileId) })
  if (!user || !file) return { success: false, error: "文件不存在或未登录" }
  const resource = await db.query.resources.findFirst({ where: eq(resources.id, file.resourceId) })
  if (!resource || resource.sensitivity === "SECRET") return { success: false, error: "该资源禁止匿名分享" }
  if (!(await canResource(resource.id, "SHARE"))) return { success: false, error: "无权分享该文件" }
  const { token, hash } = createShareToken()
  const [share] = await db.insert(shares).values({ type: "FILE", targetId: file.id, tokenHash: hash, passwordHash: input.password ? await hashPassword(input.password) : null, expiresAt: input.expiresAt, allowPreview: input.allowPreview, allowDownload: input.allowDownload, maxViews: input.maxViews, createdBy: user.id }).returning({ id: shares.id })
  return { success: true, data: { token, id: share.id } }
}

export async function revokeShare(id: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  const share = await db.query.shares.findFirst({ where: eq(shares.id, id) })
  if (!share || (!user.isAdmin && share.createdBy !== user.id)) return { success: false, error: "无权撤销分享" }
  await db.update(shares).set({ revokedAt: new Date() }).where(eq(shares.id, id))
  return { success: true, data: undefined }
}
