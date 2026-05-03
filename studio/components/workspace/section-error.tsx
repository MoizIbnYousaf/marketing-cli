"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { extractErrorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"

interface SectionErrorProps {
  error: unknown
  onRetry?: () => void
  label?: string
  className?: string
}

export function SectionError({ error, onRetry, label = "Load failed", className }: SectionErrorProps) {
  const message =
    error instanceof Error
      ? error.message
      : extractErrorMessage(error, "Couldn't fetch this section.")

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-rose-500/25 bg-rose-500/5 px-3 py-2 text-xs",
        className,
      )}
      role="alert"
    >
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle className="size-3.5 shrink-0 text-rose-500/80" />
        <div className="min-w-0">
          <p className="font-medium text-foreground">{label}</p>
          <p className="truncate text-[11px] text-muted-foreground">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:border-accent/40 hover:text-foreground"
        >
          <RefreshCw className="size-3" />
          Retry
        </button>
      )}
    </div>
  )
}
