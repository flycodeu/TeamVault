"use client"

import { ChevronLeft } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"

export function PreviewBackButton({
  fallbackHref,
  label = "返回",
}: {
  fallbackHref: string
  label?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromParam = searchParams.get("from")

  function handleBack() {
    if (fromParam) {
      router.push(fromParam)
      return
    }

    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.includes(window.location.host)
    ) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-foreground transition"
      title={label}
    >
      <ChevronLeft className="size-4" />
      <span>{label}</span>
    </Button>
  )
}
