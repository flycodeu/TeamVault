import "server-only"

import WordExtractor from "word-extractor"

export const LEGACY_WORD_PREVIEW_MAX = 25 * 1024 * 1024
const LEGACY_WORD_TEXT_MAX = 2_000_000

function cleanText(value: string) {
  return value.replaceAll("\u0000", "").trim()
}

export async function extractLegacyWord(filePath: string, size: number) {
  if (size > LEGACY_WORD_PREVIEW_MAX) {
    throw new Error("旧版 Word 文件超过 25MB，为避免服务器内存占用过高，请下载后查看。")
  }

  const extractor = new WordExtractor()
  const document = await extractor.extract(filePath)

  let remaining = LEGACY_WORD_TEXT_MAX
  let truncated = false
  function take(value: string) {
    const cleaned = cleanText(value)
    if (cleaned.length <= remaining) {
      remaining -= cleaned.length
      return cleaned
    }
    truncated = true
    const result = cleaned.slice(0, remaining)
    remaining = 0
    return result
  }

  return {
    body: take(document.getBody()),
    headers: take(document.getHeaders({ includeFooters: false })),
    footers: take(document.getFooters()),
    footnotes: take(document.getFootnotes()),
    endnotes: take(document.getEndnotes()),
    annotations: take(document.getAnnotations()),
    textboxes: take(document.getTextboxes({ includeHeadersAndFooters: false, includeBody: true })),
    truncated,
  }
}
