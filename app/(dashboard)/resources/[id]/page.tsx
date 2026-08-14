import { and, eq, inArray, isNull } from "drizzle-orm"
import {
  BookOpen,
  Boxes,
  Calendar,
  ChevronLeft,
  ExternalLink,
  FolderKanban,
  Globe2,
  Pencil,
  UserRound,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CredentialSection } from "@/components/credential/credential-section"
import { FileList } from "@/components/file/file-list"
import { FileUploader } from "@/components/file/file-uploader"
import { PermissionEditor } from "@/components/permission/permission-editor"
import { ResourceDeleteButton } from "@/components/resource/resource-delete-button"
import { ResourceDetailWorkspace, type ResourceDetailPanel } from "@/components/resource/resource-detail-workspace"
import { ResourceFavoriteButton } from "@/components/resource/resource-favorite-button"
import { ResourceLinkManager } from "@/components/resource/resource-link-manager"
import { ShareForm } from "@/components/share/share-form"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { getResourceActiveShares } from "@/lib/share/actions"
import { db } from "@/lib/db"
import {
  credentialPermissions,
  credentials,
  files,
  resourceFavorites,
  resourceLinks,
  resourcePermissions,
  resources,
  users,
} from "@/lib/db/schema"
import { canEditResource, canShareResource, canViewCredential, canViewFile, canViewResource } from "@/lib/permission"
import { cn } from "@/lib/utils"

const kindMeta = {
  PROJECT: { label: "项目", icon: FolderKanban, bgClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  TOOL: { label: "工具 / 系统", icon: Wrench, bgClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  KNOWLEDGE: { label: "知识 / 文档", icon: BookOpen, bgClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  WEBSITE: { label: "独立网站", icon: Globe2, bgClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
  PERSONAL: { label: "个人空间", icon: UserRound, bgClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  OTHER: { label: "共享模块", icon: Boxes, bgClass: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
} as const

const sensitivityLabels: Record<string, { label: string; color: string }> = {
  NORMAL: { label: "普通级别", color: "bg-muted text-muted-foreground" },
  INTERNAL: { label: "内部使用", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300" },
  CONFIDENTIAL: { label: "机密级别", color: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  SECRET: { label: "高度机密", color: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
}

const visibilityLabels: Record<string, string> = {
  TEAM: "团队可见",
  GROUP: "按授权可见",
  PRIVATE: "私有空间",
  PUBLIC: "全员公开",
}

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resource = await db.query.resources.findFirst({ where: and(eq(resources.id, id), isNull(resources.deletedAt)) })
  if (!resource || !(await canViewResource(id))) notFound()
  const isWebsite = resource.moduleKind === "WEBSITE"

  const [currentUser, mayViewFiles, mayEdit, mayShare] = await Promise.all([
    getCurrentUser(),
    canViewFile(id),
    canEditResource(id),
    canShareResource(id),
  ])
  const mayDelete = Boolean(currentUser?.isAdmin || currentUser?.id === resource.ownerId)
  const [allCredentials, resourceFiles, moduleLinks, owner] = await Promise.all([
    isWebsite ? [] : db.query.credentials.findMany({ where: eq(credentials.resourceId, id) }),
    !isWebsite && mayViewFiles ? db.query.files.findMany({ where: eq(files.resourceId, id) }) : [],
    isWebsite ? [] : db.query.resourceLinks.findMany({ where: eq(resourceLinks.resourceId, id) }),
    db.query.users.findFirst({ where: eq(users.id, resource.ownerId) }),
  ])
  const visibleCredentials = mayEdit
    ? allCredentials
    : (
        await Promise.all(
          allCredentials.map(async credential => ({ credential, allowed: await canViewCredential(credential.id) })),
        )
      )
        .filter(item => item.allowed)
        .map(item => item.credential)
  const credentialGrants = allCredentials.length
    ? await db.query.credentialPermissions.findMany({
        where: inArray(credentialPermissions.credentialId, allCredentials.map(credential => credential.id)),
      })
    : []
  const [workspaceUsers, workspaceGroups, grants] = mayEdit
    ? await Promise.all([
        db.query.users.findMany({ where: eq(users.status, "ACTIVE") }),
        db.query.groups.findMany(),
        db.query.resourcePermissions.findMany({ where: eq(resourcePermissions.resourceId, id) }),
      ])
    : [[], [], []]
  const favorite = currentUser
    ? await db.query.resourceFavorites.findFirst({
        where: and(eq(resourceFavorites.userId, currentUser.id), eq(resourceFavorites.resourceId, id)),
      })
    : null
  const subjects = [
    ...workspaceUsers
      .filter(user => user.id !== resource.ownerId)
      .map(user => ({ id: user.id, label: user.displayName, type: "USER" as const })),
    ...workspaceGroups.map(group => ({ id: group.id, label: group.name, type: "GROUP" as const })),
  ]
  const meta = kindMeta[resource.moduleKind] ?? kindMeta.OTHER
  const KindIcon = meta.icon
  const category = resource.category || meta.label
  const listHref = isWebsite ? "/websites" : "/resources"

  let tags: string[] = []
  try {
    tags = JSON.parse(resource.tags) as string[]
  } catch {
    tags = []
  }

  const panels: ResourceDetailPanel[] = []
  panels.push({
    id: "overview",
    label: isWebsite ? "网站直达" : "基本介绍",
    description: isWebsite ? undefined : "模块用途、说明与标签。",
    content: (
      <section className="rounded-xl border border-border/80 bg-card p-5 shadow-xs md:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 border-b pb-3.5">
          <h3 className="text-sm font-bold text-foreground">{isWebsite ? "网站地址与备注" : "模块介绍与说明"}</h3>
          {mayEdit ? (
            <Button asChild variant="outline" size="sm" className="h-8 gap-1 text-xs">
              <Link href={`/resources/${id}/edit`}>
                <Pencil className="size-3.5" />
                <span>编辑信息</span>
              </Link>
            </Button>
          ) : null}
        </div>

        {isWebsite && resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4.5 transition hover:border-primary/60 hover:bg-primary/10"
          >
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-primary">{resource.url}</p>
              {resource.description ? (
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{resource.description}</p>
              ) : null}
            </div>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ExternalLink className="size-4.5" />
            </span>
          </a>
        ) : resource.description ? (
          <p className="max-w-4xl whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {resource.description}
          </p>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/20 px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">暂未填写模块介绍说明。</p>
            {mayEdit ? (
              <Button asChild variant="outline" size="sm" className="mt-3.5 h-8 text-xs">
                <Link href={`/resources/${id}/edit`}>
                  <Pencil className="size-3.5 mr-1" /> 补充介绍
                </Link>
              </Button>
            ) : null}
          </div>
        )}

        {!isWebsite && tags.length ? (
          <div className="pt-3 flex flex-wrap items-center gap-1.5 border-t border-border/60">
            <span className="text-xs text-muted-foreground mr-1">标签:</span>
            {tags.map(tag => (
              <span
                key={tag}
                className="rounded-md border bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </section>
    ),
  })

  if (!isWebsite && (mayEdit || moduleLinks.length)) {
    panels.push({
      id: "links",
      label: "关联链接",
      count: moduleLinks.length,
      description: "网站、外部文档与相关入口。",
      content: <ResourceLinkManager resourceId={id} links={moduleLinks} mayEdit={mayEdit} />,
    })
  }

  if (!isWebsite && (mayEdit || visibleCredentials.length)) {
    panels.push({
      id: "credentials",
      label: "账号凭据",
      count: visibleCredentials.length,
      description: "按成员或小组控制账号与密钥的可见范围。",
      content: (
        <CredentialSection
          resourceId={id}
          credentials={visibleCredentials}
          subjects={subjects}
          accessGrants={credentialGrants.map(grant => ({
            credentialId: grant.credentialId,
            subjectType: grant.subjectType,
            subjectId: grant.subjectId,
          }))}
          mayEdit={mayEdit}
        />
      ),
    })
  }

  if (!isWebsite && (mayEdit || resourceFiles.length)) {
    panels.push({
      id: "files",
      label: "文件资料",
      count: resourceFiles.length,
      description: "图片直接展示缩略图，文档与其他文件按类型归类。",
      content: (
        <section className="rounded-xl border border-border/80 bg-card p-5 shadow-xs md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 border-b pb-3.5">
            <h3 className="text-sm font-bold text-foreground">文件资料库</h3>
            {mayEdit ? <FileUploader resourceId={id} /> : null}
          </div>
          <FileList files={resourceFiles} mayEdit={mayEdit} />
        </section>
      ),
    })
  }

  const activeShares = mayShare ? await getResourceActiveShares(id) : []

  if (mayEdit || mayShare) {
    panels.push({
      id: "access",
      label: "授权与分享",
      content: (
        <section className="rounded-xl border border-border/80 bg-card p-5 shadow-xs md:p-6">
          <div className="grid items-start gap-6 xl:grid-cols-2">
            {mayShare ? (
              <div className="rounded-xl border border-border/80 bg-background/60 p-5 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  外部协作交付包与分享
                </h3>
                <ShareForm
                  resourceId={id}
                  resourceName={resource.name}
                  files={resourceFiles.map(file => ({ id: file.id, name: file.originalName }))}
                  credentials={allCredentials.map(cred => ({
                    id: cred.id,
                    name: cred.name,
                    type: cred.type,
                    username: cred.username,
                  }))}
                  activeShares={activeShares}
                />
              </div>
            ) : null}
            {mayEdit ? (
              <div className={cn("rounded-xl border border-border/80 bg-background/60 p-5 space-y-3", mayShare ? "xl:col-span-2" : "")}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">成员与小组权限矩阵</h3>
                <PermissionEditor
                  resourceId={id}
                  subjects={subjects}
                  initial={grants.map(grant => ({
                    subjectType: grant.subjectType,
                    subjectId: grant.subjectId,
                    canView: grant.canView,
                    canViewSecret: grant.canViewSecret,
                    canViewFile: grant.canViewFile,
                    canDownload: grant.canDownload,
                    canEdit: grant.canEdit,
                    canShare: grant.canShare,
                  }))}
                />
              </div>
            ) : null}
          </div>
        </section>
      ),
    })
  }

  const sensitivity = sensitivityLabels[resource.sensitivity] ?? sensitivityLabels.NORMAL

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-8 md:py-6 space-y-4">
      {/* Top Bar Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground" asChild>
          <Link href={listHref}>
            <ChevronLeft className="size-4" />
            <span>返回{isWebsite ? "常用网站" : "共享模块"}</span>
          </Link>
        </Button>
        <div className="flex items-center gap-1.5">
          <ResourceFavoriteButton resourceId={id} resourceName={resource.name} initialFavorite={Boolean(favorite)} />
          {isWebsite && resource.url ? (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium" asChild>
              <a href={resource.url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" />
                <span>打开网站</span>
              </a>
            </Button>
          ) : null}
          {mayEdit ? (
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium" asChild>
              <Link href={`/resources/${id}/edit`}>
                <Pencil className="size-3.5" />
                <span>编辑{isWebsite ? "网站" : "模块"}</span>
              </Link>
            </Button>
          ) : null}
          {mayDelete ? (
            <ResourceDeleteButton
              resourceId={id}
              resourceName={resource.name}
              redirectTo={listHref}
              noun={isWebsite ? "网站" : "模块"}
            />
          ) : null}
        </div>
      </div>

      {/* Hero Header Banner */}
      <header className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-accent/20 p-5 md:p-6 shadow-xs">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <span
            className={cn(
              "grid size-12 shrink-0 place-items-center rounded-2xl border shadow-xs",
              meta.bgClass,
            )}
          >
            <KindIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md bg-muted px-2.5 py-0.5 font-semibold text-foreground">
                {category}
              </span>
              <span className={cn("rounded-md px-2 py-0.5 font-medium text-[11px]", sensitivity.color)}>
                {sensitivity.label}
              </span>
              <span className="rounded-md bg-muted/60 px-2 py-0.5 text-muted-foreground text-[11px]">
                {visibilityLabels[resource.visibility] ?? "团队可见"}
              </span>
            </div>
            <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {resource.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>创建者: {owner?.displayName ?? "未知"}</span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                更新于 {resource.updatedAt.toLocaleDateString("zh-CN")}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Workspace Tabs & Panels */}
      <ResourceDetailWorkspace panels={panels} />
    </div>
  )
}

