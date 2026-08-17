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
import Markdown from "react-markdown"

import { EnvironmentCredentialSection } from "@/components/resource/environment-credential-section"
import { FileList } from "@/components/file/file-list"
import { FileUploader } from "@/components/file/file-uploader"
import { PermissionEditor } from "@/components/permission/permission-editor"
import { ResourceDeleteButton } from "@/components/resource/resource-delete-button"
import { ResourceDetailWorkspace, type ResourceDetailPanel } from "@/components/resource/resource-detail-workspace"
import { ResourceFavoriteButton } from "@/components/resource/resource-favorite-button"
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
  resourceLinkPermissions,
  resourceLinks,
  resourcePermissions,
  resources,
  users,
} from "@/lib/db/schema"
import {
  canEditResource,
  canShareResource,
  canViewCredential,
  canViewFile,
  canViewResource,
  canViewResourceLink,
} from "@/lib/permission"
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
  const isWebsite = resource.moduleKind === "WEBSITE" || resource.type === "WEBSITE"

  const [currentUser, mayViewFiles, mayEdit, mayShare] = await Promise.all([
    getCurrentUser(),
    canViewFile(id),
    canEditResource(id),
    canShareResource(id),
  ])
  const mayDelete = Boolean(currentUser?.isAdmin || currentUser?.id === resource.ownerId)
  const [allCredentials, resourceFiles, allLinks, owner] = await Promise.all([
    db.query.credentials.findMany({ where: eq(credentials.resourceId, id) }),
    mayViewFiles ? db.query.files.findMany({ where: eq(files.resourceId, id) }) : [],
    db.query.resourceLinks.findMany({ where: eq(resourceLinks.resourceId, id) }),
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

  const moduleLinks = mayEdit
    ? allLinks
    : (
        await Promise.all(
          allLinks.map(async link => ({ link, allowed: await canViewResourceLink(link.id) })),
        )
      )
        .filter(item => item.allowed)
        .map(item => item.link)
  const credentialGrants = allCredentials.length
    ? await db.query.credentialPermissions.findMany({
        where: inArray(credentialPermissions.credentialId, allCredentials.map(credential => credential.id)),
      })
    : []
  const linkGrants = allLinks.length
    ? await db.query.resourceLinkPermissions.findMany({
        where: inArray(resourceLinkPermissions.linkId, allLinks.map(link => link.id)),
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
      .map(user => ({ id: user.id, label: `${user.displayName} (${user.username})`, type: "USER" as const })),
    ...workspaceGroups.map(group => ({ id: group.id, label: `群组: ${group.name}`, type: "GROUP" as const })),
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

  const panels: ResourceDetailPanel[] = [
    {
      id: "overview",
      label: "概览信息",
      description: "基本信息、所属分类与敏感等级。",
      content: (
        <section className="rounded-xl border border-border/80 bg-card p-5 shadow-xs md:p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 border-b pb-3.5">
            <h3 className="text-sm font-bold text-foreground">基础资料</h3>
            {mayEdit ? (
              <Button asChild variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <Link href={`/resources/${id}/edit`}>
                  <Pencil className="size-3.5" />
                  <span>编辑信息</span>
                </Link>
              </Button>
            ) : null}
          </div>
          {resource.description ? (
            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-xs text-muted-foreground leading-relaxed break-words">
              <Markdown>{resource.description}</Markdown>
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
              暂无描述
            </p>
          )}
          {isWebsite && resource.url ? (
            <div className="rounded-xl border border-border/80 bg-accent/20 p-3.5 flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <p className="text-[11px] font-semibold text-muted-foreground">独立访问站点 (URL)</p>
                <p className="text-xs font-mono font-medium text-foreground truncate mt-0.5">{resource.url}</p>
              </div>
              <Button asChild size="sm" className="h-8 text-xs font-medium shrink-0">
                <a href={resource.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-3.5 mr-1" /> 直达访问
                </a>
              </Button>
            </div>
          ) : null}
          {tags.length ? (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="rounded-lg bg-accent/60 px-2 py-0.5 text-xs font-medium text-accent-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </section>
      ),
    },
  ]

  if (mayEdit || visibleCredentials.length || moduleLinks.length) {
    panels.push({
      id: "environments",
      label: isWebsite ? "环境拓扑与关联账号" : "环境与凭据",
      count: moduleLinks.length + visibleCredentials.length,
      description: "配置关联的环境/链接地址，并给每个环境绑定专属账号或密钥。",
      content: (
        <EnvironmentCredentialSection
          resourceId={id}
          links={moduleLinks}
          credentials={visibleCredentials}
          subjects={subjects}
          accessGrants={credentialGrants.map(grant => ({
            credentialId: grant.credentialId,
            subjectType: grant.subjectType as "USER" | "GROUP",
            subjectId: grant.subjectId,
          }))}
          linkAccessGrants={linkGrants.map(grant => ({
            linkId: grant.linkId,
            subjectType: grant.subjectType as "USER" | "GROUP",
            subjectId: grant.subjectId,
          }))}
          mayEdit={mayEdit}
        />
      ),
    })
  }

  if (mayEdit || resourceFiles.length) {
    panels.push({
      id: "files",
      label: isWebsite ? "配套手册/文档" : "文件资料",
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

  if (mayEdit) {
    panels.push({
      id: "permissions",
      label: "成员授权",
      content: (
        <section className="rounded-xl border border-border/80 bg-card p-5 shadow-xs md:p-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold tracking-wider text-foreground flex items-center gap-2">
              <UserRound className="size-4 text-primary" />
              成员与小组权限矩阵
            </h3>
            <p className="text-xs text-muted-foreground">
              为团队内的成员或群组精细划分操作权限。拥有「修改编辑」等高级权限的人员将自动获得查阅权限。
            </p>
            <div className="rounded-xl border border-border/80 bg-background/60 p-1">
              <PermissionEditor
                resourceId={id}
                visibility={resource.visibility}
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
          </div>
        </section>
      ),
    })
  }

  if (mayShare) {
    panels.push({
      id: "shares",
      label: "对外分享",
      content: (
        <section className="rounded-xl border border-border/80 bg-card p-5 shadow-xs md:p-6">
          <div className="space-y-4 w-full">
            <h3 className="text-sm font-bold tracking-wider text-foreground flex items-center gap-2">
              <ExternalLink className="size-4 text-primary" />
              外部协作交付包与分享
            </h3>
            <div className="rounded-xl border border-border/80 bg-background/60 p-5 space-y-3">
              <ShareForm
                resourceId={id}
                resourceName={resource.name}
                files={resourceFiles.map(file => ({ id: file.id, name: file.originalName }))}
                credentials={visibleCredentials.map(cred => ({
                  id: cred.id,
                  name: cred.name,
                  type: cred.type,
                  username: cred.username,
                }))}
                activeShares={activeShares}
              />
            </div>
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

