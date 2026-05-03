"use client"

import { useEffect } from "react"

/**
 * Dev-only accessibility probe. In production it is a no-op (the dynamic
 * import never fires). In development, axe-core runs against the live DOM
 * every 1000ms and logs violations to the browser console as warnings.
 *
 * Filter the console with "axe" to see the audit. Anything critical is a
 * follow-up task.
 */
export function AxeA11y() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    let cancelled = false
    void (async () => {
      try {
        const [axeMod, ReactMod, ReactDOMMod] = await Promise.all([
          import("@axe-core/react"),
          import("react"),
          import("react-dom"),
        ])
        if (cancelled) return
        const axe = (axeMod as { default: (r: unknown, rd: unknown, ms: number) => void }).default
        axe(ReactMod, ReactDOMMod, 1000)
      } catch {
        // swallow — dev-only probe, never block the app
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
