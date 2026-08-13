import { Blocks } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

type BrandProps = {
  className?: string
  inverse?: boolean
}

export function Brand({ className, inverse = false }: BrandProps) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid size-8 place-items-center rounded-md",
          inverse ? "bg-white text-[#133d35]" : "bg-primary text-primary-foreground",
        )}
      >
        <Blocks className="size-4" aria-hidden="true" />
      </span>
      <span className="text-[15px] font-semibold">TeamVault</span>
    </Link>
  )
}
