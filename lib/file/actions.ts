"use server"

import fs from "node:fs/promises"
import { eq } from "drizzle-orm"
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
