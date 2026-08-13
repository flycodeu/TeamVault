import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { getCurrentUser } from "@/lib/auth/session"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen">
      <Sidebar isAdmin={user.isAdmin} />
      <Header user={user} />
      <main className="lg:ml-60">{children}</main>
    </div>
  )
}
