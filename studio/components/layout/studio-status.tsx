"use client"

import useSWR from "swr"
import type { Activity } from "@/lib/types/activity"
import { fetcher } from "@/lib/fetcher"
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

function activityTime(iso: string | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return null
  return `${date.toISOString().slice(11, 16)} UTC`
}

export function StudioStatus() {
  const connected = useActivityLiveStore((s) => s.connected)
  const studioApiBase = resolveStudioApiBase()

  const { data: health, error: healthError } = useSWR<{ data: HealthResponse; latencyMs: number }>(
    `${studioApiBase}/api/health`,
    timedFetchJson,
    { refreshInterval: 30_000, revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const { data: activityFrame, error: activityError } = useSWR<ActivityResponse>(
    `${studioApiBase}/api/activity?limit=1`,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false, shouldRetryOnError: false },
  )

  const latestActivity = activityFrame?.data?.[0]
  const cmoAgo = activityTime(latestActivity?.createdAt)
  // Distinguish errored-to-undefined from idle: a fetch failure flips the
  // /cmo dot to a muted rose so the user sees the chrome is stale.
  const cmoDotColor = activityError
    ? "bg-rose-500/70"
    : cmoAgo
    ? latestActivity && ["skill-run", "brand-write", "publish"].includes(latestActivity.kind)
      ? "bg-violet-500"
      : "bg-muted-foreground/40"
    : "bg-muted-foreground/25"

  const state: StudioState = connected
    ? "up"
    : healthError || health?.data?.ok === false
      ? "down"
      : health && health.latencyMs > 1000
        ? "slow"
        : "up"
  const latency = health?.latencyMs ?? 0
  const { dot, label } = studioClasses(state)
  const title = state === "up"
    ? `Bun server responding in ${Math.round(latency)}ms`
    : state === "slow"
      ? `Server slow: ${Math.round(latency)}ms`
      : "Server not responding"

  return (
    <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:flex" title={title}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      <span>{label}</span>
      <span className="text-border">|</span>
      <span className={`size-1.5 rounded-full ${cmoDotColor}`} />
      <span>
        /cmo {cmoAgo ? `active at ${cmoAgo}` : "idle"}
      </span>
    </div>
  )
}
