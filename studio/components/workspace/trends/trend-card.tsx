"use client"

import { m } from "framer-motion"
import {
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Clock,
  Play,
  TrendingUp,
  User,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { staggerItem } from "@/lib/animation/variants"
import { getDisplayHandle, getDisplaySignalTitle } from "@/components/workspace/signals/signal-display"
import type { TrendSignal } from "@/lib/types/trends"

function safeExternalUrl(candidate: string | null | undefined): string | null {
  if (!candidate) return null
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString()
    }
    return null
  } catch {
    return null
  }
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "--"
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatCompactNumber(n: number | null | undefined): string {
  if (n == null) return "--"
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return n.toString()
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "1d ago"
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function fitTone(score: number) {
  if (score >= 80) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
  if (score >= 60) return "bg-sky-500/15 text-sky-300 border-sky-500/30"
  if (score >= 40) return "bg-amber-500/15 text-amber-300 border-amber-500/30"
  return "bg-muted/60 text-muted-foreground border-border/60"
}

function engagementRate(metrics: TrendSignal["metrics"] | undefined): number | null {
  const { views, likes, comments, shares } = metrics ?? {}
  if (!views || views === 0) return null
  const engagement = (likes ?? 0) + (comments ?? 0) + (shares ?? 0)
  return (engagement / views) * 100
}

function heatLevel(views: number | null | undefined): number {
  if (views == null) return 0
  if (views >= 1_000_000_000) return 4
  if (views >= 100_000_000) return 3
  if (views >= 10_000_000) return 2
  if (views >= 1_000_000) return 1
  return 0
}

const heatColors = [
  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  "bg-amber-500/10 text-amber-400 border-amber-500/25",
  "bg-orange-500/12 text-orange-400 border-orange-500/30",
  "bg-rose-500/15 text-rose-400 border-rose-500/35",
  "bg-red-500/20 text-red-300 border-red-500/40",
]

const heatBarColors = [
  "bg-zinc-500/40",
  "bg-amber-500/50",
  "bg-orange-500/60",
  "bg-rose-500/70",
  "bg-red-500/80",
]

export function HashtagPill({
  signal,
  rank,
  relevanceScore,
}: {
  signal: TrendSignal
  rank?: number
  relevanceScore?: number
}) {
  const tag = signal.title.startsWith("#") ? signal.title : `#${signal.title}`
  const count = signal.metrics?.views
  const heat = heatLevel(count)
  const fallbackUrl = `https://www.tiktok.com/tag/${encodeURIComponent(
    signal.title.replace(/^#/, "")
  )}`
  const href = safeExternalUrl(signal.canonicalUrl) ?? fallbackUrl

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <div
        className={cn(
          "relative flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all",
          "hover:scale-[1.02] hover:shadow-md",
          heatColors[heat]
        )}
      >
        {rank != null && (
          <span className="text-[10px] font-bold tabular-nums opacity-40 min-w-[14px]">
            {rank}
          </span>
        )}

        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold tracking-tight truncate block">
            {tag}
          </span>
          <div className="flex items-center gap-1.5">
            {count != null && (
              <span className="text-[10px] opacity-60 tabular-nums">
                {formatNumber(count)} views
              </span>
            )}
            {relevanceScore != null && (
              <span
                className={cn(
                  "inline-flex items-center rounded border px-1 py-0 text-[9px] font-semibold tabular-nums",
                  fitTone(relevanceScore)
                )}
              >
                {relevanceScore}% fit
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-0.5 items-end h-3.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "w-[3px] rounded-full transition-all",
                i <= heat ? heatBarColors[heat] : "bg-white/5"
              )}
              style={{ height: `${40 + i * 20}%` }}
            />
          ))}
        </div>

        <ExternalLink className="size-3 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
      </div>
    </a>
  )
}

export function TrendVideoCard({
  signal,
  rank,
  platform = "tiktok",
  relevanceScore,
  relevanceMatches,
}: {
  signal: TrendSignal
  rank?: number
  platform?: "tiktok" | "instagram"
  relevanceScore?: number
  relevanceMatches?: string[]
}) {
  const title = getDisplaySignalTitle(signal)
  const displayHandle = getDisplayHandle(signal.authorHandle, signal.canonicalUrl)
  const rate = engagementRate(signal.metrics)
  const headerGradient =
    platform === "instagram"
      ? "from-[#F58529] via-[#DD2A7B] to-[#8134AF]"
      : "from-[#25F4EE] via-[#FE2C55] to-[#000000]"
  const destinationLabel = platform === "instagram" ? "Open on Instagram" : "Watch on TikTok"
  const href = safeExternalUrl(signal.canonicalUrl) ?? "#"

  return (
    <m.div variants={staggerItem}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <div className={cn(
          "relative rounded-xl border border-border/60 bg-muted/30 overflow-hidden",
          "hover:border-accent/40 hover:bg-muted/50 transition-all hover:shadow-lg"
        )}>
          <div
            className={cn(
              "h-1 w-full bg-gradient-to-r opacity-60 transition-opacity group-hover:opacity-100",
              headerGradient
            )}
          />

          <div className="p-3.5 space-y-2.5">
            <div className="flex items-start gap-2.5">
              {rank != null && (
                <div className="shrink-0 w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
                  <span className="text-xs font-bold text-accent tabular-nums">{rank}</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                  {title}
                </p>
                {displayHandle && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="size-4 rounded-full bg-accent/10 flex items-center justify-center">
                      <User className="size-2.5 text-accent" />
                    </div>
                    <span className="text-xs text-muted-foreground truncate">
                      @{displayHandle}
                    </span>
                    {signal.authorFollowers != null && signal.authorFollowers > 0 && (
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                        {formatCompactNumber(signal.authorFollowers)} followers
                      </span>
                    )}
                  </div>
                )}
              </div>

              <span className="shrink-0 flex items-center gap-1 text-[10px] text-muted-foreground/60 tabular-nums">
                <Clock className="size-2.5" />
                {formatTimeAgo(signal.capturedAt)}
              </span>
            </div>

            {relevanceScore != null && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    fitTone(relevanceScore)
                  )}
                >
                  {relevanceScore}% brand fit
                </span>
                {(relevanceMatches ?? []).slice(0, 3).map((term) => (
                  <Badge
                    key={term}
                    variant="outline"
                    className="h-5 rounded-full border-accent/25 bg-accent/10 px-2 text-[10px] font-medium text-accent"
                  >
                    {term}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1 flex-wrap">
              {signal.metrics?.views != null && (
                <MetricChip
                  icon={<Eye className="size-3" />}
                  value={formatCompactNumber(signal.metrics.views)}
                  primary
                />
              )}
              {signal.metrics?.likes != null && (
                <MetricChip
                  icon={<Heart className="size-3" />}
                  value={formatCompactNumber(signal.metrics.likes)}
                />
              )}
              {signal.metrics?.comments != null && (
                <MetricChip
                  icon={<MessageCircle className="size-3" />}
                  value={formatCompactNumber(signal.metrics.comments)}
                />
              )}
              {signal.metrics?.shares != null && (
                <MetricChip
                  icon={<Share2 className="size-3" />}
                  value={formatCompactNumber(signal.metrics.shares)}
                />
              )}
              {rate != null && rate > 0 && (
                <MetricChip
                  icon={<TrendingUp className="size-3" />}
                  value={`${rate.toFixed(1)}%`}
                  highlight={rate >= 5}
                />
              )}
              {signal.spikeMultiplier != null && signal.spikeMultiplier > 1 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 tabular-nums">
                  {signal.spikeMultiplier.toFixed(1)}x spike
                </span>
              )}
            </div>

            {signal.hashtags && signal.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {signal.hashtags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-accent/8 text-accent/70 border border-accent/10"
                  >
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </span>
                ))}
                {signal.hashtags.length > 4 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    +{signal.hashtags.length - 4}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1 text-[10px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="size-2.5" />
                {destinationLabel}
              </div>
              <ExternalLink className="size-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </a>
    </m.div>
  )
}

function MetricChip({
  icon,
  value,
  primary,
  highlight,
}: {
  icon: React.ReactNode
  value: string
  primary?: boolean
  highlight?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] tabular-nums",
        primary
          ? "bg-foreground/8 text-foreground font-semibold"
          : highlight
            ? "bg-emerald-500/10 text-emerald-400 font-semibold"
            : "bg-transparent text-muted-foreground"
      )}
    >
      {icon}
      {value}
    </span>
  )
}
