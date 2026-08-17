import fs from "node:fs/promises"
import path from "node:path"
import { createHash } from "node:crypto"

import { databasePath, sqlite } from "../lib/db"
import { dataPath } from "../lib/paths"

async function copyTree(source: string, target: string) {
  try { await fs.cp(source, target, { recursive: true }) } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
}

async function main() {
  const stamp = new Date().toISOString().replaceAll(":", "-").replace("T", "_").slice(0, 19)
  const target = path.join(dataPath("backups"), `teamvault-${stamp}`)
  await fs.mkdir(target, { recursive: true })
  const backupDb = path.join(target, "teamvault.db")
  await sqlite.backup(backupDb)
  await copyTree(dataPath("files"), path.join(target, "files"))
  await copyTree(dataPath("previews"), path.join(target, "previews"))
  const databaseBytes = await fs.readFile(backupDb)
  const manifest = { version: 1, createdAt: new Date().toISOString(), database: { source: databasePath, file: "teamvault.db", sha256: createHash("sha256").update(databaseBytes).digest("hex") }, directories: ["files", "previews"], restore: "Stop TeamVault, replace data/teamvault.db and restore files/previews, then start the same or newer application version." }
  await fs.writeFile(path.join(target, "manifest.json"), JSON.stringify(manifest, null, 2))
  console.log(`Backup created: ${target}`)
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 }).finally(() => sqlite.close())
