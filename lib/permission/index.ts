import "server-only"

import { and, eq, inArray, isNull, or } from "drizzle-orm"

import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import {
  credentialPermissions,
  credentials,
  groupMembers,
  resourceLinkPermissions,
  resourceLinks,
  resourcePermissions,
  resources,
} from "@/lib/db/schema"

export type ResourcePermission = "VIEW" | "VIEW_SECRET" | "VIEW_FILE" | "DOWNLOAD" | "EDIT" | "SHARE"

export async function canResource(resourceId: string, permission: ResourcePermission) {
  const user = await getCurrentUser()
  if (!user) return false
  if (user.isAdmin) return true
  const resource = await db.query.resources.findFirst({ where: eq(resources.id, resourceId) })
  if (!resource || resource.deletedAt) return false
  if (resource.ownerId === user.id) return true

  if (resource.visibility === "TEAM" || resource.visibility === "PUBLIC") {
    // 团队资源自动开放基础查看与自由分享（分享内容仍受逐项权限校验约束）
    if (permission === "VIEW" || permission === "SHARE") return true
  }

  const direct = await db.query.resourcePermissions.findFirst({
    where: and(
      eq(resourcePermissions.resourceId, resourceId),
      eq(resourcePermissions.subjectType, "USER"),
      eq(resourcePermissions.subjectId, user.id),
    ),
  })
  
  if (direct) {
    return permissionFlag(direct, permission)
  }

  const memberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, user.id))
  for (const membership of memberships) {
    const group = await db.query.resourcePermissions.findFirst({
      where: and(
        eq(resourcePermissions.resourceId, resourceId),
        eq(resourcePermissions.subjectType, "GROUP"),
        eq(resourcePermissions.subjectId, membership.groupId),
      ),
    })
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
  if (user.isAdmin) return true

  const credential = await db.query.credentials.findFirst({ where: eq(credentials.id, credentialId) })
  if (!credential) return false

  const resource = await db.query.resources.findFirst({ where: eq(resources.id, credential.resourceId) })
  if (!resource || resource.deletedAt) return false
  if (resource.ownerId === user.id) return true

  if (!(await canViewResource(credential.resourceId))) return false

  if (credential.accessMode === "RESOURCE") {
    return canViewSecret(credential.resourceId)
  }

  // RESTRICTED mode: check direct user grant
  const direct = await db.query.credentialPermissions.findFirst({
    where: and(
      eq(credentialPermissions.credentialId, credentialId),
      eq(credentialPermissions.subjectType, "USER"),
      eq(credentialPermissions.subjectId, user.id),
    ),
  })
  if (direct) return true

  // Check group grant
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

export async function canViewResourceLink(linkId: string) {
  const user = await getCurrentUser()
  if (!user) return false
  if (user.isAdmin) return true

  const link = await db.query.resourceLinks.findFirst({ where: eq(resourceLinks.id, linkId) })
  if (!link) return false

  const resource = await db.query.resources.findFirst({ where: eq(resources.id, link.resourceId) })
  if (!resource || resource.deletedAt) return false
  if (resource.ownerId === user.id) return true

  if (!(await canViewResource(link.resourceId))) return false

  if (link.accessMode === "RESOURCE") {
    return true
  }

  // RESTRICTED mode: check direct user grant
  const direct = await db.query.resourceLinkPermissions.findFirst({
    where: and(
      eq(resourceLinkPermissions.linkId, linkId),
      eq(resourceLinkPermissions.subjectType, "USER"),
      eq(resourceLinkPermissions.subjectId, user.id),
    ),
  })
  if (direct) return true

  // Check group grant
  const memberships = await db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, user.id))
  for (const membership of memberships) {
    const groupGrant = await db.query.resourceLinkPermissions.findFirst({
      where: and(
        eq(resourceLinkPermissions.linkId, linkId),
        eq(resourceLinkPermissions.subjectType, "GROUP"),
        eq(resourceLinkPermissions.subjectId, membership.groupId),
      ),
    })
    if (groupGrant) return true
  }
  return false
}

export async function listPermittedCredentialIds() {
  const user = await getCurrentUser()
  if (!user) return []
  const viewIds = await listPermittedResourceIds("VIEW")
  if (!viewIds.length) return []
  if (user.isAdmin) return (await db.select({ id: credentials.id }).from(credentials).where(inArray(credentials.resourceId, viewIds))).map(row => row.id)

  const secretResourceIds = await listPermittedResourceIds("VIEW_SECRET")
  const memberships = await db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, user.id))
  const subjectGrant = memberships.length
    ? or(
        and(eq(credentialPermissions.subjectType, "USER"), eq(credentialPermissions.subjectId, user.id)),
        and(eq(credentialPermissions.subjectType, "GROUP"), inArray(credentialPermissions.subjectId, memberships.map(membership => membership.groupId))),
      )
    : and(eq(credentialPermissions.subjectType, "USER"), eq(credentialPermissions.subjectId, user.id))
  const grantIds = (await db.select({ credentialId: credentialPermissions.credentialId }).from(credentialPermissions).where(subjectGrant)).map(row => row.credentialId)
  const access = [
    secretResourceIds.length ? and(eq(credentials.accessMode, "RESOURCE"), inArray(credentials.resourceId, secretResourceIds)) : undefined,
    grantIds.length ? inArray(credentials.id, grantIds) : undefined,
  ].filter(condition => condition !== undefined)
  if (!access.length) return []
  return (await db.select({ id: credentials.id }).from(credentials).where(and(inArray(credentials.resourceId, viewIds), or(...access)))).map(row => row.id)
}

export async function listPermittedResourceIds(permission: ResourcePermission) {
  const user = await getCurrentUser()
  if (!user) return []

  const activeResources = await db.select({
    id: resources.id,
    ownerId: resources.ownerId,
    moduleKind: resources.moduleKind,
    type: resources.type,
    visibility: resources.visibility,
  }).from(resources).where(and(eq(resources.status, "ACTIVE"), isNull(resources.deletedAt)))

  if (user.isAdmin) {
    return activeResources.map(r => r.id)
  }

  const memberships = await db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, user.id))
  const groupIds = memberships.map(m => m.groupId)

  const subjectGrant = groupIds.length
    ? or(
        and(eq(resourcePermissions.subjectType, "USER"), eq(resourcePermissions.subjectId, user.id)),
        and(eq(resourcePermissions.subjectType, "GROUP"), inArray(resourcePermissions.subjectId, groupIds))
      )
    : and(eq(resourcePermissions.subjectType, "USER"), eq(resourcePermissions.subjectId, user.id))

  const grants = await db.select().from(resourcePermissions).where(subjectGrant)
  const grantMap = new Map<string, typeof grants>()
  for (const grant of grants) {
    if (!grantMap.has(grant.resourceId)) {
      grantMap.set(grant.resourceId, [])
    }
    grantMap.get(grant.resourceId)!.push(grant)
  }

  const allowedResourceIds = new Set<string>()

  for (const resource of activeResources) {
    if (resource.ownerId === user.id) {
      allowedResourceIds.add(resource.id)
      continue
    }

    if (resource.visibility === "TEAM" || resource.visibility === "PUBLIC") {
      if (permission === "VIEW") {
        allowedResourceIds.add(resource.id)
        continue
      }
    }

    const resourceGrants = grantMap.get(resource.id) || []
    const directGrant = resourceGrants.find(g => g.subjectType === "USER")

    if (directGrant) {
      if (permissionFlag(directGrant, permission)) {
        allowedResourceIds.add(resource.id)
      }
    } else {
      const hasGroupGrant = resourceGrants.some(g => g.subjectType === "GROUP" && permissionFlag(g, permission))
      if (hasGroupGrant) {
        allowedResourceIds.add(resource.id)
      }
    }
  }

  return Array.from(allowedResourceIds)
}
