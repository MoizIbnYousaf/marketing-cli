"use client"

// PulsePage -- the rebuilt operating dashboard. One coalesced SWR call to
// /api/pulse/snapshot replaces the prior 7-way waterfall. Three visual zones,
// down from 17 unranked cards:
//
//   1. Hero ribbon (dominant): 4-node funnel with sparklines + 7d delta
//   2. Mid: Action stack + Activity timeline
//   3. Bottom strip: Brand health / Recent media / Recent publishes
//
// Per-section stale fallback: when an upstream fails, the snapshot returns
// last-known data + adds the section key to staleSections. Stale chips render
// inline so the page never goes blank when one provider degrades.
//
// Cross-lane TODO markers:
//  - <PulseEmptyBlock>  -> swap for stardust ui/EmptyState (Wave B handoff)
//  - <PageError>        -> swap for stardust ui/ErrorState level="page"
//  - rounded-panel   -> stardust Card variant="panel"
//  - rounded-2xl         -> stardust Card variant="card"
//  - hardcoded tones    -> token usage after darkbloom Wave B sweep

import { useEffect, useRef } from "react"
import type { ReactNode } from "react"
import useSWR from "swr"
import { m } from "framer-motion"
import {
  Activity as ActivityIcon,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ImageIcon,
  Layers3,
  Play,
  Radio,
  Send,
  Sparkles,
  Target,
} from "lucide-react"
import { fadeInUp } from "@/lib/animation/variants"
import { dataFetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import { computeFreshness, getFileLabel } from "@/lib/brand-editor"
import { EmptyState } from "@/components/ui/empty-state"
import { ErrorState } from "@/components/ui/error-state"
import { useActivityLiveStore } from "@/lib/stores/activity-live"
import type { Activity } from "@/lib/types/activity"
import type {
  PulseAction,
  PulseActionTone,
  PulseFunnelNode,
  PulseMediaItem,
  PulsePublishItem,
  PulseSnapshot,
  PulseStaleSection,
} from "@/lib/types/pulse"
import { PulseSparkline } from "./sparkline"

// --- Tone tokens (TODO darkbloom: swap for theme tokens) --------------------

const TONE_CLASSES: Record<PulseActionTone, { card: string; icon: string; pill: string }> = {
  green:  { card: "border-emerald-400/25 bg-emerald-400/[0.055]", icon: "bg-emerald-400/15 text-emerald-300", pill: "text-emerald-300" },
  blue:   { card: "border-sky-400/25 bg-sky-400/[0.055]",         icon: "bg-sky-400/15 text-sky-300",         pill: "text-sky-300" },
  violet: { card: "border-violet-400/25 bg-violet-400/[0.055]",   icon: "bg-violet-400/15 text-violet-300",   pill: "text-violet-300" },
  amber:  { card: "border-amber-400/25 bg-amber-400/[0.055]",     icon: "bg-amber-400/15 text-amber-300",     pill: "text-amber-300" },
}

const ACTION_ICON: Record<PulseAction["icon"], typeof Target> = {
  BookOpen,
  ImageIcon,
  Sparkles,
  Send,
  CheckCircle2,
  Target,
}

// Funnel-node color per fixed key. Matches the snapshot envelope's 4-node order.
const FUNNEL_TONE: Record<PulseFunnelNode["key"], PulseActionTone> = {
  signals: "blue",
  briefs: "violet",
  drafts: "amber",
  publishes: "green",
}

// --- Helpers ----------------------------------------------------------------

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return value.toLocaleString()
}

function relativeTime(isoOrMs: string | number | undefined): string {
  if (!isoOrMs) return "unknown"
  const ts =
    typeof isoOrMs === "number"
      ? isoOrMs
      : new Date(isoOrMs.includes("T") ? isoOrMs : `${isoOrMs.replace(" ", "T")}Z`).getTime()
  if (!Number.isFinite(ts)) return "unknown"
  const diff = Math.max(0, Date.now() - ts)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatDelta(deltaPct: number | null): { label: string; positive: boolean | null } {
  if (deltaPct === null || !Number.isFinite(deltaPct)) return { label: "no prior", positive: null }
  if (Math.abs(deltaPct) < 1) return { label: "flat", positive: null }
  const positive = deltaPct > 0
  return { label: `${positive ? "+" : ""}${Math.round(deltaPct)}%`, positive }
}

function isSectionStale(stale: PulseStaleSection[], key: PulseStaleSection): boolean {
  return stale.includes(key)
}

// --- Page -------------------------------------------------------------------

export function PulsePage({ groupId }: { groupId: string }) {
  const url = `/api/pulse/snapshot?groupId=${encodeURIComponent(groupId)}`
  const { data, error, mutate } = useSWR<PulseSnapshot>(url, dataFetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  })

  // Live invalidation: when /cmo pushes a new activity event, schedule a
  // debounced snapshot refresh so the page stays current without per-event
  // refetch storms. (Wave C: replace with direct /api/events SSE subscription.)
  const liveCount = useActivityLiveStore((s) => s.items.length)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (liveCount === 0) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void mutate()
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [liveCount, mutate])

  if (error && !data) {
    return (
      <div className="mx-auto max-w-[1580px] p-4 lg:p-5">
        <ErrorState
          level="page"
          error={error}
          onRetry={() => void mutate()}
          title="Pulse snapshot unavailable"
        />
      </div>
    )
  }

  if (!data) {
    return <LoadingSkeleton />
  }

  return <PulseLayout snapshot={data} />
}

// --- Layout -----------------------------------------------------------------

function PulseLayout({ snapshot }: { snapshot: PulseSnapshot }) {
  const stale = snapshot.staleSections

  return (
    <m.div
      data-demo-id="pulse-overview"
      variants={fadeInUp}
      initial={false}
      animate="visible"
      className="relative mx-auto max-w-[1580px] space-y-6 overflow-hidden p-4 lg:p-5"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_0%,rgba(197,255,35,0.13),transparent_34%),radial-gradient(circle_at_74%_12%,rgba(88,166,255,0.11),transparent_30%),radial-gradient(circle_at_92%_58%,rgba(168,85,247,0.10),transparent_30%)]" />

      <Hero funnel={snapshot.funnel} stale={isSectionStale(stale, "funnel")} />

      <MidSection
        actions={snapshot.actions}
        activity={snapshot.activity}
        actionsStale={isSectionStale(stale, "actions")}
        activityStale={isSectionStale(stale, "activity")}
      />

      <BottomStrip
        brandHealth={snapshot.brandHealth}
        media={snapshot.recentMedia}
        publishes={snapshot.recentPublish}
        brandStale={isSectionStale(stale, "brandHealth")}
        mediaStale={isSectionStale(stale, "media")}
        publishStale={isSectionStale(stale, "publish")}
      />
    </m.div>
  )
}

// --- Hero -------------------------------------------------------------------

function Hero({ funnel, stale }: { funnel: PulseSnapshot["funnel"]; stale: boolean }) {
  return (
    <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#080c0d]/90 px-5 py-6 shadow-2xl shadow-black/25 sm:px-7">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-30" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/10 px-3 py-1 text-xs font-medium text-lime">
          <Radio className="size-3.5" />
          Pulse
        </div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {stale ? <StaleChip label="stale" /> : null}
          <span>last 7 days</span>
        </div>
      </div>

      <div className="relative mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {funnel.nodes.map((node) => (
          <FunnelNode key={node.key} node={node} />
        ))}
      </div>
    </header>
  )
}

function FunnelNode({ node }: { node: PulseFunnelNode }) {
  const tone = FUNNEL_TONE[node.key]
  const tones = TONE_CLASSES[tone]
  const delta = formatDelta(node.deltaPct)
  return (
    <div className={cn("rounded-2xl border px-4 py-4 backdrop-blur", tones.card)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {node.label}
        </span>
        <DeltaPill delta={delta} tone={tone} />
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="font-[var(--font-heading)] text-3xl font-semibold leading-none tabular-nums text-foreground">
          {formatNumber(node.total)}
        </span>
        <PulseSparkline series={node.series} tone={tone} className="max-w-[120px]" />
      </div>
    </div>
  )
}

function DeltaPill({
  delta,
  tone,
}: {
  delta: { label: string; positive: boolean | null }
  tone: PulseActionTone
}) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
  if (delta.positive === null) {
    return <span className={cn(base, "bg-white/[0.06] text-muted-foreground")}>{delta.label}</span>
  }
  if (delta.positive) {
    return <span className={cn(base, TONE_CLASSES[tone].icon)}>{delta.label}</span>
  }
  return <span className={cn(base, "bg-red-400/15 text-red-300")}>{delta.label}</span>
}

// --- Mid section ------------------------------------------------------------

function MidSection({
  actions,
  activity,
  actionsStale,
  activityStale,
}: {
  actions: PulseAction[]
  activity: Activity[]
  actionsStale: boolean
  activityStale: boolean
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <Panel title="Next actions" icon={Layers3} stale={actionsStale}>
        {actions.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nothing flagged today."
            description="When /cmo finds something worth your attention, it lands here."
          />
        ) : (
          <div className="space-y-3">
            {actions.slice(0, 3).map((action) => (
              <ActionCard key={action.id} action={action} />
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Recent agent activity" icon={ActivityIcon} stale={activityStale}>
        <ActivityTimeline activities={activity.slice(0, 6)} />
      </Panel>
    </div>
  )
}

function ActionCard({ action }: { action: PulseAction }) {
  const tones = TONE_CLASSES[action.tone]
  const Icon = ACTION_ICON[action.icon]
  return (
    <a
      href={action.href}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border p-3.5 transition hover:-translate-y-0.5 hover:border-lime/40",
        tones.card,
      )}
    >
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", tones.icon)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{action.title}</span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">{action.detail}</span>
      </span>
      <ChevronRight className={cn("size-4 shrink-0 transition group-hover:translate-x-0.5", tones.pill)} />
    </a>
  )
}

function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="No activity yet"
        description="/cmo activity will appear here when skills run or files change."
      />
    )
  }
  return (
    <div className="relative space-y-3">
      <div className="absolute bottom-3 left-[17px] top-3 w-px bg-white/10" />
      {activities.map((a) => (
        <div key={`${a.id}-${a.createdAt}`} className="relative flex gap-3">
          <span className="relative z-10 mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#111819]">
            {a.kind === "publish" ? <Send className="size-4 text-emerald-300" /> : null}
            {a.kind === "brand-write" ? <BookOpen className="size-4 text-sky-300" /> : null}
            {a.kind === "skill-run" ? <Sparkles className="size-4 text-violet-300" /> : null}
            {a.kind !== "publish" && a.kind !== "brand-write" && a.kind !== "skill-run" ? (
              <ActivityIcon className="size-4 text-lime" />
            ) : null}
          </span>
          <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-foreground">{a.summary}</p>
              <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(a.createdAt)}</span>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {a.kind}
              {a.skill ? ` / ${a.skill}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Bottom strip -----------------------------------------------------------

function BottomStrip({
  brandHealth,
  media,
  publishes,
  brandStale,
  mediaStale,
  publishStale,
}: {
  brandHealth: PulseSnapshot["brandHealth"]
  media: PulseMediaItem[]
  publishes: PulsePublishItem[]
  brandStale: boolean
  mediaStale: boolean
  publishStale: boolean
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel
        title="Brand health"
        icon={BookOpen}
        actionHref="/dashboard?tab=brand"
        actionLabel="Open"
        stale={brandStale}
      >
        <BrandHealthCard brandHealth={brandHealth} />
      </Panel>

      <Panel
        title="Recent media"
        icon={ImageIcon}
        actionHref="/dashboard?tab=signals"
        actionLabel="View"
        stale={mediaStale}
      >
        <RecentMediaStrip items={media} />
      </Panel>

      <Panel
        title="Recent publishes"
        icon={Send}
        actionHref="/dashboard?tab=publish"
        actionLabel="Open"
        stale={publishStale}
      >
        <RecentPublishStrip items={publishes} />
      </Panel>
    </div>
  )
}

function BrandHealthCard({ brandHealth }: { brandHealth: PulseSnapshot["brandHealth"] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <span className="font-[var(--font-heading)] text-3xl font-semibold tabular-nums text-foreground">
          {brandHealth.score}
          <span className="ml-1 text-sm text-muted-foreground">/ 100</span>
        </span>
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {brandHealth.readyCount}/{brandHealth.totalSlots} ready
        </span>
      </div>

      {brandHealth.files.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No brand files yet"
          description="Run /cmo init or open Brand to bootstrap memory."
        />
      ) : (
        <div className="space-y-1.5">
          {brandHealth.files.slice(0, 4).map((file) => {
            const f = file.freshness ?? computeFreshness(file)
            return (
              <div
                key={file.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{getFileLabel(file.name)}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{relativeTime(file.mtime)}</p>
                </div>
                <FreshnessBadge freshness={f} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FreshnessBadge({ freshness }: { freshness: string }) {
  const isGood = freshness === "fresh"
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        isGood
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          : "border-amber-400/30 bg-amber-400/10 text-amber-300",
      )}
    >
      {freshness}
    </span>
  )
}

function RecentMediaStrip({ items }: { items: PulseMediaItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ImageIcon}
        title="No media yet"
        description="Generated images and videos surface here as /cmo creates them."
      />
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.slice(0, 4).map((asset) => (
        <a
          key={asset.id}
          href="/dashboard?tab=signals"
          className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-2 transition hover:-translate-y-0.5 hover:border-lime/40"
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black/40">
            {asset.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={asset.src}
                alt={asset.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(197,255,35,0.22),transparent_38%),#070909]">
                <Play className="size-7 text-lime" />
              </div>
            )}
          </div>
          <p className="mt-2 line-clamp-1 text-xs font-medium text-foreground">{asset.title}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {relativeTime(asset.mtimeMs)}
          </p>
        </a>
      ))}
    </div>
  )
}

function RecentPublishStrip({ items }: { items: PulsePublishItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="No publishes yet"
        description="Drafts shipped from Publish surface here with adapter + provider."
      />
    )
  }
  return (
    <div className="space-y-2">
      {items.slice(0, 3).map((row) => (
        <a
          key={row.id}
          href="/dashboard?tab=publish"
          className="group flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-lime/40"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
            <Send className="size-4 text-lime" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 block text-sm font-medium text-foreground">
              {row.contentPreview || "Published item"}
            </span>
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {(row.providers.slice(0, 2).join(", ") || row.adapter)} / {row.itemsPublished} sent / {relativeTime(row.createdAt)}
            </span>
          </span>
        </a>
      ))}
    </div>
  )
}

// --- Panel + status chips ---------------------------------------------------

function Panel({
  title,
  icon: Icon,
  actionHref,
  actionLabel,
  stale,
  children,
}: {
  title: string
  icon: typeof Target
  actionHref?: string
  actionLabel?: string
  stale?: boolean
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-panel border border-white/10 bg-[#0b1011]/82 shadow-xl shadow-black/20 backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-lime" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {stale ? <StaleChip label="cached" /> : null}
        </div>
        {actionHref && actionLabel ? (
          <a
            href={actionHref}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-lime"
          >
            {actionLabel}
            <ArrowRight className="size-3.5" />
          </a>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function StaleChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">
      <AlertTriangle className="size-3" />
      {label}
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1580px] space-y-6 p-4 lg:p-5">
      <SkeletonBlock className="h-[180px] rounded-[2rem]" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <SkeletonBlock className="h-[260px] rounded-panel" />
        <SkeletonBlock className="h-[260px] rounded-panel" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <SkeletonBlock className="h-[200px] rounded-panel" />
        <SkeletonBlock className="h-[200px] rounded-panel" />
        <SkeletonBlock className="h-[200px] rounded-panel" />
      </div>
    </div>
  )
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden border border-white/10 bg-white/[0.03]", className)}>
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
    </div>
  )
}
