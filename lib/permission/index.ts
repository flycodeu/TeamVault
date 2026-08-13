import "server-only"

import { and, eq } from "drizzle-orm"

import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { credentialPermissions, credentials, groupMembers, resourcePermissions, resources } from "@/lib/db/schema"

export type ResourcePermission = "VIEW" | "VIEW_SECRET" | "VIEW_FILE" | "DOWNLOAD" | "EDIT" | "SHARE"

export async function canResource(resourceId: string, permission: ResourcePermission) {
  const user = await getCurrentUser()
  if (!user) return false
  if (user.isAdmin) return true
  const resource = await db.query.resources.findFirst({ where: eq(resources.id, resourceId) })
  if (!resource || resource.deletedAt) return false
  if (resource.ownerId === user.id) return true
  if (permission === "VIEW" && (resource.visibility === "TEAM" || resource.visibility === "PUBLIC")) return true
  const direct = await db.query.resourcePermissions.findFirst({ where: and(eq(resourcePermissions.resourceId, resourceId), eq(resourcePermissions.subjectType, "USER"), eq(resourcePermissions.subjectId, user.id)) })
  if (direct && permissionFlag(direct, permission)) return true
  const memberships = await db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, user.id))
  for (const membership of memberships) {
    const group = await db.query.resourcePermissions.findFirst({ where: and(eq(resourcePermissions.resourceId, resourceId), eq(resourcePermissions.subjectType, "GROUP"), eq(resourcePermissions.subjectId, membership.groupId)) })
    if (group && permissionFlag(group, permission)) return true
  }
  return false
}

function permissionFlag(value: typeof resourcePermissions.$inferSelect, permission: ResourcePermission) {
  return { VIEW: value.canView, VIEW_SECRET: value.canViewSecret, VIEW_FILE: value.canViewFile, DOWNLOAD: value.canDownload, EDIT: value.canEdit, SHARE: value.canShare }[permission]
}

export async function requireResourcePermission(resourceId: string, permission: ResourcePermission) {
  if (!(await canResource(resourceId, permission))) throw new Error("无权访问该资源")
}

export const canViewResource = (resourceId: string) => canResource(resourceId, "VIEW")
export const canViewSecret = (resourceId: string) => canResource(resourceId, "VIEW_SECRET")
export const canViewFile = (resourceId: string) => canResource(resourceId, "VIEW_FILE")
export const canDownloadFile = (resourceId: string) => canResource(resourceId, "DOWNLOAD")
export const canEditResource = (resourceId: string) => canResource(resourceId, "EDIT")
export const canShareResource = (resourceId: string) => canResource(resourceId, "SHARE")

export async function canViewCredential(credentialId: string) {
  const user = await getCurrentUser()
  if (!user) return false
  const credential = await db.query.credentials.findFirst({ where: eq(credentials.id, credentialId) })
  if (!credential || !(await canViewResource(credential.resourceId))) return false
  const resource = await db.query.resources.findFirst({ where: eq(resources.id, credential.resourceId) })
  if (!resource) return false
  if (user.isAdmin || resource.ownerId === user.id) return true
  if (credential.accessMode === "RESOURCE") return canViewSecret(credential.resourceId)

  const direct = await db.query.credentialPermissions.findFirst({
    where: and(
      eq(credentialPermissions.credentialId, credentialId),
      eq(credentialPermissions.subjectType, "USER"),
      eq(credentialPermissions.subjectId, user.id),
    ),
  })
  if (direct) return true
  const memberships = await db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, user.id))
  for (const membership of memberships) {
    const groupGrant = await db.query.credentialPermissions.findFirst({
      where: and(
        eq(credentialPermissions.credentialId, credentialId),
        eq(credentialPermissions.subjectType, "GROUP"),
        eq(credentialPermissions.subjectId, membership.groupId),
      ),
    })
    if (groupGrant) return true
  }
  return false
}

export async function listPermittedResourceIds(permission: ResourcePermission) {
  const rows = await db.select({ id: resources.id }).from(resources).where(eq(resources.status, "ACTIVE"))
  const checks = await Promise.all(rows.map(async row => ({ id: row.id, allowed: await canResource(row.id, permission) })))
  return checks.filter(result => result.allowed).map(result => result.id)
}
