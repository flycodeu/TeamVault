import { and, eq, isNull } from "drizzle-orm"
import { FolderLock, Plus, UsersRound } from "lucide-react"
import Link from "next/link"

import { GroupForm } from "@/components/admin/group-form"
import { GroupResourceEditor } from "@/components/admin/group-resource-editor"
import { MemberEditor } from "@/components/admin/member-editor"
import { requireAdminUser } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { groupMembers, resourcePermissions, resources, users } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ group?: string }> }) {
  await requireAdminUser()
  const query = await searchParams
  const [groupRows, allUsers, resourceRows, memberships, grants] = await Promise.all([
    db.query.groups.findMany(),
    db.query.users.findMany({ where: eq(users.status, "ACTIVE") }),
    db.query.resources.findMany({ where: and(eq(resources.status, "ACTIVE"), isNull(resources.deletedAt)) }),
    db
      .select({ groupId: groupMembers.groupId, userId: groupMembers.userId, displayName: users.displayName, username: users.username })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id)),
    db.query.resourcePermissions.findMany({ where: eq(resourcePermissions.subjectType, "GROUP") }),
  ])
  const selectedGroup = groupRows.find(group => group.id === query.group) ?? groupRows[0]
  const selectedMembers = selectedGroup ? memberships.filter(member => member.groupId === selectedGroup.id) : []
  const selectedGrants = selectedGroup ? grants.filter(grant => grant.subjectId === selectedGroup.id) : []

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 md:px-8 md:py-9">
      <div>
        <h1 className="text-2xl font-semibold">小组与内容授权</h1>
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-4 py-3 text-xs font-medium text-muted-foreground">小组</div>
          <nav className="p-2" aria-label="小组列表">
            {groupRows.map(group => {
              const memberCount = memberships.filter(member => member.groupId === group.id).length
              const resourceCount = grants.filter(grant => grant.subjectId === group.id).length
              const selected = group.id === selectedGroup?.id
              return (
                <Link key={group.id} href={`/groups?group=${group.id}`} className={cn("block rounded-md px-3 py-3 transition-colors", selected ? "bg-accent text-accent-foreground" : "hover:bg-muted")}>
                  <p className="truncate text-sm font-medium">{group.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{memberCount} 位成员 · {resourceCount} 项内容</p>
                </Link>
              )
            })}
            {!groupRows.length ? <p className="px-3 py-6 text-center text-xs text-muted-foreground">还没有小组</p> : null}
          </nav>
          <details className="border-t p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted"><Plus className="size-4" />新建小组</summary>
            <div className="px-2 pb-2 pt-4"><GroupForm /></div>
          </details>
        </aside>

        {selectedGroup ? (
          <section className="min-w-0 overflow-hidden rounded-lg border bg-card">
            <header className="flex flex-col justify-between gap-4 border-b px-5 py-5 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-lg font-semibold">{selectedGroup.name}</h2>
                {selectedGroup.description ? <p className="mt-1 text-sm text-muted-foreground">{selectedGroup.description}</p> : null}
              </div>
              <div className="flex gap-2 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-1">{selectedMembers.length} 位成员</span>
                <span className="rounded-full bg-muted px-2.5 py-1">{selectedGrants.length} 项内容</span>
              </div>
            </header>
            <div className="grid divide-y xl:grid-cols-2 xl:divide-x xl:divide-y-0">
              <div className="p-5">
                <div className="mb-4 flex items-center gap-2"><UsersRound className="size-4 text-primary" /><h3 className="text-sm font-semibold">成员</h3></div>
                <MemberEditor groupId={selectedGroup.id} members={selectedMembers} users={allUsers} />
              </div>
              <div className="p-5">
                <div className="mb-4 flex items-center gap-2"><FolderLock className="size-4 text-primary" /><h3 className="text-sm font-semibold">内容权限</h3></div>
                <GroupResourceEditor groupId={selectedGroup.id} resources={resourceRows.map(resource => ({ id: resource.id, name: resource.name, type: resource.category || resource.moduleKind }))} grants={selectedGrants.map(grant => ({ resourceId: grant.resourceId, canViewSecret: grant.canViewSecret, canViewFile: grant.canViewFile, canDownload: grant.canDownload, canEdit: grant.canEdit, canShare: grant.canShare }))} />
              </div>
            </div>
          </section>
        ) : (
          <section className="grid min-h-80 place-items-center rounded-lg border border-dashed bg-card text-center">
            <div><FolderLock className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">创建小组后即可授权内容</p></div>
          </section>
        )}
      </div>
    </div>
  )
}
