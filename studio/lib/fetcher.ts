/**
 * SWR fetchers.
 *
 * - `fetcher` returns the raw parsed JSON. Use for endpoints where the
 *   consumer inspects the envelope directly (e.g. `{ok, adapter, data}`).
 * - `dataFetcher` auto-unwraps the studio's standard `{ok, data}` envelope
 *   and returns the inner `data` payload. Use for endpoints where the
 *   consumer wants the underlying array/record directly. Falls back to the
 *   raw JSON if the response isn't enveloped.
 *
 * Lane 1 / Wave A: every request now sends `Authorization: Bearer <token>`.
 * The token is bootstrapped from `?token=` on first nav and persisted in
 * localStorage. See lib/studio-token.ts.
 */

import { studioAuthHeaders } from "./studio-token"

export const fetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: { ...studioAuthHeaders() } })
  if (!res.ok) {
    // Surface HTTP-level failures as SWR errors so consumers' `error`
    // branch fires instead of handing back a parsed-error payload that
    // downstream iterators then crash on (G4-65).
    const e = new Error(`${res.status} ${res.statusText} at ${url}`) as Error & {
      status?: number
    }
    e.status = res.status
    throw e
  }
  return (await res.json()) as T
}

export async function dataFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { ...studioAuthHeaders() } })
  const json = (await res.json()) as unknown

  if (json && typeof json === "object" && "ok" in json) {
    const ok = (json as { ok: unknown }).ok
    // Studio convention: `{ ok: true, data }` on success, `{ ok: false, error }`
    // on handled failures (even at HTTP 200). Route the failure shape through
    // SWR's `error` channel -- if we passed it back as `data`, every consumer
    // that calls .filter()/.map() on it would crash (G4-65/G4-66). Throwing
    // here centralizes the fix for all 25+ SWR consumers.
    if (ok === false) {
      const err = (json as { error?: { code?: string; message?: string; fix?: string } }).error
      const message = err?.message || `${res.status} ${res.statusText} at ${url}`
      const e = new Error(message) as Error & { code?: string; fix?: string; status?: number }
      if (err?.code) e.code = err.code
      if (err?.fix) e.fix = err.fix
      e.status = res.status
      throw e
    }
    if (ok === true && "data" in json) {
      return (json as { data: T }).data
    }
  }

  // HTTP-level failure without a studio-shaped envelope -- surface it so
  // SWR returns `error`, not malformed `data`.
  if (!res.ok) {
    const e = new Error(`${res.status} ${res.statusText} at ${url}`) as Error & { status?: number }
    e.status = res.status
    throw e
  }

  return json as T
}
