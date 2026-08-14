import Database from "better-sqlite3"

const db = new Database("data/teamvault.db")

try {
  db.exec(`
    ALTER TABLE \`credential\` ADD COLUMN \`link_id\` text REFERENCES \`resource_link\`(\`id\`) ON DELETE SET NULL;
  `)
  db.exec(`
    CREATE INDEX IF NOT EXISTS \`credential_link_idx\` ON \`credential\` (\`link_id\`);
  `)
  console.log("link_id added successfully")
} catch (e: any) {
  if (e.message.includes("duplicate column name")) {
    console.log("Column already exists, ignoring")
  } else {
    throw e
  }
}
