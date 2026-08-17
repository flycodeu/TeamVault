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
  subjectType: z.enum(["USER", "GROUP"]),
  subjectId: z.string().min(1),
  canView: z.boolean(),
  canViewSecret: z.boolean(),
  canViewFile: z.boolean(),
  canDownload: z.boolean(),
  canEdit: z.boolean(),
  canShare: z.boolean(),
})).max(200)

export async function updateResourcePermissions(resourceId: string, input: z.infer<typeof permissionSchema>): Promise<ActionResult> {
  const user = await getCurrentUser()
  const resource = await db.query.resources.findFirst({ where: eq(resources.id, resourceId) })
  if (!user || !resource || (!user.isAdmin && resource.ownerId !== user.id)) {
    return { success: false, error: "仅管理员或资源所有者可以修改权限" }
  }

  const parsed = permissionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "权限配置无效" }
  }

  // Deduplicate entries by subjectType + subjectId to prevent unique constraint violations
  const uniqueMap = new Map<string, z.infer<typeof permissionSchema>[number]>()
  for (const item of parsed.data) {
    uniqueMap.set(`${item.subjectType}:${item.subjectId}`, item)
  }
  const cleanGrants = Array.from(uniqueMap.values())

  try {
    db.transaction(tx => {
      tx.delete(resourcePermissions).where(eq(resourcePermissions.resourceId, resourceId)).run()
      if (cleanGrants.length) {
        tx.insert(resourcePermissions).values(cleanGrants.map(item => ({ resourceId, ...item }))).run()
      }
    })

    await writeAudit({
      userId: user.id,
      action: "PERMISSION_CHANGE",
      resourceId,
      targetType: "RESOURCE",
      targetId: resourceId,
    })

    revalidatePath(`/resources/${resourceId}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Failed to update resource permissions:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "保存权限失败，请重试",
    }
  }
}
