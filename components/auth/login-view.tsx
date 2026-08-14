"use client"

import { useEffect, useRef, useState } from "react"

import { LoginForm } from "@/components/auth/login-form"
import { VaultLogo } from "@/components/layout/brand"
import { ThemeSwitcher } from "@/components/layout/theme-switcher"

export function LoginView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      setMousePos({ x, y })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen w-full flex-col items-center justify-between p-6 overflow-hidden bg-background"
    >
      {/* 1. Interactive Ambient Aurora Gradients */}
      <div
        className="pointer-events-none absolute size-[560px] rounded-full bg-primary/20 blur-[130px] transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${(mousePos.x - 0.5) * 70}px, ${(mousePos.y - 0.5) * 70}px)`,
          top: "15%",
          left: "25%",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute size-[460px] rounded-full bg-emerald-500/15 dark:bg-teal-500/15 blur-[120px] transition-transform duration-1000 ease-out"
        style={{
          transform: `translate(${(mousePos.x - 0.5) * -80}px, ${(mousePos.y - 0.5) * -80}px)`,
          bottom: "15%",
          right: "25%",
        }}
        aria-hidden="true"
      />

      {/* 2. Delicate Tech Dot Matrix & Blueprint Lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035] dark:opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02] dark:opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
        }}
        aria-hidden="true"
      />

      {/* Top Header Bar */}
      <header className="relative z-20 flex w-full max-w-6xl items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground shadow-xs">
            <VaultLogo size={17} />
          </span>
          <span className="text-sm font-bold tracking-tight text-foreground">TeamVault</span>
        </div>

        <div className="rounded-full border border-border/80 bg-card/80 p-1 backdrop-blur-md shadow-xs">
          <ThemeSwitcher />
        </div>
      </header>

      {/* Centered Minimalist Glassmorphic Login Card */}
      <main className="relative z-10 w-full max-w-[390px] my-auto py-8">
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/85 p-7 md:p-8 shadow-2xl backdrop-blur-xl transition duration-200 hover:border-primary/40">
          {/* Subtle Ambient Corner Glow */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/15 blur-2xl"
            aria-hidden="true"
          />

          {/* Clean Card Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3">
              <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary to-emerald-500 opacity-30 blur-sm" />
              <span className="relative grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground shadow-md shadow-primary/20">
                <VaultLogo size={25} />
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-foreground">登录 TeamVault</h1>
            <p className="mt-1 text-xs text-muted-foreground">团队资料库 · 账号密码与文件共享</p>
          </div>

          {/* Form */}
          <LoginForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center text-[11px] text-muted-foreground/60">
        © 2026 TeamVault · 轻量安全团队资料库
      </footer>
    </div>
  )
}
