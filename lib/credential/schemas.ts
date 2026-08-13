import { z } from "zod"

export const credentialTypeSchema = z.enum(["PASSWORD", "API_KEY", "TOKEN", "SSH", "DATABASE", "ACCESS_KEY", "TOTP", "OTHER"])
export const credentialAccessModeSchema = z.enum(["RESOURCE", "RESTRICTED"])
export const credentialSubjectSchema = z.object({ subjectType: z.enum(["USER", "GROUP"]), subjectId: z.string().uuid() })
export const credentialSchema = z.object({
  name: z.string().trim().min(1, "请输入凭据名称").max(100),
  type: credentialTypeSchema,
  username: z.string().trim().max(200).optional(),
  secret: z.string().min(1, "请输入 Secret").max(10000),
  extra: z.string().max(10000).optional(),
  description: z.string().trim().max(1000).optional(),
  accessMode: credentialAccessModeSchema.default("RESOURCE"),
  subjects: z.array(credentialSubjectSchema).max(200).default([]),
})
export const credentialUpdateSchema = credentialSchema.omit({ accessMode: true, subjects: true }).extend({ secret: z.string().max(10000).optional() })
export type CredentialInput = z.infer<typeof credentialSchema>
