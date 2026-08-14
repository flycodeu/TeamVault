import Link from "next/link"

import { cn } from "@/lib/utils"

type BrandProps = {
  className?: string
  inverse?: boolean
}

export function VaultLogo({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 22C12 22 20 18.5 20 12.5V5.5L12 2.5L4 5.5V12.5C4 18.5 12 22 12 22Z"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" fill="currentColor" />
      <path d="M12 12.2V15.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
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
        <VaultLogo size={19} />
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


