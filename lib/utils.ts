import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DEFAULT_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || process.env.TZ || "Asia/Shanghai"

export function formatDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "object" && date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: DEFAULT_TIMEZONE,
  }).format(d).replace(/\//g, "-")
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return ""
  const d = typeof date === "object" && date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ""
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DEFAULT_TIMEZONE,
  }).format(d).replace(/\//g, "-")
}

/**
 * Copies text to the clipboard with fallback support for non-secure contexts (HTTP),
 * older browsers, mobile devices, and restricted iframe environments.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") {
    return false
  }

  const str = String(text ?? "")

  // 1. Try modern Clipboard API if supported and in secure context
  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(str)
      return true
    } catch (err) {
      console.warn("navigator.clipboard.writeText failed, falling back to execCommand:", err)
    }
  }

  // 2. Fallback to document.execCommand('copy')
  try {
    const activeElement = document.activeElement as HTMLElement | null
    const textArea = document.createElement("textarea")
    textArea.value = str

    // Prevent iOS zoom, scrolling, and visual shifts
    textArea.style.position = "fixed"
    textArea.style.top = "-9999px"
    textArea.style.left = "-9999px"
    textArea.style.width = "2em"
    textArea.style.height = "2em"
    textArea.style.padding = "0"
    textArea.style.border = "none"
    textArea.style.outline = "none"
    textArea.style.boxShadow = "none"
    textArea.style.background = "transparent"
    textArea.style.opacity = "0"
    textArea.style.pointerEvents = "none"
    textArea.style.fontSize = "16px"
    textArea.setAttribute("readonly", "")

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    textArea.setSelectionRange(0, textArea.value.length)

    const successful = document.execCommand("copy")
    document.body.removeChild(textArea)

    if (activeElement && typeof activeElement.focus === "function") {
      activeElement.focus()
    }

    return successful
  } catch (err) {
    console.error("Failed to copy to clipboard:", err)
    return false
  }
}



