import type { FileRecord } from "@/lib/db/schema"

export const allowedFileExtensions = [
  "pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx",
  "png", "jpg", "jpeg", "webp", "gif", "svg",
  "mp4", "webm", "mov", "mkv", "avi", "mp3", "wav",
  "txt", "md", "json", "xml", "yaml", "yml", "sql", "log", "csv",
  "zip", "7z", "tar", "gz",
] as const

export const uploadAccept = allowedFileExtensions.map(extension => `.${extension}`).join(",")

export const fileKindOrder = ["IMAGE", "DOCUMENT", "TEXT", "ARCHIVE", "OTHER"] as const
export type FileKind = typeof fileKindOrder[number]

export const fileKindMeta: Record<FileKind, { label: string; storageDirectory: string }> = {
  IMAGE: { label: "图片与视觉", storageDirectory: "images" },
  DOCUMENT: { label: "文档与演示", storageDirectory: "documents" },
  TEXT: { label: "文本与数据", storageDirectory: "text" },
  ARCHIVE: { label: "压缩包与媒体", storageDirectory: "archives" },
  OTHER: { label: "其他文件", storageDirectory: "other" },
}

const imageExtensions = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg"])
const documentExtensions = new Set(["pdf", "ppt", "pptx", "doc", "docx", "xls", "xlsx"])
const textExtensions = new Set(["txt", "md", "json", "xml", "yaml", "yml", "sql", "log", "csv"])
const archiveExtensions = new Set(["zip", "7z", "tar", "gz", "mp4", "webm", "mov", "mkv", "avi", "mp3", "wav"])

const presentationExtensions = new Set(["pptx"])
const spreadsheetExtensions = new Set(["xls", "xlsx", "csv"])
const wordExtensions = new Set(["doc", "docx"])
const videoExtensions = new Set(["mp4", "webm", "mov", "mkv", "avi"])
const audioExtensions = new Set(["mp3", "wav"])

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

export const previewKindOrder = ["PDF", "PRESENTATION", "SPREADSHEET", "WORD", "IMAGE", "TEXT", "VIDEO", "AUDIO", "ZIP", "NONE"] as const
export type PreviewKind = typeof previewKindOrder[number]

/**
 * 在线预览能力分类：
 * - PDF：PDF.js 浏览器渲染
 * - PRESENTATION：PPTX 浏览器端只读渲染
 * - SPREADSHEET：XLS/XLSX/CSV 浏览器端只读表格
 * - WORD：DOCX 浏览器端排版；旧版 DOC 提取文本兼容预览
 * - IMAGE / TEXT / VIDEO / AUDIO / ZIP：浏览器原生或 JSZip 预览
 * - NONE：暂不支持在线预览
 */
export function getPreviewKind(file: Pick<FileRecord, "extension" | "mimeType">): PreviewKind {
  const extension = file.extension?.toLowerCase() ?? ""
  if (file.mimeType === "application/pdf" || extension === "pdf") return "PDF"
  if (presentationExtensions.has(extension)) return "PRESENTATION"
  if (spreadsheetExtensions.has(extension)) return "SPREADSHEET"
  if (wordExtensions.has(extension)) return "WORD"
  if (imageExtensions.has(extension) || file.mimeType.startsWith("image/")) return "IMAGE"
  if (videoExtensions.has(extension) || file.mimeType.startsWith("video/")) return "VIDEO"
  if (audioExtensions.has(extension) || file.mimeType.startsWith("audio/")) return "AUDIO"
  if (textExtensions.has(extension) || file.mimeType.startsWith("text/")) return "TEXT"
  if (extension === "zip" || file.mimeType === "application/zip") return "ZIP"
  return "NONE"
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
