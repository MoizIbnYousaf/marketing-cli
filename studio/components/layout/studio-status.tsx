"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import type { Activity } from "@/lib/types/activity"
import { useActivityLiveStore } from "@/lib/stores/activity-live"
import { resolveStudioApiBase } from "@/lib/studio-api-base"

interface HealthResponse {
  ok?: boolean
  version?: string
  ts?: string
}

interface ActivityResponse {
  ok?: boolean
  data?: Activity[]
}

async function timedFetchJson<T>(url: string): Promise<{ data: T; latencyMs: number }> {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now()
  const res = await fetch(url)
  const data = (await res.json()) as T
  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now()
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { latencyMs: t1 - t0 })
  return { data, latencyMs: t1 - t0 }
}

type StudioState = "up" | "slow" | "down"

function studioClasses(state: StudioState): { dot: string; label: string } {
  switch (state) {
    case "up":
      return { dot: "bg-emerald-500", label: "studio" }
    case "slow":
      return { dot: "bg-amber-500", label: "studio · slow" }
    case "down":
      return { dot: "bg-rose-500", label: "studio down" }
  }
}

function relativeAgo(iso: string | undefined): string | null {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diff) || diff < 0) return null
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function StudioStatus() {
  const connected = useActivityLiveStore((s) => s.connected)
  const [state, setState] = useState<StudioState>("up")
  const [studioApiBase, setStudioApiBase] = useState<string>("")
  const lastLatency = useRef<number>(0)

  useEffect(() => {
    setStudioApiBase(resolveStudioApiBase())
  }, [])

  const { data: health } = useSWR<{ data: HealthResponse; latencyMs: number }>(
    studioApiBase ? `${studioApiBase}/api/health` : null,
    timedFetchJson,
    { refreshInterval: 30_000, revalidateOnFocus: false, shouldRetryOnError: false },
  )

  useEffect(() => {
    if (connected) {
      setState("up")
      return
    }
    if (!health) return
    lastLatency.current = health.latencyMs
    if (health.data?.ok !== true) setState("down")
    else if (health.latencyMs > 1000) setState("slow")
    else setState("up")
  }, [health])

  // If the fetcher throws, SWR's data stays undefined. Fall back to "down"
  // after the first interval by watching `isValidating` idle state.
  useEffect(() => {
    if (connected) return
    if (!health) {
      const t = setTimeout(() => {
        if (!health && !connected) setState("down")
      }, 5000)
      return () => clearTimeout(t)
    }
    return undefined
  }, [connected, health])

  const { data: activityFrame } = useSWR<ActivityResponse>(
    studioApiBase ? `${studioApiBase}/api/activity?limit=1` : null,
    async (url: string) => {
      const res = await fetch(url)
      return res.json() as Promise<ActivityResponse>
    },
    { refreshInterval: 30_000, revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const latestActivity = activityFrame?.data?.[0]
  const cmoAgo = relativeAgo(latestActivity?.createdAt)
  const cmoDotColor = cmoAgo
    ? latestActivity && ["skill-run", "brand-write", "publish"].includes(latestActivity.kind)
      ? "bg-violet-500"
      : "bg-muted-foreground/40"
    : "bg-muted-foreground/25"

  const { dot, label } = studioClasses(state)
  const title = state === "up"
    ? `Bun server responding in ${Math.round(lastLatency.current)}ms`
    : state === "slow"
      ? `Server slow: ${Math.round(lastLatency.current)}ms`
      : "Server not responding"

  return (
    <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:flex" title={title}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
      <span className="text-border">|</span>
      <span className={`size-1.5 rounded-full ${cmoDotColor}`} />
      <span>
        /cmo {cmoAgo ? `active ${cmoAgo}` : "idle"}
      </span>
    </div>
  )
}
