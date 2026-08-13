import { and, eq, inArray, isNull } from "drizzle-orm"
import { BookOpen, Boxes, ChevronLeft, FolderKanban, Pencil, Plus, Star, UserRound, Wrench } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { CredentialCard } from "@/components/credential/credential-card"
import { CredentialForm } from "@/components/credential/credential-form"
import { FileList } from "@/components/file/file-list"
import { FileUploader } from "@/components/file/file-uploader"
import { PermissionEditor } from "@/components/permission/permission-editor"
import { ResourceDeleteButton } from "@/components/resource/resource-delete-button"
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 md:px-8 md:py-9">
      <div className="flex items-center justify-between"><Button variant="ghost" size="sm" asChild><Link href="/resources"><ChevronLeft />模块</Link></Button>{mayEdit || mayDelete ? <div className="flex items-center gap-1">{mayDelete ? <ResourceDeleteButton resourceId={id} resourceName={resource.name} /> : null}{mayEdit ? <Button variant="outline" size="sm" asChild><Link href={`/resources/${id}/edit`}><Pencil />编辑</Link></Button> : null}</div> : null}</div>
      <header className="mt-6 border-b pb-7"><div className="flex items-center gap-2 text-xs text-muted-foreground"><KindIcon className="size-3.5" /><span>{meta.label}</span><span>·</span><span>{owner?.displayName ?? "未知创建者"}</span>{resource.isFavorite ? <Star className="size-3.5 fill-primary text-primary" /> : null}</div><h1 className="mt-3 text-3xl font-semibold">{resource.name}</h1>{resource.description ? <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{resource.description}</p> : null}</header>
      <div className="space-y-9 py-8">
        <ResourceLinkManager resourceId={id} links={moduleLinks} mayEdit={mayEdit} />
        {(mayEdit || visibleCredentials.length) ? <section><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">账号与密钥</h2>{visibleCredentials.length ? <span className="text-xs text-muted-foreground">{visibleCredentials.length} 项</span> : null}</div>{visibleCredentials.length ? <div className="mt-3 grid gap-3 lg:grid-cols-2">{visibleCredentials.map(credential => <CredentialCard key={credential.id} credential={credential} mayEdit={mayEdit} subjects={subjects} accessGrants={credentialGrants.filter(grant => grant.credentialId === credential.id).map(grant => ({ subjectType: grant.subjectType, subjectId: grant.subjectId }))} />)}</div> : null}{mayEdit ? <details className="mt-3 rounded-lg border border-dashed bg-card"><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium"><Plus className="size-4" />添加账号或密钥</summary><div className="border-t p-4"><CredentialForm resourceId={id} subjects={subjects} /></div></details> : null}</section> : null}
        {(mayEdit || resourceFiles.length) ? <section><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">文件</h2>{mayEdit ? <FileUploader resourceId={id} /> : null}</div>{resourceFiles.length ? <div className="mt-3"><FileList files={resourceFiles} /></div> : null}</section> : null}
        {tags.length ? <section><div className="flex flex-wrap gap-2">{tags.map(tag => <span key={tag} className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{tag}</span>)}</div></section> : null}
        {mayShare ? <details className="rounded-lg border bg-card"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">外部分享</summary><div className="border-t p-4"><ShareForm resourceId={id} files={resourceFiles.map(file => ({ id: file.id, name: file.originalName }))} /></div></details> : null}
        {mayEdit ? <details className="rounded-lg border bg-card"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold">模块访问权限</summary><div className="border-t p-4"><PermissionEditor resourceId={id} subjects={subjects} initial={grants.map(grant => ({ subjectType: grant.subjectType, subjectId: grant.subjectId, canView: grant.canView, canViewSecret: grant.canViewSecret, canViewFile: grant.canViewFile, canDownload: grant.canDownload, canEdit: grant.canEdit, canShare: grant.canShare }))} /></div></details> : null}
      </div>
    </div>
  )
}
