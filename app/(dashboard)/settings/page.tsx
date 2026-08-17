import {
  CheckCircle2,
  Cpu,
  Database,
  HardDrive,
  KeyRound,
  Lock,
  ShieldCheck,
} from "lucide-react"

import { SystemMigrationPanel } from "@/components/settings/system-migration-panel"
import { requireAdminUser } from "@/lib/auth/guards"
import { databasePath } from "@/lib/db"
import { getSystemStorageStats } from "@/lib/system/backup"

export default async function SettingsPage() {
  await requireAdminUser()

  const stats = await getSystemStorageStats()

  const systemCards = [
    {
      icon: Database,
      title: "SQLite 数据库",
      value: databasePath,
      desc: "支持轻量化部署与本地快速持久化，配合 WAL 模式实现高并发读写",
      status: "正常运行",
    },
    {
      icon: HardDrive,
      title: "团队文件存储目录",
      value: "data/files",
      desc: "支持图片、PDF、技术文档及代码包的安全隔离存储与缩略图缓存",
      status: "存储就绪",
    },
    {
      icon: ShieldCheck,
      title: "会话过期策略",
      value: `${process.env.TEAMVAULT_SESSION_DAYS ?? 14} 天有效期`,
      desc: "服务端高强度 Session 令牌哈希校验，支持多设备安全登出",
      status: "保护中",
    },
    {
      icon: KeyRound,
      title: "机密加密算法",
      value: "AES-256-GCM + PBKDF2",
      desc: "系统密码与 API 凭据在落库前强制通过对称加密信封保护",
      status: "已启用",
    },
    {
      icon: Lock,
      title: "防爆破与安全限流",
      value: "IP & 用户级双重锁定",
      desc: "登录失败达上限自动触发指数退避与临时访问阻止",
      status: "生效中",
    },
    {
      icon: Cpu,
      title: "运行环境",
      value: `Node.js ${process.version}`,
      desc: "Next.js App Router 混合渲染引擎与 Drizzle ORM",
      status: "运行中",
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">系统设置与迁移</h1>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
          管理员专享
        </span>
      </div>

      {/* Migration & Backup Section */}
      <section className="space-y-4">
        <div className="border-b border-border/80 pb-3">
          <h2 className="text-base font-bold text-foreground">全量数据导出与跨机迁移</h2>
        </div>
        <SystemMigrationPanel initialStats={stats} />
      </section>

      {/* System Environment Information Section */}
      <section className="space-y-4 pt-2">
        <div className="border-b border-border/80 pb-3">
          <h2 className="text-base font-bold text-foreground">系统环境与运行状态</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {systemCards.map(item => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 shadow-xs transition duration-200 hover:border-primary/40 hover:shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                      <Icon className="size-5" />
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      {item.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-foreground">{item.title}</h3>
                  <p className="mt-1.5 font-mono text-xs text-primary font-semibold break-all bg-muted/50 rounded p-1.5">
                    {item.value}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
