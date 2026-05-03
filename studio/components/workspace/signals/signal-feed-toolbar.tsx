"use client"

import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/formatTime"

const PLATFORM_FILTERS = [
  { id: "all", label: "All" },
  { id: "instagram", label: "IG" },
  { id: "tiktok", label: "TT" },
  { id: "news", label: "News" },
  { id: "google_trends", label: "Trends" },
] as const

const TIKTOK_STREAM_FILTERS = [
  { id: "all", label: "All TT" },
  { id: "hashtag", label: "Hashtag" },
  { id: "trending", label: "Trending" },
  { id: "explore", label: "Explore" },
] as const

const TIMELINE_FILTERS = [
  { id: "live_2h", label: "Live 2h" },
  { id: "rising_8h", label: "Rising 8h" },
  { id: "context_24h", label: "Context 24h" },
  { id: "all", label: "All time" },
] as const

export type PlatformFilter = (typeof PLATFORM_FILTERS)[number]["id"]
export type StreamFilter = (typeof TIKTOK_STREAM_FILTERS)[number]["id"]
export type TimeWindowFilter = (typeof TIMELINE_FILTERS)[number]["id"]
export type SortBy = "priority" | "recency" | "reach"

export function SignalFeedToolbar({
  platformFilter,
  onPlatformChange,
  streamFilter,
  onStreamChange,
  timeWindowFilter,
  onTimeWindowChange,
  sortBy,
  onSortChange,
  totalSignals,
  spikeCount,
  lastUpdated,
  platformCounts,
  streamCounts,
  timelineCounts,
  concentrationHint,
}: {
  platformFilter: PlatformFilter
  onPlatformChange: (platform: PlatformFilter) => void
  streamFilter: StreamFilter
  onStreamChange: (stream: StreamFilter) => void
  timeWindowFilter: TimeWindowFilter
  onTimeWindowChange: (window: TimeWindowFilter) => void
  sortBy: SortBy
  onSortChange: (sort: SortBy) => void
  totalSignals: number
  spikeCount: number
  lastUpdated: number | null
  platformCounts?: { platform: string; count: number }[]
  streamCounts?: { hashtag: number; trending: number; explore: number }
  timelineCounts?: {
    live_2h: number
    rising_8h: number
    context_24h: number
    all: number
  }
  concentrationHint?: string | null
}) {
  const showStreamFilters = (platformFilter === "all" || platformFilter === "tiktok")
    && ((streamCounts?.hashtag ?? 0) + (streamCounts?.trending ?? 0) + (streamCounts?.explore ?? 0) > 0)

  const streamTotal = (streamCounts?.hashtag ?? 0) + (streamCounts?.trending ?? 0) + (streamCounts?.explore ?? 0)

  return (
    <div
      data-demo-id="signals-toolbar"
      className="flex flex-col gap-2 px-3 py-2.5 border-b border-border/50"
    >
      {/* Platform pills */}
      <div className="flex items-center gap-1">
        {PLATFORM_FILTERS.map((filter) => {
          const isActive = platformFilter === filter.id
          const count =
            filter.id === "all"
              ? totalSignals
              : platformCounts?.find((p) => p.platform === filter.id)?.count ?? 0

          return (
            <button
              key={filter.id}
              onClick={() => onPlatformChange(filter.id)}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium transition-colors",
                isActive
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {filter.label}
              {count > 0 && (
                <span className={cn("ml-1 tabular-nums", isActive ? "text-white/80" : "text-muted-foreground/60")}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
        <div className="flex-1" />
        {/* Sort selector */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortBy)}
          aria-label="Sort signals"
          className="text-xs bg-transparent border border-border/50 rounded-md px-2 py-1 text-muted-foreground cursor-pointer"
        >
          <option value="priority">Best now</option>
          <option value="recency">Newest</option>
          <option value="reach">Biggest reach</option>
        </select>
      </div>

      {/* Microcopy */}
      <p className="text-[11px] text-muted-foreground">
        {lastUpdated ? (
          <>
            Updated <strong className="text-muted-foreground">{timeAgo(lastUpdated)}</strong>
          </>
        ) : (
          "No data yet"
        )}
        <span className="mx-1">&middot;</span>
        <strong className="text-muted-foreground tabular-nums">{totalSignals}</strong> signals
        {spikeCount > 0 && (
          <>
            <span className="mx-1">&middot;</span>
            <strong className="text-amber-600 dark:text-amber-400 tabular-nums">{spikeCount}</strong> spikes
          </>
        )}
      </p>
      {showStreamFilters && (
        <div className="flex flex-wrap items-center gap-1">
          {TIKTOK_STREAM_FILTERS.map((filter) => {
            const isActive = streamFilter === filter.id
            const count =
              filter.id === "all"
                ? streamTotal
                : (streamCounts?.[filter.id] ?? 0)

            return (
              <button
                key={filter.id}
                onClick={() => onStreamChange(filter.id)}
                className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60"
                )}
              >
                {filter.label}
                <span className="ml-1 tabular-nums text-[10px] text-muted-foreground/80">
                  ({count})
                </span>
              </button>
            )
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {TIMELINE_FILTERS.map((filter) => {
          const isActive = timeWindowFilter === filter.id
          const count = timelineCounts?.[filter.id] ?? 0
          return (
            <button
              key={filter.id}
              onClick={() => onTimeWindowChange(filter.id)}
              className={cn(
                "px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              {filter.label}
              <span className="ml-1 tabular-nums text-[10px] text-muted-foreground/80">
                ({count})
              </span>
            </button>
          )
        })}
      </div>
      {concentrationHint && (
        <p className="text-[11px] text-amber-700 dark:text-amber-400">
          {concentrationHint}
        </p>
      )}
    </div>
  )
}
