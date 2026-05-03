"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { m, AnimatePresence } from "framer-motion"
import {
  FileText,
  Mail,
  BarChart3,
  Lightbulb,
  TrendingUp,
  ExternalLink,
  Clock,
  Newspaper,
  Eye,
  Sparkles,
  Play,
  Target,
  MessageCircle,
  Users,
  Heart,
  CheckCircle2,
  Database,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  staggerContainer,
  staggerItem,
  fadeIn,
} from "@/lib/animation/variants"
import { useWorkspaceStore } from "@/lib/stores/workspace"
import { AgentPhaseProgress } from "@/components/workspace/agent-phase-progress"
import type { AgentPhaseId } from "@/lib/animation/constants"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Brief } from "@/lib/types/briefs"
import type { PipelineRun } from "@/lib/types/intelligence"

// --- Annotation Badge ---

const ANNOTATIONS: Record<string, string> = {
  tldr: "The one-sentence takeaway from today's scan",
  executiveSummary: "A high-level narrative for leadership or clients",
  topStories: "The most relevant stories scored by your agent",
  sentiment: "Positive/negative/neutral breakdown of coverage",
  emergingSignals: "Early-stage trends your agent detected",
  whatToWatch: "Actionable items to keep an eye on",
  byTheNumbers: "Key stats and data points at a glance",
  contentOpportunities: "Actionable content ideas tagged by audience and platform",
  fanComments: "Top fan reactions from your brand's social posts",
  audienceProfiles: "Follower counts, engagement rates, and profile stats",
  platformIntelligence: "Scraper-exclusive data no general AI can access",
}

const AnnotationBadge = ({ text }: { text: string }) => (
  <m.span
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
    className="inline-flex items-center gap-1 rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 text-[10px] font-medium text-accent ml-2"
  >
    <Sparkles className="size-2.5" />
    {text}
  </m.span>
)

const AnnotationDismissBar = ({ onDismiss }: { onDismiss: () => void }) => (
  <m.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
    className="border-b border-accent/15 bg-accent/5 px-4 py-2 flex items-center justify-between"
  >
    <p className="text-[11px] text-accent/80">
      First time? These labels explain each section.
    </p>
    <button
      onClick={onDismiss}
      className="text-[11px] font-medium text-accent hover:text-accent/80 underline underline-offset-2 transition-colors"
    >
      Got it
    </button>
  </m.div>
)

// --- Brief Tab ---

const TldrCallout = ({ text, showAnnotations }: { text: string; showAnnotations?: boolean }) => (
  <m.div
    variants={staggerItem}
    className="relative rounded-xl border border-accent/20 bg-gradient-to-br from-accent/8 via-accent/[0.03] to-transparent p-5 overflow-hidden"
  >
    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent via-accent/60 to-transparent" />
    <div className="flex items-center gap-2 mb-3">
      <Lightbulb className="size-4 text-accent" />
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
        Today&apos;s Signal
      </span>
      <AnimatePresence>
        {showAnnotations && <AnnotationBadge text={ANNOTATIONS.tldr} />}
      </AnimatePresence>
    </div>
    <p className="text-base leading-relaxed font-serif font-medium text-foreground tracking-tight">
      {text}
    </p>
  </m.div>
)

const ExecutiveSummary = ({ text, showAnnotations }: { text: string; showAnnotations?: boolean }) => (
  <m.div variants={staggerItem} className="space-y-2">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center flex-wrap">
      Executive Summary
      <AnimatePresence>
        {showAnnotations && <AnnotationBadge text={ANNOTATIONS.executiveSummary} />}
      </AnimatePresence>
    </h3>
    <p className="text-sm leading-relaxed font-serif text-foreground/90">
      {text}
    </p>
  </m.div>
)

const TopStoryCard = ({
  story,
  index,
}: {
  story: Brief["topStories"][number]
  index: number
}) => (
  <m.div
    variants={staggerItem}
    className="group rounded-lg border border-border p-4 hover:border-accent/30 hover:shadow-sm transition-all"
  >
    <div className="flex items-start gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground text-xs font-bold mt-0.5">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mb-1.5"
        >
          <h4 className="text-sm font-semibold leading-snug text-foreground group-hover:text-accent transition-colors">
            {story.title}
          </h4>
        </a>
        <p className="text-xs text-muted-foreground leading-relaxed mb-2 break-words">
          {story.summary}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
          <span className="font-semibold text-muted-foreground">{story.source}</span>
          <span>&#183;</span>
          <span>{story.publishedAt}</span>
        </div>
        <div className="flex items-start gap-1.5 rounded-md bg-accent/5 border border-accent/10 px-3 py-2">
          <TrendingUp className="size-3 text-accent shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed break-words font-medium">
            {story.whyItMatters}
          </p>
        </div>
        {story.url && (
          <a
            href={story.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-accent/10 border border-accent/25 px-3.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 hover:border-accent/40 transition-all"
          >
            <ExternalLink className="size-3.5" />
            View on {story.source} &rarr;
          </a>
        )}
      </div>
    </div>
  </m.div>
)

const URGENCY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  now: { bg: "bg-rose-500/20", text: "text-red-600 dark:text-rose-400", label: "Now" },
  soon: { bg: "bg-amber-500/20", text: "text-amber-600 dark:text-amber-400", label: "Soon" },
  watch: { bg: "bg-slate-500/20", text: "text-slate-500 dark:text-slate-400", label: "Watch" },
}

const ContentOpportunitiesSection = ({
  opportunities,
  showAnnotations,
}: {
  opportunities: NonNullable<Brief["contentOpportunities"]>
  showAnnotations?: boolean
}) => (
  <m.div variants={staggerItem} className="space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 flex-wrap">
      <Target className="size-3" />
      Content Opportunities ({opportunities.length})
      <AnimatePresence>
        {showAnnotations && <AnnotationBadge text={ANNOTATIONS.contentOpportunities} />}
      </AnimatePresence>
    </h3>
    <div className="space-y-2">
      {opportunities.map((opp, i) => {
        const urgency = URGENCY_STYLES[opp.urgency ?? "watch"] ?? URGENCY_STYLES.watch
        return (
          <m.div
            key={i}
            variants={staggerItem}
            className="rounded-lg border border-border p-3 hover:border-accent/30 hover:shadow-sm transition-all"
          >
            <p className="text-sm font-medium leading-snug text-foreground mb-2">
              {opp.hook}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-[10px] font-semibold border-accent/30 text-accent bg-accent/5"
              >
                {opp.archetype}
              </Badge>
              {opp.platform && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {opp.platform}
                </Badge>
              )}
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  urgency.bg,
                  urgency.text
                )}
              >
                {urgency.label}
              </span>
            </div>
          </m.div>
        )
      })}
    </div>
  </m.div>
)

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return String(n)
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "border-l-pink-600 dark:border-l-pink-400",
  tiktok: "border-l-rose-600 dark:border-l-rose-500",
}

const PLATFORM_BG: Record<string, string> = {
  instagram: "from-pink-500/5 to-transparent",
  tiktok: "from-rose-500/5 to-transparent",
}

const FanComments = ({
  comments,
  showAnnotations,
}: {
  comments: NonNullable<Brief["brandComments"]>
  showAnnotations?: boolean
}) => (
  <m.div variants={staggerItem} className="space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 flex-wrap">
      <MessageCircle className="size-3" />
      Fan Comments ({comments.length})
      <AnimatePresence>
        {showAnnotations && <AnnotationBadge text={ANNOTATIONS.fanComments} />}
      </AnimatePresence>
    </h3>
    <div className="space-y-2">
      {comments.slice(0, 5).map((comment, i) => (
        <m.div
          key={i}
          variants={staggerItem}
          className={cn(
            "rounded-lg border border-border border-l-2 p-3 bg-gradient-to-r",
            PLATFORM_COLORS[comment.platform] ?? "border-l-accent",
            PLATFORM_BG[comment.platform] ?? "from-transparent"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Badge variant="outline" className="text-[10px] font-semibold h-4 px-1.5">
                  {comment.platform === "instagram" ? "IG" : "TikTok"}
                </Badge>
                <span className="text-xs font-semibold text-foreground">
                  @{comment.author}
                </span>
              </div>
              <p className="text-xs font-serif italic text-foreground/80 leading-relaxed">
                &ldquo;{comment.text}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-2">
                {comment.timestamp && (
                  <span className="text-[10px] text-muted-foreground/60">
                    {new Date(comment.timestamp).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
                {comment.postUrl && (
                  <a
                    href={comment.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-all",
                      comment.platform === "instagram"
                        ? "bg-pink-500/15 text-pink-600 dark:text-pink-400 hover:bg-pink-500/25"
                        : "bg-rose-500/15 text-red-600 dark:text-rose-400 hover:bg-rose-500/25"
                    )}
                  >
                    <ExternalLink className="size-2.5" />
                    View Post &rarr;
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
              <Heart className="size-3" />
              <span className="text-xs tabular-nums font-medium">
                {formatNumber(comment.likes)}
              </span>
            </div>
          </div>
        </m.div>
      ))}
    </div>
  </m.div>
)

const AudienceProfileCards = ({
  profiles,
  showAnnotations,
}: {
  profiles: NonNullable<Brief["audienceProfiles"]>
  showAnnotations?: boolean
}) => (
  <m.div variants={staggerItem} className="space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 flex-wrap">
      <Users className="size-3" />
      Audience Profiles ({profiles.length})
      <AnimatePresence>
        {showAnnotations && <AnnotationBadge text={ANNOTATIONS.audienceProfiles} />}
      </AnimatePresence>
    </h3>
    <div className="grid grid-cols-2 gap-2">
      {profiles.map((profile, i) => (
        <m.div
          key={i}
          variants={staggerItem}
          className="rounded-lg border border-border p-4 hover:border-accent/30 hover:shadow-sm transition-all"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {profile.platform}
            </span>
            {profile.verified && (
              <CheckCircle2 className="size-3 text-accent" />
            )}
          </div>
          <a
            href={
              profile.platform === "instagram"
                ? `https://instagram.com/${profile.handle}`
                : `https://tiktok.com/@${profile.handle}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-accent hover:underline underline-offset-2 mb-2 block"
          >
            @{profile.handle}
          </a>
          <p className="text-3xl font-bold tabular-nums text-foreground tracking-tight leading-none">
            {formatNumber(profile.followers)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">followers</p>
          {profile.engagementRate !== undefined && (
            <div className="mt-2">
              <span className="inline-flex items-center rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                {profile.engagementRate.toFixed(1)}% engagement
              </span>
            </div>
          )}
          {profile.bio && (
            <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-2">
              {profile.bio}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
            <span>{formatNumber(profile.posts)} posts</span>
            <span>{formatNumber(profile.following)} following</span>
          </div>
          <a
            href={
              profile.platform === "instagram"
                ? `https://instagram.com/${profile.handle}`
                : `https://tiktok.com/@${profile.handle}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2.5 rounded-full bg-accent/10 border border-accent/25 px-3 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20 hover:border-accent/40 transition-all"
          >
            <ExternalLink className="size-3" />
            View @{profile.handle} &rarr;
          </a>
        </m.div>
      ))}
    </div>
  </m.div>
)

const PlatformIntelligenceSection = ({
  insights,
  showAnnotations,
}: {
  insights: NonNullable<Brief["platformIntelligence"]>
  showAnnotations?: boolean
}) => (
  <m.div variants={staggerItem} className="space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 flex-wrap">
      <Database className="size-3" />
      Platform Intelligence ({insights.length})
      <AnimatePresence>
        {showAnnotations && <AnnotationBadge text={ANNOTATIONS.platformIntelligence} />}
      </AnimatePresence>
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {insights.map((pi, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-gradient-to-br from-accent/[0.04] to-transparent p-3.5 space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            {pi.url ? (
              <a
                href={pi.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-bold tabular-nums text-accent leading-tight hover:underline underline-offset-2 inline-flex items-center gap-1.5"
              >
                {pi.metric}
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            ) : (
              <span className="text-xl font-bold tabular-nums text-accent leading-tight">
                {pi.metric}
              </span>
            )}
            {pi.comparison && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                {pi.comparison.toLowerCase().includes("lower") || pi.comparison.toLowerCase().includes("under") ? (
                  <ArrowDownRight className="size-2.5" />
                ) : (
                  <ArrowUpRight className="size-2.5" />
                )}
                {pi.comparison}
              </span>
            )}
          </div>
          <p className="text-[13px] font-serif italic leading-snug text-foreground/80">
            {pi.insight}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-accent/10 border border-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {pi.platform}
            </span>
            {pi.dataSource && (
              <span className="text-[10px] text-muted-foreground">
                via {pi.dataSource}
              </span>
            )}
          </div>
          {pi.action && (
            <p className="text-[11px] text-muted-foreground leading-snug">
              {pi.action}
            </p>
          )}
        </div>
      ))}
    </div>
  </m.div>
)

const BriefContent = ({
  brief,
  showAnnotations,
  children,
}: {
  brief: Brief
  showAnnotations?: boolean
  children?: React.ReactNode
}) => (
  <ScrollArea className="h-full w-full">
    <m.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6 p-4 overflow-hidden"
    >
      {brief.tldr && <TldrCallout text={brief.tldr} showAnnotations={showAnnotations} />}
      {brief.executiveSummary && (
        <ExecutiveSummary text={brief.executiveSummary} showAnnotations={showAnnotations} />
      )}
      {brief.platformIntelligence && brief.platformIntelligence.length > 0 && (
        <PlatformIntelligenceSection
          insights={brief.platformIntelligence}
          showAnnotations={showAnnotations}
        />
      )}
      {brief.topStories.length > 0 && (
        <m.div variants={staggerItem} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <Newspaper className="size-3" />
            Top Stories ({brief.topStories.length})
            <AnimatePresence>
              {showAnnotations && <AnnotationBadge text={ANNOTATIONS.topStories} />}
            </AnimatePresence>
          </h3>
          <div className="space-y-2">
            {brief.topStories.map((story, i) => (
              <TopStoryCard key={i} story={story} index={i} />
            ))}
          </div>
        </m.div>
      )}
      {brief.contentOpportunities && brief.contentOpportunities.length > 0 && (
        <ContentOpportunitiesSection
          opportunities={brief.contentOpportunities}
          showAnnotations={showAnnotations}
        />
      )}
      {brief.sentiment && (
        <m.div variants={staggerItem} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center flex-wrap">
            Sentiment
            <AnimatePresence>
              {showAnnotations && <AnnotationBadge text={ANNOTATIONS.sentiment} />}
            </AnimatePresence>
          </h3>
          {(() => {
            const { positive, negative, neutral, summary } = brief.sentiment
            const total = positive + negative + neutral
            if (total === 0) return null
            const pPct = Math.round((positive / total) * 100)
            const nPct = Math.round((negative / total) * 100)
            const neuPct = 100 - pPct - nPct
            return (
              <>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <m.div className="bg-emerald-500 rounded-l-full" initial={{ width: 0 }} animate={{ width: `${pPct}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
                  <m.div className="bg-slate-500" initial={{ width: 0 }} animate={{ width: `${neuPct}%` }} transition={{ duration: 0.8, delay: 0.4 }} />
                  <m.div className="bg-rose-400 rounded-r-full" initial={{ width: 0 }} animate={{ width: `${nPct}%` }} transition={{ duration: 0.8, delay: 0.6 }} />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" />Positive {pPct}%</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-slate-500" />Neutral {neuPct}%</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-400" />Negative {nPct}%</span>
                </div>
                {summary && <p className="text-xs text-muted-foreground/80 leading-relaxed">{summary}</p>}
              </>
            )
          })()}
        </m.div>
      )}
      {brief.brandComments && brief.brandComments.length > 0 && (
        <FanComments comments={brief.brandComments} showAnnotations={showAnnotations} />
      )}
      {brief.audienceProfiles && brief.audienceProfiles.length > 0 && (
        <AudienceProfileCards profiles={brief.audienceProfiles} showAnnotations={showAnnotations} />
      )}
      {brief.whatToWatch.length > 0 && (
        <m.div variants={staggerItem} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <Eye className="size-3" />
            What to Watch
            <AnimatePresence>
              {showAnnotations && <AnnotationBadge text={ANNOTATIONS.whatToWatch} />}
            </AnimatePresence>
          </h3>
          <div className="space-y-1.5">
            {brief.whatToWatch.map((item, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md px-2.5 py-1.5 hover:bg-muted/50 transition-colors">
                <div className="mt-1 size-1.5 rounded-full bg-accent shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{item.item}</p>
                  {item.action && <p className="text-[11px] text-muted-foreground">{item.action}</p>}
                </div>
              </div>
            ))}
          </div>
        </m.div>
      )}
      {brief.byTheNumbers.length > 0 && (
        <m.div variants={staggerItem} className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <BarChart3 className="size-3" />
            By the Numbers
            <AnimatePresence>
              {showAnnotations && <AnnotationBadge text={ANNOTATIONS.byTheNumbers} />}
            </AnimatePresence>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {brief.byTheNumbers.map((stat, i) => {
              const match = stat.match(/^([\d,.]+%?)\s+(.+)$/)
              const hasLeadingNumber = match && match[1] && match[2]
              return (
                <m.div
                  key={i}
                  variants={staggerItem}
                  className="flex items-baseline gap-3 rounded-lg border border-border/40 bg-muted/20 px-3.5 py-3"
                >
                  {hasLeadingNumber ? (
                    <>
                      <span className="text-xl font-bold tabular-nums text-accent shrink-0 tracking-tight">{match[1]}</span>
                      <span className="text-xs text-muted-foreground leading-relaxed">{match[2]}</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground leading-relaxed">{stat}</span>
                  )}
                </m.div>
              )
            })}
          </div>
        </m.div>
      )}
      {children}
    </m.div>
  </ScrollArea>
)

// --- Email Tab ---

const EmailPreview = ({ htmlContent }: { htmlContent: string }) => {
  if (!htmlContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <Mail className="size-8 text-muted-foreground/30 mb-2" />
        <p className="text-sm text-muted-foreground">No email generated yet.</p>
      </div>
    )
  }
  return (
    <div className="h-full p-4">
      <iframe
        srcDoc={htmlContent}
        title="Email Preview"
        sandbox="allow-same-origin"
        className="w-full h-full rounded-lg border border-border/50 bg-white"
      />
    </div>
  )
}

// --- Metrics Tab ---

const MetricsView = ({
  brief,
  pipelineRun,
}: {
  brief: Brief | null
  pipelineRun: PipelineRun | null
}) => {
  const metrics = [
    { label: "Total Articles", value: brief?.totalArticles ?? "--", icon: Newspaper },
    { label: "Sources", value: brief?.totalSources ?? "--", icon: FileText },
    { label: "Relevant Articles", value: pipelineRun?.articlesRelevant ?? "--", icon: TrendingUp },
    { label: "Status", value: brief?.status ?? "--", icon: BarChart3 },
  ]

  const durationMs = pipelineRun?.completedAt
    ? pipelineRun.completedAt - pipelineRun.startedAt
    : null

  return (
    <ScrollArea className="h-full">
      <m.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-6 p-4"
      >
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => (
            <m.div
              key={metric.label}
              variants={staggerItem}
              className="rounded-lg border border-border/50 bg-muted/30 p-3"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <metric.icon className="size-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground font-medium">
                  {metric.label}
                </span>
              </div>
              <p className="text-lg font-semibold tabular-nums text-foreground">
                {metric.value}
              </p>
            </m.div>
          ))}
        </div>

        {durationMs !== null && (
          <m.div
            variants={staggerItem}
            className="rounded-lg border border-border/50 p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="size-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-medium">
                Pipeline Duration
              </span>
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {(durationMs / 1000).toFixed(1)}s
            </p>
          </m.div>
        )}

        {pipelineRun && (
          <m.div variants={staggerItem} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Last Pipeline Run
            </h3>
            <div className="rounded-lg border border-border/50 divide-y divide-border/30">
              <div className="flex justify-between px-3 py-2 text-xs">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-[10px] h-5">{pipelineRun.status}</Badge>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs">
                <span className="text-muted-foreground">Current Step</span>
                <span className="font-medium">{pipelineRun.currentStep}</span>
              </div>
              <div className="flex justify-between px-3 py-2 text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium tabular-nums">{pipelineRun.progress}%</span>
              </div>
              {pipelineRun.articlesFound !== undefined && (
                <div className="flex justify-between px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Articles Found</span>
                  <span className="font-medium tabular-nums">{pipelineRun.articlesFound}</span>
                </div>
              )}
            </div>
          </m.div>
        )}
      </m.div>
    </ScrollArea>
  )
}

// --- In-progress state ---

const PipelineInProgressState = ({ pipelineRun }: { pipelineRun: PipelineRun }) => (
  <m.div
    variants={fadeIn}
    initial="hidden"
    animate="visible"
    className="flex flex-col items-center justify-center h-full text-center px-8 max-w-md mx-auto gap-6"
  >
    <m.div
      animate={{ rotate: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      className="flex size-16 items-center justify-center rounded-2xl bg-accent/10"
    >
      <Newspaper className="size-8 text-accent" />
    </m.div>
    <div>
      <p className="text-lg font-serif font-medium text-foreground">Building your brief...</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Your agent is scanning sources and compiling intelligence.
      </p>
    </div>
    <div className="w-full">
      <AgentPhaseProgress
        currentPhase={pipelineRun.status as AgentPhaseId}
        error={pipelineRun.error}
        startedAt={pipelineRun.startedAt}
      />
    </div>
    {pipelineRun.articlesFound !== undefined && (
      <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-6 text-center">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{pipelineRun.articlesFound}</p>
          <p className="text-[11px] text-muted-foreground">Articles Found</p>
        </div>
        {pipelineRun.articlesRelevant !== undefined && (
          <div>
            <p className="text-2xl font-semibold tabular-nums text-accent">{pipelineRun.articlesRelevant}</p>
            <p className="text-[11px] text-muted-foreground">Relevant</p>
          </div>
        )}
      </m.div>
    )}
  </m.div>
)

const RunAgainCta = ({
  agentId,
  onTriggered,
}: {
  agentId: string
  onTriggered: () => void
}) => {
  const [isRunning, setIsRunning] = useState(false)

  const handleRun = async () => {
    setIsRunning(true)
    onTriggered()
    try {
      await fetch(`/api/agents/${agentId}/run`, { method: "POST" })
    } catch (err) {
      console.error("Run failed:", err)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <m.div
      variants={staggerItem}
      className="rounded-xl border-2 border-dashed border-accent/25 bg-accent/[0.02] p-5 text-center space-y-3"
    >
      <m.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-10 items-center justify-center rounded-xl bg-accent/10 mx-auto"
      >
        <Play className="size-5 text-accent" />
      </m.div>
      <div>
        <p className="text-sm font-medium text-foreground">See it happen live</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-[280px] mx-auto">
          Watch the pipeline scan sources, score articles, and build a fresh brief in real-time.
        </p>
      </div>
      <Button onClick={handleRun} disabled={isRunning} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
        {isRunning ? "Starting..." : "Run Pipeline Now"}
      </Button>
    </m.div>
  )
}

const ResearchTransitionCta = ({
  researchAgentId,
  onSeen,
}: {
  researchAgentId: string
  onSeen: () => void
}) => {
  const router = useRouter()
  const handleClick = () => {
    onSeen()
    router.push(`/dashboard/agents/${researchAgentId}`)
  }
  return (
    <m.div
      variants={staggerItem}
      className="rounded-xl border-2 border-dashed border-accent/25 bg-accent/[0.02] p-5 text-center space-y-3"
    >
      <m.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-10 items-center justify-center rounded-xl bg-accent/10 mx-auto"
      >
        <Sparkles className="size-5 text-accent" />
      </m.div>
      <div>
        <p className="text-sm font-medium text-foreground">You&apos;ve mastered News Intelligence</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-[300px] mx-auto">
          The studio also does deep research. Explore a completed market analysis with PowerPoint, Excel, and PDF deliverables.
        </p>
      </div>
      <Button onClick={handleClick} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
        Explore Deep Research &rarr;
      </Button>
    </m.div>
  )
}

const EmptyBriefState = ({ agentId }: { agentId?: string }) => {
  const [isRunning, setIsRunning] = useState(false)

  const handleGenerate = async () => {
    if (!agentId) return
    setIsRunning(true)
    try {
      await fetch(`/api/agents/${agentId}/run`, { method: "POST" })
    } catch (err) {
      console.error("Run failed:", err)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full text-center px-8 gap-4"
    >
      <m.div
        animate={{ rotate: [0, 5, -5, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-14 items-center justify-center rounded-2xl bg-muted/60"
      >
        <FileText className="size-7 text-muted-foreground/40" />
      </m.div>
      <div>
        <p className="text-lg font-serif font-medium text-foreground">No brief yet</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">
          Run the agent pipeline to generate your first intelligence brief.
        </p>
      </div>
      {agentId && (
        <Button onClick={handleGenerate} disabled={isRunning} size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
          {isRunning ? "Starting..." : "Generate First Brief"}
        </Button>
      )}
    </m.div>
  )
}

// --- Main Preview Panel ---

export function PreviewPanel({
  brief,
  pipelineRun,
  agentId,
  researchAgentId,
  className,
}: {
  brief: Brief | null
  pipelineRun: PipelineRun | null
  agentId?: string
  researchAgentId?: string
  className?: string
}) {
  const { demoWalkthrough, setDemoWalkthrough, hasSeenWelcome } = useWorkspaceStore()
  const showAnnotations = !demoWalkthrough.hasSeenAnnotations && hasSeenWelcome && !!brief
  const showRunCta = !pipelineRun && !demoWalkthrough.hasTriggeredFirstRun && demoWalkthrough.hasSeenAnnotations && !!brief && !!agentId
  const showResearchTransition = demoWalkthrough.hasTriggeredFirstRun && !demoWalkthrough.hasSeenResearchTransition && !!brief && !!researchAgentId

  return (
    <m.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className={cn("flex flex-col h-full min-w-0 overflow-hidden", className)}
    >
      <AnimatePresence>
        {showAnnotations && (
          <AnnotationDismissBar
            onDismiss={() => setDemoWalkthrough({ hasSeenAnnotations: true })}
          />
        )}
      </AnimatePresence>

      <Tabs defaultValue="brief" className="flex flex-col h-full">
        <div className="border-b border-border/50 px-4 pt-2 shrink-0">
          <TabsList variant="line" className="h-9">
            <TabsTrigger value="brief" className="gap-1.5 text-xs">
              <FileText className="size-3.5" />
              Brief
              {brief && !pipelineRun && (
                <span className="size-1.5 rounded-full bg-emerald-500 ml-1" />
              )}
              {pipelineRun && (
                <m.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="size-1.5 rounded-full bg-accent ml-1"
                />
              )}
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5 text-xs">
              <Mail className="size-3.5" />
              Email
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1.5 text-xs">
              <BarChart3 className="size-3.5" />
              Metrics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="brief" className="flex-1 min-h-0 min-w-0 mt-0 overflow-hidden">
          {brief ? (
            <BriefContent brief={brief} showAnnotations={showAnnotations}>
              {showRunCta && agentId && (
                <RunAgainCta
                  agentId={agentId}
                  onTriggered={() => setDemoWalkthrough({ hasTriggeredFirstRun: true })}
                />
              )}
              {showResearchTransition && researchAgentId && (
                <ResearchTransitionCta
                  researchAgentId={researchAgentId}
                  onSeen={() => setDemoWalkthrough({ hasSeenResearchTransition: true })}
                />
              )}
            </BriefContent>
          ) : pipelineRun ? (
            <PipelineInProgressState pipelineRun={pipelineRun} />
          ) : (
            <EmptyBriefState agentId={agentId} />
          )}
        </TabsContent>
        <TabsContent value="email" className="flex-1 min-h-0 min-w-0 mt-0 overflow-hidden">
          <EmailPreview htmlContent={brief?.htmlContent ?? ""} />
        </TabsContent>
        <TabsContent value="metrics" className="flex-1 min-h-0 min-w-0 mt-0 overflow-hidden">
          <MetricsView brief={brief} pipelineRun={pipelineRun} />
        </TabsContent>
      </Tabs>
    </m.div>
  )
}
