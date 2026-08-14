import Database from "better-sqlite3"

const db = new Database("data/teamvault.db")

try {
  db.exec(`
    ALTER TABLE \`resource_link\` ADD COLUMN \`access_mode\` text NOT NULL DEFAULT 'RESOURCE';
  `)
  db.exec(`
    CREATE TABLE IF NOT EXISTS \`resource_link_permission\` (
      \`id\` text PRIMARY KEY NOT NULL,
      \`link_id\` text NOT NULL REFERENCES \`resource_link\`(\`id\`) ON DELETE CASCADE,
      \`subject_type\` text NOT NULL,
      \`subject_id\` text NOT NULL,
      \`created_at\` integer NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS \`resource_link_permission_subject_idx\` ON \`resource_link_permission\` (\`link_id\`, \`subject_type\`, \`subject_id\`);
  `)
  console.log("Option C migration applied successfully")
} catch (e: any) {
  if (e.message.includes("duplicate column name")) {
    console.log("Column already exists, ignoring")
  } else {
    throw e
  }
}
