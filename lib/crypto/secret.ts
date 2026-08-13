import "server-only"

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const VERSION = "v1"

function masterKey() {
  const encoded = process.env.TEAMVAULT_MASTER_KEY
  if (!encoded) throw new Error("TEAMVAULT_MASTER_KEY is not configured")
  const key = Buffer.from(encoded, "base64")
  if (key.length !== 32) throw new Error("TEAMVAULT_MASTER_KEY must decode to exactly 32 bytes")
  return key
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [VERSION, iv.toString("base64url"), authTag.toString("base64url"), ciphertext.toString("base64url")].join(":")
}

export function decryptSecret(payload: string) {
  const [version, ivValue, authTagValue, ciphertextValue] = payload.split(":")
  if (version !== VERSION || !ivValue || !authTagValue || !ciphertextValue) throw new Error("Invalid encrypted secret")
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8")
}
