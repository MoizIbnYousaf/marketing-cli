"use client"

// Next.js segment-level error boundary. Catches runtime throws inside any
// dashboard route (e.g. /dashboard, /settings) and renders a recoverable
// fallback instead of the dev overlay or a blank page. The root
// app/layout.tsx ErrorBoundary still wraps providers; this file scopes the
// catch to the route subtree so the SWR cache + SSE bridge survive a crash.

import { useEffect } from "react"
import { ErrorState } from "@/components/ui/error-state"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to the browser console so dev/Sentry-style tooling can pick it up.
    // Avoid console.error in production paths if a future logger replaces it.
    if (typeof window !== "undefined") {
      console.error("[dashboard-error-boundary]", error)
    }
  }, [error])

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <ErrorState
        level="page"
        error={error}
        onRetry={reset}
        title="Dashboard couldn't render"
      />
    </div>
  )
}
