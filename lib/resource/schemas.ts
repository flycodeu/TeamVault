import { z } from "zod"

export const moduleKindSchema = z.enum(["PROJECT", "TOOL", "KNOWLEDGE", "WEBSITE", "PERSONAL", "OTHER"], { error: "请选择模块场景" })
export const visibilitySchema = z.enum(["TEAM", "GROUP", "PRIVATE", "PUBLIC"], { error: "请选择有效的可见范围" })
export const sensitivitySchema = z.enum(["NORMAL", "INTERNAL", "CONFIDENTIAL", "SECRET"], { error: "请选择有效的敏感级别" })

export const resourceSchema = z.object({
  name: z.string().trim().min(1, "请输入模块名称").max(100),
  moduleKind: moduleKindSchema,
  url: z.string().trim().max(2000).optional(),
  description: z.string().trim().max(2000).optional(),
  visibility: visibilitySchema,
  sensitivity: sensitivitySchema,
  tags: z.array(z.string().trim().min(1).max(30)).max(20),
}).superRefine((value, context) => {
  if (value.moduleKind !== "WEBSITE") return
  if (!value.url) context.addIssue({ code: "custom", path: ["url"], message: "请输入网站地址" })
  else { try { new URL(value.url) } catch { context.addIssue({ code: "custom", path: ["url"], message: "请输入有效的网站地址" }) } }
})

export type ResourceInput = z.infer<typeof resourceSchema>
