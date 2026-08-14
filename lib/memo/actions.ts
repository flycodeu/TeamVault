"use server"

import { eq, desc } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { memos } from "@/lib/db/schema"

export async function createMemo(data: { content: string; color: string; visibility: "PRIVATE" | "TEAM" }) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "未登录" }

  if (!data.content.trim()) return { success: false, error: "内容不能为空" }

  try {
    await db.insert(memos).values({
      content: data.content,
      color: data.color,
      visibility: data.visibility,
      createdBy: user.id,
    })
    revalidatePath("/memos")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateMemo(id: string, data: { content: string; color: string; visibility: "PRIVATE" | "TEAM" }) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "未登录" }

  const existing = await db.query.memos.findFirst({ where: eq(memos.id, id) })
  if (!existing || existing.createdBy !== user.id) return { success: false, error: "无权修改" }

  try {
    await db
      .update(memos)
      .set({
        content: data.content,
        color: data.color,
        visibility: data.visibility,
        updatedAt: new Date(),
      })
      .where(eq(memos.id, id))
    revalidatePath("/memos")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteMemo(id: string) {
  const user = await getCurrentUser()
  if (!user) return { success: false, error: "未登录" }

  const existing = await db.query.memos.findFirst({ where: eq(memos.id, id) })
  if (!existing || existing.createdBy !== user.id) return { success: false, error: "无权删除" }

  try {
    await db.delete(memos).where(eq(memos.id, id))
    revalidatePath("/memos")
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
