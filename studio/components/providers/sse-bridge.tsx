"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useSWRConfig } from "swr"
import { useWorkspaceStore, type WorkspaceTab } from "@/lib/stores/workspace"
import { useActivityLiveStore } from "@/lib/stores/activity-live"
import type { Activity } from "@/lib/types/activity"
import { withStudioToken } from "@/lib/studio-token"

// Wire type accepts pre-rename ids ("hq", "content") for one-release compat
// with /cmo callers that still send the old strings. The handler normalizes
// them to canonical WorkspaceTab values before dispatching to the store.
type WireTab = WorkspaceTab | "hq" | "content"

type SSEEvent =
  | { type: "navigate"; payload: { tab: WireTab; filter?: Record<string, unknown> | null } }
  | { type: "toast"; payload: { level: "success" | "error" | "info" | "warning" | "warn"; message: string; duration?: number } }
  | { type: "brand-file-changed"; payload: { file: string; url?: string } }
  | { type: "activity-new"; payload: Activity }
  | { type: "activity-deleted"; payload: { id: number } }
  | { type: "connected"; payload?: unknown }
  | { type: string; payload: unknown }

// Default to same-origin so Next.js rewrites forward /api/* → Bun.
const STUDIO_API_BASE = process.env.NEXT_PUBLIC_STUDIO_API_BASE?.replace(/\/$/, "") ?? ""

// Reconnect policy -- bounded exponential backoff, capped so a long outage
// still gets a recheck every 30s.
const RECONNECT_MIN_MS = 1_000
const RECONNECT_MAX_MS = 30_000
const RECONNECT_GROWTH = 1.6

export function SSEBridge() {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const setWorkspaceTab = useWorkspaceStore((s) => s.setWorkspaceTab)
  const setSignalFilters = useWorkspaceStore((s) => s.setSignalFilters)
  const pushActivity = useActivityLiveStore((s) => s.push)
  const setConnected = useActivityLiveStore((s) => s.setConnected)

  // Stable handler refs -- read from latest values without tearing down the
  // EventSource on every render. The channel owns its lifecycle; the
  // handlers update in place via the ref.
  const handlersRef = useRef({ router, mutate, setWorkspaceTab, setSignalFilters, pushActivity, setConnected })
  handlersRef.current = { router, mutate, setWorkspaceTab, setSignalFilters, pushActivity, setConnected }

  useEffect(() => {
    let closed = false
    let es: EventSource | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectDelay = RECONNECT_MIN_MS
    // Track when we last saw the channel healthy. `onerror` fires in both
    // the transient "browser is auto-retrying" case and the stuck-in-
    // CONNECTING case; we only force a manual reconnect if the error
    // persists past a short grace window.
    let lastOpenAt = 0

    // Dedupe across reconnects -- server may replay a few events on resubscribe;
    // we keep a small ring of seen activity IDs and skip them.
    const seenActivityIds = new Set<number>()
    const SEEN_CAP = 500

    function rememberActivity(id: number) {
      seenActivityIds.add(id)
      if (seenActivityIds.size > SEEN_CAP) {
        // Drop oldest by re-creating from a slice -- Set has insertion order.
        const trimmed = Array.from(seenActivityIds).slice(-Math.floor(SEEN_CAP * 0.8))
        seenActivityIds.clear()
        for (const v of trimmed) seenActivityIds.add(v)
      }
    }

    function scheduleReconnect() {
      if (closed) return
      if (reconnectTimer) return
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        reconnectDelay = Math.min(RECONNECT_MAX_MS, Math.floor(reconnectDelay * RECONNECT_GROWTH))
        connect()
      }, reconnectDelay)
    }

    function connect() {
      if (closed) return
      try {
        // EventSource cannot set Authorization headers from JS, so the
        // bearer travels in the query string. Lane 1 / Wave A.
        es = new EventSource(withStudioToken(`${STUDIO_API_BASE}/api/events`))
      } catch {
        scheduleReconnect()
        return
      }

      es.onopen = () => {
        if (closed) return
        reconnectDelay = RECONNECT_MIN_MS
        lastOpenAt = Date.now()
        handlersRef.current.setConnected(true)
      }

      es.onerror = () => {
        if (closed) return
        handlersRef.current.setConnected(false)
        if (!es) return
        // Browser reopens EventSource on its own for transient network blips,
        // but we've seen two failure modes that the browser does NOT recover
        // from on its own:
        //   1. Server explicitly closed (dev restart)   → readyState = CLOSED
        //   2. Auto-reconnect stuck in CONNECTING state → readyState = 0
        //      (observed during Bug #8 repro: subs drops to 0, stays 0)
        // For (1) we always force a manual reconnect. For (2) we force a
        // reconnect if the channel had been open for ≥1s before this error
        // (filters out the transient double-fire at initial connect).
        const stuckConnecting =
          es.readyState === EventSource.CONNECTING &&
          lastOpenAt > 0 &&
          Date.now() - lastOpenAt >= 1_000
        if (es.readyState === EventSource.CLOSED || stuckConnecting) {
          es.close()
          es = null
          scheduleReconnect()
        }
      }

      es.onmessage = (e: MessageEvent) => {
        if (closed) return
        let event: SSEEvent
        try {
          event = JSON.parse(e.data) as SSEEvent
        } catch {
          return
        }

        const h = handlersRef.current

        switch (event.type) {
          case "connected": {
            h.setConnected(true)
            return
          }
          case "navigate": {
            const { tab, filter } = (event as Extract<SSEEvent, { type: "navigate" }>).payload
            // Normalize legacy ids ("hq", "content") from /cmo callers that
            // haven't rolled to the post-rename tab names yet.
            const canonicalTab =
              tab === "hq" ? "pulse" :
              tab === "content" ? "signals" :
              tab
            h.setWorkspaceTab(canonicalTab)
            const { mode, ...signalFilter } = filter ?? {}
            if (Object.keys(signalFilter).length > 0) {
              h.setSignalFilters(signalFilter as Parameters<typeof h.setSignalFilters>[0])
            }
            // Mirror keyboard-chord URL behavior so bookmarks + Playwright
            // assertions see the same tab.
            h.router.push(
              canonicalTab === "pulse"
                ? "/dashboard"
                : `/dashboard?tab=${canonicalTab}`,
            )
            return
          }
          case "toast": {
            const { level, message, duration } = (event as Extract<SSEEvent, { type: "toast" }>).payload
            const opts = duration ? { duration } : undefined
            if (level === "success") toast.success(message, opts)
            else if (level === "error") toast.error(message, opts)
            else if (level === "warning" || level === "warn") toast.warning(message, opts)
            else toast.info(message, opts)
            return
          }
          case "brand-file-changed": {
            const { url } = (event as Extract<SSEEvent, { type: "brand-file-changed" }>).payload
            h.mutate(url ?? ((key: unknown) => typeof key === "string" && key.startsWith("/api/")))
            return
          }
          case "activity-new": {
            const activity = (event as Extract<SSEEvent, { type: "activity-new" }>).payload
            if (typeof activity?.id === "number") {
              if (seenActivityIds.has(activity.id)) return
              rememberActivity(activity.id)
            }
            h.pushActivity(activity)
            return
          }
          case "activity-deleted": {
            // Bust the activity list cache; the store filters by id automatically.
            h.mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/activity"))
            return
          }
          case "opportunity-new": {
            h.mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/opportunities"))
            return
          }
          case "skill-start":
          case "skill-complete": {
            h.mutate((key: unknown) => typeof key === "string" && (key.startsWith("/api/activity") || key.startsWith("/api/opportunities")))
            return
          }
          case "publish-completed": {
            h.mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/publish"))
            return
          }
          case "highlight": {
            // Reserved for future spotlight UI; no-op for now.
            return
          }
          case "foundation:progress":
          case "foundation:complete": {
            h.mutate((key: unknown) => typeof key === "string" && (key.startsWith("/api/onboarding") || key.startsWith("/api/brand")))
            return
          }
          case "job:created":
          case "job:log":
          case "job:completed":
          case "job:failed":
          case "job:cancelled": {
            h.mutate((key: unknown) => typeof key === "string" && key.startsWith("/api/jobs"))
            return
          }
        }
      }
    }

    connect()

    return () => {
      closed = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      if (es) {
        es.close()
        es = null
      }
      handlersRef.current.setConnected(false)
    }
    // Empty deps -- the channel lives for the lifetime of the bridge mount.
    // All call-site dependencies are read via handlersRef.current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
