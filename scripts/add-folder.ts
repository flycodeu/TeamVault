import { db, sqlite } from "../lib/db"

try {
  sqlite.exec("ALTER TABLE file ADD COLUMN folder text DEFAULT '/' NOT NULL;")
  console.log("Column folder added")
} catch (e: any) {
  console.log("folder column:", e.message)
}

try {
  sqlite.exec("CREATE INDEX IF NOT EXISTS file_resource_folder_idx ON file (resource_id, folder);")
  console.log("Index file_resource_folder_idx created")
} catch (e: any) {
  console.log("index:", e.message)
}
