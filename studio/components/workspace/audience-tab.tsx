"use client"

import useSWR from "swr"
import { m } from "framer-motion"
import { Users, Hash, BarChart3 } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { staggerContainer, staggerItem, scaleIn } from "@/lib/animation/variants"
import { AudienceProfiles } from "./intelligence-report/audience-profiles"
import { TabPageHeader, TabPageHeaderSkeleton, MetadataDot } from "./tab-page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { TabErrorState } from "./tab-error-state"
import { RefreshChip } from "./refresh-chip"
import type { AudienceProfile, PlatformIntelligenceItem } from "@/lib/types/audience"

type AudienceResponse = {
  profiles: AudienceProfile[]
  platformIntelligence: PlatformIntelligenceItem[]
  byTheNumbers: string[]
}

export function AudienceTab({ groupId }: { groupId: string }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<AudienceResponse>(
    `/api/audience/profiles?groupId=${groupId}`,
    fetcher
  )

  if (error && !data) {
    return <TabErrorState error={error} onRetry={() => mutate()} title="Couldn't load audience" />
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-6 p-6 max-w-6xl mx-auto">
        <TabPageHeaderSkeleton />
        <div>
          <Skeleton className="h-3 w-28 mb-3" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-lg" />
            ))}
          </div>
        </div>
        <div>
          <Skeleton className="h-3 w-36 mb-3" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  const { profiles = [], platformIntelligence = [], byTheNumbers: metrics = [] } = data

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
          <Users className="size-5 text-purple-500/40" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          No audience data yet
        </p>
        <p className="text-xs text-muted-foreground">
          Run the Audience Analyst agent to track follower growth, engagement,
          and creator networks.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0">
      <ScrollArea className="h-full min-h-0 w-full">
      <m.div
        variants={staggerContainer}
        initial={false}
        animate="visible"
        className="space-y-6 p-6 max-w-6xl mx-auto"
      >
        {/* Header */}
        <m.div variants={staggerItem}>
          <TabPageHeader
            icon={Users}
            iconColorClass="text-purple-400"
            iconBgClass="bg-purple-500/5"
            title="Audience Intelligence"
          >
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {profiles.length} profile
              {profiles.length !== 1 ? "s" : ""}
            </span>
            {metrics.length > 0 && (
              <>
                <MetadataDot />
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {metrics.length} metric{metrics.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
            {platformIntelligence.length > 0 && (
              <>
                <MetadataDot />
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {platformIntelligence.length} insight
                  {platformIntelligence.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
            <MetadataDot />
            <RefreshChip onClick={() => mutate()} loading={isValidating} />
          </TabPageHeader>
        </m.div>

        {/* Profiles */}
        <m.div variants={staggerItem}>
          <AudienceProfiles profiles={profiles} />
        </m.div>

        {/* Platform Intelligence */}
        {platformIntelligence.length > 0 && (
          <m.div variants={scaleIn} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BarChart3 className="size-3" />
              Platform Intelligence ({platformIntelligence.length})
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {platformIntelligence.map((item, i) => (
                <m.div
                  key={i}
                  variants={staggerItem}
                  className="rounded-lg border border-border px-4 py-3 hover:border-accent/30 hover:shadow-sm transition-all"
                >
                  <p className="text-sm font-semibold text-accent tabular-nums leading-snug">
                    {item.metric}
                  </p>
                  <p className="text-xs font-serif italic text-foreground/70 leading-relaxed mt-1.5">
                    {item.insight}
                  </p>
                  <Badge
                    variant="outline"
                    className="mt-2.5 text-[10px] font-bold uppercase tracking-wider"
                  >
                    {item.platform}
                  </Badge>
                </m.div>
              ))}
            </div>
          </m.div>
        )}

        {/* By the Numbers */}
        {metrics.length > 0 && (
          <m.div variants={scaleIn} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Hash className="size-3" />
              By the Numbers
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {metrics.map((metric: string, i: number) => (
                <m.div
                  key={i}
                  variants={staggerItem}
                  className="rounded-lg border border-border px-4 py-3 hover:border-accent/30 hover:shadow-sm transition-all"
                >
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {metric}
                  </p>
                </m.div>
              ))}
            </div>
          </m.div>
        )}
      </m.div>
      </ScrollArea>
    </div>
  )
}
