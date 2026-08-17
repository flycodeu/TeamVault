import "server-only"

type SharedFile = {
  id: string
  resourceId: string
}

type FileShare = {
  type: string
  targetId: string
  fileIds: string | null
  allowPreview: boolean
  allowDownload: boolean
}

export function isShareFileAllowed(
  share: FileShare,
  file: SharedFile,
  capability: "preview" | "download",
) {
  if (capability === "preview" && !share.allowPreview) return false
  if (capability === "download" && !share.allowDownload) return false
  if (share.type === "FILE") return share.targetId === file.id
  if (share.targetId !== file.resourceId) return false
  if (!share.fileIds) return true

  try {
    const allowed = JSON.parse(share.fileIds) as unknown
    return Array.isArray(allowed) && allowed.every(id => typeof id === "string") && allowed.includes(file.id)
  } catch {
    return false
  }
}
