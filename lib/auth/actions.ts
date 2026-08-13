"use server"

import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"

import type { ActionResult } from "@/lib/action-result"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { writeAudit } from "@/lib/audit/log"

import { verifyPassword } from "./password"
import { loginSchema } from "./schemas"
import { createSession, deleteCurrentSession } from "./session"
import { requireSameOrigin } from "./csrf"
import { clearLoginFailures, loginAllowed, recordLoginFailure } from "./rate-limit"
import { headers } from "next/headers"

export async function loginAction(
  _previousState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  await requireSameOrigin()
  const input = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  })

  if (!input.success) {
    return { success: false, error: input.error.issues[0]?.message ?? "登录信息无效" }
  }

  const requestHeaders = await headers()
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local"
  const rateKey = `${ip}:${input.data.username.toLowerCase()}`
  if (!(await loginAllowed(rateKey))) return { success: false, error: "登录尝试过多，请稍后再试" }

  const user = await db.query.users.findFirst({
    where: eq(users.username, input.data.username),
  })

  const passwordMatches = user
    ? await verifyPassword(user.passwordHash, input.data.password)
    : false

  if (!user || !passwordMatches || user.status !== "ACTIVE") {
    await recordLoginFailure(rateKey)
    return { success: false, error: "用户名或密码错误" }
  }

  await clearLoginFailures(rateKey)
  await createSession(user.id)
  await writeAudit({ userId: user.id, action: "LOGIN", targetType: "SESSION" })
  redirect("/")
}

export async function logoutAction() {
  await requireSameOrigin()
  const user = await (await import("./session")).getCurrentUser()
  if (user) await writeAudit({ userId: user.id, action: "LOGOUT", targetType: "SESSION" })
  await deleteCurrentSession()
  redirect("/login")
}
