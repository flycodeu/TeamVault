"use client"

import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  LayoutGrid,
  List,
  Lock,
  Plus,
  Shield,
  ShieldCheck,
  Upload,
  User,
  Users2,
} from "lucide-react"
import Link from "next/link"
import { useState, useTransition } from "react"

import { ResourceDeleteButton } from "@/components/resource/resource-delete-button"
import { ResourceFavoriteButton } from "@/components/resource/resource-favorite-button"
import { Button } from "@/components/ui/button"
import { revealCredential } from "@/lib/credential/actions"
import type { Resource } from "@/lib/db/schema"
import { cn, copyToClipboard } from "@/lib/utils"
import { WebsiteCard, type WebsiteWithCredentials } from "./website-card"
import { WebsiteImportDialog } from "./website-import-dialog"

const visibilityMeta: Record<Resource["visibility"], { label: string; icon: typeof Users2 }> = {
  TEAM: { label: "团队", icon: Users2 },
  GROUP: { label: "群组", icon: Shield },
  PRIVATE: { label: "私有", icon: Lock },
  PUBLIC: { label: "公开", icon: Globe2 },
}

export function WebsiteListView({
  websites,
  favoriteIds,
  currentUserId,
  isAdmin = false,
}: {
  websites: WebsiteWithCredentials[]
  favoriteIds: string[]
  currentUserId: string
  isAdmin?: boolean
}) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [importOpen, setImportOpen] = useState(false)
  const [copiedUser, setCopiedUser] = useState<string | null>(null)
  const [copiedPass, setCopiedPass] = useState<string | null>(null)
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  const favoriteSet = new Set(favoriteIds)

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
    <div className="space-y-4">
      {/* Action Row: View Switcher + Batch Import + Add Website */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-xl border border-border/80 bg-muted/30 p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="卡片网格视图"
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden sm:inline">卡片视图</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                viewMode === "table"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="紧凑表格视图（超低滚动）"
            >
              <List className="size-3.5" />
              <span className="hidden sm:inline">紧凑表格</span>
            </button>
          </div>
        </div>

        {/* Right Buttons: Batch Import & New Website */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImportOpen(true)}
            className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Upload className="size-3.5 text-teal-600 dark:text-teal-400" />
            <span>批量导入网站</span>
          </Button>

          <Button asChild size="sm" className="h-9 gap-1.5 text-xs font-semibold shadow-xs">
            <Link href="/websites/new">
              <Plus className="size-3.5" />
              <span>新增网站</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Grid Mode */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {websites.map(website => (
            <WebsiteCard
              key={website.id}
              website={website}
              mayDelete={Boolean(
                isAdmin ||
                currentUserId === website.ownerId ||
                website.visibility === "TEAM" ||
                website.visibility === "PUBLIC",
              )}
              isFavorite={favoriteSet.has(website.id)}
            />
          ))}
        </div>
      ) : (
        /* Dense Table View Mode (Zero Excessive Scrolling) */
        <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase border-b border-border/60">
                <tr>
                  <th className="p-3 w-8 text-center"></th>
                  <th className="p-3 min-w-44">网站系统名称 / 业务分类</th>
                  <th className="p-3 min-w-52">访问网址 (URL)</th>
                  <th className="p-3 min-w-64">携带账号与密码</th>
                  <th className="p-3 min-w-24">可见范围</th>
                  <th className="p-3 w-28 text-right pr-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-normal">
                {websites.map(website => {
                  const mayDelete = Boolean(
                    isAdmin ||
                    currentUserId === website.ownerId ||
                    website.visibility === "TEAM" ||
                    website.visibility === "PUBLIC",
                  )
                  const visibility = visibilityMeta[website.visibility] ?? visibilityMeta.TEAM
                  const VisIcon = visibility.icon

                  return (
                    <tr key={website.id} className="hover:bg-accent/20 transition duration-150">
                      {/* Favorite Button */}
                      <td className="p-3 text-center">
                        <ResourceFavoriteButton
                          resourceId={website.id}
                          resourceName={website.name}
                          initialFavorite={favoriteSet.has(website.id)}
                          compact
                        />
                      </td>

                      {/* Name & Category */}
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                            <Globe2 className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/websites/${website.id}`}
                              className="font-bold text-foreground hover:text-primary transition truncate block"
                            >
                              {website.name}
                            </Link>
                            {website.category ? (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                {website.category}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Direct URL */}
                      <td className="p-3">
                        {website.url ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-muted-foreground truncate max-w-44" title={website.url}>
                              {website.url}
                            </span>
                            <a
                              href={website.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition"
                            >
                              <span>直达</span>
                              <ExternalLink className="size-2.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/50 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Embedded Credentials */}
                      <td className="p-3">
                        {website.credentials.length ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {website.credentials.map(cred => {
                              const hasRevealed = Boolean(revealedSecrets[cred.id])
                              const isRestricted = cred.accessMode === "RESTRICTED"

                              return (
                                <div
                                  key={cred.id}
                                  className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 px-2 py-1 text-[11px] font-mono shadow-2xs"
                                >
                                  {isRestricted ? (
                                    <span title="白名单授权保护" className="text-blue-500">
                                      <ShieldCheck className="size-3" />
                                    </span>
                                  ) : (
                                    <User className="size-3 text-muted-foreground" />
                                  )}

                                  {cred.username ? (
                                    <span className="font-bold text-foreground max-w-24 truncate">
                                      {cred.username}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">{cred.name}</span>
                                  )}

                                  {/* Copy user */}
                                  {cred.username ? (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyUser(cred.username!, cred.id)}
                                      className="text-muted-foreground hover:text-foreground p-0.5"
                                      title="复制账号"
                                    >
                                      {copiedUser === cred.id ? (
                                        <Check className="size-3 text-emerald-500" />
                                      ) : (
                                        <Copy className="size-3" />
                                      )}
                                    </button>
                                  ) : null}

                                  {/* Copy pass */}
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPassword(cred.id)}
                                    className="text-primary hover:text-primary/80 p-0.5 ml-0.5"
                                    title="复制密码"
                                  >
                                    {copiedPass === cred.id ? (
                                      <Check className="size-3 text-emerald-500" />
                                    ) : (
                                      <KeyRound className="size-3" />
                                    )}
                                  </button>

                                  {/* Reveal pass */}
                                  <button
                                    type="button"
                                    onClick={() => toggleRevealPassword(cred.id)}
                                    className="text-muted-foreground hover:text-foreground p-0.5"
                                    title={hasRevealed ? "隐藏" : "查看密码"}
                                  >
                                    {hasRevealed ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 text-[11px]">无账号</span>
                        )}
                      </td>

                      {/* Visibility */}
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <VisIcon className="size-3" />
                          <span>{visibility.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right pr-4">
                        <div className="inline-flex items-center gap-1.5">
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            <Link href={`/websites/${website.id}`}>详情</Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                            <Link href={`/websites/${website.id}/edit`}>编辑</Link>
                          </Button>
                          {mayDelete ? (
                            <ResourceDeleteButton
                              resourceId={website.id}
                              resourceName={website.name}
                              compact
                              redirectTo="/websites"
                              noun="网站"
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batch Import Dialog */}
      <WebsiteImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
