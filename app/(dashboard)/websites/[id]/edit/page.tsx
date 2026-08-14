import { and, eq, isNull } from "drizzle-orm"
import { ChevronLeft, Globe2 } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { WebsiteForm } from "@/components/website/website-form"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import {
  credentialPermissions,
  credentials,
  resources,
  users,
} from "@/lib/db/schema"
import { canEditResource } from "@/lib/permission"

export default async function EditWebsitePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [{ id }, currentUser] = await Promise.all([
    params,
    getCurrentUser(),
  ])

  const website = await db.query.resources.findFirst({
    where: and(eq(resources.id, id), isNull(resources.deletedAt)),
  })

  if (!website) notFound()
  if (website.moduleKind !== "WEBSITE" && website.type !== "WEBSITE") {
    redirect(`/resources/${id}/edit`)
  }

  const mayEdit = await canEditResource(id)
  if (!mayEdit) {
    redirect(`/websites/${id}`)
  }

  const mayDelete = Boolean(
    currentUser?.isAdmin ||
    currentUser?.id === website.ownerId ||
    website.visibility === "TEAM" ||
    website.visibility === "PUBLIC",
  )

  // Fetch all credentials attached to this website
  const attachedCredentials = await db.query.credentials.findMany({
    where: eq(credentials.resourceId, id),
  })

  const initialCredentials = await Promise.all(
    attachedCredentials.map(async cred => {
      const perms = await db.query.credentialPermissions.findMany({
        where: eq(credentialPermissions.credentialId, cred.id),
      })

      return {
        id: cred.id,
        name: cred.name,
        username: cred.username,
        description: cred.description,
        accessMode: cred.accessMode,
        subjects: perms.map(p => ({
          subjectType: p.subjectType,
          subjectId: p.subjectId,
        })),
      }
    }),
  )

  // Load active workspace users & groups
  const [workspaceUsers, workspaceGroups] = await Promise.all([
    db.query.users.findMany({ where: eq(users.status, "ACTIVE") }),
    db.query.groups.findMany(),
  ])

  const subjects = [
    ...workspaceUsers.map(user => ({
      id: user.id,
      label: `${user.displayName} (${user.username})`,
      type: "USER" as const,
    })),
    ...workspaceGroups.map(group => ({
      id: group.id,
      label: `群组: ${group.name}`,
      type: "GROUP" as const,
    })),
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-6 space-y-6">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1 -ml-2 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href={`/websites/${website.id}`}>
              <ChevronLeft className="size-3.5" />
              <span>返回网站详情</span>
            </Link>
          </Button>
          <span>/</span>
          <span className="font-semibold text-foreground">编辑网站资料</span>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <span className="grid size-9 place-items-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-xs">
            <Globe2 className="size-4.5" />
          </span>
          <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
            编辑网站 · {website.name}
          </h1>
        </div>
      </div>

      {/* Main Specialized Website Form Body in Edit Mode */}
      <WebsiteForm
        website={website}
        initialCredentials={initialCredentials}
        subjects={subjects}
        mayDelete={mayDelete}
      />
    </div>
  )
}
