"use client"

import { cn } from "@/lib/utils"
import { AlertTriangle, Eye, TrendingDown } from "lucide-react"

const SEVERITY_CONFIG = {
  p0: {
    label: "SPIKE",
    icon: AlertTriangle,
    className:
      "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700",
  },
  p1: {
    label: "SPIKE",
    icon: AlertTriangle,
    className:
      "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800",
  },
  watch: {
    label: "WATCH",
    icon: Eye,
    className:
      "bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  },
  negative: {
    label: "DROP",
    icon: TrendingDown,
    className:
      "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800",
  },
} as const

export function SpikeBadge({
  severity,
  multiplier,
  className,
}: {
  severity: "p0" | "p1" | "watch" | "negative"
  multiplier?: number
  className?: string
}) {
  const config = SEVERITY_CONFIG[severity]
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide",
        config.className,
        className
      )}
    >
      <Icon className="size-3" />
      {config.label}
      {multiplier !== undefined && multiplier > 0 && (
        <span className="tabular-nums">{multiplier.toFixed(1)}x</span>
      )}
    </span>
  )
}
