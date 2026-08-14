import { randomUUID } from "node:crypto"

import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core"

export const users = sqliteTable(
  "user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    username: text("username").notNull().unique(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    avatar: text("avatar"),
    status: text("status", { enum: ["ACTIVE", "DISABLED"] })
      .notNull()
      .default("ACTIVE"),
    isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("user_status_idx").on(table.status)],
)

export const sessions = sqliteTable(
  "session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_expires_at_idx").on(table.expiresAt),
  ],
)

export const resourceCollections = sqliteTable("resource_collection", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
})

export const resources = sqliteTable(
  "resource",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: text("name").notNull(),
    moduleKind: text("module_kind", { enum: ["PROJECT", "TOOL", "KNOWLEDGE", "WEBSITE", "PERSONAL", "OTHER"] }).notNull().default("OTHER"),
    type: text("type", {
      enum: ["WEBSITE", "SERVER", "DATABASE", "DEVICE", "DOCUMENT", "SOFTWARE", "API", "OTHER"],
    }).notNull().default("OTHER"),
    description: text("description"),
    url: text("url"),
    host: text("host"),
    ip: text("ip"),
    port: integer("port"),
    visibility: text("visibility", { enum: ["TEAM", "GROUP", "PRIVATE", "PUBLIC"] }).notNull().default("TEAM"),
    sensitivity: text("sensitivity", { enum: ["NORMAL", "INTERNAL", "CONFIDENTIAL", "SECRET"] }).notNull().default("NORMAL"),
    tags: text("tags").notNull().default("[]"),
    collectionId: text("collection_id").references(() => resourceCollections.id, { onDelete: "set null" }),
    ownerId: text("owner_id").notNull().references(() => users.id),
    createdBy: text("created_by").notNull().references(() => users.id),
    isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
    status: text("status", { enum: ["ACTIVE", "ARCHIVED"] }).notNull().default("ACTIVE"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("resource_owner_idx").on(table.ownerId), index("resource_status_idx").on(table.status)],
)

export const resourceFavorites = sqliteTable(
  "resource_favorite",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    resourceId: text("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("resource_favorite_user_resource_idx").on(table.userId, table.resourceId),
    index("resource_favorite_user_idx").on(table.userId),
  ],
)

export const resourceLinks = sqliteTable(
  "resource_link",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    resourceId: text("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["WEBSITE", "EXTERNAL_DOCUMENT", "OTHER"] }).notNull().default("WEBSITE"),
    title: text("title").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("resource_link_resource_idx").on(table.resourceId)],
)

export const credentials = sqliteTable(
  "credential",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    resourceId: text("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: ["PASSWORD", "API_KEY", "TOKEN", "SSH", "DATABASE", "ACCESS_KEY", "TOTP", "OTHER"] }).notNull().default("PASSWORD"),
    username: text("username"),
    secretCipher: text("secret_cipher").notNull(),
    extraCipher: text("extra_cipher"),
    description: text("description"),
    accessMode: text("access_mode", { enum: ["RESOURCE", "RESTRICTED"] }).notNull().default("RESOURCE"),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("credential_resource_idx").on(table.resourceId)],
)

export const auditLogs = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action", { enum: ["LOGIN", "LOGOUT", "RESOURCE_CREATE", "RESOURCE_EDIT", "RESOURCE_DELETE", "SECRET_VIEW", "SECRET_COPY", "FILE_UPLOAD", "FILE_PREVIEW", "FILE_DOWNLOAD", "FILE_DELETE", "SHARE_CREATE", "SHARE_REVOKE", "PERMISSION_CHANGE"] }).notNull(),
    resourceId: text("resource_id").references(() => resources.id, { onDelete: "set null" }),
    targetType: text("target_type"),
    targetId: text("target_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("audit_log_created_idx").on(table.createdAt), index("audit_log_resource_idx").on(table.resourceId)],
)

export const files = sqliteTable(
  "file",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    resourceId: text("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
    originalName: text("original_name").notNull(),
    storageName: text("storage_name").notNull().unique(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type").notNull(),
    extension: text("extension"),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    previewStatus: text("preview_status", { enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "NONE"] }).notNull().default("NONE"),
    previewPath: text("preview_path"),
    thumbnailPath: text("thumbnail_path"),
    createdBy: text("created_by").notNull().references(() => users.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [index("file_resource_idx").on(table.resourceId)],
)

export const groups = sqliteTable("group", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
})

export const groupMembers = sqliteTable("group_member", {
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["MEMBER", "MANAGER"] }).notNull().default("MEMBER"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => [uniqueIndex("group_member_unique_idx").on(table.groupId, table.userId)])

export const resourcePermissions = sqliteTable("resource_permission", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  resourceId: text("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  subjectType: text("subject_type", { enum: ["USER", "GROUP"] }).notNull(),
  subjectId: text("subject_id").notNull(),
  canView: integer("can_view", { mode: "boolean" }).notNull().default(true),
  canViewSecret: integer("can_view_secret", { mode: "boolean" }).notNull().default(false),
  canViewFile: integer("can_view_file", { mode: "boolean" }).notNull().default(false),
  canDownload: integer("can_download", { mode: "boolean" }).notNull().default(false),
  canEdit: integer("can_edit", { mode: "boolean" }).notNull().default(false),
  canShare: integer("can_share", { mode: "boolean" }).notNull().default(false),
}, (table) => [uniqueIndex("resource_permission_subject_idx").on(table.resourceId, table.subjectType, table.subjectId)])

export const credentialPermissions = sqliteTable("credential_permission", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  credentialId: text("credential_id").notNull().references(() => credentials.id, { onDelete: "cascade" }),
  subjectType: text("subject_type", { enum: ["USER", "GROUP"] }).notNull(),
  subjectId: text("subject_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
}, (table) => [uniqueIndex("credential_permission_subject_idx").on(table.credentialId, table.subjectType, table.subjectId)])

export const shares = sqliteTable("share", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  type: text("type", { enum: ["RESOURCE", "FILE"] }).notNull(),
  targetId: text("target_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  passwordHash: text("password_hash"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  allowPreview: integer("allow_preview", { mode: "boolean" }).notNull().default(true),
  allowDownload: integer("allow_download", { mode: "boolean" }).notNull().default(false),
  maxViews: integer("max_views"),
  viewCount: integer("view_count").notNull().default(0),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
})

export const previewJobs = sqliteTable("preview_job", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  fileId: text("file_id").notNull().references(() => files.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["PENDING", "PROCESSING", "SUCCESS", "FAILED"] }).notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
})

export const loginAttempts = sqliteTable("login_attempt", {
  key: text("key").primaryKey(),
  failures: integer("failures").notNull().default(0),
  windowStartedAt: integer("window_started_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  blockedUntil: integer("blocked_until", { mode: "timestamp_ms" }),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type Resource = typeof resources.$inferSelect
export type NewResource = typeof resources.$inferInsert
export type Credential = typeof credentials.$inferSelect
export type AuditLog = typeof auditLogs.$inferSelect
export type FileRecord = typeof files.$inferSelect
export type Group = typeof groups.$inferSelect
export type ResourceCollection = typeof resourceCollections.$inferSelect
export type ResourceLink = typeof resourceLinks.$inferSelect
export type Share = typeof shares.$inferSelect
