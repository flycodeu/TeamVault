import "server-only"

import { redirect } from "next/navigation"

import { getCurrentUser } from "./session"

export async function requireAdminUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!user.isAdmin) redirect("/")
  return user
}
