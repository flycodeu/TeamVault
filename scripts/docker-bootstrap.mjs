import { createRequire } from "node:module"
import path from "node:path"
import crypto from "node:crypto"

const require = createRequire(path.resolve("migration-node_modules", "package.json"))
const Database = require("better-sqlite3")
// 与 lib/auth/password.ts 保持同一套哈希实现，确保登录校验 (argon2.verify) 能通过。
const argon2 = require("argon2")

const configuredDatabasePath = process.env.TEAMVAULT_DATABASE_PATH ?? "/app/data/teamvault.db"
const databasePath = path.isAbsolute(configuredDatabasePath)
  ? path.normalize(configuredDatabasePath)
  : path.resolve(process.env.TEAMVAULT_APP_ROOT ?? process.cwd(), configuredDatabasePath)

const sqlite = new Database(databasePath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")

const username = (process.env.TEAMVAULT_ADMIN_USERNAME || "admin").trim()
const displayName = (process.env.TEAMVAULT_ADMIN_DISPLAY_NAME || "TeamVault Admin").trim()
const password = process.env.TEAMVAULT_ADMIN_PASSWORD

if (!password) {
  console.log("No TEAMVAULT_ADMIN_PASSWORD specified, skipping admin bootstrap.")
  sqlite.close()
  process.exit(0)
}

async function main() {
  try {
    const userCount = sqlite.prepare("SELECT count(*) as count FROM user").get()
    if (userCount && userCount.count === 0) {
      const id = crypto.randomUUID()
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      })
      const now = Date.now()
      sqlite.prepare(`
        INSERT INTO user (id, username, display_name, password_hash, is_admin, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 'ACTIVE', ?, ?)
      `).run(id, username, displayName, passwordHash, now, now)
      console.log(`Bootstrap admin user created successfully: ${username}`)
    } else {
      console.log("Users already exist in database, skipping admin bootstrap.")
    }
  } catch (err) {
    console.error("Error during admin bootstrap:", err)
    process.exitCode = 1
  } finally {
    sqlite.close()
  }
}

main()
