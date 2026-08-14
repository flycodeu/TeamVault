import { and, count, desc, eq, inArray } from "drizzle-orm"
import { ArrowRight, ShieldCheck, UserRoundPlus } from "lucide-react"
import Link from "next/link"

import { UserForm } from "@/components/admin/user-form"
import { UserStatusButton } from "@/components/admin/user-status-button"
import { Button } from "@/components/ui/button"
import { Pagination } from "@/components/ui/pagination"
import { requireAdminUser } from "@/lib/auth/guards"
import { db } from "@/lib/db"
import { groupMembers, groups, resourcePermissions, users } from "@/lib/db/schema"

const pageSize = 20

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const currentUser = await requireAdminUser()
  const query = await searchParams
  const requestedPage = Number.parseInt(query.page ?? "1", 10)
  const [[{ value: total }], [{ value: membershipTotal }]] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(groupMembers),
  ])
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages)
  const rows = await db.query.users.findMany({ orderBy: [desc(users.createdAt)], limit: pageSize, offset: (currentPage - 1) * pageSize })
  const pageUserIds = rows.map(user => user.id)
  const [memberships, directPermissions] = pageUserIds.length ? await Promise.all([
    db
      .select({ userId: groupMembers.userId, groupId: groups.id, groupName: groups.name })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(inArray(groupMembers.userId, pageUserIds)),
    db.query.resourcePermissions.findMany({ where: and(eq(resourcePermissions.subjectType, "USER"), inArray(resourcePermissions.subjectId, pageUserIds)) }),
  ]) : [[], []]

  const groupsByUser = new Map<string, typeof memberships>()
  for (const membership of memberships) {
    groupsByUser.set(membership.userId, [...(groupsByUser.get(membership.userId) ?? []), membership])
  }
  const resourceIdsByUser = new Map<string, Set<string>>()
  for (const permission of directPermissions) {
    const resourceIds = resourceIdsByUser.get(permission.subjectId) ?? new Set<string>()
    resourceIds.add(permission.resourceId)
    resourceIdsByUser.set(permission.subjectId, resourceIds)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 md:px-8 md:py-9">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">成员管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} 位成员 · {membershipTotal} 个小组关系</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/groups">小组与模块授权 <ArrowRight /></Link>
        </Button>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-lg border bg-card">
          <div className="hidden grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_120px_90px_72px] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground md:grid">
            <span>成员</span><span>所属小组</span><span>直接授权</span><span>状态</span><span />
          </div>
          {rows.map(user => {
            const userGroups = groupsByUser.get(user.id) ?? []
            const directResourceCount = resourceIdsByUser.get(user.id)?.size ?? 0
            return (
              <article key={user.id} className="grid gap-4 border-b px-4 py-4 last:border-b-0 md:grid-cols-[minmax(220px,1.2fr)_minmax(180px,1fr)_120px_90px_72px] md:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{user.displayName.slice(0, 2)}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{user.displayName}</p>
                      {user.isAdmin ? <ShieldCheck className="size-3.5 shrink-0 text-primary" aria-label="管理员" /> : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {userGroups.length ? userGroups.map(group => <span key={group.groupId} className="rounded bg-muted px-2 py-1 text-xs">{group.groupName}</span>) : <span className="text-xs text-muted-foreground">未加入小组</span>}
                </div>
                <p className="text-xs text-muted-foreground">{user.isAdmin ? "全部内容" : `${directResourceCount} 个直接授权`}</p>
                <span className={user.status === "ACTIVE" ? "w-fit rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300" : "w-fit rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"}>{user.status === "ACTIVE" ? "正常" : "已禁用"}</span>
                <UserStatusButton userId={user.id} active={user.status === "ACTIVE"} disabled={currentUser.id === user.id} />
              </article>
            )
          })}
        </section>

        <aside className="h-fit rounded-lg border bg-card p-5 xl:sticky xl:top-24">
          <div className="mb-5 flex items-center gap-2 text-sm font-semibold"><UserRoundPlus className="size-4" />新增成员</div>
          <UserForm />
        </aside>
      </div>
      <Pagination pathname="/users" currentPage={currentPage} pageSize={pageSize} total={total} />
    </div>
  )
}
