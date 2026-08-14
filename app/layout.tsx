import type { Metadata } from "next"
import type { ReactNode } from "react"

import { ThemeProvider } from "@/components/layout/theme-provider"

import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "TeamVault",
    template: "%s · TeamVault",
  },
  description: "轻量、安全的团队模块与加密凭据资料库",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
