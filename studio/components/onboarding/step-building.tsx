"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type LaneStatus = "pending" | "queued" | "running" | "done" | "error"

type AgentKey = "brand-researcher" | "audience-researcher" | "competitive-scanner"
type LaneId = "brand" | "audience" | "competitors"

interface Lane {
  id: LaneId
  agentKey: AgentKey
  label: string
  icon: string
  file: string
  status: LaneStatus
  detail?: string
  errorMessage?: string
  filesChanged?: string[]
}

interface FoundationProgressPayload {
  agent: string
  status: "queued" | "running" | "complete" | "failed"
  filesChanged?: string[]
  error?: string
}

interface FoundationCompletePayload {
  durationMs?: number
  successes?: number
  failures?: number
}

interface EventEnvelope {
  type: string
  payload?: unknown
}

interface Props {
  onDone: () => void
}

const STUDIO_API_BASE =
  process.env.NEXT_PUBLIC_STUDIO_API_BASE?.replace(/\/$/, "") ?? ""

const DEMO_MODE = process.env.NEXT_PUBLIC_STUDIO_DEMO === "1"

const INITIAL_LANES: Lane[] = [
  {
    id: "brand",
    agentKey: "brand-researcher",
    label: "Brand voice",
    icon: "🧠",
    file: "brand/voice-profile.md",
    status: "pending",
  },
  {
    id: "audience",
    agentKey: "audience-researcher",
    label: "Audience",
    icon: "👥",
    file: "brand/audience.md",
    status: "pending",
  },
  {
    id: "competitors",
    agentKey: "competitive-scanner",
    label: "Competitors",
    icon: "🥊",
    file: "brand/competitors.md",
    status: "pending",
  },
]

function agentToLaneId(agent: string): LaneId | null {
  if (!agent) return null
  const a = agent.toLowerCase()
  if (a.includes("brand")) return "brand"
  if (a.includes("audience")) return "audience"
  if (a.includes("competitive") || a.includes("competitor")) return "competitors"
  return null
}

function statusLabel(status: LaneStatus): string {
  switch (status) {
    case "pending": return "Waiting"
    case "queued": return "Queued"
    case "running": return "Researching…"
    case "done": return "Complete"
    case "error": return "Failed"
  }
}

function LaneRow({ lane }: { lane: Lane }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 transition-colors",
        lane.status === "done" && "border-emerald-500/30 bg-emerald-500/5",
        (lane.status === "running" || lane.status === "queued") && "border-primary/30 bg-primary/5",
        lane.status === "error" && "border-destructive/30 bg-destructive/5",
        lane.status === "pending" && "border-border bg-muted/30",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{lane.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{lane.label}</p>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {statusLabel(lane.status)}
            </span>
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">{lane.file}</p>
          {lane.detail && lane.status !== "error" && (
            <p className="mt-0.5 text-xs text-muted-foreground">{lane.detail}</p>
          )}
        </div>
        <div className="shrink-0">
          {lane.status === "pending" && (
            <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
          )}
          {lane.status === "queued" && (
            <div className="size-4 rounded-full border-2 border-primary/40 border-dashed animate-pulse" />
          )}
          {lane.status === "running" && (
            <Loader2 className="size-4 animate-spin text-primary" />
          )}
          {lane.status === "done" && (
            <CheckCircle2 className="size-4 text-emerald-500" />
          )}
          {lane.status === "error" && (
            <AlertCircle className="size-4 text-destructive" />
          )}
        </div>
      </div>

      {lane.status === "error" && lane.errorMessage && (
        <p className="mt-2 font-mono text-[11px] text-destructive/80">{lane.errorMessage}</p>
      )}

      {lane.status === "done" && lane.filesChanged && lane.filesChanged.length > 0 && (
        <ul className="mt-2 ml-8 space-y-0.5">
          {lane.filesChanged.map((f) => (
            <li key={f} className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// A17 / H1-02: hard limit on how long the user watches "Reconnecting…"
// before we offer Retry / Skip. 15s is plenty under normal conditions
// (typical onopen fires within a few hundred ms) and covers transient
// flakiness without tipping into "is this thing even working?" anxiety.
const SSE_CONNECT_TIMEOUT_MS = 15_000

export function StepBuilding({ onDone }: Props) {
  const [lanes, setLanes] = useState<Lane[]>(INITIAL_LANES)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [retrying, setRetrying] = useState(false)
  // A17: tracks the "SSE never opened within the budget" state. UI
  // separates this from `connected=false` (transient reconnect) so we
  // can offer Retry + Skip only for persistent failures.
  const [sseTimedOut, setSseTimedOut] = useState(false)
  const [esGeneration, setEsGeneration] = useState(0)
  const esRef = useRef<EventSource | null>(null)
  const demoTimersRef = useRef<number[]>([])

  const applyProgress = useCallback((payload: FoundationProgressPayload) => {
    const laneId = agentToLaneId(payload.agent)
    if (!laneId) return
    setLanes((prev) =>
      prev.map((l) => {
        if (l.id !== laneId) return l
        if (payload.status === "queued") {
          return { ...l, status: "queued", detail: "Queued for /cmo" }
        }
        if (payload.status === "running") {
          return { ...l, status: "running", detail: "Researching with /cmo…" }
        }
        if (payload.status === "complete") {
          return {
            ...l,
            status: "done",
            detail: undefined,
            filesChanged: payload.filesChanged ?? [l.file],
            errorMessage: undefined,
          }
        }
        if (payload.status === "failed") {
          return {
            ...l,
            status: "error",
            errorMessage: payload.error ?? "Agent failed without an error message.",
          }
        }
        return l
      }),
    )
  }, [])

  const runDemoStream = useCallback(() => {
    // Simulate the server event shape locally for UI preview.
    const stages: Array<{ delay: number; event: EventEnvelope }> = [
      { delay: 250, event: { type: "foundation:progress", payload: { agent: "mktg-brand-researcher", status: "queued" } } },
      { delay: 400, event: { type: "foundation:progress", payload: { agent: "mktg-audience-researcher", status: "queued" } } },
      { delay: 550, event: { type: "foundation:progress", payload: { agent: "mktg-competitive-scanner", status: "queued" } } },
      { delay: 900, event: { type: "foundation:progress", payload: { agent: "mktg-brand-researcher", status: "running" } } },
      { delay: 1100, event: { type: "foundation:progress", payload: { agent: "mktg-audience-researcher", status: "running" } } },
      { delay: 1400, event: { type: "foundation:progress", payload: { agent: "mktg-competitive-scanner", status: "running" } } },
      { delay: 2200, event: { type: "foundation:progress", payload: { agent: "mktg-brand-researcher", status: "complete", filesChanged: ["brand/voice-profile.md"] } } },
      { delay: 2600, event: { type: "foundation:progress", payload: { agent: "mktg-audience-researcher", status: "complete", filesChanged: ["brand/audience.md"] } } },
      { delay: 3100, event: { type: "foundation:progress", payload: { agent: "mktg-competitive-scanner", status: "complete", filesChanged: ["brand/competitors.md"] } } },
      { delay: 3300, event: { type: "foundation:complete", payload: { durationMs: 3050, successes: 3, failures: 0 } } },
    ]
    for (const s of stages) {
      const id = window.setTimeout(() => handleEnvelope(s.event), s.delay)
      demoTimersRef.current.push(id)
    }
    setConnected(true)
  }, [])

  const handleEnvelope = useCallback(
    (envelope: EventEnvelope) => {
      if (envelope.type === "foundation:progress") {
        applyProgress(envelope.payload as FoundationProgressPayload)
        return
      }
      if (envelope.type === "foundation:complete") {
        const payload = (envelope.payload ?? {}) as FoundationCompletePayload
        setLanes((prev) => {
          const anyFailed = prev.some((l) => l.status === "error")
          if (!anyFailed && (payload.failures ?? 0) === 0) {
            window.setTimeout(onDone, 600)
          }
          return prev
        })
      }
    },
    [applyProgress, onDone],
  )

  const start = useCallback(async () => {
    setError(null)
    setRetrying(false)
    setLanes(INITIAL_LANES)

    if (DEMO_MODE) {
      runDemoStream()
      return
    }

    try {
      const res = await fetch(`${STUDIO_API_BASE}/api/onboarding/foundation`, { method: "POST" })
      if (!res.ok) {
        setError(`Couldn't start foundation agents (HTTP ${res.status}). Retry or check the server.`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Server unreachable. Retry or check that the studio server is running on :3001.")
    }
  }, [runDemoStream])

  useEffect(() => {
    if (DEMO_MODE) {
      start()
      return () => {
        for (const id of demoTimersRef.current) window.clearTimeout(id)
        demoTimersRef.current = []
      }
    }

    start()

    const es = new EventSource(`${STUDIO_API_BASE}/api/events`)
    esRef.current = es

    // A17 / H1-02: if onopen never fires, the wizard previously sat on
    // "Reconnecting…" forever. Race the connection against a 15s budget.
    let opened = false
    const timeoutId = window.setTimeout(() => {
      if (!opened) setSseTimedOut(true)
    }, SSE_CONNECT_TIMEOUT_MS)

    es.onopen = () => {
      opened = true
      window.clearTimeout(timeoutId)
      setConnected(true)
      setSseTimedOut(false)
    }
    es.onerror = () => setConnected(false)

    es.onmessage = (ev: MessageEvent) => {
      try {
        const envelope = JSON.parse(ev.data) as EventEnvelope
        if (envelope.type === "connected") {
          opened = true
          window.clearTimeout(timeoutId)
          setConnected(true)
          setSseTimedOut(false)
          return
        }
        if (envelope.type && envelope.type.startsWith("foundation:")) {
          handleEnvelope(envelope)
        }
      } catch {
        // ignore malformed frames
      }
    }

    return () => {
      window.clearTimeout(timeoutId)
      es.close()
      esRef.current = null
      setConnected(false)
    }
    // esGeneration in deps lets handleRetrySse remount the stream cleanly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esGeneration])

  async function handleRetry() {
    setRetrying(true)
    for (const id of demoTimersRef.current) window.clearTimeout(id)
    demoTimersRef.current = []
    await start()
  }

  // A17 / H1-02: explicitly retry the SSE connection after a timeout.
  // Bumping esGeneration triggers the effect to tear down + re-open.
  function handleRetrySse() {
    setSseTimedOut(false)
    setRetrying(true)
    setEsGeneration((n) => n + 1)
    // Retrying indicator only needs to show for a beat: the effect
    // clears the flag once connection lands or re-times-out.
    window.setTimeout(() => setRetrying(false), 500)
  }

  // Let the user bail from the live-progress dependency and move on to
  // the finished state without it. Foundation may still complete on the
  // server; when the user returns to the dashboard the Activity panel
  // will already have the completions.
  function handleSkipSse() {
    esRef.current?.close()
    esRef.current = null
    onDone()
  }

  const anyFailed = lanes.some((l) => l.status === "error")
  const allDone = lanes.every((l) => l.status === "done")

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Building your marketing brain…
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Three research agents are running in parallel. Each writes a brand
          file to disk. This takes 60–90 seconds.
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {connected ? (
            <>
              <Wifi className="size-3 text-emerald-500" />
              Live stream connected
            </>
          ) : sseTimedOut ? (
            <>
              <WifiOff className="size-3 text-amber-500" />
              Live stream unavailable
            </>
          ) : (
            <>
              <WifiOff className="size-3 text-muted-foreground/50" />
              Reconnecting…
            </>
          )}
        </span>
        {allDone && (
          <span className="text-emerald-600 dark:text-emerald-400">All three complete. Advancing…</span>
        )}
      </div>

      {sseTimedOut && !connected && (
        <div
          role="alert"
          className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-3 text-xs"
        >
          <p className="font-medium text-amber-700 dark:text-amber-300">
            Couldn&apos;t reach the live stream.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Foundation may still complete on the server. Retry the connection, or continue
            without live progress. You&apos;ll see the results on the dashboard when they&apos;re done.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleRetrySse}
              disabled={retrying}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {retrying ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
              Retry
            </Button>
            <Button
              onClick={handleSkipSse}
              size="sm"
              variant="ghost"
            >
              Continue without live progress
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {lanes.map((lane) => (
          <LaneRow key={lane.id} lane={lane} />
        ))}
      </div>

      {(error || anyFailed) && (
        <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3">
          {error && <p className="text-xs text-destructive">{error}</p>}
          {anyFailed && !error && (
            <p className="text-xs text-destructive">
              One or more agents failed. You can retry, or continue and re-run them later from the
              dashboard.
            </p>
          )}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRetry}
              disabled={retrying}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              {retrying ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
              Retry
            </Button>
            <Button onClick={onDone} size="sm" variant="ghost">
              Skip for now
            </Button>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        /cmo is orchestrating; you&apos;ll move on automatically when all three complete.
      </p>
    </div>
  )
}
