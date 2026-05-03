"use client"

import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { m } from "framer-motion"
import useSWR from "swr"
import {
  Flame,
  Compass,
  Hash,
  RefreshCw,
  Loader2,
  Eye,
  BarChart3,
  Play,
  Target,
  Sparkles,
  SlidersHorizontal,
  Instagram,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { fadeInUp, staggerContainer } from "@/lib/animation/variants"
import { HashtagPill, TrendVideoCard } from "./trend-card"
import {
  HotContextFeed,
  type HotContextActionInput,
  type HotContextFeedItem,
} from "./hot-context-feed"
import { fetcher } from "@/lib/fetcher"
import { extractErrorMessage } from "@/lib/api-error"
import {
  extractFocusTerms,
  rankSignalsForBrand,
  FIT_THRESHOLD,
} from "@/lib/severity"
import type { TrendSignal, TrendsFeedData, HotContextFeedData, BrandAgent } from "@/lib/types/trends"

type RankedSignal<T extends TrendSignal = TrendSignal> = {
  signal: T
  score: number
  matches: string[]
}

type RefreshPlatformResult = {
  platform: string
  inserted: number
  updated: number
  fetched: number
  mock: boolean
}

type SignalRefreshSummary = {
  status: string
  inserted: number
  updated: number
  total: number
  refreshedAt: number
  mock: boolean
  signalTags: string[]
  keywordCount: number
  platformResults: RefreshPlatformResult[]
}

type SignalRefreshResponse =
  | SignalRefreshSummary
  | { status: string; collectJobId?: string }

const isSignalRefreshSummary = (
  value: SignalRefreshResponse
): value is SignalRefreshSummary =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as SignalRefreshSummary).inserted === "number" &&
  typeof (value as SignalRefreshSummary).updated === "number" &&
  Array.isArray((value as SignalRefreshSummary).platformResults)

const formatPlatformSummary = (platformResults?: RefreshPlatformResult[]): string => {
  if (!Array.isArray(platformResults) || platformResults.length === 0) {
    return "No sources updated"
  }
  const visible = platformResults.filter((item) => item.inserted + item.updated > 0)
  const source = visible.length > 0 ? visible : platformResults
  if (source.length === 0) return "No sources updated"
  return source
    .map((item) => {
      const label = item.platform.charAt(0).toUpperCase() + item.platform.slice(1)
      return `${label}: ${item.inserted} new, ${item.updated} updated`
    })
    .join(" | ")
}

export function TrendsTab({ groupId }: { groupId: string }) {
  const { data: feedData } = useSWR<TrendsFeedData>(
    `/api/trends/feed?groupId=${groupId}`,
    fetcher
  )
  const { data: hotContextData, mutate: mutateHotContext } = useSWR<HotContextFeedData>(
    `/api/trends/hot-context?groupId=${groupId}`,
    fetcher
  )

  const trending: TrendSignal[] = feedData?.trending ?? []
  const explore: TrendSignal[] = feedData?.explore ?? []
  const hashtag: TrendSignal[] = feedData?.hashtag ?? []
  const instagram: TrendSignal[] = feedData?.instagram ?? []
  const agents: BrandAgent[] = feedData?.agents ?? []
  const hotContextFeed = hotContextData?.items

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRefreshCoolingDown, setIsRefreshCoolingDown] = useState(false)
  const [activeCollectJobId, setActiveCollectJobId] = useState<string | null>(null)
  const [refreshBaselineCapturedAt, setRefreshBaselineCapturedAt] = useState<number | null>(null)
  const [lastRefreshSummary, setLastRefreshSummary] = useState<SignalRefreshSummary | null>(null)
  const [highFitOnly, setHighFitOnly] = useState(true)
  const [selectedTerms, setSelectedTerms] = useState<string[]>([])
  const [creatingSignalIds, setCreatingSignalIds] = useState<Set<string>>(new Set())
  const cooldownTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        window.clearTimeout(cooldownTimerRef.current)
      }
    }
  }, [])

  const startRefreshCooldown = () => {
    setIsRefreshCoolingDown(true)
    if (cooldownTimerRef.current) {
      window.clearTimeout(cooldownTimerRef.current)
    }
    cooldownTimerRef.current = window.setTimeout(() => {
      setIsRefreshCoolingDown(false)
      cooldownTimerRef.current = null
    }, 10_000)
  }

  const finishRefresh = useCallback((
    summary: SignalRefreshSummary,
    title: string = "TikTok refresh completed",
  ) => {
    setLastRefreshSummary(summary)
    setActiveCollectJobId(null)
    setRefreshBaselineCapturedAt(null)
    setIsRefreshing(false)
    startRefreshCooldown()
    toast(title, {
      description: `${summary.inserted} new, ${summary.updated} updated. ${formatPlatformSummary(summary.platformResults)}.`,
    })
  }, [])

  const handleRefresh = async () => {
    if (isRefreshing || isRefreshCoolingDown) return
    setIsRefreshing(true)
    setLastRefreshSummary(null)
    const baseline = Math.max(
      ...trending.map((s) => s.capturedAt),
      ...explore.map((s) => s.capturedAt),
      ...hashtag.map((s) => s.capturedAt),
      0,
    )
    setRefreshBaselineCapturedAt(baseline)
    try {
      const result: SignalRefreshResponse = await fetch("/api/trends/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, platform: "tiktok", waitForCompletion: false }),
      }).then((r) => r.json())

      if (result.status === "signal_collection_completed" && isSignalRefreshSummary(result)) {
        finishRefresh(result)
      } else {
        setActiveCollectJobId((result as { collectJobId?: string }).collectJobId ?? null)
        toast("TikTok refresh started", {
          description: "Collecting live TikTok signals in the background.",
        })
      }
    } catch (err) {
      console.error("TikTok refresh failed:", err)
      setActiveCollectJobId(null)
      setRefreshBaselineCapturedAt(null)
      setIsRefreshing(false)
      startRefreshCooldown()
      toast.error("Refresh failed", {
        description: "TikTok collection did not start. Check logs and retry.",
      })
    }
  }

  useEffect(() => {
    if (!activeCollectJobId || !isRefreshing) return

    let cancelled = false
    let timeoutId: number | null = null
    const deadline = Date.now() + 2 * 60 * 1000

    const poll = async () => {
      try {
        const result = await fetch(`/api/trends/refresh-status?collectJobId=${activeCollectJobId}`).then((r) => r.json())
        if (cancelled) return

        if (result.status === "running") {
          if (Date.now() >= deadline) {
            setActiveCollectJobId(null)
            setRefreshBaselineCapturedAt(null)
            setIsRefreshing(false)
            startRefreshCooldown()
            toast.error("Refresh timed out", {
              description: "Live TikTok collection took too long. The latest saved signals are still available below.",
            })
            return
          }
          timeoutId = window.setTimeout(poll, 3000)
          return
        }

        if (result.status === "completed") {
          const summary: SignalRefreshSummary = {
            status: "signal_collection_completed",
            inserted: result.inserted,
            updated: result.updated,
            total: result.total,
            refreshedAt: result.refreshedAt,
            mock: result.mock,
            signalTags: result.signalTags,
            keywordCount: result.keywordCount,
            platformResults: result.platformResults,
          }
          finishRefresh(summary)
          return
        }

        setActiveCollectJobId(null)
        setRefreshBaselineCapturedAt(null)
        setIsRefreshing(false)
        startRefreshCooldown()
        toast.error("Refresh failed", {
          description: extractErrorMessage(result, "TikTok collection failed before completion."),
        })
      } catch (err) {
        if (cancelled) return
        console.error("TikTok refresh status failed:", err)
        setActiveCollectJobId(null)
        setRefreshBaselineCapturedAt(null)
        setIsRefreshing(false)
        startRefreshCooldown()
        toast.error("Refresh failed", {
          description: "Could not confirm the live TikTok collection status.",
        })
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [activeCollectJobId, isRefreshing, finishRefresh])

  useEffect(() => {
    if (!isRefreshing || refreshBaselineCapturedAt === null) return

    const freshSignals = Array.from(
      new Map(
        [...trending, ...explore, ...hashtag]
          .filter((signal) => signal.capturedAt > refreshBaselineCapturedAt)
          .map((signal) => [signal.id, signal]),
      ).values(),
    )

    if (freshSignals.length === 0) return

    finishRefresh({
      status: "signal_collection_completed",
      inserted: freshSignals.length,
      updated: 0,
      total: freshSignals.length,
      refreshedAt: freshSignals[0]?.capturedAt ?? Date.now(),
      mock: false,
      signalTags: [],
      keywordCount: 0,
      platformResults: [
        {
          platform: "tiktok",
          inserted: freshSignals.length,
          updated: 0,
          fetched: freshSignals.length,
          mock: false,
        },
      ],
    }, "Live TikTok signals landed")
  }, [explore, finishRefresh, hashtag, isRefreshing, refreshBaselineCapturedAt, trending])

  const hotContextBySignalId = useMemo(() => {
    const map = new Map<string, HotContextFeedItem>()
    for (const item of hotContextFeed ?? []) {
      map.set(item.signalId, item)
    }
    return map
  }, [hotContextFeed])

  const handleCreateActionFromSignal = async (input: HotContextActionInput) => {
    if (!input.signalId) return
    const signalId = input.signalId
    let shouldStart = false
    setCreatingSignalIds((prev) => {
      if (prev.has(signalId)) return prev
      shouldStart = true
      const next = new Set(prev)
      next.add(signalId)
      return next
    })
    if (!shouldStart) return

    try {
      const sourceItem = hotContextBySignalId.get(signalId)
      await fetch("/api/trends/create-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          signalId: sourceItem?.signalId ?? signalId,
          recommendedAction: sourceItem?.recommendedAction ?? input.recommendedAction,
          lane: sourceItem?.lane ?? input.lane,
          whyNow: sourceItem?.whyNow ?? input.whyNow,
        }),
      })
      await mutateHotContext()
    } catch (err) {
      console.error("Create action from signal failed:", err)
    } finally {
      setCreatingSignalIds((prev) => {
        const next = new Set(prev)
        next.delete(signalId)
        return next
      })
    }
  }

  const isLoading = feedData === undefined

  const focusTerms = useMemo(() => extractFocusTerms(agents), [agents])
  const activeTerms = selectedTerms.length > 0 ? selectedTerms : focusTerms

  const ranked = useMemo(() => {
    const rankedTrending = rankSignalsForBrand(trending, activeTerms)
    const rankedExplore = rankSignalsForBrand(explore, activeTerms)
    const rankedHashtag = rankSignalsForBrand(hashtag, activeTerms)
    const rankedInstagram = rankSignalsForBrand(instagram, activeTerms)

    return {
      trendingHashtags: rankedTrending.filter((item) => item.signal.title.startsWith("#")) as RankedSignal[],
      trendingVideos: rankedTrending.filter((item) => !item.signal.title.startsWith("#")) as RankedSignal[],
      explore: rankedExplore as RankedSignal[],
      hashtag: rankedHashtag as RankedSignal[],
      instagram: rankedInstagram as RankedSignal[],
    }
  }, [trending, explore, hashtag, instagram, activeTerms])

  const shouldFilterByFit = highFitOnly && activeTerms.length > 0
  const applyFitFilter = (items: RankedSignal[], threshold = FIT_THRESHOLD) =>
    shouldFilterByFit ? items.filter((item) => item.score >= threshold) : items

  const visibleTrendingHashtags = applyFitFilter(ranked.trendingHashtags, 48)
  const visibleTrendingVideos = applyFitFilter(ranked.trendingVideos)
  const visibleExplore = applyFitFilter(ranked.explore)
  const visibleHashtag = applyFitFilter(ranked.hashtag)
  const visibleInstagram = applyFitFilter(ranked.instagram)

  const heroMetrics = useMemo(() => {
    const allVideos = [...visibleTrendingVideos, ...visibleExplore, ...visibleInstagram]
    const totalViews = allVideos.reduce((sum, item) => sum + (item.signal.metrics?.views ?? 0), 0)
    const highFitHits = allVideos.filter((item) => item.score >= FIT_THRESHOLD).length
    const avgFit =
      allVideos.length > 0
        ? Math.round(allVideos.reduce((sum, item) => sum + item.score, 0) / allVideos.length)
        : 0
    const spikeCount = allVideos.filter(
      (item) => item.signal.spikeMultiplier != null && item.signal.spikeMultiplier > 1
    ).length

    return {
      totalVideos: allVideos.length,
      totalViews,
      highFitHits,
      avgFit,
      focusCount: activeTerms.length,
      hashtagCount: visibleTrendingHashtags.length + visibleHashtag.length,
      spikeCount,
    }
  }, [visibleTrendingHashtags, visibleTrendingVideos, visibleExplore, visibleHashtag, visibleInstagram, activeTerms])

  if (isLoading) {
    return <TrendsLoadingSkeleton />
  }

  const isEmptyRaw =
    trending.length === 0 && explore.length === 0 && hashtag.length === 0 && instagram.length === 0

  const isEmptyFiltered =
    visibleTrendingHashtags.length === 0 &&
    visibleTrendingVideos.length === 0 &&
    visibleExplore.length === 0 &&
    visibleHashtag.length === 0 &&
    visibleInstagram.length === 0

  const toggleTerm = (term: string) => {
    setSelectedTerms((prev) =>
      prev.includes(term) ? prev.filter((item) => item !== term) : [...prev, term]
    )
  }

  return (
    <m.div
      variants={fadeInUp}
      initial={false}
      animate="visible"
      className="space-y-6 pb-8"
    >
      <div
        data-demo-id="trends-radar"
        className="relative overflow-hidden rounded-2xl border border-border/45 bg-gradient-to-br from-radar-bg-start/95 via-radar-bg-mid/95 to-radar-bg-end/95 text-radar-foreground shadow-xl"
      >
        <div className="absolute inset-0 bg-[radial-gradient(600px_220px_at_15%_0%,rgba(37,244,238,0.14),transparent_70%),radial-gradient(640px_260px_at_90%_10%,rgba(254,44,85,0.14),transparent_75%)]" />

        <div className="relative space-y-4 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-radar-accent-hot to-radar-accent-cool shadow-lg">
                  <Play className="size-4 fill-white text-white" />
                </div>
                <h2 className="font-display text-xl tracking-wide uppercase text-white">
                  Relevance Radar
                </h2>
                <Badge className="rounded-full border border-white/20 bg-white/10 text-[10px] text-white">
                  TikTok + Instagram
                </Badge>
                <Badge className="rounded-full border border-cyan-300/35 bg-cyan-300/15 text-[10px] text-cyan-100">
                  Hot Context
                </Badge>
              </div>
              <p className="mt-1 text-xs text-zinc-300 sm:text-sm">
                Trend intelligence ranked against your brand focus so your team sees what matters first.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHighFitOnly((prev) => !prev)}
                className={cn(
                  "gap-2 border-white/20 text-xs text-white hover:bg-white/10",
                  highFitOnly ? "bg-white/10" : "bg-transparent"
                )}
              >
                <SlidersHorizontal className="size-3.5" />
                {highFitOnly ? "High-Fit Only" : "Show All"}
              </Button>
              <Button
                data-demo-id="trends-refresh"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || isRefreshCoolingDown}
                className="gap-2 border-white/45 bg-white/15 text-xs text-white shadow-sm hover:bg-white/20"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Collecting...
                  </>
                ) : isRefreshCoolingDown ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Cooling down...
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-3.5" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>

          {focusTerms.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-300">
                <Target className="size-3" />
                Focus terms powering relevance
                {selectedTerms.length > 0 && (
                  <button
                    onClick={() => setSelectedTerms([])}
                    className="ml-2 rounded border border-white/25 px-1.5 py-0 text-[10px] font-semibold text-white/90"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {focusTerms.map((term) => {
                  const selected = selectedTerms.includes(term)
                  return (
                    <button
                      key={term}
                      onClick={() => toggleTerm(term)}
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        selected
                          ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
                          : "border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10"
                      )}
                    >
                      {term}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-white/20 bg-white/5 px-3 py-2 text-xs text-zinc-300">
              Add sharper brand keywords in agent settings to improve relevance ranking quality.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <HeroMetric
              icon={<Eye className="size-3.5" />}
              label="Total Views"
              value={formatLargeNumber(heroMetrics.totalViews)}
              dark
            />
            <HeroMetric
              icon={<BarChart3 className="size-3.5" />}
              label="Videos"
              value={heroMetrics.totalVideos.toString()}
              dark
            />
            <HeroMetric
              icon={<Sparkles className="size-3.5" />}
              label="High-Fit"
              value={heroMetrics.highFitHits.toString()}
              highlight={heroMetrics.highFitHits > 0}
              dark
            />
            <HeroMetric
              icon={<Target className="size-3.5" />}
              label="Avg Fit"
              value={`${heroMetrics.avgFit}%`}
              dark
            />
            <HeroMetric
              icon={heroMetrics.spikeCount > 0 ? <Flame className="size-3.5" /> : <Hash className="size-3.5" />}
              label={heroMetrics.spikeCount > 0 ? "Spike Alerts" : "Hashtags"}
              value={(heroMetrics.spikeCount > 0 ? heroMetrics.spikeCount : heroMetrics.hashtagCount).toString()}
              highlight={heroMetrics.spikeCount > 0}
              dark
            />
          </div>

          {lastRefreshSummary && (
            <div className="rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-3 py-2 text-emerald-50">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                Aha moment: live refresh completed
              </div>
              <p className="mt-1 text-xs text-emerald-100">
                {lastRefreshSummary.inserted} new and {lastRefreshSummary.updated} updated signals.
                {" "}
                {formatPlatformSummary(lastRefreshSummary.platformResults)}.
              </p>
              <p className="mt-1 text-[11px] text-emerald-200/90">
                {new Date(lastRefreshSummary.refreshedAt).toLocaleTimeString()}
                {lastRefreshSummary.mock ? " • Mock data mode (no live API keys)" : " • Live source refresh"}
              </p>
            </div>
          )}
        </div>
      </div>

      <HotContextFeed
        feed={hotContextFeed}
        pendingSignalIds={creatingSignalIds}
        onCreateAction={handleCreateActionFromSignal}
      />

      {isEmptyRaw ? (
        <div className="rounded-xl border border-dashed border-border/40 bg-muted/10 p-16 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-muted/50">
            <Flame className="size-6 text-muted-foreground/40" />
          </div>
          <p className="mb-1 text-sm font-medium text-foreground">
            No social trends collected yet
          </p>
          <p className="mx-auto mb-5 max-w-sm text-xs text-muted-foreground">
            Run a refresh to collect TikTok and Instagram trend signals for this brand.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isRefreshCoolingDown}
            className="gap-2"
          >
            <RefreshCw className="size-3.5" />
            {isRefreshCoolingDown ? "Cooling down..." : "Collect Trends"}
          </Button>
        </div>
      ) : isEmptyFiltered ? (
        <div className="rounded-xl border border-border/40 bg-muted/10 p-10 text-center">
          <p className="text-sm font-medium text-foreground">
            No high-fit trends matched your active focus terms.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Toggle to Show All or broaden your selected terms.
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => setHighFitOnly(false)}>
              Show All Signals
            </Button>
          </div>
        </div>
      ) : (
        <>
          {visibleTrendingHashtags.length > 0 && (
            <section>
              <SectionHeader
                icon={<Hash className="size-3.5" />}
                title="High-Fit Trending Hashtags"
                count={visibleTrendingHashtags.length}
                color="text-rose-400"
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {visibleTrendingHashtags.map((item, i) => (
                  <HashtagPill
                    key={item.signal.id}
                    signal={item.signal}
                    rank={i + 1}
                    relevanceScore={item.score}
                  />
                ))}
              </div>
            </section>
          )}

          {visibleTrendingVideos.length > 0 && (
            <section>
              <SectionHeader
                icon={<Flame className="size-3.5" />}
                title="TikTok Trending -- Ranked For Your Brand"
                count={visibleTrendingVideos.length}
                color="text-orange-400"
              />
              <m.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visibleTrendingVideos.map((item, i) => (
                  <TrendVideoCard
                    key={item.signal.id}
                    signal={item.signal}
                    rank={i + 1}
                    relevanceScore={item.score}
                    relevanceMatches={item.matches}
                  />
                ))}
              </m.div>
            </section>
          )}

          {visibleExplore.length > 0 && (
            <section>
              <SectionHeader
                icon={<Compass className="size-3.5" />}
                title="TikTok Explore -- Sports"
                count={visibleExplore.length}
                color="text-blue-400"
              />
              <m.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visibleExplore.map((item, i) => (
                  <TrendVideoCard
                    key={item.signal.id}
                    signal={item.signal}
                    rank={i + 1}
                    relevanceScore={item.score}
                    relevanceMatches={item.matches}
                  />
                ))}
              </m.div>
            </section>
          )}

          {visibleHashtag.length > 0 && (
            <section>
              <SectionHeader
                icon={<Hash className="size-3.5" />}
                title="Your Hashtag Signals"
                count={visibleHashtag.length}
                color="text-purple-400"
              />
              <m.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visibleHashtag.map((item, i) => (
                  <TrendVideoCard
                    key={item.signal.id}
                    signal={item.signal}
                    rank={i + 1}
                    relevanceScore={item.score}
                    relevanceMatches={item.matches}
                  />
                ))}
              </m.div>
            </section>
          )}

          {visibleInstagram.length > 0 && (
            <section>
              <SectionHeader
                icon={<Instagram className="size-3.5" />}
                title="Instagram Momentum -- Ranked For Your Brand"
                count={visibleInstagram.length}
                color="text-fuchsia-400"
              />
              <m.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {visibleInstagram.map((item, i) => (
                  <TrendVideoCard
                    key={item.signal.id}
                    signal={item.signal}
                    rank={i + 1}
                    platform="instagram"
                    relevanceScore={item.score}
                    relevanceMatches={item.matches}
                  />
                ))}
              </m.div>
            </section>
          )}
        </>
      )}
    </m.div>
  )
}

function SectionHeader({
  icon,
  title,
  count,
  color,
}: {
  icon: React.ReactNode
  title: string
  count: number
  color: string
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span className={color}>{icon}</span>
      <h3 className="font-display text-sm tracking-wider text-foreground uppercase">
        {title}
      </h3>
      <span className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
        {count}
      </span>
      <div className="h-px flex-1 bg-border/30" />
    </div>
  )
}

function HeroMetric({
  icon,
  label,
  value,
  highlight,
  dark,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
  dark?: boolean
}) {
  return (
    <div className={cn(
      "rounded-lg border px-3 py-2.5",
      dark ? "border-white/15 bg-white/[0.04]" : "border-border/30 bg-background/60"
    )}>
      <div className="mb-1 flex items-center gap-1.5">
        <span className={dark ? "text-zinc-300" : "text-muted-foreground"}>{icon}</span>
        <span className={cn(
          "text-[10px] uppercase tracking-wider",
          dark ? "text-zinc-400" : "text-muted-foreground"
        )}>
          {label}
        </span>
      </div>
      <p className={cn(
        "truncate text-lg font-bold tabular-nums",
        highlight ? "text-emerald-400" : dark ? "text-white" : "text-foreground"
      )}>
        {value}
      </p>
    </div>
  )
}

function formatLargeNumber(n: number): string {
  if (n === 0) return "0"
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function TrendsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/40 bg-muted/20 p-5">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div>
            <Skeleton className="mb-1 h-5 w-36" />
            <Skeleton className="h-3 w-60" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="mb-3 h-4 w-52" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      </div>

      <div>
        <Skeleton className="mb-3 h-4 w-56" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
