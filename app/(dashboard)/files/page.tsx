import { desc, eq, inArray } from "drizzle-orm"
import { FileList } from "@/components/file/file-list"
import { db } from "@/lib/db"
import { files, resources } from "@/lib/db/schema"
import { listPermittedResourceIds } from "@/lib/permission"

export default async function FilesPage() {
  const permittedIds = await listPermittedResourceIds("VIEW_FILE")
  const rows = permittedIds.length ? await db.select({ file: files, resourceName: resources.name }).from(files).innerJoin(resources, eq(files.resourceId, resources.id)).where(inArray(files.resourceId, permittedIds)).orderBy(desc(files.createdAt)) : []
  return <div className="mx-auto max-w-5xl px-4 py-8 md:px-8"><h1 className="text-2xl font-semibold">文件</h1><div className="mt-7 space-y-6">{rows.length ? Object.entries(Object.groupBy(rows, row => row.resourceName)).map(([name, group]) => <section key={name}><h2 className="mb-3 text-sm font-semibold">{name}</h2><FileList files={(group ?? []).map(row => row.file)} /></section>) : null}</div></div>
}
