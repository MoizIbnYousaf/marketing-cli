"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import {
  SignalFeedToolbar,
  type PlatformFilter,
  type SortBy,
  type StreamFilter,
  type TimeWindowFilter,
} from "./signal-feed-toolbar"
import { SignalList } from "./signal-list"
import { SignalDetailPanel } from "./signal-detail-panel"
import { getDisplayHandle } from "./signal-display"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Signal } from "@/lib/types/signals"
import { useWorkspaceStore } from "@/lib/stores/workspace"
import { dataFetcher } from "@/lib/fetcher"
import { useSignalStats } from "@/lib/hooks/use-signal-stats"
import { TabErrorState } from "../tab-error-state"

const SEVERITY_ORDER: Record<string, number> = {
  p0: 0,
  p1: 1,
  negative: 2,
  watch: 3,
}

const HOUR = 60 * 60 * 1000

function sortSignals(signals: Signal[], sortBy: SortBy): Signal[] {
  return [...signals].sort((a, b) => {
    if (sortBy === "priority") {
      const aSev = a.severity ? (SEVERITY_ORDER[a.severity] ?? 99) : 99
      const bSev = b.severity ? (SEVERITY_ORDER[b.severity] ?? 99) : 99
      if (aSev !== bSev) return aSev - bSev
      return b.capturedAt - a.capturedAt
    }
    if (sortBy === "reach") {
      const aReach = a.metrics?.views ?? a.metrics?.likes ?? 0
      const bReach = b.metrics?.views ?? b.metrics?.likes ?? 0
      return bReach - aReach
    }
    // recency (default)
    return b.capturedAt - a.capturedAt
  })
}

function interleaveBySource(signals: Signal[]): Signal[] {
  const buckets = new Map<string, Signal[]>()
  const order: string[] = []

  for (const signal of signals) {
    const sourceKey = `${signal.platform}:${getDisplayHandle(signal.authorHandle, signal.canonicalUrl) ?? "unknown"}`
    if (!buckets.has(sourceKey)) {
      buckets.set(sourceKey, [])
      order.push(sourceKey)
    }
    buckets.get(sourceKey)!.push(signal)
  }

  const result: Signal[] = []
  let progressed = true
  while (progressed) {
    progressed = false
    for (const key of order) {
      const bucket = buckets.get(key)
      if (!bucket || bucket.length === 0) continue
      const next = bucket.shift()
      if (!next) continue
      result.push(next)
      progressed = true
    }
  }

  return result
}

function diversifyTopWindow(
  signals: Signal[],
  topWindowSize: number = 30,
  maxPerSourceInWindow: number = 5
): Signal[] {
  if (signals.length <= topWindowSize) return signals

  const sourceCounts = new Map<string, number>()
  const prioritized: Signal[] = []
  const deferred: Signal[] = []

  for (const signal of signals) {
    if (prioritized.length >= topWindowSize) {
      deferred.push(signal)
      continue
    }

    const sourceKey = `${signal.platform}:${getDisplayHandle(signal.authorHandle, signal.canonicalUrl) ?? "unknown"}`
    const currentCount = sourceCounts.get(sourceKey) ?? 0

    if (currentCount >= maxPerSourceInWindow) {
      deferred.push(signal)
      continue
    }

    sourceCounts.set(sourceKey, currentCount + 1)
    prioritized.push(signal)
  }

  return [...prioritized, ...deferred]
}

function normalizeTikTokStream(value: Signal["stream"]): Exclude<StreamFilter, "all"> {
  if (value === "trending" || value === "explore") return value
  return "hashtag"
}

export function SignalInbox() {
  const selectedSignalId = useWorkspaceStore((s) => s.selectedSignalId)
  const signalFilters = useWorkspaceStore((s) => s.signalFilters)
  const setSignalFilters = useWorkspaceStore((s) => s.setSignalFilters)
  const setSelectedSignalId = useWorkspaceStore((s) => s.setSelectedSignalId)
  const [sortBy, setSortBy] = useState<SortBy>("priority")
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  const {
    data: allSignalsRaw,
    error: signalsError,
    mutate: refetchSignals,
  } = useSWR<Signal[]>("/api/signals", dataFetcher)
  const stats = useSignalStats()

  // G4-65 guard: the /api/signals endpoint can briefly return non-array
  // shapes (error envelope slipping through, empty stub). Narrowing to an
  // array here saves every downstream .filter/.map/for-of.
  const allSignals = useMemo<Signal[]>(
    () => (Array.isArray(allSignalsRaw) ? allSignalsRaw : []),
    [allSignalsRaw],
  )

  const streamCounts = useMemo(() => {
    const counts = { hashtag: 0, trending: 0, explore: 0 }
    for (const signal of allSignals) {
      if (signal.platform !== "tiktok") continue
      const stream = normalizeTikTokStream(signal.stream)
      counts[stream] += 1
    }
    return counts
  }, [allSignals])

  const freshestCapturedAt = useMemo(() => {
    let newest = 0
    for (const signal of allSignals) {
      if (signal.capturedAt > newest) newest = signal.capturedAt
    }
    return newest
  }, [allSignals])

  const platformAndStreamFiltered = useMemo(() => {
    const platformFiltered =
      signalFilters.platform === "all"
        ? allSignals
        : allSignals.filter((s) => s.platform === signalFilters.platform)

    return signalFilters.stream === "all"
      ? platformFiltered
      : platformFiltered.filter(
        (signal) =>
          signal.platform === "tiktok"
          && normalizeTikTokStream(signal.stream) === signalFilters.stream
      )
  }, [allSignals, signalFilters.platform, signalFilters.stream])

  const timelineCounts = useMemo(() => {
    const liveThreshold = freshestCapturedAt - 2 * HOUR
    const risingThreshold = freshestCapturedAt - 8 * HOUR
    const contextThreshold = freshestCapturedAt - 24 * HOUR

    let live2h = 0
    let rising8h = 0
    let context24h = 0

    for (const signal of platformAndStreamFiltered) {
      const capturedAt = signal.capturedAt ?? 0
      if (freshestCapturedAt > 0 && capturedAt >= liveThreshold) live2h += 1
      if (freshestCapturedAt > 0 && capturedAt >= risingThreshold) rising8h += 1
      if (freshestCapturedAt > 0 && capturedAt >= contextThreshold) context24h += 1
    }

    return {
      live_2h: live2h,
      rising_8h: rising8h,
      context_24h: context24h,
      all: platformAndStreamFiltered.length,
    }
  }, [freshestCapturedAt, platformAndStreamFiltered])

  const filteredSignals = useMemo(() => {
    const threshold =
      freshestCapturedAt <= 0
        ? null
        : signalFilters.timeWindow === "live_2h"
          ? freshestCapturedAt - 2 * HOUR
          : signalFilters.timeWindow === "rising_8h"
            ? freshestCapturedAt - 8 * HOUR
            : signalFilters.timeWindow === "context_24h"
              ? freshestCapturedAt - 24 * HOUR
              : null
    const timelineFiltered =
      threshold === null || signalFilters.timeWindow === "all"
        ? platformAndStreamFiltered
        : platformAndStreamFiltered.filter((signal) => (signal.capturedAt ?? 0) >= threshold)

    const sorted = sortSignals(timelineFiltered, sortBy)
    if (signalFilters.platform === "all" && signalFilters.stream === "all") {
      return diversifyTopWindow(interleaveBySource(sorted))
    }
    return diversifyTopWindow(sorted)
  }, [
    freshestCapturedAt,
    platformAndStreamFiltered,
    sortBy,
    signalFilters.platform,
    signalFilters.stream,
    signalFilters.timeWindow,
  ])

  const activeSelectedId = useMemo(() => {
    if (!selectedSignalId) return null
    return filteredSignals.some((signal) => signal.id === selectedSignalId)
      ? selectedSignalId
      : null
  }, [filteredSignals, selectedSignalId])

  useEffect(() => {
    if (selectedSignalId && !activeSelectedId) {
      setSelectedSignalId(null)
    }
  }, [activeSelectedId, selectedSignalId, setSelectedSignalId])

  const concentrationHint = useMemo(() => {
    const sample = filteredSignals.slice(0, 40)
    if (sample.length < 8) return null

    const counts = new Map<string, number>()
    for (const signal of sample) {
      const handle = getDisplayHandle(signal.authorHandle, signal.canonicalUrl)
      const key = handle ? `@${handle}` : signal.platform.toUpperCase()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    let topLabel: string | null = null
    let topCount = 0
    for (const [label, count] of counts) {
      if (count > topCount) {
        topLabel = label
        topCount = count
      }
    }

    if (!topLabel) return null
    const share = topCount / sample.length
    if (share < 0.35 || topCount < 12) return null
    return `Coverage warning: ${Math.round(share * 100)}% of this view is from ${topLabel}. Add broader sources in Data for better trend confidence.`
  }, [filteredSignals])

  const toolbar = (
    <SignalFeedToolbar
      platformFilter={signalFilters.platform}
      onPlatformChange={(nextPlatform) => {
        const nextState: Partial<{
          platform: PlatformFilter
          stream: StreamFilter
        }> = { platform: nextPlatform }
        if (nextPlatform !== "all" && nextPlatform !== "tiktok") {
          nextState.stream = "all"
        }
        setSignalFilters(nextState)
      }}
      streamFilter={signalFilters.stream}
      onStreamChange={(nextStream) => setSignalFilters({ stream: nextStream })}
      timeWindowFilter={signalFilters.timeWindow}
      onTimeWindowChange={(nextWindow: TimeWindowFilter) => setSignalFilters({ timeWindow: nextWindow })}
      sortBy={sortBy}
      onSortChange={setSortBy}
      totalSignals={stats?.totalSignals ?? 0}
      spikeCount={stats?.spikeCount ?? 0}
      lastUpdated={stats?.lastUpdated ?? null}
      platformCounts={stats?.platformCounts}
      streamCounts={streamCounts}
      timelineCounts={timelineCounts}
      concentrationHint={concentrationHint}
    />
  )

  if (signalsError && !allSignalsRaw) {
    return (
      <TabErrorState
        error={signalsError}
        onRetry={() => refetchSignals()}
        title="Couldn't load signals"
      />
    )
  }

  return (
    <>
      <div className="h-full min-h-0 xl:hidden">
        <div className="flex h-full min-h-0 flex-col">
          {toolbar}
          <div className="min-h-0 flex-1 overflow-hidden">
            <SignalList
              signals={filteredSignals}
              selectedId={activeSelectedId}
              onSelect={(nextId) => {
                setSelectedSignalId(nextId)
                setMobileDetailOpen(true)
              }}
              hasAnySignals={allSignals.length > 0}
            />
          </div>
        </div>
        <Sheet
          open={mobileDetailOpen && !!activeSelectedId}
          onOpenChange={(open) => {
            setMobileDetailOpen(open)
            if (!open) setSelectedSignalId(null)
          }}
        >
          <SheetContent side="bottom" className="h-[88dvh] rounded-t-3xl p-0">
            <div className="border-b border-border/70 px-4 pb-3 pt-4">
              <SheetTitle className="text-base">Signal details</SheetTitle>
              <SheetDescription>Review metrics, context, and source.</SheetDescription>
            </div>
            <div className="min-h-0 flex-1">
              <SignalDetailPanel signalId={activeSelectedId} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden h-full min-h-0 xl:block">
        <ResizablePanelGroup className="h-full min-h-0">
          <ResizablePanel defaultSize={42} minSize={30}>
            <div className="flex h-full min-h-0 flex-col">
              {toolbar}
              <div className="min-h-0 flex-1 overflow-hidden">
                <SignalList
                  signals={filteredSignals}
                  selectedId={activeSelectedId}
                  onSelect={(nextId) => setSelectedSignalId(nextId)}
                  hasAnySignals={allSignals.length > 0}
                />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={58} minSize={30}>
            <SignalDetailPanel signalId={activeSelectedId} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  )
}
