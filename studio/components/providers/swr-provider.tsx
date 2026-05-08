"use client"

import { useEffect, useState } from "react"
import { SWRConfig } from "swr"
import { fetcher } from "@/lib/fetcher"
import { getStudioToken } from "@/lib/studio-token"

const STORAGE_KEY = "mktgStudioToken"

/**
 * SWR provider with cold-start token bootstrap.
 *
 * Production path: `mktg studio` opens the dashboard at `?token=<hex>`,
 * `getStudioToken()` reads the URL, stashes it in localStorage, and we
 * render immediately.
 *
 * Dev path: `bun run dev:all` opens the dashboard with no `?token=`,
 * localStorage is empty, `getStudioToken()` returns null. We then call
 * `GET /api/auth/bootstrap` (a public, Host-allowlisted endpoint that
 * returns the studio token) and stash the result before rendering. CORS
 * blocks cross-origin reads; only the localhost dashboard can complete
 * this exchange.
 *
 * If the bootstrap fails (network down, unauthenticated proxy, etc.) we
 * render anyway. SWR will surface 401s as ErrorState rather than the
 * dashboard staying blank forever.
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(() => getStudioToken() !== null)

  useEffect(() => {
    if (ready) return
    let cancelled = false
    fetch("/api/auth/bootstrap")
      .then((r) => r.json())
      .then((b: { ok?: boolean; data?: { token?: string } }) => {
        if (cancelled) return
        if (b?.ok && typeof b?.data?.token === "string" && b.data.token.length >= 32 && typeof window !== "undefined") {
          window.localStorage.setItem(STORAGE_KEY, b.data.token)
        }
        setReady(true)
      })
      .catch(() => {
        if (cancelled) return
        // Render anyway. SWR will surface 401 as ErrorState; better signal
        // than a blank page.
        setReady(true)
      })
    return () => { cancelled = true }
  }, [ready])

  if (!ready) return null

  return (
    <SWRConfig value={{ fetcher }}>
      {children}
    </SWRConfig>
  )
}
