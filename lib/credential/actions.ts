"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { ActionResult } from "@/lib/action-result"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { credentialPermissions, credentials, resources } from "@/lib/db/schema"
import { writeAudit } from "@/lib/audit/log"
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret"
import { canEditResource, canViewCredential } from "@/lib/permission"

import { credentialSchema, credentialUpdateSchema, type CredentialInput } from "./schemas"

async function resourceForUser(resourceId: string) {
  const user = await getCurrentUser()
  if (!user) return { user: null, resource: null }
  const resource = await db.query.resources.findFirst({ where: eq(resources.id, resourceId) })
  return { user, resource }
}

export async function createCredential(resourceId: string, input: CredentialInput): Promise<ActionResult<{ id: string }>> {
  const parsed = credentialSchema.safeParse(input)
  const { user, resource } = await resourceForUser(resourceId)
  if (!user) return { success: false, error: "请先登录" }
  if (!resource || !(await canEditResource(resourceId))) return { success: false, error: "无权编辑该资源" }
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "凭据信息无效" }
  let credentialId = ""
  db.transaction(tx => {
    const credential = tx.insert(credentials).values({ resourceId, linkId: parsed.data.linkId, name: parsed.data.name, type: parsed.data.type, username: parsed.data.username, secretCipher: encryptSecret(parsed.data.secret), extraCipher: parsed.data.extra ? encryptSecret(parsed.data.extra) : null, description: parsed.data.description, accessMode: parsed.data.accessMode, createdBy: user.id }).returning({ id: credentials.id }).get()
    credentialId = credential.id
    if (parsed.data.accessMode === "RESTRICTED" && parsed.data.subjects.length) {
      tx.insert(credentialPermissions).values(parsed.data.subjects.map(subject => ({ credentialId, ...subject }))).run()
    }
  })
  await writeAudit({ userId: user.id, action: "RESOURCE_EDIT", resourceId, targetType: "CREDENTIAL", targetId: credentialId })
  revalidatePath(`/resources/${resourceId}`)
  return { success: true, data: { id: credentialId } }
}

export async function revealCredential(id: string, copy = false): Promise<ActionResult<{ secret: string; extra: string | null }>> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  const credential = await db.query.credentials.findFirst({ where: eq(credentials.id, id) })
  if (!credential) return { success: false, error: "凭据不存在" }
  const { resource } = await resourceForUser(credential.resourceId)
  if (!resource || !(await canViewCredential(id))) return { success: false, error: "无权查看该凭据" }
  await writeAudit({ userId: user.id, action: copy ? "SECRET_COPY" : "SECRET_VIEW", resourceId: resource.id, targetType: "CREDENTIAL", targetId: id })
  return { success: true, data: { secret: decryptSecret(credential.secretCipher), extra: credential.extraCipher ? decryptSecret(credential.extraCipher) : null } }
}

export async function deleteCredential(id: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  const credential = await db.query.credentials.findFirst({ where: eq(credentials.id, id) })
  if (!user || !credential) return { success: false, error: "凭据不存在或未登录" }
  const { resource } = await resourceForUser(credential.resourceId)
  if (!resource || !(await canEditResource(resource.id))) return { success: false, error: "无权删除该凭据" }
  await db.delete(credentials).where(eq(credentials.id, id))
  await writeAudit({ userId: user.id, action: "RESOURCE_EDIT", resourceId: resource.id, targetType: "CREDENTIAL", targetId: id })
  revalidatePath(`/resources/${resource.id}`)
  return { success: true, data: undefined }
}

const credentialAccessSchema = z.object({ accessMode: z.enum(["RESOURCE", "RESTRICTED"]), subjects: z.array(z.object({ subjectType: z.enum(["USER", "GROUP"]), subjectId: z.string().uuid() })).max(200) })

export async function updateCredentialAccess(id: string, input: z.infer<typeof credentialAccessSchema>): Promise<ActionResult> {
  const user = await getCurrentUser()
  const credential = await db.query.credentials.findFirst({ where: eq(credentials.id, id) })
  if (!user || !credential || !(await canEditResource(credential.resourceId))) return { success: false, error: "无权修改凭据可见范围" }
  const parsed = credentialAccessSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: "凭据可见范围无效" }

  db.transaction(tx => {
    tx.update(credentials).set({ accessMode: parsed.data.accessMode, updatedAt: new Date() }).where(eq(credentials.id, id)).run()
    tx.delete(credentialPermissions).where(eq(credentialPermissions.credentialId, id)).run()
    if (parsed.data.accessMode === "RESTRICTED" && parsed.data.subjects.length) {
      tx.insert(credentialPermissions).values(parsed.data.subjects.map(subject => ({ credentialId: id, ...subject }))).run()
    }
  })
  await writeAudit({ userId: user.id, action: "PERMISSION_CHANGE", resourceId: credential.resourceId, targetType: "CREDENTIAL", targetId: id })
  revalidatePath(`/resources/${credential.resourceId}`)
  return { success: true, data: undefined }
}

export async function updateCredential(id: string, input: { name: string; type: CredentialInput["type"]; username?: string; secret?: string; extra?: string; description?: string }): Promise<ActionResult> {
  const user = await getCurrentUser()
  const credential = await db.query.credentials.findFirst({ where: eq(credentials.id, id) })
  if (!user || !credential || !(await canEditResource(credential.resourceId))) return { success: false, error: "无权编辑该凭据" }
  const parsed = credentialUpdateSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "凭据信息无效" }
  await db.update(credentials).set({ name: parsed.data.name, type: parsed.data.type, username: parsed.data.username, description: parsed.data.description, extraCipher: parsed.data.extra ? encryptSecret(parsed.data.extra) : credential.extraCipher, secretCipher: parsed.data.secret ? encryptSecret(parsed.data.secret) : credential.secretCipher, updatedAt: new Date() }).where(eq(credentials.id, id))
  await writeAudit({ userId: user.id, action: "RESOURCE_EDIT", resourceId: credential.resourceId, targetType: "CREDENTIAL", targetId: id })
  revalidatePath(`/resources/${credential.resourceId}`)
  return { success: true, data: undefined }
}
