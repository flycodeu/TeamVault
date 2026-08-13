import { createRequire } from "node:module"
import path from "node:path"

const require = createRequire(path.resolve("migration-node_modules", "package.json"))
const Database = require("better-sqlite3")
const { drizzle } = require("drizzle-orm/better-sqlite3")
const { migrate } = require("drizzle-orm/better-sqlite3/migrator")

const configuredDatabasePath = process.env.TEAMVAULT_DATABASE_PATH ?? "/app/data/teamvault.db"
const databasePath = path.isAbsolute(configuredDatabasePath)
  ? path.normalize(configuredDatabasePath)
  : path.resolve(process.env.TEAMVAULT_APP_ROOT ?? process.cwd(), configuredDatabasePath)
const sqlite = new Database(databasePath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")
sqlite.pragma("busy_timeout = 5000")
migrate(drizzle(sqlite), { migrationsFolder: "./drizzle" })
sqlite.close()
console.log(`Database migrated: ${databasePath}`)
