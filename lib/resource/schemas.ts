import { z } from "zod"

export const moduleKindSchema = z.enum(["PROJECT", "TOOL", "KNOWLEDGE", "PERSONAL", "OTHER"], { error: "请选择模块场景" })
export const visibilitySchema = z.enum(["TEAM", "GROUP", "PRIVATE", "PUBLIC"], { error: "请选择有效的可见范围" })
export const sensitivitySchema = z.enum(["NORMAL", "INTERNAL", "CONFIDENTIAL", "SECRET"], { error: "请选择有效的敏感级别" })

export const resourceSchema = z.object({
  name: z.string().trim().min(1, "请输入模块名称").max(100),
  moduleKind: moduleKindSchema,
  description: z.string().trim().max(2000).optional(),
  visibility: visibilitySchema,
  sensitivity: sensitivitySchema,
  tags: z.array(z.string().trim().min(1).max(30)).max(20),
})

export type ResourceInput = z.infer<typeof resourceSchema>
