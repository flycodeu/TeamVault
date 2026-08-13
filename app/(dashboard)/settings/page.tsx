import { Database, HardDrive, ShieldCheck } from "lucide-react"
import { databasePath } from "@/lib/db"
import { requireAdminUser } from "@/lib/auth/guards"

export default async function SettingsPage() {
  await requireAdminUser()
  return <div className="mx-auto max-w-4xl px-4 py-8 md:px-8"><h1 className="text-2xl font-semibold">设置</h1><div className="mt-7 grid gap-4 sm:grid-cols-3">{[[Database,"SQLite",databasePath],[HardDrive,"文件存储","data/files"],[ShieldCheck,"会话策略",`${process.env.TEAMVAULT_SESSION_DAYS ?? 14} 天`]].map(([Icon,title,value]) => { const I = Icon as typeof Database; return <div key={String(title)} className="rounded-lg border bg-card p-5"><I className="size-4 text-primary" /><p className="mt-4 text-sm font-medium">{String(title)}</p><p className="mt-1 break-all text-xs text-muted-foreground">{String(value)}</p></div> })}</div></div>
}
