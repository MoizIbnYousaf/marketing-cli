"use client"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export function DeltaBadge({
  value,
  baseline,
  snapshots,
  className,
}: {
  value: number
  baseline?: number
  snapshots?: number
  className?: string
}) {
  if (baseline === undefined || baseline === 0) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums bg-muted text-muted-foreground",
          className
        )}
      >
        <Minus className="size-3" />
        --
      </span>
    )
  }

  const delta = ((value - baseline) / baseline) * 100
  const isPositive = delta > 0
  const isNeutral = Math.abs(delta) < 5

  if (isNeutral) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums bg-muted text-muted-foreground",
          className
        )}
      >
        <Minus className="size-3" />
        {Math.abs(delta).toFixed(0)}%
      </span>
    )
  }

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums font-medium",
        isPositive
          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
          : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400",
        className
      )}
    >
      {isPositive ? (
        <TrendingUp className="size-3" />
      ) : (
        <TrendingDown className="size-3" />
      )}
      {isPositive ? "+" : ""}
      {delta.toFixed(0)}%
    </span>
  )

  if (baseline !== undefined) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            Baseline: {baseline.toLocaleString()}
            {snapshots !== undefined ? ` \u00B7 ${snapshots} snapshots` : ""}
            {" \u00B7 7D window"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badge
}
