import { migrate } from "drizzle-orm/better-sqlite3/migrator"

import { databasePath, db, sqlite } from "../lib/db"

migrate(db, { migrationsFolder: "./drizzle" })
sqlite.close()

console.log(`Database migrated: ${databasePath}`)
