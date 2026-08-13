import { and, eq, gt, isNull, or } from "drizzle-orm"
import { NextResponse } from "next/server"

import { verifyPassword } from "@/lib/auth/password"
import { db } from "@/lib/db"
import { shares } from "@/lib/db/schema"
import { hashShareToken, shareAccessProof } from "@/lib/share/token"
import { requireSameOrigin } from "@/lib/auth/csrf"

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  await requireSameOrigin()
  const { token } = await params
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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/s/${token}`,
    expires: share.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
  })
  return response
}
