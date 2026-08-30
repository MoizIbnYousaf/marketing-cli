"use client"

import { useEffect, useState } from "react"
import { SWRConfig } from "swr"
import { fetcher } from "@/lib/fetcher"
import { removeLegacyBrowserCredentials } from "@/lib/studio-token"

/**
 * SWR provider with cold-start token bootstrap.
 *
 * Every cold load calls the public, Host-allowlisted bootstrap endpoint.
 * It establishes an HttpOnly, same-site session cookie without exposing the
 * bearer token to JavaScript, browser storage, or navigation URLs.
 *
 * If the bootstrap fails (network down, unauthenticated proxy, etc.) we
 * render anyway. SWR will surface 401s as ErrorState rather than the
 * dashboard staying blank forever.
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    removeLegacyBrowserCredentials()
    fetch("/api/auth/bootstrap", { credentials: "same-origin" })
      .then((response) => {
        if (!cancelled) setReady(true)
        return response.body?.cancel()
      })
      .catch(() => {
        if (cancelled) return
        // Render anyway. SWR will surface 401 as ErrorState; better signal
        // than a blank page.
        setReady(true)
      })
    return () => { cancelled = true }
  }, [])

  if (!ready) return null

  return (
    <SWRConfig value={{ fetcher }}>
      {children}
    </SWRConfig>
  )
}
