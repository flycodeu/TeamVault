"use server"

import { and, count, eq, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/action-result"
import { writeAudit } from "@/lib/audit/log"
import { hashPassword } from "@/lib/auth/password"
import { bootstrapAdminSchema } from "@/lib/auth/schemas"
import { getCurrentUser, revokeUserSessions } from "@/lib/auth/session"
import { db } from "@/lib/db"
import {
  credentialPermissions,
  groupMembers,
  groups,
  resourceFavorites,
  resourceLinkPermissions,
  resourcePermissions,
  resources,
  sessions,
  users,
} from "@/lib/db/schema"
import { z } from "zod"

const userSchema = bootstrapAdminSchema.extend({ isAdmin: z.boolean().default(false) })
export const userEditSchema = z.object({
  username: z.string().trim().min(2, "用户名至少 2 个字符").max(32, "用户名最多 32 个字符"),
  displayName: z.string().trim().min(1, "请输入显示名称").max(50, "显示名称最多 50 个字符"),
  isAdmin: z.boolean().default(false),
  password: z.string().min(6, "密码至少 6 位").max(100).optional().or(z.literal("")),
})

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
  const admin = await requireAdmin()
  if (!admin) return { success: false, error: "仅管理员可以创建用户" }
  const parsed = userSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "用户信息无效" }
  try {
    const [newUser] = await db.insert(users).values({
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      passwordHash: await hashPassword(parsed.data.password),
      isAdmin: parsed.data.isAdmin,
    }).returning({ id: users.id })
    await writeAudit({ userId: admin.id, action: "PERMISSION_CHANGE", targetType: "USER", targetId: newUser.id })
    revalidatePath("/users")
    return { success: true, data: undefined }
  } catch { return { success: false, error: "用户名已存在" } }
}

export async function updateUser(id: string, input: z.infer<typeof userEditSchema>): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { success: false, error: "仅管理员可以修改用户信息" }
  const parsed = userEditSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "用户信息无效" }

  const targetUser = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!targetUser) return { success: false, error: "用户不存在" }

  // 检查用户名冲突
  if (parsed.data.username !== targetUser.username) {
    const duplicate = await db.query.users.findFirst({
      where: and(eq(users.username, parsed.data.username), ne(users.id, id)),
    })
    if (duplicate) return { success: false, error: "该用户名已被其他成员使用" }
  }

  // 若试图撤销自己的管理员权限，检查系统中是否还有其他管理员
  if (admin.id === id && targetUser.isAdmin && !parsed.data.isAdmin) {
    const [{ value: adminCount }] = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.isAdmin, true), eq(users.status, "ACTIVE")))
    if (adminCount <= 1) {
      return { success: false, error: "系统必须至少保留一个活动的管理员账户" }
    }
  }

  const updateData: {
    username: string
    displayName: string
    isAdmin: boolean
    updatedAt: Date
    passwordHash?: string
  } = {
    username: parsed.data.username,
    displayName: parsed.data.displayName,
    isAdmin: parsed.data.isAdmin,
    updatedAt: new Date(),
  }

  const shouldRevokeSessions = parsed.data.password || parsed.data.isAdmin !== targetUser.isAdmin
  if (parsed.data.password && parsed.data.password.trim() !== "") {
    updateData.passwordHash = await hashPassword(parsed.data.password.trim())
  }

  await db.update(users).set(updateData).where(eq(users.id, id))

  if (shouldRevokeSessions && id !== admin.id) {
    await revokeUserSessions(id)
  }

  await writeAudit({ userId: admin.id, action: "PERMISSION_CHANGE", targetType: "USER", targetId: id })
  revalidatePath("/users")
  revalidatePath("/groups")
  return { success: true, data: undefined }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { success: false, error: "仅管理员可以删除用户" }
  if (admin.id === id) return { success: false, error: "不能删除当前登录账户" }

  const targetUser = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!targetUser) return { success: false, error: "用户不存在" }

  if (targetUser.isAdmin) {
    const [{ value: adminCount }] = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.isAdmin, true), eq(users.status, "ACTIVE")))
    if (adminCount <= 1) {
      return { success: false, error: "系统中仅存一个管理员账户，无法删除" }
    }
  }

  // 级联清理所有关联权限、群组、会话与资源转移
  db.transaction(tx => {
    // 1. 将该用户拥有的资源转移给执行删除的管理员，避免资源孤立
    tx.update(resources).set({ ownerId: admin.id }).where(eq(resources.ownerId, id)).run()
    // 2. 清理会话
    tx.delete(sessions).where(eq(sessions.userId, id)).run()
    // 3. 清理群组成员
    tx.delete(groupMembers).where(eq(groupMembers.userId, id)).run()
    // 4. 清理资源直接授权
    tx.delete(resourcePermissions).where(and(eq(resourcePermissions.subjectType, "USER"), eq(resourcePermissions.subjectId, id))).run()
    // 5. 清理凭据直接授权
    tx.delete(credentialPermissions).where(and(eq(credentialPermissions.subjectType, "USER"), eq(credentialPermissions.subjectId, id))).run()
    // 6. 清理链接直接授权
    tx.delete(resourceLinkPermissions).where(and(eq(resourceLinkPermissions.subjectType, "USER"), eq(resourceLinkPermissions.subjectId, id))).run()
    // 7. 清理用户收藏
    tx.delete(resourceFavorites).where(eq(resourceFavorites.userId, id)).run()
    // 8. 正式删除用户
    tx.delete(users).where(eq(users.id, id)).run()
  })

  await writeAudit({ userId: admin.id, action: "PERMISSION_CHANGE", targetType: "USER", targetId: id })
  revalidatePath("/users")
  revalidatePath("/groups")
  revalidatePath("/resources")
  return { success: true, data: undefined }
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

export async function createGroup(input: z.infer<typeof groupSchema>): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin()
  if (!admin) return { success: false, error: "仅管理员可以创建小组" }
  const parsed = groupSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "小组信息无效" }
  try {
    const [newGroup] = await db.insert(groups).values(parsed.data).returning({ id: groups.id })
    await writeAudit({ userId: admin.id, action: "PERMISSION_CHANGE", targetType: "GROUP", targetId: newGroup.id })
    revalidatePath("/groups")
    return { success: true, data: { id: newGroup.id } }
  } catch {
    return { success: false, error: "小组名称已存在" }
  }
}

export async function updateGroup(id: string, input: z.infer<typeof groupSchema>): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { success: false, error: "仅管理员可以修改小组" }
  const parsed = groupSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "小组信息无效" }

  const group = await db.query.groups.findFirst({ where: eq(groups.id, id) })
  if (!group) return { success: false, error: "小组不存在" }

  if (parsed.data.name !== group.name) {
    const duplicate = await db.query.groups.findFirst({
      where: and(eq(groups.name, parsed.data.name), ne(groups.id, id)),
    })
    if (duplicate) return { success: false, error: "该小组名称已被占用" }
  }

  await db.update(groups).set(parsed.data).where(eq(groups.id, id))
  await writeAudit({ userId: admin.id, action: "PERMISSION_CHANGE", targetType: "GROUP", targetId: id })
  revalidatePath("/groups")
  revalidatePath("/users")
  return { success: true, data: undefined }
}

export async function deleteGroup(id: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!admin) return { success: false, error: "仅管理员可以删除小组" }

  const group = await db.query.groups.findFirst({ where: eq(groups.id, id) })
  if (!group) return { success: false, error: "小组不存在" }

  db.transaction(tx => {
    // 1. 清理成员绑定
    tx.delete(groupMembers).where(eq(groupMembers.groupId, id)).run()
    // 2. 清理模块资源直接授权
    tx.delete(resourcePermissions).where(and(eq(resourcePermissions.subjectType, "GROUP"), eq(resourcePermissions.subjectId, id))).run()
    // 3. 清理凭据直接授权
    tx.delete(credentialPermissions).where(and(eq(credentialPermissions.subjectType, "GROUP"), eq(credentialPermissions.subjectId, id))).run()
    // 4. 清理环境链接直接授权
    tx.delete(resourceLinkPermissions).where(and(eq(resourceLinkPermissions.subjectType, "GROUP"), eq(resourceLinkPermissions.subjectId, id))).run()
    // 5. 删除小组
    tx.delete(groups).where(eq(groups.id, id)).run()
  })

  await writeAudit({ userId: admin.id, action: "PERMISSION_CHANGE", targetType: "GROUP", targetId: id })
  revalidatePath("/groups")
  revalidatePath("/users")
  revalidatePath("/resources")
  return { success: true, data: undefined }
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
