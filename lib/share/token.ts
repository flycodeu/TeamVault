import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

export function createShareToken() {
  const token = randomBytes(32).toString("base64url")
  return { token, hash: createHash("sha256").update(token).digest("hex") }
}

export function hashShareToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

function signingKey() {
  const encoded = process.env.TEAMVAULT_MASTER_KEY
  if (!encoded) throw new Error("TEAMVAULT_MASTER_KEY is not configured")
  const key = Buffer.from(encoded, "base64")
  if (key.length !== 32) throw new Error("TEAMVAULT_MASTER_KEY must decode to exactly 32 bytes")
  return key
}

export function shareAccessProof(shareId: string, tokenHash: string) {
  return createHmac("sha256", signingKey()).update(`${shareId}:${tokenHash}`).digest("base64url")
}

export function verifyShareAccessProof(value: string, shareId: string, tokenHash: string) {
  const expected = Buffer.from(shareAccessProof(shareId, tokenHash))
  const actual = Buffer.from(value)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
