"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={resolvedTheme === "dark" ? "切换到浅色主题" : "切换到深色主题"}
      title={resolvedTheme === "dark" ? "浅色主题" : "深色主题"}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      disabled={!resolvedTheme}
      suppressHydrationWarning
    >
      {resolvedTheme === "dark" ? <Sun /> : <Moon />}
    </Button>
  )
}
