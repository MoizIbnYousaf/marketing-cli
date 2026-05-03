"use client"

import useSWR from "swr"
import { m } from "framer-motion"
import { FileText, TrendingUp, Shield, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { fetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/formatTime"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { staggerContainer, staggerItem } from "@/lib/animation/variants"
import { TabPageHeader, TabPageHeaderSkeleton, MetadataDot } from "./tab-page-header"
import { TabErrorState } from "./tab-error-state"
import { RefreshChip } from "./refresh-chip"
import { IntelligenceReport } from "./intelligence-report/intelligence-report"
import type { Brief } from "@/lib/types/briefs"

const DIMENSION_ORDER = ["trend", "brand", "audience"] as const

const DIMENSION_CONFIG: Record<
  string,
  {
    icon: LucideIcon
    label: string
    borderColor: string
    iconColor: string
    bgGradient: string
  }
> = {
  trend: {
    icon: TrendingUp,
    label: "Trend Scout",
    borderColor: "border-t-blue-500",
    iconColor: "text-blue-600 dark:text-blue-400",
    bgGradient: "from-blue-500/[0.04] via-transparent to-transparent",
  },
  brand: {
    icon: Shield,
    label: "Brand Sentinel",
    borderColor: "border-t-amber-500",
    iconColor: "text-amber-600 dark:text-amber-400",
    bgGradient: "from-amber-500/[0.04] via-transparent to-transparent",
  },
  audience: {
    icon: Users,
    label: "Audience Analyst",
    borderColor: "border-t-purple-500",
    iconColor: "text-purple-600 dark:text-purple-400",
    bgGradient: "from-purple-500/[0.04] via-transparent to-transparent",
  },
}

type Agent = {
  _id: string
  name: string
  agentType?: string
}

type BriefsResponse = {
  agents: Agent[]
  briefs: Brief[]
}

function BriefsTabSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <TabPageHeaderSkeleton />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-lg" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  )
}

export function BriefsTab({ groupId }: { groupId: string }) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<BriefsResponse>(
    `/api/briefs?groupId=${groupId}`,
    fetcher
  )

  if (error && !data) {
    return <TabErrorState error={error} onRetry={() => mutate()} title="Couldn't load briefs" />
  }

  if (isLoading || !data) {
    return <BriefsTabSkeleton />
  }

  // G4-65 guard: destructure defaults only fire on `undefined`. When the
  // server returns an explicit null for either array, the default is
  // skipped and the `[...agents].sort` / `for (const brief of briefs)`
  // below would crash. Narrow explicitly.
  const agents = Array.isArray(data.agents) ? data.agents : []
  const briefs = Array.isArray(data.briefs) ? data.briefs : []

  // Sort agents by dimension order
  const sorted = [...agents].sort(
    (a, b) =>
      DIMENSION_ORDER.indexOf(
        (a.agentType ?? "trend") as (typeof DIMENSION_ORDER)[number]
      ) -
      DIMENSION_ORDER.indexOf(
        (b.agentType ?? "trend") as (typeof DIMENSION_ORDER)[number]
      )
  )

  // Get latest completed brief per agent type
  const latestBriefByType = new Map<string, Brief>()
  for (const brief of briefs) {
    if (brief.status !== "completed") continue
    const existing = latestBriefByType.get(brief.agentType ?? "")
    if (!existing || brief._creationTime > existing._creationTime) {
      latestBriefByType.set(brief.agentType ?? "", brief)
    }
  }

  const completedCount = latestBriefByType.size
  const hasAnyBrief = completedCount > 0

  const latestTimestamp = hasAnyBrief
    ? Math.max(
        ...Array.from(latestBriefByType.values(), (b) => b._creationTime)
      )
    : null

  if (!hasAnyBrief) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="size-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
          <FileText className="size-5 text-accent/40" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          No intelligence briefs yet
        </p>
        <p className="text-xs text-muted-foreground">
          Run your agents to generate intelligence reports across all
          dimensions.
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full w-full">
      <m.div
        variants={staggerContainer}
        initial={false}
        animate="visible"
        className="space-y-6 p-6 max-w-6xl mx-auto"
      >
        {/* Header */}
        <m.div variants={staggerItem}>
          <TabPageHeader
            icon={FileText}
            iconColorClass="text-accent"
            title="Intelligence Briefs"
          >
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {completedCount} of {DIMENSION_ORDER.length} dimensions
            </span>
            {latestTimestamp && (
              <>
                <MetadataDot />
                <span className="text-[11px] text-muted-foreground">
                  Latest {timeAgo(latestTimestamp)}
                </span>
              </>
            )}
            <MetadataDot />
            <RefreshChip onClick={() => mutate()} loading={isValidating} />
          </TabPageHeader>
        </m.div>

        {/* Dimension summary cards */}
        <m.div variants={staggerItem} className="grid grid-cols-3 gap-3">
          {DIMENSION_ORDER.map((dimension) => {
            const config = DIMENSION_CONFIG[dimension]
            const brief = latestBriefByType.get(dimension)
            const DimensionIcon = config.icon
            const hasBrief = !!brief?.tldr

            return (
              <Card
                key={dimension}
                className={cn(
                  "border-t-2 py-0 overflow-hidden relative hover:shadow-sm transition-all",
                  config.borderColor
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br pointer-events-none",
                    config.bgGradient
                  )}
                />
                <CardContent className="p-4 relative">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <DimensionIcon
                      className={cn("size-3.5", config.iconColor)}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {config.label}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-xs leading-relaxed line-clamp-2",
                      hasBrief
                        ? "font-serif text-foreground/80"
                        : "text-muted-foreground/50 italic"
                    )}
                  >
                    {brief?.tldr ?? "Awaiting first run"}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </m.div>

        {/* Section divider */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Full Reports
          </span>
          <div className="flex-1 border-t border-border/30" />
        </div>

        {/* Full reports */}
        {sorted.map((agent) => {
          const brief = latestBriefByType.get(agent.agentType ?? "") ?? null
          if (!brief) return null

          return (
            <m.div key={agent._id} variants={staggerItem}>
              <IntelligenceReport
                brief={brief}
                pipelineRun={null}
                agentName={agent.name}
              />
            </m.div>
          )
        })}
      </m.div>
    </ScrollArea>
  )
}
