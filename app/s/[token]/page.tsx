import { and, eq, gt, isNull, or } from "drizzle-orm"
import { Download, ExternalLink, FileText, LockKeyhole } from "lucide-react"
import Link from "next/link"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"

import { db } from "@/lib/db"
import { files, resourceLinks, resources, shares } from "@/lib/db/schema"
import { consumeShare } from "@/lib/share/access"
import { hashShareToken, verifyShareAccessProof } from "@/lib/share/token"

export default async function SharePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params
  const tokenHash = hashShareToken(token)
  const share = await db.query.shares.findFirst({
    where: and(eq(shares.tokenHash, tokenHash), isNull(shares.revokedAt), or(isNull(shares.expiresAt), gt(shares.expiresAt, new Date()))),
  })
  if (!share) notFound()

  const proof = (await cookies()).get(`teamvault_share_${share.id}`)?.value
  const granted = !share.passwordHash || (proof ? verifyShareAccessProof(proof, share.id, tokenHash) : false)
  const query = await searchParams
  if (!granted) return <PasswordGate token={token} hasError={Boolean(query.error)} />
  if (!await consumeShare(token)) notFound()

  if (share.type === "FILE") {
    const file = await db.query.files.findFirst({ where: eq(files.id, share.targetId) })
    if (!file) notFound()
    const resource = await db.query.resources.findFirst({ where: eq(resources.id, file.resourceId) })
    if (!resource || resource.sensitivity === "SECRET") notFound()
    return <ShareShell><p className="text-xs font-medium text-primary">单文件分享</p><h1 className="mt-2 text-2xl font-semibold">{file.originalName}</h1><p className="mt-2 text-sm text-muted-foreground">来自 {resource.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p><FileActions token={token} fileId={file.id} allowPreview={share.allowPreview} allowDownload={share.allowDownload} /></ShareShell>
  }

  const resource = await db.query.resources.findFirst({ where: eq(resources.id, share.targetId) })
  if (!resource || resource.sensitivity === "SECRET") notFound()
  const [resourceFiles, links] = await Promise.all([
    db.query.files.findMany({ where: eq(files.resourceId, resource.id) }),
    db.query.resourceLinks.findMany({ where: eq(resourceLinks.resourceId, resource.id) }),
  ])
  return <ShareShell><p className="text-xs font-medium text-primary">模块分享</p><h1 className="mt-2 text-2xl font-semibold">{resource.name}</h1>{resource.description ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{resource.description}</p> : null}{links.length ? <div className="mt-7 space-y-2">{links.map(link => <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-md border p-3 hover:border-primary/50"><ExternalLink className="size-4" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{link.title}</span></a>)}</div> : null}{resourceFiles.length ? <div className="mt-7 space-y-2">{resourceFiles.map(file => <div key={file.id} className="flex items-center gap-3 rounded-md border p-3"><span className="grid size-8 place-items-center rounded bg-muted"><FileText className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.originalName}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div><FileActions token={token} fileId={file.id} allowPreview={share.allowPreview} allowDownload={share.allowDownload} compact /></div>)}</div> : null}<p className="mt-6 rounded-md bg-muted px-3 py-3 text-xs leading-5 text-muted-foreground">外部分享不包含任何账号、密码、API Key 或 Token。</p></ShareShell>
}

function ShareShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-2xl px-5 py-16"><div className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><LockKeyhole className="size-4" /></span>TeamVault</div><div className="mt-12 rounded-lg border bg-card p-6">{children}</div></main>
}

function PasswordGate({ token, hasError }: { token: string; hasError: boolean }) {
  return <main className="mx-auto min-h-screen max-w-md px-5 py-16"><div className="flex items-center gap-2 text-sm font-semibold"><span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><LockKeyhole className="size-4" /></span>TeamVault</div><div className="mt-12 rounded-lg border bg-card p-6"><p className="text-xs font-medium text-primary">受保护的分享</p><h1 className="mt-2 text-xl font-semibold">请输入访问密码</h1><p className="mt-2 text-sm text-muted-foreground">密码正确后才会显示分享内容。</p><form action={`/s/${token}/verify`} method="post" className="mt-6 space-y-3"><input type="password" name="password" required autoFocus className="h-10 w-full rounded-md border bg-background px-3 text-sm" placeholder="分享密码" />{hasError ? <p className="text-sm text-destructive">密码错误</p> : null}<button className="h-10 w-full rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">验证并访问</button></form></div></main>
}

function FileActions({ token, fileId, allowPreview, allowDownload, compact = false }: { token: string; fileId: string; allowPreview: boolean; allowDownload: boolean; compact?: boolean }) {
  return <div className={compact ? "flex shrink-0 gap-1" : "mt-6 flex gap-2"}>{allowPreview ? <Link className="inline-flex h-9 items-center rounded-md border px-3 text-sm" href={`/s/${token}/files/${fileId}/content`} target="_blank">预览</Link> : null}{allowDownload ? <Link className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground" href={`/s/${token}/files/${fileId}/download`}><Download className="size-4" />{compact ? "" : "下载"}</Link> : null}</div>
}
