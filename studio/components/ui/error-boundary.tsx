"use client"

// components/ui/error-boundary.tsx — last line of defense.
//
// React error boundaries are the only way to stop a runtime throw in a
// child tree from blowing up the whole page as a Next.js dev error
// overlay (or a blank screen in prod). Without one, G4-65 / G4-66 turn
// every 500 response or malformed SWR payload into a full-viewport
// crash.
//
// This is a thin class component — React still requires class for error
// boundaries, even in 19. We intentionally avoid the `react-error-boundary`
// dependency to keep the boundary trivially auditable and zero-cost.

import { Component, type ErrorInfo, type ReactNode } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

type Props = {
  children: ReactNode
  /**
   * Optional label for the fallback card. Defaults to "Something went wrong".
   * Useful when the boundary wraps a known surface (e.g. "Publish failed to load").
   */
  label?: string
  /**
   * Render-prop fallback. Called with (error, reset). Overrides the default
   * fallback card when provided. Reset drops the caught state so React
   * remounts children on the next render.
   */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /**
   * Called once per caught error. Wire to a structured logger in prod.
   */
  onError?: (error: Error, info: ErrorInfo) => void
}

type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Always surface in dev console — the Next dev overlay swallows
    // boundary-caught errors by default, which makes diagnosis painful.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", error, info)
    }
    this.props.onError?.(error, info)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset)
    }

    const label = this.props.label ?? "Something went wrong"

    return (
      <div
        role="alert"
        className="flex min-h-64 w-full items-center justify-center p-6"
      >
        <div className="max-w-md w-full rounded-lg border border-rose-500/25 bg-rose-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-rose-500" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">{label}</h2>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed break-words">
            {error.message || "An unexpected error stopped this view from rendering."}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-subtle/50 transition-colors"
          >
            <RefreshCw className="size-3" aria-hidden />
            Retry
          </button>
        </div>
      </div>
    )
  }
}
