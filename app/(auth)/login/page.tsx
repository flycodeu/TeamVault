import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { LoginView } from "@/components/auth/login-view"
import { getCurrentUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "登录" }

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect("/")
  }

  return <LoginView />
}
