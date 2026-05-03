"use client"

import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface RefreshChipProps {
  onClick: () => void | Promise<unknown>
  loading?: boolean
  label?: string
  className?: string
}

export function RefreshChip({ onClick, loading, label = "Refresh", className }: RefreshChipProps) {
  return (
    <button
      type="button"
      onClick={() => onClick()}
      disabled={loading}
      className={cn(
        // min-h-11 + min-w-11 meet Apple HIG 44×44 / WCAG 2.5.5 target
        // size. Visually the chip still reads as a chip because padding
        // centers the compact content; the extra height is hit area only.
        // G2-03 / audience-tab previously had 0/11 elements compliant.
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground disabled:opacity-50",
        className,
      )}
    >
      <RefreshCw className={cn("size-3", loading && "animate-spin")} />
      {label}
    </button>
  )
}
