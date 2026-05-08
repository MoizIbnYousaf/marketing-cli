// lib/pulse-snapshot.ts -- aggregator for GET /api/pulse/snapshot.
//
// Coalesces 7 reads into one envelope so Pulse renders from a single round
// trip. Each section runs through Promise.allSettled style isolation so a
// single upstream failure marks that section stale instead of failing the
// whole snapshot.
//
// Owned by silverspark (Lane 5). Wired into the route table by ironmint at
// the /api/pulse/snapshot slot. Real metric_baselines ingest is Wave D.

import type { Database } from "bun:sqlite"
import { listBrandFiles } from "./brand-files"
import type { Activity, ActivityKind } from "./types/activity"
import type { BrandFile, BrandFreshness } from "./brand-editor"
import type {
  PulseAction,
  PulseFunnel,
  PulseFunnelNode,
  PulseMediaItem,
  PulsePublishItem,
  PulseSeries,
  PulseSnapshot,
  PulseStaleSection,
} from "./types/pulse"

const TOTAL_BRAND_SLOTS = 10

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export interface BuildPulseSnapshotOpts {
  /** Open SQLite handle. Server keeps this on boot. */
  db: Database
  /** Project root for brand-files resolution. Defaults to cwd. */
  projectRoot?: string
  /** Recent media. Server passes the content manifest result; pass [] to skip. */
  recentMedia?: PulseMediaItem[]
}

export function buildPulseSnapshot(opts: BuildPulseSnapshotOpts): PulseSnapshot {
  const { db, projectRoot, recentMedia = [] } = opts
  const stale: PulseStaleSection[] = []

  // buildFunnel handles per-table failures internally; one wedged table
  // marks "funnel" stale via the hook but doesn't zero the others.
  let funnelStaleMarked = false
  const markFunnelStale = (): void => {
    if (!funnelStaleMarked) {
      stale.push("funnel")
      funnelStaleMarked = true
    }
  }
  const funnel = trySection<PulseFunnel>(
    () => buildFunnel(db, markFunnelStale),
    "funnel",
    stale,
    () => emptyFunnel(),
  )

  const brandFiles = trySection<BrandFile[]>(
    () => listBrandFiles(projectRoot ?? process.cwd()).map(toBrandFile),
    "brandHealth",
    stale,
    () => [],
  )

  const activity = trySection<Activity[]>(
    () => readRecentActivity(db, 6),
    "activity",
    stale,
    () => [],
  )

  const recentPublish = trySection<PulsePublishItem[]>(
    () => readRecentPublish(db, 3),
    "publish",
    stale,
    () => [],
  )

  // Media is supplied by the caller (server reads its own content manifest);
  // mark stale only when the caller passes undefined explicitly via opts.
  const media = recentMedia

  const brandHealth = {
    score: computeBrandScore(brandFiles),
    files: brandFiles,
    readyCount: brandFiles.filter((f) => (f.freshness ?? "missing") === "fresh").length,
    totalSlots: TOTAL_BRAND_SLOTS,
  }

  const actions = trySection<PulseAction[]>(
    () => buildActions({ brandFiles, mediaCount: media.length, publishCount: recentPublish.length }),
    "actions",
    stale,
    () => [],
  )

  return {
    funnel,
    brandHealth,
    actions,
    activity,
    recentMedia: media,
    recentPublish,
    generatedAt: new Date().toISOString(),
    staleSections: stale,
  }
}

// ---------------------------------------------------------------------------
// Section: funnel
// ---------------------------------------------------------------------------

interface DailyRow {
  day: string
  n: number
}

function buildFunnel(db: Database, onTableFail: (key: PulseFunnelNode["key"]) => void): PulseFunnel {
  const today = new Date()
  const labels: { key: PulseFunnelNode["key"]; label: string; tableSql: string }[] = [
    { key: "signals",    label: "Signals",    tableSql: SIGNALS_DAILY_SQL },
    { key: "briefs",     label: "Briefs",     tableSql: BRIEFS_DAILY_SQL },
    { key: "drafts",     label: "Drafts",     tableSql: DRAFTS_DAILY_SQL },
    { key: "publishes",  label: "Publishes",  tableSql: PUBLISHES_DAILY_SQL },
  ]

  const days = listLast14DayKeys(today)
  const empty: PulseSeries = [0, 0, 0, 0, 0, 0, 0]

  const built = labels.map(({ key, label, tableSql }) => {
    // Per-table fallback: a single missing table (eg. dropped publish_log)
    // must not zero out the other three nodes. Mark the funnel section stale
    // via the caller's onTableFail hook and return a zero node for this key
    // only.
    try {
      const rows = db.query<DailyRow, []>(tableSql).all()
      const byDay = new Map(rows.map((r) => [r.day, r.n] as const))
      const counts = days.map((d) => byDay.get(d) ?? 0)
      const c = counts.slice(7)
      const series: PulseSeries = [c[0] ?? 0, c[1] ?? 0, c[2] ?? 0, c[3] ?? 0, c[4] ?? 0, c[5] ?? 0, c[6] ?? 0]
      const priorTotal = sum(counts.slice(0, 7))
      const total = sum([...series])
      const deltaPct = priorTotal === 0 ? null : ((total - priorTotal) / priorTotal) * 100
      const node: PulseFunnelNode = { key, label, series, total, deltaPct }
      return node
    } catch (err) {
      console.error(`[pulse-snapshot] funnel.${key} failed; serving zeros`, err)
      onTableFail(key)
      const node: PulseFunnelNode = { key, label, series: empty, total: 0, deltaPct: null }
      return node
    }
  })

  // labels has fixed length 4, but Array.map types it as PulseFunnelNode[].
  // Coerce through unknown into the fixed 4-tuple the wire contract requires.
  const nodes = built as unknown as readonly [
    PulseFunnelNode,
    PulseFunnelNode,
    PulseFunnelNode,
    PulseFunnelNode,
  ]

  return {
    nodes,
    windowEnd: today.toISOString(),
  }
}

// SQLite uses `date()` to bucket created_at. Filter to last 14 days so the
// query stays cheap even after the seeder runs heavily.
const SIGNALS_DAILY_SQL = `
  SELECT date(created_at) as day, COUNT(*) as n
  FROM signals
  WHERE created_at >= date('now', '-14 days')
  GROUP BY day
  ORDER BY day
`
const BRIEFS_DAILY_SQL = `
  SELECT date(created_at) as day, COUNT(*) as n
  FROM briefs
  WHERE created_at >= date('now', '-14 days')
  GROUP BY day
  ORDER BY day
`
const DRAFTS_DAILY_SQL = `
  SELECT date(created_at) as day, COUNT(*) as n
  FROM skill_runs
  WHERE created_at >= date('now', '-14 days')
  GROUP BY day
  ORDER BY day
`
const PUBLISHES_DAILY_SQL = `
  SELECT date(created_at) as day, COUNT(*) as n
  FROM publish_log
  WHERE created_at >= date('now', '-14 days')
  GROUP BY day
  ORDER BY day
`

// ---------------------------------------------------------------------------
// Section: activity + publishes
// ---------------------------------------------------------------------------

interface ActivityRow {
  id: number
  kind: string
  skill: string | null
  summary: string
  detail: string | null
  files_changed: string | null
  meta: string | null
  created_at: string
}

function readRecentActivity(db: Database, limit: number): Activity[] {
  const rows = db
    .query<ActivityRow, [number]>(
      "SELECT id, kind, skill, summary, detail, files_changed, meta, created_at FROM activity ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit)
  return rows.map((r) => ({
    id: r.id,
    kind: (r.kind as ActivityKind) ?? "custom",
    skill: r.skill,
    summary: r.summary,
    detail: r.detail,
    filesChanged: r.files_changed ? safeJsonArray(r.files_changed) : undefined,
    meta: r.meta ? safeJsonObject(r.meta) : null,
    createdAt: r.created_at,
  }))
}

interface PublishRow {
  id: number
  adapter: string
  providers: string | null
  content_preview: string | null
  items_published: number | null
  items_failed: number | null
  created_at: string
}

function readRecentPublish(db: Database, limit: number): PulsePublishItem[] {
  const rows = db
    .query<PublishRow, [number]>(
      "SELECT id, adapter, providers, content_preview, items_published, items_failed, created_at FROM publish_log ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit)
  return rows.map((r) => ({
    id: r.id,
    adapter: r.adapter,
    providers: r.providers ? safeJsonArray(r.providers).slice(0, 2) : [],
    contentPreview: r.content_preview ?? "",
    itemsPublished: r.items_published ?? 0,
    itemsFailed: r.items_failed ?? 0,
    createdAt: r.created_at,
  }))
}

// ---------------------------------------------------------------------------
// Section: actions
// ---------------------------------------------------------------------------

interface ActionInput {
  brandFiles: BrandFile[]
  mediaCount: number
  publishCount: number
}

function buildActions({ brandFiles, mediaCount, publishCount }: ActionInput): PulseAction[] {
  const actions: PulseAction[] = []

  const needsBrand = brandFiles.filter((f) => (f.freshness ?? "missing") !== "fresh")
  if (needsBrand.length > 0 || brandFiles.length === 0) {
    actions.push({
      id: "brand-bootstrap",
      title: brandFiles.length === 0 ? "Bootstrap brand memory" : "Refresh brand files",
      detail:
        brandFiles.length === 0
          ? "Run /cmo to create the canonical brand docs."
          : `${needsBrand.length} file${needsBrand.length === 1 ? "" : "s"} need attention.`,
      href: "/dashboard?tab=brand",
      icon: "BookOpen",
      tone: "green",
    })
  }

  if (mediaCount > 0) {
    actions.push({
      id: "review-media",
      title: "Review generated media",
      detail: `${mediaCount} asset${mediaCount === 1 ? "" : "s"} pending in Signals.`,
      href: "/dashboard?tab=signals",
      icon: "ImageIcon",
      tone: "blue",
    })
  }

  if (publishCount === 0) {
    actions.push({
      id: "stage-first-launch",
      title: "Stage first launch post",
      detail: "Publish is empty. Draft or schedule when copy is ready.",
      href: "/dashboard?tab=publish",
      icon: "Send",
      tone: "amber",
    })
  }

  if (actions.length === 0) {
    actions.push({
      id: "system-calm",
      title: "Nothing flagged today.",
      detail: "When /cmo finds something worth your attention, it lands here.",
      href: "/dashboard?tab=signals",
      icon: "CheckCircle2",
      tone: "green",
    })
  }

  return actions.slice(0, 3)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function trySection<T>(
  fn: () => T,
  key: PulseStaleSection,
  stale: PulseStaleSection[],
  fallback: () => T,
): T {
  try {
    return fn()
  } catch (err) {
    console.error(`[pulse-snapshot] ${key} failed; serving fallback`, err)
    stale.push(key)
    return fallback()
  }
}

function emptyFunnel(): PulseFunnel {
  const empty: PulseSeries = [0, 0, 0, 0, 0, 0, 0]
  return {
    windowEnd: new Date().toISOString(),
    nodes: [
      { key: "signals",   label: "Signals",   series: empty, total: 0, deltaPct: null },
      { key: "briefs",    label: "Briefs",    series: empty, total: 0, deltaPct: null },
      { key: "drafts",    label: "Drafts",    series: empty, total: 0, deltaPct: null },
      { key: "publishes", label: "Publishes", series: empty, total: 0, deltaPct: null },
    ],
  }
}

function listLast14DayKeys(today: Date): string[] {
  const result: string[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    result.push(d.toISOString().slice(0, 10))
  }
  return result
}

function sum(arr: number[]): number {
  let s = 0
  for (const n of arr) s += n
  return s
}

function safeJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

function safeJsonObject(json: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(json)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

function toBrandFile(listing: {
  name: string
  path: string
  bytes: number
  mtime: string
  freshness: BrandFreshness | "missing"
}): BrandFile {
  return {
    name: listing.name,
    path: listing.path,
    bytes: listing.bytes,
    mtime: listing.mtime,
    freshness: listing.freshness === "missing" ? undefined : listing.freshness,
  }
}

function computeBrandScore(files: BrandFile[]): number {
  if (files.length === 0) return 0
  const fresh = files.filter((f) => f.freshness === "fresh").length
  const present = files.filter((f) => f.bytes > 0).length
  // Weight: 70% freshness, 30% existence. Capped at 100.
  const score = Math.round((fresh / TOTAL_BRAND_SLOTS) * 70 + (present / TOTAL_BRAND_SLOTS) * 30)
  return Math.min(100, score)
}
