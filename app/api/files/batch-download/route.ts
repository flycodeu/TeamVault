import fs from "node:fs/promises"
import { inArray } from "drizzle-orm"
import JSZip from "jszip"
import { NextResponse } from "next/server"

import { writeAudit } from "@/lib/audit/log"
import { getCurrentUser } from "@/lib/auth/session"
import { db } from "@/lib/db"
import { files } from "@/lib/db/schema"
import { canDownloadFile } from "@/lib/permission"
import { safeStoragePath } from "@/lib/storage/files"

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 })
  }

  let fileIds: string[] = []
  try {
    const body = await request.json()
    fileIds = Array.isArray(body?.fileIds) ? body.fileIds : []
  } catch {
    return NextResponse.json({ success: false, error: "无效的请求参数" }, { status: 400 })
  }

  if (!fileIds.length) {
    return NextResponse.json({ success: false, error: "未选择任何文件" }, { status: 400 })
  }

  // Fetch file records from database
  const fileRecords = await db.query.files.findMany({
    where: inArray(files.id, fileIds),
  })

  if (!fileRecords.length) {
    return NextResponse.json({ success: false, error: "未找到选中的文件" }, { status: 404 })
  }

  const zip = new JSZip()
  const usedNames = new Map<string, number>()
  let addedCount = 0

  for (const file of fileRecords) {
    const allowed = await canDownloadFile(file.resourceId)
    if (!allowed && !user.isAdmin) {
      continue
    }

    try {
      const filePath = safeStoragePath(file.storagePath)
      const fileBuffer = await fs.readFile(filePath)

      // Handle duplicate file names in zip
      let fileName = file.originalName
      const count = usedNames.get(fileName) ?? 0
      if (count > 0) {
        const dotIndex = fileName.lastIndexOf(".")
        if (dotIndex > 0) {
          fileName = `${fileName.slice(0, dotIndex)} (${count})${fileName.slice(dotIndex)}`
        } else {
          fileName = `${fileName} (${count})`
        }
      }
      usedNames.set(file.originalName, count + 1)

      zip.file(fileName, fileBuffer)
      addedCount++

      // Record audit log for file download
      await writeAudit({
        userId: user.id,
        action: "FILE_DOWNLOAD",
        resourceId: file.resourceId,
        targetType: "FILE",
        targetId: file.id,
      })
    } catch (err) {
      console.error(`Failed to read file ${file.id} for zip archive:`, err)
    }
  }

  if (addedCount === 0) {
    return NextResponse.json({ success: false, error: "没有可下载的文件或权限不足" }, { status: 403 })
  }

  const zipUint8Array = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  })

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const zipFilename = `teamvault-export-${timestamp}.zip`

  return new Response(zipUint8Array.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipFilename}"; filename*=UTF-8''${encodeURIComponent(zipFilename)}`,
      "Content-Length": String(zipUint8Array.length),
    },
  })
}

