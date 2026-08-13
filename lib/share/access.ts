import "server-only"

import { and, eq, gt, isNull, or, sql } from "drizzle-orm"
import { cookies } from "next/headers"

import { db } from "@/lib/db"
import { shares } from "@/lib/db/schema"
import { hashShareToken, verifyShareAccessProof } from "./token"

export async function getShareAccess(token: string, consume = false) {
  const tokenHash = hashShareToken(token)
  const share = await db.query.shares.findFirst({ where: and(eq(shares.tokenHash, tokenHash), isNull(shares.revokedAt), or(isNull(shares.expiresAt), gt(shares.expiresAt, new Date()))) })
  if (!share || (share.maxViews !== null && share.viewCount >= share.maxViews)) return null
  if (share.passwordHash) {
    const proof = (await cookies()).get(`teamvault_share_${share.id}`)?.value
    if (!proof || !verifyShareAccessProof(proof, share.id, tokenHash)) return null
  }
  if (!consume) return { share, tokenHash }
  const updated = await db.update(shares).set({ viewCount: sql`${shares.viewCount} + 1` }).where(and(eq(shares.id, share.id), or(isNull(shares.maxViews), sql`${shares.viewCount} < ${shares.maxViews}`))).returning({ id: shares.id })
  return updated[0] ? { share, tokenHash } : null
}

export const consumeShare = (token: string) => getShareAccess(token, true)
