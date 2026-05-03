"use client"

import useSWR, { useSWRConfig } from "swr"
import {
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Instagram,
  Newspaper,
  BarChart3,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/formatTime"
import { MetricChip } from "./metric-chip"
import { SpikeBadge } from "./spike-badge"
import { getDisplayHandle, getDisplaySignalTitle } from "./signal-display"
import type { Signal, SignalSnapshot } from "@/lib/types/signals"
import { fetcher } from "@/lib/fetcher"

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  news: "News",
  google_trends: "Google Trends",
  youtube: "YouTube",
}

const PLATFORM_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  tiktok: BarChart3,
  news: Newspaper,
  google_trends: BarChart3,
  youtube: BarChart3,
}

function getStreamLabel(platform: string, stream: Signal["stream"]): string | null {
  if (platform !== "tiktok") return null
  if (stream === "trending") return "Trending"
  if (stream === "explore") return "Explore"
  return "Hashtag"
}

function getSignalEmbedUrl(platform: string, canonicalUrl: string | undefined): string | null {
  if (!canonicalUrl) return null
  try {
    const parsed = new URL(canonicalUrl)

    if (platform === "tiktok") {
      const match = parsed.pathname.match(/\/video\/(\d+)/)
      if (match?.[1]) return `https://www.tiktok.com/embed/v2/${match[1]}`
    }

    if (platform === "instagram") {
      const match = parsed.pathname.match(/\/(p|reel)\/([^/]+)/)
      if (match?.[1] && match?.[2]) {
        return `https://www.instagram.com/${match[1]}/${match[2]}/embed`
      }
    }
  } catch {
    return null
  }

  return null
}

export function SignalDetailPanel({
  signalId,
}: {
  signalId: string | null
}) {
  const { mutate } = useSWRConfig()
  const { data: signal } = useSWR<Signal>(
    signalId ? `/api/signals/${signalId}` : null,
    fetcher
  )
  const { data: snapshots } = useSWR<SignalSnapshot[]>(
    signalId ? `/api/signals/${signalId}/snapshots` : null,
    fetcher
  )

  if (!signalId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-sm">Select a signal to view details</p>
          <p className="text-xs text-muted-foreground/60">
            Click any row in the feed
          </p>
        </div>
      </div>
    )
  }

  if (!signal) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Loading signal...</p>
      </div>
    )
  }

  const Icon = PLATFORM_ICONS[signal.platform] ?? Newspaper
  const safeSnapshots: SignalSnapshot[] = snapshots ?? []
  const sparkViews = safeSnapshots.map((s) => s.views ?? 0)
  const sparkLikes = safeSnapshots.map((s) => s.likes ?? 0)
  const sparkComments = safeSnapshots.map((s) => s.comments ?? 0)
  const displayHandle = getDisplayHandle(signal.authorHandle, signal.canonicalUrl)
  const displayTitle = getDisplaySignalTitle(signal)
  const embedUrl = getSignalEmbedUrl(signal.platform, signal.canonicalUrl ?? undefined)
  const streamLabel = getStreamLabel(signal.platform, signal.stream)

  const handleFeedback = async (feedback: "relevant" | "irrelevant" | "actioned") => {
    await fetch(`/api/signals/${signal.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback }),
    })
    mutate(`/api/signals/${signal.id}`)
    mutate("/api/signals")
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4 space-y-5">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {PLATFORM_LABELS[signal.platform] ?? signal.platform}
              </span>
              {streamLabel && (
                <Badge variant="outline" className="text-[10px]">
                  {streamLabel}
                </Badge>
              )}
              {signal.severity && signal.severity !== "neutral" && (
                <SpikeBadge
                  severity={signal.severity as "p0" | "p1" | "watch" | "negative"}
                  multiplier={signal.spikeMultiplier}
                />
              )}
            </div>
            <h2 className="text-base font-semibold text-foreground leading-snug">
              {displayTitle}
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {displayHandle && (
                <span>@{displayHandle}</span>
              )}
              <div className="flex items-center gap-1">
                <Clock className="size-3" />
                <span>{timeAgo(signal.capturedAt)}</span>
              </div>
              {signal.canonicalUrl && (
                <a
                  href={signal.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  Open source
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>

          {embedUrl && (
            <div className="overflow-hidden rounded-lg border border-border/60 bg-black/5">
              <iframe
                src={embedUrl}
                className="h-[min(52vh,520px)] w-full border-0"
                loading="lazy"
                allowFullScreen
                title="Signal media preview"
              />
            </div>
          )}

          {/* Metric Strip */}
          <div className="grid grid-cols-2 gap-2">
            {signal.metrics?.views !== undefined && (
              <MetricChip
                label="Views"
                value={signal.metrics.views}
                sparklineData={sparkViews.length > 1 ? sparkViews : undefined}
              />
            )}
            {signal.metrics?.likes !== undefined && (
              <MetricChip
                label="Likes"
                value={signal.metrics.likes}
                sparklineData={sparkLikes.length > 1 ? sparkLikes : undefined}
              />
            )}
            {signal.metrics?.comments !== undefined && (
              <MetricChip
                label="Comments"
                value={signal.metrics.comments}
                sparklineData={sparkComments.length > 1 ? sparkComments : undefined}
              />
            )}
            {signal.metrics?.shares !== undefined && (
              <MetricChip
                label="Shares"
                value={signal.metrics.shares}
              />
            )}
          </div>

          {/* Trend data */}
          {signal.trendInterest !== undefined && (
            <div className="rounded-lg border border-border/50 bg-muted/30 px-3.5 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Trend Interest
                </span>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {signal.trendInterest}
                </span>
              </div>
              {signal.trendRising && (
                <Badge variant="outline" className="mt-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Rising
                </Badge>
              )}
            </div>
          )}

          {/* Content Preview */}
          {signal.content && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Content
              </span>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {signal.content}
              </p>
            </div>
          )}

          {/* Hashtags */}
          {signal.hashtags && signal.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {signal.hashtags.map((tag: string) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[11px] font-normal"
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Feedback indicator */}
          {signal.feedback && signal.feedback !== "pending" && (
            <div className="rounded-lg border border-border/50 bg-muted/30 px-3.5 py-2.5">
              <span className="text-xs text-muted-foreground">
                Status:{" "}
                <strong className="text-foreground">
                  {signal.feedback === "relevant"
                    ? "Use this"
                    : signal.feedback === "irrelevant"
                      ? "Skip"
                      : "Posted"}
                </strong>
                {signal.feedbackAt && (
                  <span className="text-muted-foreground/60">
                    {" "}
                    &middot; {timeAgo(signal.feedbackAt)}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions Bar (sticky footer) */}
      <div className="border-t border-border/50 px-4 py-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 text-xs",
            signal.feedback === "relevant" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          )}
          onClick={() => handleFeedback("relevant")}
        >
          <ThumbsUp className="size-3.5" />
          Use
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 text-xs",
            signal.feedback === "irrelevant" && "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
          )}
          onClick={() => handleFeedback("irrelevant")}
        >
          <ThumbsDown className="size-3.5" />
          Skip
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 text-xs",
            signal.feedback === "actioned" && "bg-accent/10 border-accent/30 text-accent"
          )}
          onClick={() => handleFeedback("actioned")}
        >
          <CheckCircle2 className="size-3.5" />
          Posted
        </Button>
      </div>
    </div>
  )
}
