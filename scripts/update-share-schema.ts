import { sqlite } from "../lib/db"

try {
  sqlite.exec(`
    ALTER TABLE share ADD COLUMN allow_credentials INTEGER NOT NULL DEFAULT 0;
  `)
  console.log("Added allow_credentials column")
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes("duplicate column")) {
    console.log("allow_credentials already exists")
  } else {
    console.error(msg)
  }
}

try {
  sqlite.exec(`
    ALTER TABLE share ADD COLUMN credential_ids TEXT;
  `)
  console.log("Added credential_ids column")
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes("duplicate column")) {
    console.log("credential_ids already exists")
  } else {
    console.error(msg)
  }
}

try {
  sqlite.exec(`
    ALTER TABLE share ADD COLUMN file_ids TEXT;
  `)
  console.log("Added file_ids column")
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes("duplicate column")) {
    console.log("file_ids already exists")
  } else {
    console.error(msg)
  }
}

console.log("Database schema check complete.")
sqlite.close()

