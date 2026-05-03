"use client"

import useSWR from "swr"
import { Smartphone, ExternalLink } from "lucide-react"
import { PulseEmptyState } from "./empty-state"
import { getDisplayHandle, getDisplaySignalTitle } from "@/components/workspace/signals/signal-display"
import { timeAgo } from "@/lib/formatTime"
import { dataFetcher } from "@/lib/fetcher"
import { SectionError } from "../section-error"
import type { Signal, SocialHighlightsData } from "@/lib/types/pulse"

const PLATFORM_DOT: Record<string, string> = {
  tiktok: "bg-cyan-400",
  instagram: "bg-pink-400",
}

export function SocialHighlights({ groupId, filterKeywords }: { groupId: string; filterKeywords?: string[] | null }) {
  const { data, error, mutate } = useSWR<SocialHighlightsData>(
    `/api/pulse/social-highlights?groupId=${groupId}`,
    dataFetcher
  )

  const all: Signal[] = (data?.signals ?? []).sort((a, b) => b.capturedAt - a.capturedAt)

  const merged = (filterKeywords
    ? all.filter((s) => {
        const haystack = [s.title, s.content, ...(s.hashtags ?? [])].filter(Boolean).join(" ").toLowerCase()
        return filterKeywords.some((kw) => haystack.includes(kw))
      })
    : all
  ).slice(0, 4)

  const isLoading = data === undefined

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Smartphone className="size-4 text-accent" />
        <h3 className="font-serif text-base font-semibold tracking-tight text-foreground">
          Social Highlights
        </h3>
      </div>

      {error ? (
        <SectionError error={error} onRetry={() => mutate()} label="Social highlights unavailable" />
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : merged.length === 0 ? (
        <PulseEmptyState
          icon={Smartphone}
          title="No social signals yet"
          description="Social highlights appear after you refresh trends."
        />
      ) : (
        <div className="space-y-1.5">
          {merged.map((signal) => {
            const dot = PLATFORM_DOT[signal.platform] ?? "bg-slate-400"
            const metric = signal.platform === "tiktok" ? signal.metrics?.views : signal.metrics?.likes
            const metricLabel =
              metric === undefined || metric === null
                ? null
                : `${metric.toLocaleString()} ${signal.platform === "tiktok" ? "views" : "likes"}`
            const displayHandle = getDisplayHandle(signal.authorHandle, signal.canonicalUrl)
            const displayTitle = getDisplaySignalTitle(signal)
            const handleToken = displayHandle ? `@${displayHandle}`.toLowerCase() : null
            const shouldShowHandle = Boolean(handleToken && !displayTitle.toLowerCase().includes(handleToken))

            const Wrapper = signal.canonicalUrl ? "a" : "div"
            const linkProps = signal.canonicalUrl
              ? { href: signal.canonicalUrl, target: "_blank" as const, rel: "noopener noreferrer" }
              : {}

            return (
              <Wrapper
                key={signal.id}
                {...linkProps}
                className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/30 transition-colors"
              >
                <span className={`size-2 rounded-full shrink-0 ${dot}`} />
                <span className="text-sm text-foreground truncate min-w-0 flex-1">
                  {displayTitle}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                  {timeAgo(signal.capturedAt)}
                </span>
                {metricLabel && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {metricLabel}
                  </span>
                )}
                {shouldShowHandle && displayHandle && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    @{displayHandle}
                  </span>
                )}
                {signal.canonicalUrl && (
                  <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </Wrapper>
            )
          })}
        </div>
      )}
    </div>
  )
}
