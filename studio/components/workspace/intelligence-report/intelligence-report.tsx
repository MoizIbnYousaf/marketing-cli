"use client"

import { m } from "framer-motion"
import { Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { reportStagger } from "@/lib/animation/variants"
import type { Brief } from "@/lib/types/briefs"
import type { PipelineRun, PlatformStat } from "@/lib/types/intelligence"

import { ReportHeader } from "./report-header"
import { TldrHero } from "./tldr-hero"
import { PlatformGrid } from "./platform-grid"
import { TopStoriesGrid } from "./top-stories-grid"
import { SentimentDashboard } from "./sentiment-dashboard"
import { ContentOpportunities } from "./content-opportunities"
import { BrandCommentsFeed } from "./brand-comments-feed"
import { AudienceProfiles } from "./audience-profiles"

const SkeletonCard = ({ label }: { label: string }) => (
  <div className="rounded-lg border border-border/40 p-4 animate-pulse">
    <div className="h-3 w-24 bg-muted rounded mb-3" />
    <div className="space-y-2">
      <div className="h-2 bg-muted rounded w-full" />
      <div className="h-2 bg-muted rounded w-3/4" />
    </div>
    <p className="text-[10px] text-muted-foreground/50 mt-2">{label}</p>
  </div>
)

export const IntelligenceReport = ({
  brief,
  pipelineRun,
  agentName,
  signalStats,
}: {
  brief: Brief | null | undefined
  pipelineRun: PipelineRun | null | undefined
  agentName: string
  signalStats?: PlatformStat[]
}) => {
  const isPipelineRunning = pipelineRun && !["completed", "failed"].includes(pipelineRun.status)

  if (!brief && !isPipelineRunning) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="size-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
          <Loader2 className="size-5 text-accent/40" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No brief yet</p>
        <p className="text-xs text-muted-foreground">
          Run the pipeline to generate your first intelligence report.
        </p>
      </div>
    )
  }

  if (isPipelineRunning && !brief) {
    return (
      <ScrollArea className="h-full w-full">
        <m.div
          variants={reportStagger}
          initial="hidden"
          animate="visible"
          className="space-y-4 p-4"
        >
          <ReportHeader agentName={agentName} status={pipelineRun.status} />
          {signalStats && <PlatformGrid stats={signalStats} />}
          <SkeletonCard label="Generating TL;DR..." />
          <SkeletonCard label="Analyzing stories..." />
          <SkeletonCard label="Processing sentiment..." />
        </m.div>
      </ScrollArea>
    )
  }

  if (!brief) return null

  return (
    <ScrollArea className="h-full w-full">
      <m.div
        variants={reportStagger}
        initial="hidden"
        animate="visible"
        className="space-y-5 p-4"
      >
        <ReportHeader
          agentName={agentName}
          briefDate={brief.date}
          briefType={brief.briefType ?? undefined}
          status={brief.status}
        />

        {brief.tldr && <TldrHero text={brief.tldr} />}

        {signalStats && <PlatformGrid stats={signalStats} />}

        {brief.topStories.length > 0 && (
          <TopStoriesGrid
            stories={brief.topStories}
            emergingSignals={brief.emergingSignals.length > 0 ? brief.emergingSignals : undefined}
          />
        )}

        {brief.contentOpportunities && brief.contentOpportunities.length > 0 && (
          <ContentOpportunities
            opportunities={brief.contentOpportunities}
            watchItems={brief.whatToWatch.length > 0 ? brief.whatToWatch : undefined}
          />
        )}

        <SentimentDashboard sentiment={brief.sentiment} />

        {brief.brandComments && brief.brandComments.length > 0 && (
          <BrandCommentsFeed comments={brief.brandComments} />
        )}

        {brief.audienceProfiles && brief.audienceProfiles.length > 0 && (
          <AudienceProfiles profiles={brief.audienceProfiles} />
        )}
      </m.div>
    </ScrollArea>
  )
}
