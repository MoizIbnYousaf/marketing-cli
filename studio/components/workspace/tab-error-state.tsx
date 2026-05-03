"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { extractErrorFix, extractErrorMessage } from "@/lib/api-error"

interface TabErrorStateProps {
  error: unknown
  onRetry?: () => void
  title?: string
}

export function TabErrorState({ error, onRetry, title = "Couldn't load this tab" }: TabErrorStateProps) {
  const message =
    error instanceof Error
      ? error.message
      : extractErrorMessage(error, "Something went wrong fetching this view.")
  const fix = extractErrorFix(error)

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-rose-500/10">
        <AlertTriangle className="size-5 text-rose-500/80" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-[320px] text-xs text-muted-foreground">{message}</p>
      {fix && (
        <p className="mt-2 max-w-[320px] rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
          Fix: {fix}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} size="sm" variant="outline" className="mt-4 gap-2">
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      )}
    </div>
  )
}
