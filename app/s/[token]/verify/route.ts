import { and, eq, gt, isNull, or } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

import { verifyPassword } from "@/lib/auth/password"
import { db } from "@/lib/db"
import { shares } from "@/lib/db/schema"
import { hashShareToken, shareAccessProof } from "@/lib/share/token"
import { requireSameOrigin } from "@/lib/auth/csrf"

const MAX_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000
// 内存级限流（单节点部署）：同一分享链接 + IP 在窗口期内最多尝试 MAX_ATTEMPTS 次
const attemptLog = new Map<string, number[]>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const recent = (attemptLog.get(key) ?? []).filter(t => now - t < WINDOW_MS)
  if (recent.length >= MAX_ATTEMPTS) return true
  recent.push(now)
  attemptLog.set(key, recent)
  return false
}

function isSecureCookie() {
  if (process.env.TEAMVAULT_SECURE_COOKIE === "false" || process.env.TEAMVAULT_SECURE_COOKIE === "0") {
    return false
  }
  if (process.env.TEAMVAULT_SECURE_COOKIE === "true" || process.env.TEAMVAULT_SECURE_COOKIE === "1") {
    return true
  }
  return process.env.NODE_ENV === "production"
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  await requireSameOrigin()
  const { token } = await params
  const requestHeaders = await headers()
  const ip = requestHeaders.get("x-real-ip")?.trim() || requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (rateLimited(`${token}:${ip}`)) {
    return NextResponse.redirect(new URL(`/s/${token}?error=rate`, request.url), 303)
  }
  const tokenHash = hashShareToken(token)
  const share = await db.query.shares.findFirst({
    where: and(
      eq(shares.tokenHash, tokenHash),
      isNull(shares.revokedAt),
      or(isNull(shares.expiresAt), gt(shares.expiresAt, new Date())),
    ),
  })
  if (!share?.passwordHash) return NextResponse.redirect(new URL(`/s/${token}`, request.url), 303)
  const form = await request.formData()
  const password = String(form.get("password") ?? "")
  if (!(await verifyPassword(share.passwordHash, password))) {
    return NextResponse.redirect(new URL(`/s/${token}?error=password`, request.url), 303)
  }
  const response = NextResponse.redirect(new URL(`/s/${token}`, request.url), 303)
  response.cookies.set(`teamvault_share_${share.id}`, shareAccessProof(share.id, tokenHash), {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: `/s/${token}`,
    expires: share.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
  })
  return response
}
