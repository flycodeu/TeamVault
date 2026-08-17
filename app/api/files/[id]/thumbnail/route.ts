import fs from "node:fs/promises"
import path from "node:path"
import { eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import sharp from "sharp"

import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { isImageFile } from "@/lib/file/kinds"
import { thumbnailsRoot } from "@/lib/paths"
import { canViewFile } from "@/lib/permission"
import { safeStoragePath } from "@/lib/storage/files"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return NextResponse.json({ success: false, error: "未登录" }, { status: 401 })
  const { id } = await params
  const file = await db.query.files.findFirst({ where: eq(files.id, id) })
  if (!file || !(await canViewFile(file.resourceId)) || !isImageFile(file)) return NextResponse.json({ success: false, error: "无可用缩略图" }, { status: 404 })
  const thumbnailRoot = thumbnailsRoot()
  const target = path.join(thumbnailRoot, `${file.id}.webp`)
  try { await fs.access(target) } catch { await fs.mkdir(thumbnailRoot, { recursive: true }); await sharp(safeStoragePath(file.storagePath)).resize({ width: 640, height: 420, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toFile(target) }
  return new Response(await fs.readFile(target), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400" } })
}
