import argon2 from "argon2"

const hashOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const

export function hashPassword(password: string) {
  return argon2.hash(password, hashOptions)
}

export function verifyPassword(passwordHash: string, password: string) {
  return argon2.verify(passwordHash, password)
}
