"use client"

import { cn } from "@/lib/utils"
import { Instagram, Newspaper, BarChart3 } from "lucide-react"
import { SpikeBadge } from "./spike-badge"
import { DeltaBadge } from "./delta-badge"
import { getDisplaySignalSubtitle, getDisplaySignalTitle } from "./signal-display"
import type { Signal } from "@/lib/types/signals"

const PLATFORM_CONFIG: Record<
  string,
  {
    icon: typeof Instagram
    dotColor: string
    primaryMetric: keyof NonNullable<Signal["metrics"]>
    metricLabel: string
  }
> = {
  instagram: {
    icon: Instagram,
    dotColor: "bg-pink-600 dark:bg-pink-400",
    primaryMetric: "likes",
    metricLabel: "likes",
  },
  tiktok: {
    icon: BarChart3,
    dotColor: "bg-cyan-600 dark:bg-cyan-400",
    primaryMetric: "views",
    metricLabel: "views",
  },
  news: {
    icon: Newspaper,
    dotColor: "bg-slate-500 dark:bg-slate-400",
    primaryMetric: "views",
    metricLabel: "mentions",
  },
  google_trends: {
    icon: BarChart3,
    dotColor: "bg-violet-400",
    primaryMetric: "views",
    metricLabel: "index",
  },
  youtube: {
    icon: BarChart3,
    dotColor: "bg-red-600 dark:bg-red-400",
    primaryMetric: "views",
    metricLabel: "views",
  },
}

const SEVERITY_RAIL: Record<string, string> = {
  p0: "border-l-amber-500 bg-amber-950/10",
  p1: "border-l-amber-600 dark:border-l-amber-400",
  watch: "border-l-slate-600",
  negative: "border-l-red-600 dark:border-l-red-400",
}

function formatMetric(value: number | undefined): string {
  if (value === undefined) return "--"
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

function timeAgoShort(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function getStreamLabel(platform: string, stream: Signal["stream"]): string | null {
  if (platform !== "tiktok") return null
  if (stream === "trending") return "Trending"
  if (stream === "explore") return "Explore"
  return "Hashtag"
}

export function SignalRow({
  signal,
  isSelected,
  onClick,
}: {
  signal: Signal
  isSelected: boolean
  onClick: () => void
}) {
  const config = PLATFORM_CONFIG[signal.platform] ?? PLATFORM_CONFIG.news
  const Icon = config.icon
  const primaryValue = signal.metrics?.[config.primaryMetric]
  const severityRail = signal.severity ? SEVERITY_RAIL[signal.severity] : ""
  const subtitle = getDisplaySignalSubtitle(signal)
  const displayHandle = signal.authorHandle && signal.authorHandle !== "unknown" ? `@${signal.authorHandle}` : null
  const showHandle = Boolean(displayHandle && (!subtitle || !subtitle.includes(displayHandle)))
  const streamLabel = getStreamLabel(signal.platform, signal.stream)

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-l-[3px] border-b border-b-border/30 transition-colors",
        isSelected
          ? "border-l-accent bg-accent/5"
          : severityRail || "border-l-transparent",
        !isSelected && "hover:bg-muted/50"
      )}
    >
      {/* Line 1: Platform + Title + Primary metric */}
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <Icon className="size-4 text-muted-foreground" />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full",
              config.dotColor
            )}
          />
        </div>
        <span className="flex-1 text-sm font-medium text-foreground truncate">
          {getDisplaySignalTitle(signal).slice(0, 80)}
        </span>
        {typeof primaryValue === "number" && Number.isFinite(primaryValue) && (
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {formatMetric(primaryValue)}
          </span>
        )}
      </div>

      {/* Line 2: Author + time + severity + delta */}
      <div className="flex items-center gap-2 mt-1 ml-6">
        {subtitle && (
          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
            {subtitle}
          </span>
        )}
        {showHandle && (
          <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">
            {displayHandle}
          </span>
        )}
        <span className="text-[11px] text-muted-foreground/60">
          {timeAgoShort(signal.capturedAt)}
        </span>
        <div className="flex-1" />
        {signal.severity && (signal.severity === "p0" || signal.severity === "p1") && (
          <SpikeBadge
            severity={signal.severity}
            multiplier={signal.spikeMultiplier}
          />
        )}
        {signal.spikeMultiplier !== undefined && signal.spikeMultiplier > 1 && (
          <DeltaBadge
            value={primaryValue ?? 0}
            baseline={
              signal.spikeMultiplier > 0
                ? (primaryValue ?? 0) / signal.spikeMultiplier
                : undefined
            }
          />
        )}
        {streamLabel && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {streamLabel}
          </span>
        )}
      </div>
    </button>
  )
}
