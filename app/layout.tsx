import type { Metadata } from "next"
import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/layout/theme-provider"

import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "TeamVault",
    template: "%s · TeamVault",
  },
  description: "轻量、安全的团队模块资料库",
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
