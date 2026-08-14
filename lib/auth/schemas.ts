import { z } from "zod"

export const usernameSchema = z
  .string()
  .trim()
  .min(2, "用户名至少需要 2 个字符")
  .max(40, "用户名不能超过 40 个字符")
  .regex(/^[a-zA-Z0-9._-]+$/, "用户名只能包含字母、数字、点、下划线和连字符")

export const passwordSchema = z
  .string()
  .min(6, "密码至少需要 6 个字符")
  .max(128, "密码不能超过 128 个字符")

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "请输入密码").max(128),
})

export const bootstrapAdminSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(60),
  password: passwordSchema,
})
