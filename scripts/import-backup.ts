import fs from "node:fs/promises"
import path from "node:path"

import { inspectBackupArchive, restoreFromBackupArchive } from "../lib/system/backup"

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error("用法: npm run import <备份压缩包路径.zip>")
    console.error("例如: npm run import data/backups/teamvault-backup-2026-08-17.zip")
    process.exit(1)
  }

  const resolvedPath = path.resolve(filePath)
  console.log(`正在读取备份包: ${resolvedPath}`)

  const buffer = await fs.readFile(resolvedPath)
  console.log("正在解析备份包元数据...")

  const inspection = await inspectBackupArchive(buffer)
  if (!inspection.valid) {
    console.error("❌ 备份包校验失败:", inspection.error || "未知原因")
    process.exit(1)
  }

  console.log("------------------------------------------")
  console.log("📦 备份包元数据详情:")
  if (inspection.manifest) {
    console.log(`   - 导出时间: ${inspection.manifest.exportedAt}`)
    console.log(`   - 系统版本: v${inspection.manifest.appVersion}`)
    console.log(`   - 包含资源: ${inspection.manifest.stats.resourcesCount} 个`)
    console.log(`   - 包含文件: ${inspection.manifest.stats.filesCount} 个`)
    console.log(`   - 包含凭据: ${inspection.manifest.stats.credentialsCount} 条`)
    console.log(`   - 包含用户: ${inspection.manifest.stats.usersCount} 位`)
  }
  console.log("------------------------------------------")
  console.log("正在执行全量数据恢复（已自动对当前服务器数据生成应急本地快照）...")

  const result = await restoreFromBackupArchive(buffer, { backupCurrentFirst: true })
  if (!result.success) {
    console.error("❌ 恢复失败:", result.error)
    process.exit(1)
  }

  console.log("==========================================")
  console.log("✅ 全量备份数据恢复成功！")
  console.log(`📁 恢复文件数量: ${result.restoredFileCount} 个`)
  if (result.backupSnapshotPath) {
    console.log(`🛡️ 本次恢复前的本地应急快照已保存在: ${result.backupSnapshotPath}`)
  }
  console.log("==========================================")
}

main().catch(error => {
  console.error("❌ 恢复失败:", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
