import { Shield } from "lucide-react"
import Link from "next/link"

import { cn } from "@/lib/utils"

type BrandProps = {
  className?: string
  inverse?: boolean
}

export function Brand({ className, inverse = false }: BrandProps) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5 transition", className)}>
      <span
        className={cn(
          "grid size-9 place-items-center rounded-xl shadow-sm transition duration-300 group-hover:scale-105",
          inverse
            ? "bg-white text-[#0e6553] shadow-white/10"
            : "bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground shadow-primary/20",
        )}
      >
        <Shield className="size-4.5" strokeWidth={2.2} aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <span className={cn("text-[15px] font-bold tracking-tight", inverse ? "text-white" : "text-foreground")}>
          TeamVault
        </span>
        <span className={cn("text-[10px] -mt-0.5 tracking-wider uppercase font-medium", inverse ? "text-white/60" : "text-muted-foreground")}>
          Team Shared Hub
        </span>
      </div>
    </Link>
  )
}

