"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Activity as ActivityIcon, RefreshCw, Wifi, WifiOff } from "lucide-react"
import { ActivityItem } from "./activity-item"
import { ActivityFilters } from "./activity-filters"
import type { Activity, ActivityKind } from "@/lib/types/activity"
import { useActivityLiveStore } from "@/lib/stores/activity-live"
import { ErrorState } from "@/components/ui/error-state"

async function fetcher(url: string): Promise<Activity[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch activity")
  const json = await res.json()
  return json.data ?? []
}

// Default to same-origin so Next.js rewrites forward /api/* → Bun (:3001).
// Only override with NEXT_PUBLIC_STUDIO_API_BASE when you intentionally point
// the dashboard at a remote studio server.
const STUDIO_API_BASE = process.env.NEXT_PUBLIC_STUDIO_API_BASE?.replace(/\/$/, "") ?? ""

function buildUrl(base: string, kind: ActivityKind | "all", skill: string, timeWindow: string): string {
  const params = new URLSearchParams()
  if (kind !== "all") params.set("kind", kind)
  if (skill) params.set("skill", skill)
  if (timeWindow !== "all") params.set("window", timeWindow)
  params.set("limit", "50")
  return `${base}?${params.toString()}`
}

interface ActivityPanelProps {
  /** Reserved for future group-scoped filtering. Currently the feed is global. */
  groupId?: string
}

export function ActivityPanel(_props: ActivityPanelProps = {}) {
  const [kind, setKind] = useState<ActivityKind | "all">("all")
  const [skill, setSkill] = useState("")
  const [timeWindow, setTimeWindow] = useState("24h")

  const liveItems = useActivityLiveStore((s) => s.items)
  const connected = useActivityLiveStore((s) => s.connected)
  const clearLive = useActivityLiveStore((s) => s.clear)

  const apiUrl = buildUrl(`${STUDIO_API_BASE}/api/activity`, kind, skill, timeWindow)

  const { data: fetched, error, mutate, isLoading } = useSWR<Activity[]>(apiUrl, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  })

  const visible = useMemo(() => {
    const base = fetched ?? []
    const liveIds = new Set(liveItems.map((a) => a.id))
    const baseDeduped = base.filter((a) => !liveIds.has(a.id))
    const merged = [...liveItems, ...baseDeduped]
    return merged.filter((a) => {
      if (kind !== "all" && a.kind !== kind) return false
      if (skill) {
        const needle = skill.toLowerCase()
        const hit =
          a.skill?.toLowerCase().includes(needle) ||
          a.summary.toLowerCase().includes(needle)
        if (!hit) return false
      }
      return true
    }).slice(0, 100)
  }, [fetched, liveItems, kind, skill])

  return (
    <aside
      aria-label="/cmo activity feed"
      className="flex flex-col h-full w-full overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <ActivityIcon className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">/cmo Activity</span>
          {connected ? (
            <Wifi className="size-3 text-emerald-500" />
          ) : (
            <WifiOff className="size-3 text-muted-foreground/40" />
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            mutate()
            clearLive()
          }}
          className="p-1 rounded hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          title="Refresh activity"
          aria-label="Refresh activity feed"
        >
          <RefreshCw className={`size-3.5 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <ActivityFilters
        kind={kind}
        onKindChange={setKind}
        skill={skill}
        onSkillChange={setSkill}
        timeWindow={timeWindow}
        onTimeWindowChange={setTimeWindow}
      />

      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="/cmo activity feed"
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        {error && visible.length === 0 ? (
          <div className="px-3 py-3">
            <ErrorState
              level="section"
              error={error}
              onRetry={() => mutate()}
              title="Couldn't load activity"
            />
          </div>
        ) : isLoading && visible.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
            Loading…
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground/60">
            <ActivityIcon className="size-5" />
            <p className="text-xs">No activity yet</p>
            <p className="text-[10px]">/cmo will log here when it runs skills</p>
          </div>
        ) : (
          <ul>
            {visible.map((a) => (
              <li key={`${a.id}-${a.createdAt}`}>
                <ActivityItem activity={a} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-border/40">
        <p className="text-[10px] text-muted-foreground/50">
          {visible.length} event{visible.length !== 1 ? "s" : ""} shown
          {liveItems.length > 0 && ` · ${liveItems.length} live`}
        </p>
      </div>
    </aside>
  )
}
