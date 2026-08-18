"use client"

import {
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Lock,
  Share2,
  Shield,
  ShieldCheck,
  User,
  Users2,
} from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { ResourceDeleteButton } from "@/components/resource/resource-delete-button"
import { ResourceFavoriteButton } from "@/components/resource/resource-favorite-button"
import { QuickShareDialog } from "@/components/share/quick-share-dialog"
import { Button } from "@/components/ui/button"
import { revealCredential } from "@/lib/credential/actions"
import type { Credential, Resource } from "@/lib/db/schema"
import { copyToClipboard } from "@/lib/utils"

export type WebsiteWithCredentials = Resource & {
  credentials: (Credential & {
    restrictedSubjectsCount?: number
  })[]
}

const visibilityMeta: Record<Resource["visibility"], { label: string; icon: typeof Users2 }> = {
  TEAM: { label: "团队", icon: Users2 },
  GROUP: { label: "群组", icon: Shield },
  PRIVATE: { label: "私有", icon: Lock },
  PUBLIC: { label: "公开", icon: Globe2 },
}

export function WebsiteCard({
  website,
  mayDelete = false,
  isFavorite = false,
}: {
  website: WebsiteWithCredentials
  mayDelete?: boolean
  isFavorite?: boolean
}) {
  const [copiedUser, setCopiedUser] = useState<string | null>(null)
  const [copiedPass, setCopiedPass] = useState<string | null>(null)
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({})
  const [showShareModal, setShowShareModal] = useState(false)
  const [, startTransition] = useTransition()

  const visibility = visibilityMeta[website.visibility] ?? visibilityMeta.TEAM
  const VisIcon = visibility.icon

  async function handleCopyUser(username: string, credId: string) {
    if (!username) return
    const ok = await copyToClipboard(username)
    if (ok) {
      setCopiedUser(credId)
      setTimeout(() => setCopiedUser(null), 1500)
    }
  }

  async function handleCopyPassword(credId: string) {
    startTransition(async () => {
      let secret = revealedSecrets[credId]
      if (!secret) {
        const res = await revealCredential(credId, true)
        if (res.success && res.data.secret) {
          secret = res.data.secret
          setRevealedSecrets(prev => ({ ...prev, [credId]: secret }))
        }
      }
      if (secret) {
        const ok = await copyToClipboard(secret)
        if (ok) {
          setCopiedPass(credId)
          setTimeout(() => setCopiedPass(null), 1500)
        }
      }
    })
  }

  async function toggleRevealPassword(credId: string) {
    if (revealedSecrets[credId]) {
      setRevealedSecrets(prev => {
        const next = { ...prev }
        delete next[credId]
        return next
      })
      return
    }

    startTransition(async () => {
      const res = await revealCredential(credId, false)
      if (res.success && res.data.secret) {
        setRevealedSecrets(prev => ({ ...prev, [credId]: res.data.secret }))
      }
    })
  }

  return (
    <article className="h-full group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4.5 md:p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5">
      {/* Top Bar Actions: Favorite, Share, Edit, Delete */}
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
        <ResourceFavoriteButton
          resourceId={website.id}
          resourceName={website.name}
          initialFavorite={isFavorite}
          compact
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowShareModal(true)}
          className="size-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
          title="对外分享协作包"
        >
          <Share2 className="size-3.5" />
        </Button>
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-foreground hover:bg-accent/40 rounded-lg"
          title="编辑网站"
        >
          <Link href={`/websites/${website.id}/edit`}>
            <Edit3 className="size-3.5" />
          </Link>
        </Button>
        {mayDelete ? (
          <ResourceDeleteButton
            resourceId={website.id}
            resourceName={website.name}
            compact
            redirectTo="/resources?kind=WEBSITE"
            noun="网站"
          />
        ) : null}
      </div>

      <QuickShareDialog
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        resourceId={website.id}
        resourceName={website.name}
        resourceUrl={website.url}
        initialCredentials={website.credentials.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          username: c.username,
          linkId: c.linkId,
        }))}
      />

      <div className="pr-20">
        {/* Header Icon + Title */}
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200/50 dark:border-teal-900/40 shadow-xs transition group-hover:scale-105">
            <Globe2 className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {website.category ? (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {website.category}
                </span>
              ) : null}
              <span className="flex items-center gap-1 rounded-md bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                <VisIcon className="size-2.5" />
                {visibility.label}
              </span>
            </div>

            <Link href={`/websites/${website.id}`} className="block mt-1">
              <h3 className="truncate text-base font-bold text-foreground group-hover:text-primary transition-colors">
                {website.name}
              </h3>
            </Link>
          </div>
        </div>

        {/* Website Direct URL */}
        {website.url ? (
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-border/70 bg-accent/20 px-3 py-1.5 text-xs transition hover:border-primary/40 hover:bg-accent/30">
            <span className="font-mono text-[11px] text-muted-foreground truncate flex-1 min-w-0 pr-2" title={website.url}>
              {website.url}
            </span>
            <a
              href={website.url.startsWith("http") ? website.url : `https://${website.url}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline shrink-0 ml-2"
              title="在新标签页打开"
            >
              <span>直达</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        ) : null}

        {/* Description */}
        {website.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {website.description}
          </p>
        ) : null}
      </div>

      {/* Embedded Associated Credentials */}
      <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground">
            <KeyRound className="size-3 text-amber-500" />
            <span>携带账号密码</span>
            <span className="text-muted-foreground font-normal">
              ({website.credentials.length})
            </span>
          </span>

          <div className="flex items-center gap-2">
            <Link
              href={`/websites/${website.id}/edit`}
              className="text-[11px] text-muted-foreground hover:text-foreground font-semibold flex items-center gap-0.5"
            >
              <Edit3 className="size-3" />
              <span>编辑</span>
            </Link>
            <Link
              href={`/websites/${website.id}`}
              className="text-[11px] text-primary hover:underline font-semibold"
            >
              详情 →
            </Link>
          </div>
        </div>

        {website.credentials.length ? (
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5">
            {website.credentials.map(cred => {
              const hasRevealed = Boolean(revealedSecrets[cred.id])
              const isRestricted = cred.accessMode === "RESTRICTED"

              return (
                <div
                  key={cred.id}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-background/60 px-2.5 py-1.5 text-xs font-mono shadow-2xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isRestricted ? (
                      <span title="白名单授权保护" className="text-blue-500 shrink-0">
                        <ShieldCheck className="size-3.5" />
                      </span>
                    ) : (
                      <User className="size-3.5 text-muted-foreground shrink-0" />
                    )}

                    <div className="min-w-0">
                      {cred.username ? (
                        <div className="flex items-center gap-1">
                          {cred.name && !cred.name.includes("登录凭据") ? (
                            <span className="text-[10px] bg-muted/80 text-muted-foreground px-1 py-0.2 rounded font-sans font-medium shrink-0 max-w-18 truncate" title={cred.name}>
                              {cred.name}
                            </span>
                          ) : null}
                          <span className="font-bold text-foreground truncate max-w-24">
                            {cred.username}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyUser(cred.username!, cred.id)}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                            title="复制用户名"
                          >
                            {copiedUser === cred.id ? (
                              <Check className="size-3 text-emerald-500" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground truncate max-w-28">
                          {cred.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {hasRevealed ? revealedSecrets[cred.id] : "••••••"}
                    </span>

                    {/* Copy Password Button */}
                    <button
                      type="button"
                      onClick={() => handleCopyPassword(cred.id)}
                      className="rounded p-1 text-primary hover:bg-primary/10 transition"
                      title="复制密码"
                    >
                      {copiedPass === cred.id ? (
                        <Check className="size-3 text-emerald-500" />
                      ) : (
                        <KeyRound className="size-3" />
                      )}
                    </button>

                    {/* Reveal Password Button */}
                    <button
                      type="button"
                      onClick={() => toggleRevealPassword(cred.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-accent/40 hover:text-foreground transition"
                      title={hasRevealed ? "隐藏密码" : "查看密码"}
                    >
                      {hasRevealed ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-2 text-center text-[11px] text-muted-foreground/70">
            暂未绑定独立账号密码 ·{" "}
            <Link
              href={`/websites/${website.id}/edit`}
              className="text-primary hover:underline font-semibold"
            >
              去添加
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}
