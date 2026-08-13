"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/action-result"
import { hashPassword } from "@/lib/auth/password"
import { bootstrapAdminSchema } from "@/lib/auth/schemas"
import { getCurrentUser, revokeUserSessions } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { groupMembers, groups, resourcePermissions, resources, users } from "@/lib/db/schema"
import { z } from "zod"

const userSchema = bootstrapAdminSchema.extend({ isAdmin: z.boolean().default(false) })
const groupSchema = z.object({ name: z.string().trim().min(1).max(80), description: z.string().trim().max(500).optional() })
const groupResourceSchema = z.object({
  groupId: z.string().uuid(),
  resourceId: z.string().uuid(),
  level: z.enum(["VIEW", "FILES", "SECRETS", "MANAGE"]),
})

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.isAdmin ? user : null
}

export async function createUser(input: z.infer<typeof userSchema>): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "仅管理员可以创建用户" }
  const parsed = userSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "用户信息无效" }
  try {
    await db.insert(users).values({ username: parsed.data.username, displayName: parsed.data.displayName, passwordHash: await hashPassword(parsed.data.password), isAdmin: parsed.data.isAdmin })
    revalidatePath("/users")
    return { success: true, data: undefined }
  } catch { return { success: false, error: "用户名已存在" } }
}

export async function disableUser(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { success: false, error: "仅管理员可以禁用用户" }
  if (admin.id === id) return { success: false, error: "不能禁用当前登录账户" }
  await db.update(users).set({ status: "DISABLED", updatedAt: new Date() }).where(eq(users.id, id))
  await revokeUserSessions(id)
  revalidatePath("/users")
  return { success: true, data: undefined }
}

export async function enableUser(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "仅管理员可以启用用户" }
  await db.update(users).set({ status: "ACTIVE", updatedAt: new Date() }).where(eq(users.id, id))
  revalidatePath("/users")
  return { success: true, data: undefined }
}

export async function createGroup(input: z.infer<typeof groupSchema>): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "仅管理员可以创建小组" }
  const parsed = groupSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "小组信息无效" }
  try { await db.insert(groups).values(parsed.data); revalidatePath("/groups"); return { success: true, data: undefined } } catch { return { success: false, error: "小组名称已存在" } }
}

export async function addGroupMember(groupId: string, userId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "仅管理员可以修改小组" }
  const exists = await db.query.groupMembers.findFirst({ where: and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)) })
  if (!exists) await db.insert(groupMembers).values({ groupId, userId })
  revalidatePath("/groups")
  return { success: true, data: undefined }
}

export async function removeGroupMember(groupId: string, userId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "仅管理员可以修改小组" }
  await db.delete(groupMembers).where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
  revalidatePath("/groups")
  return { success: true, data: undefined }
}

export async function setGroupResourceAccess(groupId: string, resourceId: string, level: "VIEW" | "FILES" | "SECRETS" | "MANAGE"): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "仅管理员可以分配资源" }
  const parsed = groupResourceSchema.safeParse({ groupId, resourceId, level })
  if (!parsed.success) return { success: false, error: "资源分配信息无效" }
  const [group, resource] = await Promise.all([
    db.query.groups.findFirst({ where: eq(groups.id, parsed.data.groupId) }),
    db.query.resources.findFirst({ where: eq(resources.id, parsed.data.resourceId) }),
  ])
  if (!group || !resource || resource.deletedAt) return { success: false, error: "小组或资源不存在" }
  const flags = {
    canView: true,
    canViewFile: parsed.data.level !== "VIEW",
    canDownload: parsed.data.level !== "VIEW",
    canViewSecret: parsed.data.level === "SECRETS" || parsed.data.level === "MANAGE",
    canEdit: parsed.data.level === "MANAGE",
    canShare: parsed.data.level === "MANAGE",
  }
  const existing = await db.query.resourcePermissions.findFirst({ where: and(eq(resourcePermissions.resourceId, parsed.data.resourceId), eq(resourcePermissions.subjectType, "GROUP"), eq(resourcePermissions.subjectId, parsed.data.groupId)) })
  if (existing) await db.update(resourcePermissions).set(flags).where(eq(resourcePermissions.id, existing.id))
  else await db.insert(resourcePermissions).values({ resourceId: parsed.data.resourceId, subjectType: "GROUP", subjectId: parsed.data.groupId, ...flags })
  revalidatePath("/groups")
  revalidatePath(`/resources/${parsed.data.resourceId}`)
  return { success: true, data: undefined }
}

export async function removeGroupResourceAccess(groupId: string, resourceId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { success: false, error: "仅管理员可以取消资源分配" }
  await db.delete(resourcePermissions).where(and(eq(resourcePermissions.resourceId, resourceId), eq(resourcePermissions.subjectType, "GROUP"), eq(resourcePermissions.subjectId, groupId)))
  revalidatePath("/groups")
  revalidatePath(`/resources/${resourceId}`)
  return { success: true, data: undefined }
}
