import { and, eq, inArray, isNull } from "drizzle-orm"
import { BookOpen, Boxes, ChevronLeft, FolderKanban, Pencil, Star, UserRound, Wrench } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CredentialSection } from "@/components/credential/credential-section"
import { FileList } from "@/components/file/file-list"
import { FileUploader } from "@/components/file/file-uploader"
import { PermissionEditor } from "@/components/permission/permission-editor"
import { ResourceDeleteButton } from "@/components/resource/resource-delete-button"
import { ResourceDetailWorkspace, type ResourceDetailPanel } from "@/components/resource/resource-detail-workspace"
import { ResourceLinkManager } from "@/components/resource/resource-link-manager"
import { ShareForm } from "@/components/share/share-form"
import { Button } from "@/components/ui/button"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { credentialPermissions, credentials, files, resourceLinks, resourcePermissions, resources, users } from "@/lib/db/schema"
import { canEditResource, canShareResource, canViewCredential, canViewFile, canViewResource } from "@/lib/permission"

const kindMeta = { PROJECT: { label: "项目", icon: FolderKanban }, TOOL: { label: "工具 / 系统", icon: Wrench }, KNOWLEDGE: { label: "知识 / 文档", icon: BookOpen }, PERSONAL: { label: "个人", icon: UserRound }, OTHER: { label: "其他", icon: Boxes } } as const

export default async function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resource = await db.query.resources.findFirst({ where: and(eq(resources.id, id), isNull(resources.deletedAt)) })
  if (!resource || !(await canViewResource(id))) notFound()

  const [currentUser, mayViewFiles, mayEdit, mayShare] = await Promise.all([getCurrentUser(), canViewFile(id), canEditResource(id), canShareResource(id)])
  const mayDelete = Boolean(currentUser?.isAdmin || currentUser?.id === resource.ownerId)
  const [allCredentials, resourceFiles, moduleLinks, owner] = await Promise.all([
    db.query.credentials.findMany({ where: eq(credentials.resourceId, id) }),
    mayViewFiles ? db.query.files.findMany({ where: eq(files.resourceId, id) }) : [],
    db.query.resourceLinks.findMany({ where: eq(resourceLinks.resourceId, id) }),
    db.query.users.findFirst({ where: eq(users.id, resource.ownerId) }),
  ])
  const visibleCredentials = mayEdit ? allCredentials : (await Promise.all(allCredentials.map(async credential => ({ credential, allowed: await canViewCredential(credential.id) })))).filter(item => item.allowed).map(item => item.credential)
  const credentialGrants = allCredentials.length ? await db.query.credentialPermissions.findMany({ where: inArray(credentialPermissions.credentialId, allCredentials.map(credential => credential.id)) }) : []
  const [workspaceUsers, workspaceGroups, grants] = mayEdit ? await Promise.all([db.query.users.findMany({ where: eq(users.status, "ACTIVE") }), db.query.groups.findMany(), db.query.resourcePermissions.findMany({ where: eq(resourcePermissions.resourceId, id) })]) : [[], [], []]
  const subjects = [...workspaceUsers.filter(user => user.id !== resource.ownerId).map(user => ({ id: user.id, label: user.displayName, type: "USER" as const })), ...workspaceGroups.map(group => ({ id: group.id, label: group.name, type: "GROUP" as const }))]
  const meta = kindMeta[resource.moduleKind]
  const KindIcon = meta.icon
  let tags: string[] = []
  try { tags = JSON.parse(resource.tags) as string[] } catch { tags = [] }

  const panels: ResourceDetailPanel[] = []
  panels.push({ id: "overview", label: "介绍", description: "模块用途、说明与标签。", content: <section className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] md:p-6"><div className="flex items-center justify-between gap-4"><h3 className="text-sm font-semibold">模块介绍</h3>{mayEdit ? <Button asChild variant="ghost" size="sm"><Link href={`/resources/${id}/edit`}><Pencil />编辑</Link></Button> : null}</div>{resource.description ? <p className="mt-4 max-w-4xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{resource.description}</p> : <div className="mt-4 rounded-lg border border-dashed bg-muted/25 px-5 py-8 text-center"><p className="text-sm text-muted-foreground">暂未填写模块介绍。</p>{mayEdit ? <Button asChild variant="outline" size="sm" className="mt-4"><Link href={`/resources/${id}/edit`}><Pencil />补充介绍</Link></Button> : null}</div>}{tags.length ? <div className="mt-5 flex flex-wrap gap-2">{tags.map(tag => <span key={tag} className="rounded-full border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">{tag}</span>)}</div> : null}</section> })
  if (mayEdit || moduleLinks.length) panels.push({ id: "links", label: "链接", count: moduleLinks.length, description: "网站、外部文档与相关入口。", content: <ResourceLinkManager resourceId={id} links={moduleLinks} mayEdit={mayEdit} /> })
  if (mayEdit || visibleCredentials.length) panels.push({ id: "credentials", label: "账号", count: visibleCredentials.length, description: "按成员或小组控制账号与密钥的可见范围。", content: <CredentialSection resourceId={id} credentials={visibleCredentials} subjects={subjects} accessGrants={credentialGrants.map(grant => ({ credentialId: grant.credentialId, subjectType: grant.subjectType, subjectId: grant.subjectId }))} mayEdit={mayEdit} /> })
  if (mayEdit || resourceFiles.length) panels.push({ id: "files", label: "文件", count: resourceFiles.length, description: "图片直接展示缩略图，文档与其他文件按类型归类。", content: <section className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] md:p-6"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold">模块文件</h3><p className="mt-1 text-xs text-muted-foreground">支持一次选择多个文件上传。</p></div>{mayEdit ? <FileUploader resourceId={id} /> : null}</div>{resourceFiles.length ? <div className="mt-5"><FileList files={resourceFiles} mayEdit={mayEdit} /></div> : <div className="mt-5 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">暂未上传文件。</div>}</section> })
  if (mayEdit || mayShare) panels.push({ id: "access", label: "访问", description: "管理外部分享以及成员、小组的模块权限。", content: <section className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] md:p-6"><div className="grid items-start gap-5 xl:grid-cols-2">{mayShare ? <div className="rounded-lg border bg-background p-4"><h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">外部分享</h3><ShareForm resourceId={id} files={resourceFiles.map(file => ({ id: file.id, name: file.originalName }))} /></div> : null}{mayEdit ? <div className={`rounded-lg border bg-background p-4 ${mayShare ? "xl:col-span-2" : ""}`}><h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">成员与小组权限</h3><PermissionEditor resourceId={id} subjects={subjects} initial={grants.map(grant => ({ subjectType: grant.subjectType, subjectId: grant.subjectId, canView: grant.canView, canViewSecret: grant.canViewSecret, canViewFile: grant.canViewFile, canDownload: grant.canDownload, canEdit: grant.canEdit, canShare: grant.canShare }))} /></div> : null}</div></section> })

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 md:px-8 md:py-9">
      <div className="flex items-center justify-between"><Button variant="ghost" size="sm" asChild><Link href="/resources"><ChevronLeft />模块</Link></Button>{mayEdit || mayDelete ? <div className="flex items-center gap-1">{mayDelete ? <ResourceDeleteButton resourceId={id} resourceName={resource.name} /> : null}{mayEdit ? <Button variant="outline" size="sm" asChild><Link href={`/resources/${id}/edit`}><Pencil />编辑模块</Link></Button> : null}</div> : null}</div>

      <header className="relative mt-6 overflow-hidden rounded-2xl border bg-card px-5 py-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] md:px-7 md:py-8"><div className="absolute inset-y-0 left-0 w-1.5 bg-primary" /><div className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-primary/8 blur-3xl" /><div className="relative flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(18,100,85,0.2)]"><KindIcon className="size-5" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="rounded-full bg-accent px-2.5 py-1 font-medium text-accent-foreground">{meta.label}</span><span>{owner?.displayName ?? "未知创建者"}</span>{resource.isFavorite ? <Star className="size-3.5 fill-primary text-primary" /> : null}</div><h1 className="mt-3 break-words text-3xl font-semibold tracking-tight md:text-4xl">{resource.name}</h1><p className="mt-3 text-sm text-muted-foreground">在一个模块中集中管理介绍、链接、账号、文件与访问权限。</p></div></div></header>

      <ResourceDetailWorkspace panels={panels} />
    </div>
  )
}
