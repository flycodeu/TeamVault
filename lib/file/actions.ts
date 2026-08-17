"use server"

import fs from "node:fs/promises"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/action-result"
import { writeAudit } from "@/lib/audit/log"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { canEditResource } from "@/lib/permission"
import { safeStoragePath } from "@/lib/storage/files"

export async function deleteFile(id: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  const file = await db.query.files.findFirst({ where: eq(files.id, id) })
  if (!user || !file || !(await canEditResource(file.resourceId))) return { success: false, error: "无权删除该文件" }
  try { await fs.unlink(safeStoragePath(file.storagePath)) } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") return { success: false, error: "文件删除失败" } }
  await db.delete(files).where(eq(files.id, id))
  await writeAudit({ userId: user.id, action: "FILE_DELETE", resourceId: file.resourceId, targetType: "FILE", targetId: id })
  revalidatePath(`/resources/${file.resourceId}`)
  revalidatePath("/files")
  return { success: true, data: undefined }
}

export async function batchDeleteFiles(ids: string[]): Promise<ActionResult<{ deletedCount: number }>> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  if (!ids.length) return { success: true, data: { deletedCount: 0 } }

  const fileRows = await db.query.files.findMany({ where: inArray(files.id, ids) })
  if (!fileRows.length) return { success: true, data: { deletedCount: 0 } }

  const resourceIds = Array.from(new Set(fileRows.map(f => f.resourceId)))
  for (const rId of resourceIds) {
    if (!(await canEditResource(rId))) {
      return { success: false, error: "无权删除部分文件" }
    }
  }

  let deletedCount = 0
  for (const file of fileRows) {
    try {
      await fs.unlink(safeStoragePath(file.storagePath))
    } catch {
      // Ignore ENOENT
    }
    await db.delete(files).where(eq(files.id, file.id))
    await writeAudit({ userId: user.id, action: "FILE_DELETE", resourceId: file.resourceId, targetType: "FILE", targetId: file.id })
    deletedCount++
  }

  for (const rId of resourceIds) {
    revalidatePath(`/resources/${rId}`)
  }
  revalidatePath("/files")
  return { success: true, data: { deletedCount } }
}

export async function moveFiles(fileIds: string[], targetFolder: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  if (!fileIds.length) return { success: true, data: undefined }

  const normalizedFolder = targetFolder.trim() === "" || targetFolder.trim() === "/"
    ? "/"
    : (targetFolder.trim().startsWith("/") ? targetFolder.trim() : `/${targetFolder.trim()}`)

  const fileRows = await db.query.files.findMany({ where: inArray(files.id, fileIds) })
  if (!fileRows.length) return { success: false, error: "未找到文件" }

  const resourceIds = Array.from(new Set(fileRows.map(f => f.resourceId)))
  for (const rId of resourceIds) {
    if (!(await canEditResource(rId))) {
      return { success: false, error: "无权移动该资源下的文件" }
    }
  }

  await db.update(files).set({ folder: normalizedFolder }).where(inArray(files.id, fileIds))

  for (const rId of resourceIds) {
    revalidatePath(`/resources/${rId}`)
  }
  revalidatePath("/files")
  return { success: true, data: undefined }
}

export async function renameFolder(resourceId: string, oldFolder: string, newFolder: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  if (!(await canEditResource(resourceId))) return { success: false, error: "无权管理该资源文件夹" }

  const normalizedOld = oldFolder.trim() === "" || oldFolder.trim() === "/" ? "/" : (oldFolder.trim().startsWith("/") ? oldFolder.trim() : `/${oldFolder.trim()}`)
  const normalizedNew = newFolder.trim() === "" || newFolder.trim() === "/" ? "/" : (newFolder.trim().startsWith("/") ? newFolder.trim() : `/${newFolder.trim()}`)

  if (normalizedOld === normalizedNew) return { success: true, data: undefined }

  await db
    .update(files)
    .set({ folder: normalizedNew })
    .where(and(eq(files.resourceId, resourceId), eq(files.folder, normalizedOld)))

  revalidatePath(`/resources/${resourceId}`)
  revalidatePath("/files")
  return { success: true, data: undefined }
}

export async function deleteFolder(resourceId: string, folder: string): Promise<ActionResult> {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "请先登录" }
  if (!(await canEditResource(resourceId))) return { success: false, error: "无权管理该资源文件夹" }

  const normalizedFolder = folder.trim() === "" || folder.trim() === "/" ? "/" : (folder.trim().startsWith("/") ? folder.trim() : `/${folder.trim()}`)
  const targetFiles = await db.query.files.findMany({
    where: and(eq(files.resourceId, resourceId), eq(files.folder, normalizedFolder)),
  })

  for (const file of targetFiles) {
    try {
      await fs.unlink(safeStoragePath(file.storagePath))
    } catch {
      // Ignore
    }
    await db.delete(files).where(eq(files.id, file.id))
    await writeAudit({ userId: user.id, action: "FILE_DELETE", resourceId, targetType: "FILE", targetId: file.id })
  }

  revalidatePath(`/resources/${resourceId}`)
  revalidatePath("/files")
  return { success: true, data: undefined }
}
