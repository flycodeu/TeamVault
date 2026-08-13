import { eq } from "drizzle-orm"
import { KeyRound } from "lucide-react"
import Link from "next/link"

import { db } from "@/lib/db"
import { credentials, resources } from "@/lib/db/schema"
import { canViewCredential } from "@/lib/permission"

export default async function CredentialsPage() {
  const rows = await db.select({ credential: credentials, resourceName: resources.name }).from(credentials).innerJoin(resources, eq(credentials.resourceId, resources.id))
  const visible = (await Promise.all(rows.map(async row => ({ ...row, allowed: await canViewCredential(row.credential.id) })))).filter(row => row.allowed)
  return <div className="mx-auto max-w-5xl px-4 py-8 md:px-8"><h1 className="text-2xl font-semibold">凭据</h1>{visible.length ? <div className="mt-7 grid gap-3 sm:grid-cols-2">{visible.map(({ credential, resourceName }) => <Link key={credential.id} href={`/resources/${credential.resourceId}`} className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:border-primary/50"><span className="grid size-9 place-items-center rounded-md bg-muted"><KeyRound className="size-4" /></span><div><p className="text-sm font-medium">{credential.name}</p><p className="text-xs text-muted-foreground">{resourceName} · {credential.type.replaceAll("_", " ")}</p></div></Link>)}</div> : null}</div>
}
