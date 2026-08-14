import { desc, eq, or } from "drizzle-orm"
import { notFound } from "next/navigation"

import { MemoBoard } from "@/components/memo/memo-board"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { memos, users } from "@/lib/db/schema"

export default async function MemosPage() {
  const user = await getCurrentUser()
  if (!user) notFound()

  // Fetch memos: user's own + TEAM visibility
  const rawMemos = await db
    .select({
      id: memos.id,
      content: memos.content,
      color: memos.color,
      visibility: memos.visibility,
      createdBy: memos.createdBy,
      createdAt: memos.createdAt,
      updatedAt: memos.updatedAt,
      authorName: users.displayName,
    })
    .from(memos)
    .leftJoin(users, eq(memos.createdBy, users.id))
    .where(
      or(
        eq(memos.createdBy, user.id),
        eq(memos.visibility, "TEAM")
      )
    )
    .orderBy(desc(memos.createdAt))

  const typedMemos = rawMemos.map((m) => ({
    ...m,
    visibility: m.visibility as "PRIVATE" | "TEAM",
    authorName: m.authorName || "未知用户",
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <MemoBoard initialMemos={typedMemos} currentUserId={user.id} />
    </div>
  )
}
