import "server-only"

import { headers } from "next/headers"

export async function requireSameOrigin() {
  const requestHeaders = await headers()
  const origin = requestHeaders.get("origin")
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
  if (!origin || !host) return
  const originHost = new URL(origin).host
  if (originHost !== host) throw new Error("Invalid request origin")
}
