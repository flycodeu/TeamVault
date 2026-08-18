import { and, eq, gt, isNull, or } from "drizzle-orm"
import {
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe2,
  KeyRound,
  Lock,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound } from "next/navigation"

import { decryptSecret } from "@/lib/crypto/secret"
import { db } from "@/lib/db"
import { credentials, files, resourceLinks, resources, shares } from "@/lib/db/schema"
import { consumeShare } from "@/lib/share/access"
import { hashShareToken, verifyShareAccessProof } from "@/lib/share/token"
import { formatDate } from "@/lib/utils"
import {
  DecryptedGuestCredential,
  GuestCredentialList,
} from "./guest-credential-list"
import { GuestFileList } from "./guest-file-list"

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { token } = await params
  const tokenHash = hashShareToken(token)
  const share = await db.query.shares.findFirst({
    where: and(
      eq(shares.tokenHash, tokenHash),
      isNull(shares.revokedAt),
      or(isNull(shares.expiresAt), gt(shares.expiresAt, new Date())),
    ),
  })
  if (!share) notFound()

  const proof = (await cookies()).get(`teamvault_share_${share.id}`)?.value
  const granted = !share.passwordHash || (proof ? verifyShareAccessProof(proof, share.id, tokenHash) : false)
  const query = await searchParams
  if (!granted) return <PasswordGate token={token} errorType={typeof query.error === "string" ? query.error : ""} />
  if (!(await consumeShare(token))) notFound()

  // 1. Single File Share
  if (share.type === "FILE") {
    const file = await db.query.files.findFirst({ where: eq(files.id, share.targetId) })
    if (!file) notFound()
    const resource = await db.query.resources.findFirst({ where: eq(resources.id, file.resourceId) })
    if (!resource || resource.sensitivity === "SECRET") notFound()

    return (
      <ShareShell share={share}>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              单文件分享
            </span>
            <span className="text-xs text-muted-foreground">来自 {resource.name}</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl break-words">
            {file.originalName}
          </h1>

          <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-background/80 p-4 shadow-xs">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{file.originalName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            <FileActions
              token={token}
              fileId={file.id}
              allowPreview={share.allowPreview}
              allowDownload={share.allowDownload}
            />
          </div>
        </div>
      </ShareShell>
    )
  }

  // 2. Resource / Module Handover Package
  const resource = await db.query.resources.findFirst({ where: eq(resources.id, share.targetId) })
  if (!resource || resource.sensitivity === "SECRET") notFound()

  // Filter Files
  let specificFileIds: string[] | null = null
  try {
    if (share.fileIds) specificFileIds = JSON.parse(share.fileIds) as string[]
  } catch {
    specificFileIds = null
  }

  // Filter Credentials
  let specificCredentialIds: string[] | null = null
  try {
    if (share.credentialIds) specificCredentialIds = JSON.parse(share.credentialIds) as string[]
  } catch {
    specificCredentialIds = null
  }

  const [allResourceFiles, allResourceLinks, allCredentials] = await Promise.all([
    db.query.files.findMany({ where: eq(files.resourceId, resource.id) }),
    db.query.resourceLinks.findMany({
      where: eq(resourceLinks.resourceId, resource.id),
    }),
    share.allowCredentials
      ? db.query.credentials.findMany({ where: eq(credentials.resourceId, resource.id) })
      : [],
  ])

  const linkMap = new Map(allResourceLinks.map(l => [l.id, l]))

  const visibleFiles = specificFileIds
    ? allResourceFiles.filter(f => specificFileIds!.includes(f.id))
    : allResourceFiles

  const visibleCredentialsRaw = specificCredentialIds
    ? allCredentials.filter(c => specificCredentialIds!.includes(c.id))
    : allCredentials

  // Decrypt secrets securely for external guest
  const decryptedCredentials: DecryptedGuestCredential[] = visibleCredentialsRaw.map(c => {
    let secret = ""
    let extra: string | null = null
    try {
      secret = decryptSecret(c.secretCipher)
    } catch {
      secret = "解密失败"
    }
    try {
      extra = c.extraCipher ? decryptSecret(c.extraCipher) : null
    } catch {
      extra = null
    }

    const matchedLink = c.linkId ? linkMap.get(c.linkId) : null
    const targetUrl = matchedLink?.url ?? resource.url ?? null
    const targetUrlTitle = matchedLink?.title ?? (resource.url ? "系统主站点" : null)

    return {
      id: c.id,
      name: c.name,
      type: c.type,
      username: c.username,
      secret,
      extra,
      description: c.description,
      targetUrl,
      targetUrlTitle,
    }
  })

  // Links visible on the page: standard RESOURCE links, or any link referenced by visible credentials
  const referencedLinkIds = new Set(visibleCredentialsRaw.map(c => c.linkId).filter(Boolean) as string[])
  const visibleLinks = allResourceLinks.filter(l => l.accessMode === "RESOURCE" || referencedLinkIds.has(l.id))

  return (
    <ShareShell share={share}>
      <div className="space-y-6">
        {/* Header Title */}
        <div className="border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 px-2 py-0.5 text-xs font-semibold">
              外部协作交付包
            </span>
            {resource.category ? (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {resource.category}
              </span>
            ) : null}
          </div>
          <h1 className="mt-2.5 text-2xl font-bold tracking-tight text-foreground md:text-3xl break-words">
            {resource.name}
          </h1>
          {resource.description ? (
            <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {resource.description}
            </p>
          ) : null}
        </div>

        {/* 1. Main Website / Target URL */}
        {resource.url ? (
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Globe2 className="size-4 text-primary" />
              <span>系统访问地址</span>
            </div>
            <a
              href={resource.url.startsWith("http") ? resource.url : `https://${resource.url}`}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 transition duration-200 hover:border-primary/60 hover:bg-primary/10 hover:shadow-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-bold text-primary group-hover:underline">
                  {resource.url}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">点击在新标签页中直接打开系统</p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-2xs">
                <ExternalLink className="size-4" />
              </span>
            </a>
          </section>
        ) : null}

        {/* 2. Additional Links */}
        {visibleLinks.length ? (
          <section className="space-y-2.5">
            <h2 className="text-xs font-bold text-foreground">相关网站与文档入口</h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {visibleLinks.map(link => (
                <a
                  key={link.id}
                  href={link.url.startsWith("http") ? link.url : `https://${link.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-border/80 bg-background/80 p-3 shadow-xs transition hover:border-primary/40 hover:bg-accent/20"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-xs font-semibold text-foreground">{link.title}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">{link.url}</p>
                  </div>
                  <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {/* 3. Handover Credentials (Usernames & Passwords) */}
        {share.allowCredentials ? (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-xs font-bold text-foreground">登录账号与访问密钥</h2>
              </div>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.2 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                {decryptedCredentials.length} 个凭据
              </span>
            </div>

            {decryptedCredentials.length ? (
              <GuestCredentialList credentials={decryptedCredentials} />
            ) : (
              <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                未包含任何账号信息
              </div>
            )}
          </section>
        ) : null}

        {/* 4. Manuals & Documentation Files */}
        {visibleFiles.length && (share.allowPreview || share.allowDownload) ? (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xs font-bold text-foreground">配套手册与资料文档</h2>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.2 text-[10px] font-semibold text-muted-foreground">
                {visibleFiles.length} 份文件
              </span>
            </div>

            <GuestFileList
              token={token}
              files={visibleFiles.map(f => ({
                id: f.id,
                originalName: f.originalName,
                size: f.size,
                extension: f.extension,
                mimeType: f.mimeType,
                folder: f.folder,
              }))}
              allowPreview={share.allowPreview}
              allowDownload={share.allowDownload}
            />
          </section>
        ) : null}
      </div>
    </ShareShell>
  )
}

function ShareShell({
  children,
  share,
}: {
  children: React.ReactNode
  share?: typeof shares.$inferSelect
}) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 md:py-16">
      {/* Brand Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <LockKeyhole className="size-4.5" />
          </span>
          <span>TeamVault 安全协作平台</span>
        </div>
        {share?.expiresAt ? (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3 text-muted-foreground" />
            有效至 {formatDate(share.expiresAt)}
          </span>
        ) : null}
      </div>

      {/* Main Delivery Card */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-sm">
        {children}
      </div>

      {/* Security Footer Note */}
      <footer className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-center text-[11px] text-muted-foreground px-2">
        <span className="inline-flex items-center justify-center gap-1">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          本页面受提取密码与端到端密钥保护
        </span>
        <span>由 TeamVault 安全提供服务</span>
      </footer>
    </main>
  )
}

function PasswordGate({ token, errorType }: { token: string; errorType?: string }) {
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-16">
      <div className="flex items-center justify-center gap-2 text-sm font-bold text-foreground">
        <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
          <LockKeyhole className="size-4.5" />
        </span>
        <span>TeamVault 外部安全协作</span>
      </div>

      <div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-sm text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary mb-4">
          <Lock className="size-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">请输入访问提取码</h1>
        <p className="mt-1.5 text-xs text-muted-foreground">该协作交付包受密码保护，验证成功后方可查看内容</p>

        <form action={`/s/${token}/verify`} method="post" className="mt-6 space-y-3.5 text-left">
          <div className="space-y-1.5">
            <input
              type="password"
              name="password"
              required
              autoFocus
              className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-center font-mono tracking-widest text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="输入 4 位提取码或访问密码"
            />
            {errorType === "rate" ? (
              <p className="text-xs text-destructive text-center font-medium pt-1">尝试次数过多，请 15 分钟后再试</p>
            ) : errorType === "password" ? (
              <p className="text-xs text-destructive text-center font-medium pt-1">提取密码错误，请重试</p>
            ) : null}
          </div>
          <button
            type="submit"
            className="h-10 w-full rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition duration-150"
          >
            验证并进入交付页面
          </button>
        </form>
      </div>
    </main>
  )
}

function FileActions({
  token,
  fileId,
  allowPreview,
  allowDownload,
  compact = false,
}: {
  token: string
  fileId: string
  allowPreview: boolean
  allowDownload: boolean
  compact?: boolean
}) {
  return (
    <div className={compact ? "flex items-center gap-1.5 shrink-0" : "mt-4 flex items-center gap-2"}>
      {allowPreview ? (
        <Link
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border/80 bg-card px-2.5 text-xs font-medium text-foreground hover:bg-accent/40 transition"
          href={`/s/${token}/files/${fileId}/preview`}
        >
          <Eye className="size-3.5 text-muted-foreground" />
          <span>预览</span>
        </Link>
      ) : null}
      {allowDownload ? (
        <Link
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 transition"
          href={`/s/${token}/files/${fileId}/download`}
        >
          <Download className="size-3.5" />
          <span>下载</span>
        </Link>
      ) : null}
    </div>
  )
}
