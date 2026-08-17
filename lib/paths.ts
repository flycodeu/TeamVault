import path from "node:path"

/**
 * 统一的应用数据根目录解析。
 * 数据库 (lib/db/index.ts) 已使用 TEAMVAULT_APP_ROOT；文件存储/预览/缩略图/备份
 * 也统一走这里，避免 standalone 模式下 process.cwd() 被 chdir 改变导致路径错位。
 * 注意：本模块供 Next.js 与独立维护脚本共同使用，不引入 server-only。
 */
export function appRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.env.TEAMVAULT_APP_ROOT ?? process.cwd())
}

export function dataPath(...segments: string[]) {
  return path.join(appRoot(), "data", ...segments)
}

export function storageRoot() {
  return dataPath("files")
}

export function previewsRoot() {
  return dataPath("previews")
}

export function thumbnailsRoot() {
  return dataPath("thumbnails")
}

export function tempRoot() {
  return dataPath("temp")
}
