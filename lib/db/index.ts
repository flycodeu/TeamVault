import fs from "node:fs"
import path from "node:path"

import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"

import * as schema from "./schema"

const configuredDatabasePath = process.env.TEAMVAULT_DATABASE_PATH ?? "./data/teamvault.db"
const databasePath = path.isAbsolute(configuredDatabasePath)
  ? path.normalize(configuredDatabasePath)
  : path.resolve(process.env.TEAMVAULT_APP_ROOT ?? process.cwd(), configuredDatabasePath)

fs.mkdirSync(path.dirname(databasePath), { recursive: true })

const sqlite = new Database(databasePath)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")
sqlite.pragma("busy_timeout = 5000")

export const db = drizzle(sqlite, { schema })
export { databasePath, sqlite }
