"use client"

import { Heart } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { toggleFavorite } from "@/lib/resource/actions"
import { cn } from "@/lib/utils"

export function ResourceFavoriteButton({ resourceId, resourceName, initialFavorite, compact = false }: { resourceId: string; resourceName: string; initialFavorite: boolean; compact?: boolean }) {
  const router = useRouter()
  const [favorited, setFavorited] = useState(initialFavorite)
  const [pending, setPending] = useState(false)
  const label = favorited ? `取消收藏 ${resourceName}` : `收藏 ${resourceName}`

  async function toggle() {
    setPending(true)
    const result = await toggleFavorite(resourceId)
    if (result.success) {
      setFavorited(result.data.favorited)
      router.refresh()
    } else {
      window.alert(result.error)
    }
    setPending(false)
  }

  return (
    <Button type="button" variant={compact ? "ghost" : "outline"} size={compact ? "icon" : "sm"} onClick={toggle} disabled={pending} className={cn(favorited && "text-primary")} title={label} aria-label={label}>
      <Heart className={cn(favorited && "fill-current")} />
      {compact ? null : favorited ? "已收藏" : "收藏"}
    </Button>
  )
}
