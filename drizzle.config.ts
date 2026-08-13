import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.TEAMVAULT_DATABASE_PATH ?? "./data/teamvault.db",
  },
  strict: true,
  verbose: true,
})
