import Database from "better-sqlite3"

const db = new Database("data/teamvault.db")

try {
  db.exec(`
    ALTER TABLE \`resource\` ADD COLUMN \`parent_id\` text REFERENCES \`resource\`(\`id\`) ON DELETE CASCADE;
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS \`resource_parent_idx\` ON \`resource\` (\`parent_id\`);
  `)
  console.log("parent_id added successfully")
} catch (e: any) {
  if (e.message.includes("duplicate column name")) {
    console.log("Column already exists, ignoring")
  } else {
    throw e
  }
}
