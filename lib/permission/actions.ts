"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import type { ActionResult } from "@/lib/action-result"
import { writeAudit } from "@/lib/audit/log"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { resourcePermissions, resources } from "@/lib/db/schema"

const permissionSchema = z.array(z.object({
  subjectType: z.enum(["USER", "GROUP"]), subjectId: z.string().uuid(),
  canView: z.boolean(), canViewSecret: z.boolean(), canViewFile: z.boolean(),
  canDownload: z.boolean(), canEdit: z.boolean(), canShare: z.boolean(),
})).max(200)

export async function updateResourcePermissions(resourceId: string, input: z.infer<typeof permissionSchema>): Promise<ActionResult> {
  const user = await getCurrentUser()
  const resource = await db.query.resources.findFirst({ where: eq(resources.id, resourceId) })
  if (!user || !resource || (!user.isAdmin && resource.ownerId !== user.id)) return { success: false, error: "仅管理员或资源所有者可以修改权限" }
  const parsed = permissionSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: "权限配置无效" }
  db.transaction(tx => {
    tx.delete(resourcePermissions).where(eq(resourcePermissions.resourceId, resourceId)).run()
    if (parsed.data.length) {
      tx.insert(resourcePermissions).values(parsed.data.map(item => ({ resourceId, ...item }))).run()
    }
  })
  await writeAudit({ userId: user.id, action: "PERMISSION_CHANGE", resourceId, targetType: "RESOURCE", targetId: resourceId })
  revalidatePath(`/resources/${resourceId}`)
  return { success: true, data: undefined }
}
