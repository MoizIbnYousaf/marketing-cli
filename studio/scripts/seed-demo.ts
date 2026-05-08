#!/usr/bin/env bun
/**
 * Demo data seeder. Populates marketing.db with realistic fixtures so
 * screenshots / videos / first-run walkthroughs have something to look at.
 *
 * Usage: bun run scripts/seed-demo.ts [--reset]
 *
 * --reset: delete prior demo rows (identified by a "demo:" sentinel prefix on
 *          opportunity.reason / activity.summary / publish_log.content_preview)
 *          before inserting fresh ones. Safe to run repeatedly.
 *
 * Imagined brand: "DemoCo", a deliberately fake SaaS persona used so a
 * viewer who screencaps the dashboard cannot confuse the seeded rows with
 * their own brand. URLs point at `https://demo.local/...` so any click
 * lands on a clearly-not-real domain instead of a real-domain 404.
 *
 * Lane 8 Wave B: removed em-dashes, "Parallel" leak, and real-domain URLs
 * per neonpulse fix #5.
 */

import { Database } from "bun:sqlite"
import path from "node:path"
import { existsSync } from "node:fs"

const DB_PATH = path.join(process.cwd(), "marketing.db")
const RESET = process.argv.includes("--reset")
const DEMO_SENTINEL = "demo:"

if (!existsSync(DB_PATH)) {
  console.error(`[seed-demo] marketing.db not found at ${DB_PATH}.`)
  console.error("[seed-demo] Launch the studio once to create it: mktg studio")
  console.error("[seed-demo] (or: bun run server.ts inside studio/ if you are bypassing the launcher)")
  process.exit(1)
}

const db = new Database(DB_PATH)
db.exec("PRAGMA journal_mode=WAL")

// ---------------------------------------------------------------------------
// Fixtures: realistic-feeling rows for a fictional SaaS persona ("DemoCo").
// URLs point at https://demo.local/... so any click resolves to a placeholder
// instead of a real-domain 404. Em-dashes stripped to keep the no-em-dash
// lint clean across seed-flowing-to-UI strings.
// ---------------------------------------------------------------------------

const SIGNALS = [
  { platform: "tiktok",      severity: 82, spike: 1, feedback: "pending",
    content: "@agentcore (fictional) just dropped a teardown of 6 competing agent frameworks: 2.1M views, DemoCo not mentioned.",
    url: "https://demo.local/tiktok/agent-framework-teardown" },
  { platform: "news",        severity: 71, spike: 0, feedback: "pending",
    content: "Industry report: 82% of GTM teams now ship automations in-house. Big opportunity for agent-first workflow SaaS.",
    url: "https://demo.local/news/in-house-gtm-automation" },
  { platform: "twitter",     severity: 68, spike: 0, feedback: "pending",
    content: "'Everyone is building agent frameworks. No one is building marketing studios around them.' (fictional VC)",
    url: "https://demo.local/twitter/missing-studio-layer" },
  { platform: "reddit",      severity: 64, spike: 1, feedback: "pending",
    content: "r/SaaS discussion: 'Looking for an agent platform that does not make me write Python.' 400+ upvotes.",
    url: "https://demo.local/reddit/agent-platform-no-python" },
  { platform: "instagram",   severity: 61, spike: 0, feedback: "pending",
    content: "Carousel template format driving 8x engagement vs plain posts in B2B SaaS niche.",
    url: "https://demo.local/instagram/carousel-template-trend" },
  { platform: "news",        severity: 59, spike: 0, feedback: "pending",
    content: "Latest accelerator batch: 14 startups named agent-* or cmo-*. Crowded naming space.",
    url: "https://demo.local/news/accelerator-naming-glut" },
  { platform: "tiktok",      severity: 57, spike: 0, feedback: "approved",
    content: "Behind-the-scenes tour of a marketing ops team using 3 agents in parallel: 480k views.",
    url: "https://demo.local/tiktok/marketing-ops-3-agents" },
  { platform: "google_trends", severity: 55, spike: 0, feedback: "pending",
    content: "'AI marketing agent' query volume +340% in 90 days. 'AI marketing CMO' +210%.",
    url: "https://demo.local/trends/ai-marketing-agent" },
  { platform: "twitter",     severity: 54, spike: 0, feedback: "pending",
    content: "'The studio layer for agents is the missing piece. Frameworks without studios is like git without GitHub.' (fictional engineer)",
    url: "https://demo.local/twitter/studio-vs-framework" },
  { platform: "news",        severity: 51, spike: 0, feedback: "pending",
    content: "Major payments API ships agent-friendly surface: machine-readable errors, schema introspection, dry-run on every mutator.",
    url: "https://demo.local/news/agent-friendly-payments-api" },
  { platform: "instagram",   severity: 48, spike: 0, feedback: "pending",
    content: "Dark-mode dashboard screenshots are outperforming light-mode 3:1 in B2B ads this quarter.",
    url: "https://demo.local/instagram/dark-mode-ads" },
  { platform: "reddit",      severity: 46, spike: 0, feedback: "dismissed",
    content: "r/marketing thread on AI fatigue: 'another AI tool, no thanks'. 260 upvotes, mostly agency folks.",
    url: "https://demo.local/reddit/ai-fatigue-thread" },
  { platform: "news",        severity: 44, spike: 0, feedback: "pending",
    content: "Frontend cloud ships AI Gateway with usage-based pricing. Pressure on BYOAI positioning across the stack.",
    url: "https://demo.local/news/ai-gateway-usage-pricing" },
  { platform: "tiktok",      severity: 42, spike: 0, feedback: "pending",
    content: "Dev-tool demo videos under 45s outperform 60s+ at 2.2x CTR on TikTok this week.",
    url: "https://demo.local/tiktok/short-demo-ctr-trend" },
  { platform: "twitter",     severity: 40, spike: 0, feedback: "pending",
    content: "'Onchain marketing tools are the next wave.' Flag-level signal; watch the adjacent space.",
    url: "https://demo.local/twitter/onchain-marketing-flag" },
  { platform: "news",        severity: 38, spike: 0, feedback: "pending",
    content: "Open-source social scheduler adds more channels; positions as 'Buffer killer'.",
    url: "https://demo.local/news/oss-social-scheduler" },
  { platform: "reddit",      severity: 36, spike: 0, feedback: "pending",
    content: "r/startups: 'I built a landing page in 20 minutes with an agent.' 1.8k upvotes.",
    url: "https://demo.local/reddit/agent-landing-page" },
  { platform: "google_trends", severity: 34, spike: 0, feedback: "pending",
    content: "'Claude Code' query volume +180% week over week. Agent IDEs are breaking out.",
    url: "https://demo.local/trends/claude-code-volume" },
  { platform: "tiktok",      severity: 30, spike: 0, feedback: "pending",
    content: "'My AI marketing department' format is hitting: raw vertical video, text overlays, 8 to 12s clips.",
    url: "https://demo.local/tiktok/ai-marketing-department-format" },
  { platform: "instagram",   severity: 28, spike: 0, feedback: "pending",
    content: "Short-form carousel template with animated count-up stats outperforming static by 2.8x.",
    url: "https://demo.local/instagram/animated-carousel-format" },
]

const OPPORTUNITIES = [
  { skill: "seo-content",        priority: 92, status: "pending",
    reason: "Search 'AI marketing agent' trending +340%: own the comparison query before competitors do.",
    prerequisites: JSON.stringify({ needs: ["brand/keyword-plan.md"], nice_to_have: ["Exa API key"] }) },
  { skill: "content-atomizer",   priority: 87, status: "pending",
    reason: "Founder talk from last week has 3 hooks worth atomizing into 12 social posts + 2 newsletter sections.",
    prerequisites: JSON.stringify({ needs: ["transcript", "brand/voice-profile.md"] }) },
  { skill: "competitive-intel",  priority: 74, status: "started",
    reason: "3 new accelerator entrants in the agent-platform space. Update brand/competitors.md before the next briefing.",
    prerequisites: JSON.stringify({ needs: ["Exa API key"] }) },
  { skill: "landscape-scan",     priority: 68, status: "pending",
    reason: "Claims blacklist last refreshed 18 days ago, past the 14-day window for content-safe claims.",
    prerequisites: JSON.stringify({ freshness: "14d", writes: "brand/landscape.md" }) },
  { skill: "direct-response-copy", priority: 61, status: "pending",
    reason: "Homepage hero has not been tested against the 'agent studio' positioning. A 10-min A/B could lift signup 12 to 15%.",
    prerequisites: JSON.stringify({ needs: ["brand/positioning.md"] }) },
]

const ACTIVITIES = [
  { kind: "skill-run",   skill: "audience-research",  summary: "Audience personas refreshed: 3 archetypes written.",
    files: ["brand/audience.md"],          meta: { durationMs: 48200, successes: 1 } },
  { kind: "brand-write", skill: "voice-extraction",   summary: "Voice profile rewritten from 6 founder-letter samples.",
    files: ["brand/voice-profile.md"],     meta: { samplesUsed: 6 } },
  { kind: "skill-run",   skill: "competitive-intel",  summary: "Competitor table updated: added 3 new entries.",
    files: ["brand/competitors.md"],       meta: { added: 3 } },
  { kind: "skill-run",   skill: "seo-content",        summary: "Drafted 3 SEO articles against the keyword plan.",
    files: ["marketing/articles/agent-studios-vs-frameworks.md",
            "marketing/articles/why-your-marketing-team-needs-an-agent.md",
            "marketing/articles/measuring-agent-roi.md"],
    meta: { wordCount: 5420 } },
  { kind: "publish",     skill: "content-atomizer",   summary: "Atomized long-form into 8 social posts; queued via postiz.",
    files: ["marketing/social/queue.json"], meta: { platforms: ["linkedin", "bluesky", "threads"] } },
  { kind: "toast",       skill: null,                 summary: "Postiz key rotated successfully.",
    files: [],                              meta: { level: "success" } },
  { kind: "navigate",    skill: null,                 summary: "Switched to Publish tab after draft created.",
    files: [],                              meta: { tab: "publish" } },
  { kind: "skill-run",   skill: "landscape-scan",     summary: "Refreshed ecosystem snapshot + Claims Blacklist.",
    files: ["brand/landscape.md"],          meta: { claimsFlagged: 4 } },
  { kind: "brand-write", skill: "keyword-research",   summary: "Keyword plan doubled: 24 new head + long-tail entries.",
    files: ["brand/keyword-plan.md"],       meta: { added: 24 } },
  { kind: "custom",      skill: "cmo",                summary: "/cmo queued a Content Engine playbook run.",
    files: [],                              meta: { playbook: "Content Engine" } },
]

const BRIEFS = [
  { title: "Trend brief: TikTok agent framework teardown",
    skill: "landscape-scan",
    content: "Recent fictional TikTok teardown (2.1M views) benchmarks 6 agent frameworks but omits studio layers, which is our lane. Recommended: 90s POV reply to the video, link to our demo."
  },
  { title: "Audience brief: mid-market marketing ops",
    skill: "audience-research",
    content: "Primary archetype is a marketing-ops IC at a 40 to 200 person SaaS, 2 to 5 yrs experience, already runs 2+ agents informally via Notion + Zapier. Hook: 'let me replace your Zapier with 50 marketing skills'."
  },
  { title: "Competitive brief: agent-platform launch wave",
    skill: "competitive-intel",
    content: "14 recent batch startups use agent-* or cmo-* naming. Most are framework plays; 2 are studio plays (one overlap with our positioning). Watchlist populated."
  },
]

const PUBLISH_LOG = [
  { adapter: "postiz",    providers: ["linkedin", "bluesky", "threads"], items: 3, failed: 0,
    content: "demo: 'The studio is the missing layer'. Founder POV on agent frameworks." },
  { adapter: "typefully", providers: ["x"],                              items: 1, failed: 0,
    content: "demo: thread teardown, 'Why your agent needs a studio (and not just a framework).'" },
  { adapter: "postiz",    providers: ["mastodon", "bluesky"],            items: 2, failed: 0,
    content: "demo: reshare of the 82% in-house GTM automation stat." },
  { adapter: "resend",    providers: ["email"],                          items: 1, failed: 0,
    content: "demo: launch-day newsletter, 'DemoCo now ships with an activity panel.'" },
  { adapter: "postiz",    providers: ["linkedin"],                       items: 1, failed: 1,
    content: "demo: LinkedIn carousel, 'A day with your marketing department'. 1 failed (rate-limited)." },
  { adapter: "file",      providers: ["notion"],                         items: 4, failed: 0,
    content: "demo: internal digest, 4 shortform items handed to the ops team." },
]

// ---------------------------------------------------------------------------
// Reset pass (demo-only rows identified by the sentinel)
// ---------------------------------------------------------------------------

if (RESET) {
  const sentinel = `%${DEMO_SENTINEL}%`
  db.prepare("DELETE FROM activity      WHERE summary        LIKE ?").run(sentinel)
  db.prepare("DELETE FROM opportunities WHERE reason         LIKE ?").run(sentinel)
  db.prepare("DELETE FROM publish_log   WHERE content_preview LIKE ?").run(sentinel)
  db.prepare("DELETE FROM signals       WHERE content        LIKE ?").run(sentinel)
  db.prepare("DELETE FROM briefs        WHERE content        LIKE ?").run(sentinel)
  console.log("[seed-demo] Cleared prior demo rows.")
}

// ---------------------------------------------------------------------------
// Inserts
//
// Bug F (silverspark, 2026-05-08): Bun's SQLite binder silently drops the
// `?` parameter inside `datetime('now', ?)` when surrounding INSERT VALUES
// mix SQL literals (`0`, `'pending'`, `NULL`) with positional params. The
// column lands NULL on every row and date-windowed queries return 0.
// seed-demo.ts has been all-`?` historically so the bug is latent here,
// but the canonical fix is to compute the timestamp in JS and bind a
// plain TEXT value -- removes the fragile pattern entirely. Mirrors
// scripts/seed-pulse-series.ts:108-130.
// ---------------------------------------------------------------------------

let inserted = { signals: 0, opportunities: 0, activities: 0, briefs: 0, publish: 0 }

const NOW_MS = Date.now()

/**
 * Returns a SQLite-compatible UTC timestamp ("YYYY-MM-DD HH:MM:SS") for a
 * point in time `daysAgo` days + `minutesAgo` minutes before NOW. Matches
 * the format SQLite's own `datetime('now')` returns, so existing queries
 * that compare against `datetime('now', '-7 days')` work unchanged.
 */
function isoOffset(daysAgo: number, minutesAgo: number, hoursAgo = 0): string {
  const t = NOW_MS
    - daysAgo * 24 * 60 * 60 * 1000
    - hoursAgo * 60 * 60 * 1000
    - minutesAgo * 60 * 1000
  return new Date(t).toISOString().slice(0, 19).replace("T", " ")
}

// Signals
const signalStmt = db.prepare(
  "INSERT INTO signals (platform, content, url, severity, spike_detected, feedback, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
)
SIGNALS.forEach((s, i) => {
  const ageHours = Math.round(i * 1.4)
  const createdAt = isoOffset(0, 0, ageHours)
  const content = `${DEMO_SENTINEL} ${s.content}`
  const metadata = JSON.stringify({ source: "demo-seed", index: i })
  signalStmt.run(s.platform, content, s.url, s.severity, s.spike, s.feedback, metadata, createdAt)
  inserted.signals++
})

// Opportunities
const oppStmt = db.prepare(
  "INSERT INTO opportunities (skill, reason, priority, prerequisites, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
)
OPPORTUNITIES.forEach((o, i) => {
  const createdAt = isoOffset(0, 0, i * 2)
  oppStmt.run(o.skill, `${DEMO_SENTINEL} ${o.reason}`, o.priority, o.prerequisites, o.status, createdAt)
  inserted.opportunities++
})

// Activity
const activityStmt = db.prepare(
  "INSERT INTO activity (kind, skill, summary, detail, files_changed, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
)
ACTIVITIES.forEach((a, i) => {
  const createdAt = isoOffset(0, i * 17)
  activityStmt.run(
    a.kind,
    a.skill,
    `${DEMO_SENTINEL} ${a.summary}`,
    null,
    JSON.stringify(a.files),
    JSON.stringify(a.meta),
    createdAt,
  )
  inserted.activities++
})

// Briefs
const briefStmt = db.prepare(
  "INSERT INTO briefs (title, content, skill, brand_files_read, created_at) VALUES (?, ?, ?, ?, ?)",
)
BRIEFS.forEach((b, i) => {
  const createdAt = isoOffset(i + 1, 0)
  briefStmt.run(
    b.title,
    `${DEMO_SENTINEL} ${b.content}`,
    b.skill,
    JSON.stringify(["brand/voice-profile.md", "brand/audience.md", "brand/competitors.md"]),
    createdAt,
  )
  inserted.briefs++
})

// Publish log
const publishStmt = db.prepare(
  "INSERT INTO publish_log (adapter, providers, content_preview, result, items_published, items_failed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
)
PUBLISH_LOG.forEach((p, i) => {
  const createdAt = isoOffset(0, 0, i * 3 + 1)
  publishStmt.run(
    p.adapter,
    JSON.stringify(p.providers),
    p.content,
    JSON.stringify({ ok: true, items: p.items, failed: p.failed }),
    p.items,
    p.failed,
    createdAt,
  )
  inserted.publish++
})

db.close()

console.log("[seed-demo] Inserted:")
for (const [k, v] of Object.entries(inserted)) {
  console.log(`  - ${k}: ${v}`)
}
console.log("[seed-demo] Done. Open http://localhost:3000/dashboard to see populated data.")
console.log("[seed-demo] Re-run with --reset to clear prior demo rows first.")
