import "server-only"

import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { loginAttempts } from "@/lib/db/schema"

const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000
const MAX_FAILURES = 8

export async function loginAllowed(key: string) {
  const attempt = await db.query.loginAttempts.findFirst({ where: eq(loginAttempts.key, key) })
  return !attempt?.blockedUntil || attempt.blockedUntil <= new Date()
}

export async function recordLoginFailure(key: string) {
  const now = new Date()
  const attempt = await db.query.loginAttempts.findFirst({ where: eq(loginAttempts.key, key) })
  const expired = !attempt || now.getTime() - attempt.windowStartedAt.getTime() > WINDOW_MS
  const failures = expired ? 1 : attempt.failures + 1
  await db.insert(loginAttempts).values({ key, failures, windowStartedAt: expired ? now : attempt.windowStartedAt, blockedUntil: failures >= MAX_FAILURES ? new Date(now.getTime() + BLOCK_MS) : null }).onConflictDoUpdate({ target: loginAttempts.key, set: { failures, windowStartedAt: expired ? now : attempt.windowStartedAt, blockedUntil: failures >= MAX_FAILURES ? new Date(now.getTime() + BLOCK_MS) : null } })
}

export async function clearLoginFailures(key: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.key, key))
}
