"use client"

import useSWR from "swr"
import { useMemo } from "react"
import { dataFetcher } from "@/lib/fetcher"
import type { SignalStats } from "@/lib/types/signals"

interface RawSignal {
  platform?: string
  spike_detected?: 0 | 1 | boolean
  spikeDetected?: boolean
  capturedAt?: number
  created_at?: string | null
  updated_at?: string | null
}

const SAME_KEY = "/api/signals"

function toMs(s?: string | null): number | null {
  if (!s) return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : null
}

/**
 * Derive SignalStats client-side from /api/signals.
 *
 * The server has no /api/signals/stats endpoint (NOT_FOUND); UI used to call
 * it and the resulting 404 polluted the console + left badges at zero. Pulling
 * from /api/signals is a single SWR cache hit (deduped across consumers) and
 * keeps the badges accurate.
 */
export function useSignalStats(): SignalStats | undefined {
  const { data: rows } = useSWR<RawSignal[]>(SAME_KEY, dataFetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  })

  return useMemo<SignalStats | undefined>(() => {
    // Defensive: `dataFetcher` may unwrap `{ok:true,data}` and return the
    // inner payload, but endpoint stubs or legacy callers can pass through
    // non-array shapes. Crash-hardens useSignalStats against G4-65.
    if (!Array.isArray(rows)) return undefined
    const totalSignals = rows.length
    const spikeCount = rows.filter(
      (r) => r.spikeDetected === true || r.spike_detected === 1 || r.spike_detected === true,
    ).length

    let lastUpdated: number | null = null
    const platformMap = new Map<string, number>()
    for (const r of rows) {
      const ms =
        (typeof r.capturedAt === "number" ? r.capturedAt : null) ??
        toMs(r.updated_at) ??
        toMs(r.created_at)
      if (ms !== null && (lastUpdated === null || ms > lastUpdated)) {
        lastUpdated = ms
      }
      const p = r.platform ?? "unknown"
      platformMap.set(p, (platformMap.get(p) ?? 0) + 1)
    }
    const platformCounts = [...platformMap.entries()]
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count)

    return { totalSignals, spikeCount, lastUpdated, platformCounts }
  }, [rows])
}
