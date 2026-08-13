import "server-only"

import { createHash, randomBytes } from "node:crypto"

import { and, eq, gt } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import { cache } from "react"

import { db } from "@/lib/db"
import { sessions, users } from "@/lib/db/schema"

const SESSION_COOKIE = "teamvault_session"
const DEFAULT_SESSION_DAYS = 14

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function sessionDays() {
  const configured = Number(process.env.TEAMVAULT_SESSION_DAYS)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_SESSION_DAYS
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url")
  const expiresAt = new Date(Date.now() + sessionDays() * 24 * 60 * 60 * 1000)
  const requestHeaders = await headers()

  await db.insert(sessions).values({
    userId,
    tokenHash: tokenHash(token),
    expiresAt,
    ip: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim(),
    userAgent: requestHeaders.get("user-agent")?.slice(0, 500),
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  })
}

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) {
    return null
  }

  const result = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      isAdmin: users.isAdmin,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash(token)),
        gt(sessions.expiresAt, new Date()),
        eq(users.status, "ACTIVE"),
      ),
    )
    .limit(1)

  return result[0] ?? null
})

export async function deleteCurrentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)))
  }

  cookieStore.delete(SESSION_COOKIE)
}

export async function revokeUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}
