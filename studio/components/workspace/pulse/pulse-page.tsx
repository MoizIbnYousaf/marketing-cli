"use client"

import { useMemo } from "react"
import type { ReactNode } from "react"
import useSWR from "swr"
import { m } from "framer-motion"
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  ImageIcon,
  Layers3,
  Megaphone,
  Play,
  Radio,
  Route,
  Send,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react"
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animation/variants"
import { dataFetcher, fetcher } from "@/lib/fetcher"
import { cn } from "@/lib/utils"
import { computeFreshness, getFileLabel, type BrandFile } from "@/lib/brand-editor"
import { useActivityLiveStore } from "@/lib/stores/activity-live"
import type { Activity as ActivityRow } from "@/lib/types/activity"
import type { ContentAsset, ContentManifest } from "@/lib/content-manifest"
import type { Signal as FeedSignal } from "@/lib/types/signals"
import type { OpportunitiesData } from "@/lib/types/opportunities"

type ContentManifestResponse = {
  ok: true
  data: ContentManifest
}

type PublishHistoryRow = {
  id: number
  adapter: string
  providers: string[]
  contentPreview: string
  itemsPublished: number
  itemsFailed: number
  createdAt: string
}

type PublishHistoryResponse = {
  ok: true
  data: PublishHistoryRow[]
}

type NativeAccountResponse = {
  ok: true
  data: {
    account: { id: string; apiKeyPreview: string }
    providerCount: number
    postCount: number
  }
}

type NextAction = {
  title: string
  detail: string
  href: string
  icon: typeof Target
  tone: "green" | "blue" | "violet" | "amber"
}

const TONE_CLASSES: Record<NextAction["tone"], { card: string; icon: string; pill: string }> = {
  green: {
    card: "border-emerald-400/25 bg-emerald-400/[0.055]",
    icon: "bg-emerald-400/15 text-emerald-300",
    pill: "text-emerald-300",
  },
  blue: {
    card: "border-sky-400/25 bg-sky-400/[0.055]",
    icon: "bg-sky-400/15 text-sky-300",
    pill: "text-sky-300",
  },
  violet: {
    card: "border-violet-400/25 bg-violet-400/[0.055]",
    icon: "bg-violet-400/15 text-violet-300",
    pill: "text-violet-300",
  },
  amber: {
    card: "border-amber-400/25 bg-amber-400/[0.055]",
    icon: "bg-amber-400/15 text-amber-300",
    pill: "text-amber-300",
  },
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return value.toLocaleString()
}

function relativeTime(isoOrMs: string | number | undefined): string {
  if (!isoOrMs) return "unknown"
  const ts = typeof isoOrMs === "number" ? isoOrMs : new Date(isoOrMs.includes("T") ? isoOrMs : `${isoOrMs.replace(" ", "T")}Z`).getTime()
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

function assetHref(asset: ContentAsset): string {
  return asset.mediaUrl ?? `/api/cmo/content/media?path=${encodeURIComponent(asset.relativePath)}`
}

function assetTitle(asset: ContentAsset): string {
  return asset.title || asset.relativePath.split("/").pop() || "Untitled asset"
}

function providerLabel(row: PublishHistoryRow): string {
  if (row.providers.length === 0) return row.adapter
  return row.providers.slice(0, 2).join(", ")
}

export function PulsePage({ groupId }: { groupId: string }) {
  const { data: brandFiles } = useSWR<BrandFile[]>("/api/brand/files", dataFetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })
  const { data: manifestData } = useSWR<ContentManifestResponse>("/api/cmo/content/manifest", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })
  const { data: historyData } = useSWR<PublishHistoryResponse>("/api/publish/history?limit=8", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })
  const { data: nativeAccount } = useSWR<NativeAccountResponse>("/api/publish/native/account", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })
  const { data: fetchedActivity } = useSWR<ActivityRow[]>("/api/activity?limit=8", dataFetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  })
  const { data: allSignalsRaw } = useSWR<FeedSignal[]>("/api/signals", dataFetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })
  const { data: opportunitiesData } = useSWR<OpportunitiesData>(
    `/api/opportunities?groupId=${groupId}`,
    dataFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false },
  )

  const liveActivity = useActivityLiveStore((s) => s.items)
  const connected = useActivityLiveStore((s) => s.connected)

  const files = Array.isArray(brandFiles) ? brandFiles : []
  const assets = manifestData?.data.assets ?? []
  const mediaAssets = assets.filter((asset) => asset.kind === "image" || asset.kind === "video")
  const imageCount = mediaAssets.filter((asset) => asset.kind === "image").length
  const videoCount = mediaAssets.filter((asset) => asset.kind === "video").length
  const approvedAssets = mediaAssets.filter((asset) => asset.status === "approved" || asset.status === "published")

  const brandFreshness = files.map((file) => ({ file, freshness: computeFreshness(file) }))
  const readyFiles = brandFreshness.filter(({ freshness }) => freshness === "fresh")
  const needsBrand = brandFreshness.filter(({ freshness }) => freshness !== "fresh")
  const brandReady = files.length > 0 && needsBrand.length === 0

  const activities = useMemo(() => {
    const fetched = fetchedActivity ?? []
    const liveIds = new Set(liveActivity.map((item) => item.id))
    return [...liveActivity, ...fetched.filter((item) => !liveIds.has(item.id))].slice(0, 6)
  }, [fetchedActivity, liveActivity])

  const signals = Array.isArray(allSignalsRaw) ? allSignalsRaw : []
  const spikes = signals.filter((signal) => signal.severity === "p0" || signal.severity === "p1" || (signal.spikeMultiplier ?? 0) > 1)
  const opportunities = Array.isArray(opportunitiesData?.opportunities) ? opportunitiesData.opportunities.slice(0, 3) : []
  const history = historyData?.data ?? []
  const recentMedia = [...mediaAssets].sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, 4)

  const nextActions = useMemo<NextAction[]>(() => {
    const actions: NextAction[] = []
    if (!brandReady) {
      actions.push({
        title: "Finish Brand memory",
        detail: needsBrand.length > 0 ? `${needsBrand.length} file${needsBrand.length === 1 ? "" : "s"} need attention` : "Create the canonical brand docs",
        href: "/dashboard?tab=brand",
        icon: BookOpen,
        tone: "green",
      })
    }
    if (mediaAssets.length > 0) {
      actions.push({
        title: "Review generated media",
        detail: `${imageCount} image${imageCount === 1 ? "" : "s"} and ${videoCount} video${videoCount === 1 ? "" : "s"} in Content`,
        href: "/dashboard?tab=content",
        icon: ImageIcon,
        tone: "blue",
      })
    }
    if (opportunities.length > 0) {
      actions.push({
        title: "Convert fresh opportunity",
        detail: opportunities[0]?.hook?.replace(/^demo:\s*/i, "").slice(0, 92) || "Turn the newest signal into a post",
        href: "/dashboard?tab=publish",
        icon: Sparkles,
        tone: "violet",
      })
    }
    if (history.length === 0) {
      actions.push({
        title: "Stage first launch post",
        detail: "Publish is empty. Draft or schedule the launch post when ready.",
        href: "/dashboard?tab=publish",
        icon: Send,
        tone: "amber",
      })
    }
    if (actions.length === 0) {
      actions.push({
        title: "System is calm",
        detail: "Brand, media, and publish surfaces look ready for the next command.",
        href: "/dashboard?tab=content",
        icon: CheckCircle2,
        tone: "green",
      })
    }
    return actions.slice(0, 4)
  }, [brandReady, history.length, imageCount, mediaAssets.length, needsBrand.length, opportunities, videoCount])

  return (
    <m.div
      data-demo-id="pulse-overview"
      variants={fadeInUp}
      initial={false}
      animate="visible"
      className="relative mx-auto max-w-[1580px] space-y-5 overflow-hidden p-4 lg:p-5"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_0%,rgba(197,255,35,0.13),transparent_34%),radial-gradient(circle_at_74%_12%,rgba(88,166,255,0.11),transparent_30%),radial-gradient(circle_at_92%_58%,rgba(168,85,247,0.10),transparent_30%)]" />

      <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#080c0d]/90 px-5 py-6 shadow-2xl shadow-black/25 sm:px-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-30" />
        <div className="relative flex flex-col gap-6 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/10 px-3 py-1 text-xs font-medium text-lime">
              <Radio className="size-3.5" />
              Pulse
            </div>
            <h1 className="mt-5 max-w-3xl font-[var(--font-heading)] text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Turn brand memory into market motion.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              One overview for the local /cmo loop: Brand defines truth, Content holds visual assets, Publish executes, and Learn closes the feedback loop later.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 2xl:w-[680px]">
            <HeroStat
              icon={Target}
              label={brandReady ? "Brand ready" : "Needs brand"}
              value={`${readyFiles.length}/${Math.max(files.length, 10)}`}
              detail="memory files current"
              tone="green"
            />
            <HeroStat
              icon={FolderOpen}
              label="Media assets"
              value={formatNumber(mediaAssets.length)}
              detail={`${imageCount} images, ${videoCount} videos`}
              tone="blue"
            />
            <HeroStat
              icon={Send}
              label="Publish log"
              value={formatNumber(history.length)}
              detail={`${nativeAccount?.data.providerCount ?? 0} native providers`}
              tone="violet"
            />
          </div>
        </div>
      </header>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-5">
          <m.section
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid gap-4 2xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
          >
            <m.div variants={staggerItem}>
              <Panel title="Next actions" icon={Layers3} actionHref="/dashboard?tab=publish" actionLabel="Act">
                <div className="space-y-3">
                  {nextActions.map((action) => (
                    <ActionCard key={action.title} action={action} />
                  ))}
                </div>
              </Panel>
            </m.div>

            <m.div variants={staggerItem}>
              <Panel
                title="Recent agent activity"
                icon={Activity}
                actionHref="/dashboard"
                actionLabel={connected ? "Live" : "Idle"}
              >
                <ActivityTimeline activities={activities} />
              </Panel>
            </m.div>
          </m.section>

          <Panel title="Pipeline" icon={Route}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
              <PipelineStep href="/dashboard?tab=brand" icon={BookOpen} title="Brand" detail="Define truth" tone="green" />
              <PipelineArrow />
              <PipelineStep href="/dashboard?tab=content" icon={ImageIcon} title="Signals" detail="Review media" tone="blue" />
              <PipelineArrow />
              <PipelineStep href="/dashboard?tab=publish" icon={Send} title="Publish" detail="Ship posts" tone="violet" />
              <PipelineArrow />
              <PipelineStep href="/dashboard" icon={TrendingUp} title="Learn" detail="Feedback loop next" tone="amber" />
            </div>
          </Panel>

          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Panel title="Recent content" icon={ImageIcon} actionHref="/dashboard?tab=content" actionLabel="View all">
              <RecentMediaGrid assets={recentMedia} />
            </Panel>

            <Panel title="Publish queue" icon={Megaphone} actionHref="/dashboard?tab=publish" actionLabel="Open">
              <PublishQueue rows={history} />
            </Panel>
          </div>
        </main>

        <aside className="space-y-5">
          <Panel title="Project snapshot" icon={Target}>
            <SnapshotCard
              icon={CheckCircle2}
              title="Launch goal"
              detail={opportunities[0]?.hook?.replace(/^demo:\s*/i, "") || "Keep the launch story tight, concrete, and ready to publish."}
              tone="blue"
            />
            <SnapshotCard
              icon={BookOpen}
              title="Brand memory files"
              detail={`${readyFiles.length} current, ${needsBrand.length} need attention`}
              tone="violet"
              href="/dashboard?tab=brand"
              cta="Open in Brand"
            />
            <SnapshotCard
              icon={ImageIcon}
              title="Approved assets"
              detail={`${approvedAssets.length} approved of ${mediaAssets.length} total media assets`}
              tone="green"
              href="/dashboard?tab=content"
              cta="Go to Content"
            />
            <SnapshotCard
              icon={CalendarClock}
              title="Signals and timing"
              detail={`${spikes.length} spike${spikes.length === 1 ? "" : "s"} detected. ${history.length} publish event${history.length === 1 ? "" : "s"} logged.`}
              tone="amber"
              href="/dashboard?tab=publish"
              cta="View in Publish"
            />
          </Panel>

          <Panel title="Brand files" icon={FileText} actionHref="/dashboard?tab=brand" actionLabel="Edit">
            <div className="space-y-2">
              {files.slice(0, 6).map((file) => (
                <div key={file.name} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{getFileLabel(file.name)}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{relativeTime(file.mtime)}</p>
                  </div>
                  <FreshnessBadge freshness={computeFreshness(file)} />
                </div>
              ))}
              {files.length === 0 ? (
                <EmptyBlock title="No brand files yet" detail="Run /cmo init or open Brand to create the memory set." />
              ) : null}
            </div>
          </Panel>
        </aside>
      </div>
    </m.div>
  )
}

function HeroStat({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Target
  label: string
  value: string
  detail: string
  tone: NextAction["tone"]
}) {
  return (
    <div className={cn("rounded-2xl border px-4 py-4 backdrop-blur", TONE_CLASSES[tone].card)}>
      <div className="flex items-center gap-3">
        <span className={cn("flex size-11 items-center justify-center rounded-2xl", TONE_CLASSES[tone].icon)}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="font-[var(--font-heading)] text-3xl font-semibold leading-none text-foreground">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  actionHref,
  actionLabel,
  children,
}: {
  title: string
  icon: typeof Target
  actionHref?: string
  actionLabel?: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0b1011]/82 shadow-xl shadow-black/20 backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-lime" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {actionHref && actionLabel ? (
          <a href={actionHref} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-lime">
            {actionLabel}
            <ArrowRight className="size-3.5" />
          </a>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function ActionCard({ action }: { action: NextAction }) {
  const tone = TONE_CLASSES[action.tone]
  const Icon = action.icon
  return (
    <a href={action.href} className={cn("group flex items-center gap-3 rounded-2xl border p-3.5 transition hover:-translate-y-0.5 hover:border-lime/40", tone.card)}>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", tone.icon)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{action.title}</span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">{action.detail}</span>
      </span>
      <ChevronRight className={cn("size-4 shrink-0 transition group-hover:translate-x-0.5", tone.pill)} />
    </a>
  )
}

function ActivityTimeline({ activities }: { activities: ActivityRow[] }) {
  if (activities.length === 0) {
    return <EmptyBlock title="No activity yet" detail="/cmo activity will appear here when skills run or files change." />
  }

  return (
    <div className="relative space-y-3">
      <div className="absolute bottom-3 left-[17px] top-3 w-px bg-white/10" />
      {activities.map((activity) => (
        <div key={`${activity.id}-${activity.createdAt}`} className="relative flex gap-3">
          <span className="relative z-10 mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#111819]">
            {activity.kind === "publish" ? <Send className="size-4 text-emerald-300" /> : null}
            {activity.kind === "brand-write" ? <BookOpen className="size-4 text-sky-300" /> : null}
            {activity.kind === "skill-run" ? <Sparkles className="size-4 text-violet-300" /> : null}
            {activity.kind !== "publish" && activity.kind !== "brand-write" && activity.kind !== "skill-run" ? <Activity className="size-4 text-lime" /> : null}
          </span>
          <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-foreground">{activity.summary}</p>
              <span className="shrink-0 text-[10px] text-muted-foreground">{relativeTime(activity.createdAt)}</span>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {activity.kind}{activity.skill ? ` / ${activity.skill}` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function PipelineStep({
  href,
  icon: Icon,
  title,
  detail,
  tone,
}: {
  href: string
  icon: typeof Target
  title: string
  detail: string
  tone: NextAction["tone"]
}) {
  return (
    <a href={href} className={cn("group rounded-2xl border px-4 py-4 transition hover:-translate-y-0.5 hover:border-lime/40", TONE_CLASSES[tone].card)}>
      <div className="flex items-center gap-3">
        <span className={cn("flex size-10 items-center justify-center rounded-xl", TONE_CLASSES[tone].icon)}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
    </a>
  )
}

function PipelineArrow() {
  return (
    <div className="hidden items-center justify-center text-muted-foreground md:flex">
      <ArrowRight className="size-5" />
    </div>
  )
}

function RecentMediaGrid({ assets }: { assets: ContentAsset[] }) {
  if (assets.length === 0) {
    return <EmptyBlock title="No media yet" detail="Generated images and videos will appear in Content first." />
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4">
      {assets.map((asset) => (
        <a key={asset.id} href="/dashboard?tab=content" className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-2 transition hover:-translate-y-0.5 hover:border-lime/40">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black/40">
            {asset.kind === "image" ? (
              <img src={assetHref(asset)} alt={assetTitle(asset)} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" decoding="async" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(197,255,35,0.22),transparent_38%),#070909]">
                <Play className="size-8 text-lime" />
              </div>
            )}
            <span className="absolute left-2 top-2 rounded-full border border-white/10 bg-black/70 px-2 py-1 text-[10px] font-medium uppercase text-white/80">
              {asset.kind}
            </span>
          </div>
          <p className="mt-2 line-clamp-1 text-xs font-medium text-foreground">{assetTitle(asset)}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{relativeTime(asset.mtimeMs)}</p>
        </a>
      ))}
    </div>
  )
}

function PublishQueue({ rows }: { rows: PublishHistoryRow[] }) {
  if (rows.length === 0) {
    return <EmptyBlock title="No publish events yet" detail="Draft or schedule the first post from Publish when the launch copy is ready." />
  }

  return (
    <div className="space-y-3">
      {rows.slice(0, 3).map((row) => (
        <a key={row.id} href="/dashboard?tab=publish" className="group flex gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-lime/40">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
            <Send className="size-5 text-lime" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 block text-sm font-medium text-foreground">
              {row.contentPreview || "Published item"}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {providerLabel(row)} / {row.itemsPublished} sent / {relativeTime(row.createdAt)}
            </span>
          </span>
          <Clock3 className="size-4 shrink-0 text-muted-foreground transition group-hover:text-lime" />
        </a>
      ))}
    </div>
  )
}

function SnapshotCard({
  icon: Icon,
  title,
  detail,
  tone,
  href,
  cta,
}: {
  icon: typeof Target
  title: string
  detail: string
  tone: NextAction["tone"]
  href?: string
  cta?: string
}) {
  const body = (
    <div className={cn("rounded-2xl border p-4", TONE_CLASSES[tone].card)}>
      <div className="flex items-start gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TONE_CLASSES[tone].icon)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-1 line-clamp-4 text-sm leading-6 text-muted-foreground">{detail}</p>
          {cta ? <p className={cn("mt-3 text-xs font-semibold", TONE_CLASSES[tone].pill)}>{cta}</p> : null}
        </div>
      </div>
    </div>
  )

  return href ? <a href={href} className="block transition hover:-translate-y-0.5">{body}</a> : body
}

function FreshnessBadge({ freshness }: { freshness: string }) {
  const isGood = freshness === "fresh"
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        isGood ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-amber-400/30 bg-amber-400/10 text-amber-300",
      )}
    >
      {freshness}
    </span>
  )
}

function EmptyBlock({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  )
}
