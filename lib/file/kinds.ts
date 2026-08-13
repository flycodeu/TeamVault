import type { FileRecord } from "@/lib/db/schema"

export const allowedFileExtensions = [
  "pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx",
  "png", "jpg", "jpeg", "webp", "gif", "svg",
  "txt", "md", "json", "xml", "yaml", "yml", "sql", "log", "csv",
  "zip",
] as const

export const uploadAccept = allowedFileExtensions.map(extension => `.${extension}`).join(",")

export const fileKindOrder = ["IMAGE", "DOCUMENT", "TEXT", "ARCHIVE", "OTHER"] as const
export type FileKind = typeof fileKindOrder[number]

export const fileKindMeta: Record<FileKind, { label: string; storageDirectory: string }> = {
  IMAGE: { label: "图片", storageDirectory: "images" },
  DOCUMENT: { label: "文档", storageDirectory: "documents" },
  TEXT: { label: "文本与数据", storageDirectory: "text" },
  ARCHIVE: { label: "压缩文件", storageDirectory: "archives" },
  OTHER: { label: "其他文件", storageDirectory: "other" },
}

const imageExtensions = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"])
const documentExtensions = new Set(["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx"])
const textExtensions = new Set(["txt", "md", "json", "xml", "yaml", "yml", "sql", "log", "csv"])
const archiveExtensions = new Set(["zip"])

export function getFileKind(file: Pick<FileRecord, "extension" | "mimeType">): FileKind {
  const extension = file.extension?.toLowerCase() ?? ""
  if (imageExtensions.has(extension) || file.mimeType.startsWith("image/")) return "IMAGE"
  if (documentExtensions.has(extension) || file.mimeType === "application/pdf") return "DOCUMENT"
  if (textExtensions.has(extension) || file.mimeType.startsWith("text/")) return "TEXT"
  if (archiveExtensions.has(extension)) return "ARCHIVE"
  return "OTHER"
}

export function isImageFile(file: Pick<FileRecord, "extension" | "mimeType">) {
  return getFileKind(file) === "IMAGE"
}

export function storageDirectoryForExtension(extension: string) {
  return fileKindMeta[getFileKind({ extension, mimeType: "" })].storageDirectory
}

export function normalizeUploadMimeType(mimeType: string, extension: string) {
  if (mimeType) return mimeType
  if (extension === "svg") return "image/svg+xml"
  if (extension === "pdf") return "application/pdf"
  if (extension === "txt" || extension === "md" || extension === "log") return "text/plain"
  if (extension === "csv") return "text/csv"
  return "application/octet-stream"
}
