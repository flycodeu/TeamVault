import { Check, FileLock2, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { Brand } from "@/components/layout/brand"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { getCurrentUser } from "@/lib/auth/session"

export const metadata: Metadata = { title: "登录" }

const safeguards = ["服务端会话", "细粒度权限", "敏感信息加密"]

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect("/")
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(320px,0.9fr)_minmax(520px,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-[#123d35] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          aria-hidden="true"
        />
        <Brand className="relative" inverse />
        <div className="relative max-w-md">
          <div className="mb-7 grid size-14 place-items-center rounded-lg border border-white/20 bg-white/10">
            <FileLock2 className="size-6" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-semibold leading-tight">把项目、工具与资料整理成清晰模块。</h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/66">
            说明、网站、外部文档、账号与文件按场景组合，并保持清晰的访问边界。
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/82">
            {safeguards.map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="grid size-5 place-items-center rounded-full bg-white/12">
                  <Check className="size-3" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/45">Internal workspace · Authorized members only</p>
      </section>

      <section className="flex min-h-screen flex-col bg-background">
        <div className="flex h-16 items-center justify-between px-6 lg:justify-end lg:px-10">
          <Brand className="lg:hidden" />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-20 pt-8">
          <div className="w-full max-w-sm">
            <div className="mb-10 flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold uppercase text-primary">成员访问</p>
            <h2 className="mt-2 text-2xl font-semibold">欢迎回来</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">使用管理员分配的账户登录 TeamVault。</p>
            <LoginForm />
            <p className="mt-8 text-xs leading-5 text-muted-foreground">
              无法登录？请联系工作区管理员重置账户状态或密码。
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
