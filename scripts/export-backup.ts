import fs from "node:fs/promises"
import path from "node:path"

import { dataPath } from "../lib/paths"
import { createFullBackupArchive } from "../lib/system/backup"

async function main() {
  const customTarget = process.argv[2]
  console.log("正在创建 TeamVault 全量数据备份包...")

  const { buffer, filename, stats, manifest } = await createFullBackupArchive()

  const backupDir = dataPath("backups")
  await fs.mkdir(backupDir, { recursive: true })

  const targetPath = customTarget ? path.resolve(customTarget) : path.join(backupDir, filename)
  await fs.writeFile(targetPath, buffer)

  console.log("==========================================")
  console.log("✅ 全量备份归档包已成功生成！")
  console.log(`📁 存储路径: ${targetPath}`)
  console.log(`📦 归档大小: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`)
  console.log(`⏱ 导出时间: ${manifest.exportedAt}`)
  console.log("------------------------------------------")
  console.log(`📊 包含数据:`)
  console.log(`   - 资源项目: ${stats.resourcesCount} 个`)
  console.log(`   - 物理文件: ${stats.filesCount} 个 (${(stats.storageTotalBytes / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`   - 机密凭据: ${stats.credentialsCount} 条`)
  console.log(`   - 团队成员: ${stats.usersCount} 位`)
  console.log(`   - 环境外链: ${stats.linksCount} 条`)
  console.log(`   - 随手便签: ${stats.memosCount} 条`)
  console.log("==========================================")
  console.log("💡 跨服务器迁移提示：请确保目标服务器 .env 中的 ENCRYPTION_KEY 与当前服务器保持一致。")
}

main().catch(error => {
  console.error("❌ 全量备份生成失败:", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
