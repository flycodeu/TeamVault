import { createHash, randomUUID } from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import Database from "better-sqlite3"
import JSZip from "jszip"

import { db, databasePath, sqlite } from "@/lib/db"
import {
  credentials,
  files,
  memos,
  resourceLinks,
  resources,
  users,
} from "@/lib/db/schema"
import { dataPath, previewsRoot, storageRoot, tempRoot, thumbnailsRoot } from "@/lib/paths"

export type SystemStats = {
  usersCount: number
  resourcesCount: number
  filesCount: number
  credentialsCount: number
  linksCount: number
  memosCount: number
  storageFileCount: number
  storageTotalBytes: number
}

export type BackupManifest = {
  manifestVersion: number
  format: "teamvault-backup"
  exportedAt: string
  appVersion: string
  stats: SystemStats
  database: {
    file: string
    sha256: string
    sizeBytes: number
  }
  directories: string[]
  encryptionNotice: string
}

export type BackupInspectionResult = {
  valid: boolean
  manifest: BackupManifest | null
  dbFound: boolean
  fileEntriesCount: number
  archiveSizeBytes: number
  error?: string
}

export type RestoreResult = {
  success: boolean
  manifest: BackupManifest | null
  backupSnapshotPath?: string
  restoredFileCount: number
  restoredAt: string
  error?: string
}

async function walkDirectory(dir: string): Promise<{ relativePath: string; absolutePath: string; size: number }[]> {
  const result: { relativePath: string; absolutePath: string; size: number }[] = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const sub = await walkDirectory(fullPath)
        result.push(...sub)
      } else if (entry.isFile()) {
        const stat = await fs.stat(fullPath)
        result.push({
          relativePath: path.relative(dataPath(), fullPath).replaceAll("\\", "/"),
          absolutePath: fullPath,
          size: stat.size,
        })
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Error reading directory", dir, error)
    }
  }
  return result
}

/**
 * 获取当前系统的资源统计信息（用于页面展示与备份清单生成）
 */
export async function getSystemStorageStats(): Promise<SystemStats> {
  const [allUsers, allResources, allFiles, allCredentials, allLinks, allMemos] = await Promise.all([
    db.select().from(users),
    db.select().from(resources),
    db.select().from(files),
    db.select().from(credentials),
    db.select().from(resourceLinks),
    db.select().from(memos),
  ])

  const diskFiles = await walkDirectory(storageRoot())
  const totalStorageBytes = diskFiles.reduce((acc, f) => acc + f.size, 0)

  return {
    usersCount: allUsers.length,
    resourcesCount: allResources.length,
    filesCount: allFiles.length,
    credentialsCount: allCredentials.length,
    linksCount: allLinks.length,
    memosCount: allMemos.length,
    storageFileCount: diskFiles.length,
    storageTotalBytes: totalStorageBytes,
  }
}

/**
 * 创建全量数据备份归档包 (.zip)
 */
export async function createFullBackupArchive(): Promise<{
  buffer: Buffer
  filename: string
  stats: SystemStats
  manifest: BackupManifest
}> {
  const tempDir = path.join(tempRoot(), `backup-${Date.now()}-${randomUUID()}`)
  await fs.mkdir(tempDir, { recursive: true })
  const snapshotDbPath = path.join(tempDir, "database.sqlite")

  try {
    // 1. 使用 SQLite 在线一致性备份生成独立数据库快照
    await sqlite.backup(snapshotDbPath)
    const dbBytes = await fs.readFile(snapshotDbPath)
    const dbSha256 = createHash("sha256").update(dbBytes).digest("hex")

    // 2. 统计当前系统指标
    const stats = await getSystemStorageStats()
    const exportedAt = new Date().toISOString()

    const manifest: BackupManifest = {
      manifestVersion: 1,
      format: "teamvault-backup",
      exportedAt,
      appVersion: "0.1.0",
      stats,
      database: {
        file: "database.sqlite",
        sha256: dbSha256,
        sizeBytes: dbBytes.length,
      },
      directories: ["files", "previews", "thumbnails"],
      encryptionNotice:
        "业务凭据使用 AES-256-GCM 加密。跨服务器迁移时，目标服务器的 .env 中必须配置与源服务器相同的 ENCRYPTION_KEY。",
    }

    // 3. 构建 JSZip 归档
    const zip = new JSZip()
    zip.file("manifest.json", JSON.stringify(manifest, null, 2))
    zip.file("database.sqlite", dbBytes)

    // 4. 添加物理文件到归档包
    const fileDirs = [
      { name: "files", root: storageRoot() },
      { name: "previews", root: previewsRoot() },
      { name: "thumbnails", root: thumbnailsRoot() },
    ]

    for (const { name, root } of fileDirs) {
      const items = await walkDirectory(root)
      for (const item of items) {
        try {
          const content = await fs.readFile(item.absolutePath)
          const relInDir = path.relative(root, item.absolutePath).replaceAll("\\", "/")
          zip.file(`${name}/${relInDir}`, content)
        } catch (err) {
          console.warn(`Failed to read file ${item.absolutePath} during backup:`, err)
        }
      }
    }

    // 5. 生成压缩后的 ZIP Buffer
    const buffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })

    const timestamp = exportedAt.slice(0, 19).replaceAll(":", "-").replace("T", "_")
    const filename = `teamvault-backup-${timestamp}.zip`

    return {
      buffer,
      filename,
      stats,
      manifest,
    }
  } finally {
    // 清理临时文件
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

/**
 * 预检并解析备份归档包中的元数据
 */
export async function inspectBackupArchive(buffer: Buffer): Promise<BackupInspectionResult> {
  try {
    const zip = await JSZip.loadAsync(buffer)
    let manifest: BackupManifest | null = null

    const manifestFile = zip.file("manifest.json")
    if (manifestFile) {
      const text = await manifestFile.async("string")
      manifest = JSON.parse(text) as BackupManifest
    }

    const dbFile = zip.file("database.sqlite") || zip.file("teamvault.db")
    const dbFound = Boolean(dbFile)

    let fileEntriesCount = 0
    zip.forEach((relativePath, entry) => {
      if (!entry.dir && relativePath.startsWith("files/")) {
        fileEntriesCount++
      }
    })

    if (!dbFound) {
      return {
        valid: false,
        manifest: null,
        dbFound: false,
        fileEntriesCount,
        archiveSizeBytes: buffer.length,
        error: "归档包中未找到有效的 SQLite 数据库文件 (database.sqlite)",
      }
    }

    return {
      valid: true,
      manifest,
      dbFound: true,
      fileEntriesCount: manifest?.stats?.storageFileCount ?? fileEntriesCount,
      archiveSizeBytes: buffer.length,
    }
  } catch (error) {
    return {
      valid: false,
      manifest: null,
      dbFound: false,
      fileEntriesCount: 0,
      archiveSizeBytes: buffer.length,
      error: error instanceof Error ? error.message : "无效的 ZIP 归档文件",
    }
  }
}

/**
 * 从归档包执行全量恢复与数据替换
 */
export async function restoreFromBackupArchive(
  buffer: Buffer,
  options: { backupCurrentFirst?: boolean } = { backupCurrentFirst: true },
): Promise<RestoreResult> {
  const tempExtractDir = path.join(tempRoot(), `restore-${Date.now()}-${randomUUID()}`)
  await fs.mkdir(tempExtractDir, { recursive: true })

  let backupSnapshotPath: string | undefined

  try {
    const zip = await JSZip.loadAsync(buffer)

    // 1. 读取并校验 manifest
    let manifest: BackupManifest | null = null
    const manifestFile = zip.file("manifest.json")
    if (manifestFile) {
      const manifestText = await manifestFile.async("string")
      manifest = JSON.parse(manifestText) as BackupManifest
    }

    const dbEntry = zip.file("database.sqlite") || zip.file("teamvault.db")
    if (!dbEntry) {
      throw new Error("备份包缺少有效的数据库文件 (database.sqlite)")
    }

    // 2. 自动创建当前数据的应急快照备份（防灾机制）
    if (options.backupCurrentFirst !== false) {
      const stamp = new Date().toISOString().replaceAll(":", "-").replace("T", "_").slice(0, 19)
      const snapshotDir = path.join(dataPath("backups"), `pre-restore-${stamp}`)
      await fs.mkdir(snapshotDir, { recursive: true })
      await sqlite.backup(path.join(snapshotDir, "teamvault.db"))
      try {
        await fs.cp(storageRoot(), path.join(snapshotDir, "files"), { recursive: true })
      } catch {}
      backupSnapshotPath = snapshotDir
    }

    // 3. 解压并验证数据库文件完整性
    const tempDbPath = path.join(tempExtractDir, "database.sqlite")
    const dbBuffer = await dbEntry.async("nodebuffer")
    await fs.writeFile(tempDbPath, dbBuffer)

    // 测试该数据库是否可以正常打开并读取
    const testDb = new Database(tempDbPath)
    try {
      const countCheck = testDb.prepare("SELECT count(*) as cnt FROM sqlite_master").get() as { cnt: number }
      if (typeof countCheck?.cnt !== "number") {
        throw new Error("数据库校验失败：无法查询 sqlite_master")
      }
    } finally {
      testDb.close()
    }

    // 4. 解压所有物理文件
    let restoredFileCount = 0
    const entries = Object.keys(zip.files)

    for (const filePath of entries) {
      const entry = zip.files[filePath]
      if (!entry || entry.dir) continue

      if (filePath.startsWith("files/") || filePath.startsWith("previews/") || filePath.startsWith("thumbnails/")) {
        const destPath = path.join(dataPath(), filePath)
        await fs.mkdir(path.dirname(destPath), { recursive: true })
        const fileData = await entry.async("nodebuffer")
        await fs.writeFile(destPath, fileData)
        if (filePath.startsWith("files/")) {
          restoredFileCount++
        }
      }
    }

    // 5. 替换生产数据库
    try {
      sqlite.pragma("wal_checkpoint(TRUNCATE)")
    } catch {}

    await fs.copyFile(tempDbPath, databasePath)

    // 清理可能存在的旧 WAL / SHM 临时缓存文件
    await fs.rm(`${databasePath}-wal`, { force: true }).catch(() => {})
    await fs.rm(`${databasePath}-shm`, { force: true }).catch(() => {})

    // 重新让 SQLite 激活 WAL 模式与外键约束
    sqlite.pragma("journal_mode = WAL")
    sqlite.pragma("foreign_keys = ON")
    sqlite.pragma("busy_timeout = 5000")

    return {
      success: true,
      manifest,
      backupSnapshotPath,
      restoredFileCount,
      restoredAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Restore from backup failed:", error)
    return {
      success: false,
      manifest: null,
      backupSnapshotPath,
      restoredFileCount: 0,
      restoredAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : "恢复过程发生未知错误",
    }
  } finally {
    await fs.rm(tempExtractDir, { recursive: true, force: true }).catch(() => {})
  }
}
