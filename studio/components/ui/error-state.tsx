"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { extractErrorFix, extractErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Unified error surface. Replaces workspace/section-error.tsx and
// workspace/tab-error-state.tsx, and serves as the fallback card for
// components/ui/error-boundary.tsx. Three levels:
//
//   - section: inline chip with horizontal layout. Used inside cards or
//     above lists when a single section failed but the rest of the page
//     is fine.
//   - tab: full-bleed vertical layout with optional fix hint. Used when
//     an entire workspace tab failed to load.
//   - page: bordered card mid-page with retry button. Used by
//     ErrorBoundary as the default fallback for runtime throws.

const errorStateVariants = cva("", {
  variants: {
    level: {
      section:
        "flex items-center justify-between gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs",
      tab: "flex h-full flex-col items-center justify-center px-8 text-center",
      page: "flex min-h-64 w-full items-center justify-center p-6",
    },
  },
  defaultVariants: {
    level: "section",
  },
})

type ErrorStateProps = {
  error: unknown
  onRetry?: () => void
  /** Override the default heading. */
  title?: string
  className?: string
} & VariantProps<typeof errorStateVariants>

export function ErrorState({
  error,
  onRetry,
  title,
  className,
  level = "section",
}: ErrorStateProps) {
  const message =
    error instanceof Error
      ? error.message
      : extractErrorMessage(error, "Something went wrong.")
  const fix = extractErrorFix(error)

  if (level === "section") {
    const heading = title ?? "Load failed"
    return (
      <div role="alert" className={cn(errorStateVariants({ level }), className)}>
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="size-3.5 shrink-0 text-destructive/80" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{heading}</p>
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

  if (level === "tab") {
    const heading = title ?? "Couldn't load this tab"
    return (
      <div role="alert" className={cn(errorStateVariants({ level }), className)}>
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle className="size-5 text-destructive/80" />
        </div>
        <p className="text-sm font-medium text-foreground">{heading}</p>
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

  // level === "page"
  const heading = title ?? "Something went wrong"
  return (
    <div role="alert" className={cn(errorStateVariants({ level }), className)}>
      <div className="w-full max-w-md space-y-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" aria-hidden />
          <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
        </div>
        <p className="break-words text-xs leading-relaxed text-muted-foreground">
          {message || "An unexpected error stopped this view from rendering."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-subtle/50"
          >
            <RefreshCw className="size-3" aria-hidden />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
