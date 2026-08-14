import { and, eq, inArray, isNull } from "drizzle-orm"
import {
  ChevronLeft,
  Edit3,
  ExternalLink,
  Globe2,
  KeyRound,
  Lock,
  Shield,
  ShieldAlert,
  Users2,
} from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { ResourceDeleteButton } from "@/components/resource/resource-delete-button"
import { ResourceFavoriteButton } from "@/components/resource/resource-favorite-button"
import { Button } from "@/components/ui/button"
import { WebsiteCredentialItem } from "@/components/website/website-credential-item"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import {
  credentialPermissions,
  credentials,
  groups,
  resourceFavorites,
  resources,
  users,
} from "@/lib/db/schema"
import { canEditResource, canViewCredential, canViewResource } from "@/lib/permission"

const visibilityMeta: Record<
  "TEAM" | "GROUP" | "PRIVATE" | "PUBLIC",
  { label: string; icon: typeof Users2; color: string }
> = {
  TEAM: { label: "团队可见", icon: Users2, color: "text-blue-500 bg-blue-500/10" },
  GROUP: { label: "群组可见", icon: Shield, color: "text-amber-500 bg-amber-500/10" },
  PRIVATE: { label: "私有专属", icon: Lock, color: "text-purple-500 bg-purple-500/10" },
  PUBLIC: { label: "全员公开", icon: Globe2, color: "text-emerald-500 bg-emerald-500/10" },
}

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [currentUser, mayView, mayEdit] = await Promise.all([
    getCurrentUser(),
    canViewResource(id),
    canEditResource(id),
  ])

  if (!mayView) notFound()

  const website = await db.query.resources.findFirst({
    where: and(eq(resources.id, id), isNull(resources.deletedAt)),
  })

  if (!website) notFound()
  if (website.moduleKind !== "WEBSITE" && website.type !== "WEBSITE") {
    redirect(`/resources/${id}`)
  }

  // Fetch website owner info
  const owner = website.ownerId
    ? await db.query.users.findFirst({ where: eq(users.id, website.ownerId) })
    : null

  // Fetch website credentials
  const attachedCredentials = await db.query.credentials.findMany({
    where: eq(credentials.resourceId, website.id),
  })

  // Check visibility for each credential & load subjects if restricted
  const credPermsList = await Promise.all(
    attachedCredentials.map(async cred => {
      const allowed = currentUser?.isAdmin || (await canViewCredential(cred.id))
      if (!allowed) {
        return {
          ...cred,
          isPermitted: false,
          subjectLabels: [] as string[],
        }
      }

      let subjectLabels: string[] = []
      if (cred.accessMode === "RESTRICTED") {
        const perms = await db.query.credentialPermissions.findMany({
          where: eq(credentialPermissions.credentialId, cred.id),
        })
        const userIds = perms.filter(p => p.subjectType === "USER").map(p => p.subjectId)
        const groupIds = perms.filter(p => p.subjectType === "GROUP").map(p => p.subjectId)

        const [permUsers, permGroups] = await Promise.all([
          userIds.length
            ? db.query.users.findMany({ where: inArray(users.id, userIds) })
            : [],
          groupIds.length
            ? db.query.groups.findMany({ where: inArray(groups.id, groupIds) })
            : [],
        ])

        subjectLabels = [
          ...permGroups.map(g => `群组: ${g.name}`),
          ...permUsers.map(u => u.displayName),
        ]
      }

      return {
        ...cred,
        isPermitted: true,
        subjectLabels,
      }
    }),
  )

  // Check favorite status
  const isFavorite = currentUser
    ? Boolean(
        await db.query.resourceFavorites.findFirst({
          where: and(
            eq(resourceFavorites.userId, currentUser.id),
            eq(resourceFavorites.resourceId, website.id),
          ),
        }),
      )
    : false

  const vis = visibilityMeta[website.visibility] ?? visibilityMeta.TEAM
  const VisIcon = vis.icon
  const mayDelete = Boolean(
    currentUser?.isAdmin ||
    currentUser?.id === website.ownerId ||
    website.visibility === "TEAM" ||
    website.visibility === "PUBLIC",
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-6 space-y-6">
      {/* Top Breadcrumb & Header Controls */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-b border-border/60 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 -ml-2 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/websites">
              <ChevronLeft className="size-3.5" />
              <span>常用网站</span>
            </Link>
          </Button>
          <span>/</span>
          <span className="font-semibold text-foreground truncate max-w-60">
            {website.name}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {website.url ? (
            <Button asChild size="sm" className="h-8.5 gap-1.5 font-bold text-xs shadow-xs">
              <a
                href={website.url.startsWith("http") ? website.url : `https://${website.url}`}
                target="_blank"
                rel="noreferrer"
              >
                <span>直达访问</span>
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : null}

          {mayEdit ? (
            <Button asChild variant="outline" size="sm" className="h-8.5 gap-1.5 text-xs font-semibold">
              <Link href={`/websites/${website.id}/edit`}>
                <Edit3 className="size-3.5" />
                <span>编辑网站</span>
              </Link>
            </Button>
          ) : null}

          <ResourceFavoriteButton
            resourceId={website.id}
            resourceName={website.name}
            initialFavorite={isFavorite}
          />

          {mayDelete ? (
            <ResourceDeleteButton
              resourceId={website.id}
              resourceName={website.name}
              redirectTo="/websites"
              noun="网站"
            />
          ) : null}
        </div>
      </div>

      {/* Website Header Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shadow-xs">
            <Globe2 className="size-6" />
          </span>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                {website.name}
              </h1>
              {website.category ? (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {website.category}
                </span>
              ) : null}
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${vis.color}`}
              >
                <VisIcon className="size-3" />
                <span>{vis.label}</span>
              </span>
            </div>

            {website.url ? (
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground pt-0.5">
                <span className="truncate max-w-md">{website.url}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Grid: Details + Attached Credentials */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Website Overview & Credentials */}
        <div className="space-y-6 lg:col-span-8">
          {/* Section 1: Attached Login Credentials */}
          <section className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="size-4 text-amber-500" />
                <h2 className="text-xs font-bold text-foreground">
                  登录账号与密码凭据
                </h2>
                <span className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.2 text-[10px] font-bold">
                  {credPermsList.length}
                </span>
              </div>

              {mayEdit ? (
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs font-semibold text-primary">
                  <Link href={`/websites/${website.id}/edit`}>管理账号</Link>
                </Button>
              ) : null}
            </div>

            {credPermsList.length ? (
              <div className="space-y-3 pt-1">
                {credPermsList.map(cred => (
                  <WebsiteCredentialItem key={cred.id} credential={cred} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-center">
                <p className="text-xs text-muted-foreground">
                  该网站当前为“纯网址直达”，未绑定任何登录账号密码。成员点击即可直接跳转。
                </p>
                {mayEdit ? (
                  <Button asChild variant="outline" size="sm" className="mt-3 h-8 text-xs font-semibold">
                    <Link href={`/websites/${website.id}/edit`}>+ 绑定登录账号与密码</Link>
                  </Button>
                ) : null}
              </div>
            )}
          </section>

          {/* Section 2: Website Description & Meta */}
          {website.description ? (
            <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-2.5">
              <h2 className="text-xs font-bold text-foreground">网站说明与使用备注</h2>
              <div className="rounded-xl bg-muted/30 p-3.5 text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
                {website.description}
              </div>
            </section>
          ) : null}
        </div>

        {/* Right Column (4 cols): Meta & Quick Access */}
        <div className="space-y-5 lg:col-span-4">
          {/* Card 1: Website Meta Info */}
          <section className="rounded-2xl border border-border/80 bg-card p-4.5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-foreground border-b border-border/60 pb-2.5">
              网站基本属性
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>访问模式</span>
                <span className="font-semibold text-foreground">
                  {credPermsList.length ? "携带账号直达" : "公开链接直达"}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>所属业务分类</span>
                <span className="font-semibold text-foreground">
                  {website.category || "未分类"}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>创建人员</span>
                <span className="font-semibold text-foreground">
                  {owner?.displayName || "未知"}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>创建时间</span>
                <span className="font-mono text-[11px] text-foreground/80">
                  {new Date(website.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>最后更新</span>
                <span className="font-mono text-[11px] text-foreground/80">
                  {new Date(website.updatedAt).toLocaleDateString("zh-CN")}
                </span>
              </div>
            </div>
          </section>

          {/* Card 2: Security & Permissions Note */}
          <section className="rounded-2xl border border-border/80 bg-card p-4.5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-primary" />
              <h2 className="text-xs font-bold text-foreground">安全保密声明</h2>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              网站 URL 与系统名称对授权范围内成员可见。若绑定了受限凭据，密码受 AES-256-GCM 工业级加密保护，仅白名单授权人员或群组有权解密查看。
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
