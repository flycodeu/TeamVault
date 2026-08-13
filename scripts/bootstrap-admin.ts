import { count, eq } from "drizzle-orm"

import { hashPassword } from "../lib/auth/password"
import { bootstrapAdminSchema } from "../lib/auth/schemas"
import { db, sqlite } from "../lib/db"
import { sessions, users } from "../lib/db/schema"

async function main() {
  const input = bootstrapAdminSchema.safeParse({
    username: process.env.TEAMVAULT_ADMIN_USERNAME,
    displayName: process.env.TEAMVAULT_ADMIN_DISPLAY_NAME,
    password: process.env.TEAMVAULT_ADMIN_PASSWORD,
  })

  if (!input.success) {
    console.error(
      "Set TEAMVAULT_ADMIN_USERNAME, TEAMVAULT_ADMIN_DISPLAY_NAME, and TEAMVAULT_ADMIN_PASSWORD before running db:bootstrap.",
    )
    process.exitCode = 1
    return
  }

  const [{ value }] = await db.select({ value: count() }).from(users)
  if (value > 0) {
    if (process.env.TEAMVAULT_ADMIN_RESET_PASSWORD !== "1") {
      console.error(
        "Bootstrap is only available when the user table is empty. Set TEAMVAULT_ADMIN_RESET_PASSWORD=1 only for an intentional password reset.",
      )
      process.exitCode = 1
      return
    }
    const existing = await db.query.users.findFirst({
      where: eq(users.username, input.data.username),
    })
    if (!existing) {
      console.error(`Administrator '${input.data.username}' does not exist.`)
      process.exitCode = 1
      return
    }
    await db
      .update(users)
      .set({
        displayName: input.data.displayName,
        passwordHash: await hashPassword(input.data.password),
        isAdmin: true,
        status: "ACTIVE",
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
    await db.delete(sessions).where(eq(sessions.userId, existing.id))
    console.log(`Administrator password reset: ${input.data.username}`)
    return
  }

  await db.insert(users).values({
    username: input.data.username,
    displayName: input.data.displayName,
    passwordHash: await hashPassword(input.data.password),
    isAdmin: true,
  })
  console.log(`Administrator created: ${input.data.username}`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Administrator bootstrap failed.")
    process.exitCode = 1
  })
  .finally(() => sqlite.close())
