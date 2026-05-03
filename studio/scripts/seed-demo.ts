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
 * Imagined brand: "Parallel" — a SaaS that lets marketing teams run agent
 * workflows across their stack. Mid-market, bootstrapped, indie-tech voice.
 */

import { Database } from "bun:sqlite"
import path from "node:path"
import { existsSync } from "node:fs"

const DB_PATH = path.join(process.cwd(), "marketing.db")
const RESET = process.argv.includes("--reset")
const DEMO_SENTINEL = "demo:"

if (!existsSync(DB_PATH)) {
  console.error(`[seed-demo] marketing.db not found at ${DB_PATH}.`)
  console.error("[seed-demo] Start the studio server once to create it: bun run server.ts")
  process.exit(1)
}

const db = new Database(DB_PATH)
db.exec("PRAGMA journal_mode=WAL")

// ---------------------------------------------------------------------------
// Fixtures — realistic for a bootstrapped SaaS persona ("Parallel")
// ---------------------------------------------------------------------------

const SIGNALS = [
  { platform: "tiktok",      severity: 82, spike: 1, feedback: "pending",
    content: "@agentcore just dropped a teardown of 6 competing agent frameworks — 2.1M views. Parallel not mentioned.",
    url: "https://www.tiktok.com/@agentcore/video/7485510233" },
  { platform: "news",        severity: 71, spike: 0, feedback: "pending",
    content: "Bain report: 82% of GTM teams now ship automations in-house. Big opportunity for agent-first workflow SaaS.",
    url: "https://www.bain.com/insights/agentic-gtm-2026" },
  { platform: "twitter",     severity: 68, spike: 0, feedback: "pending",
    content: "'Everyone's building agent frameworks. No one's building marketing studios around them.' — @rauchg",
    url: "https://twitter.com/rauchg/status/1819271331" },
  { platform: "reddit",      severity: 64, spike: 1, feedback: "pending",
    content: "r/SaaS discussion: 'Looking for an agent platform that doesn't make me write Python.' 400+ upvotes.",
    url: "https://reddit.com/r/SaaS/comments/agent_platforms_2026" },
  { platform: "instagram",   severity: 61, spike: 0, feedback: "pending",
    content: "Carousel template format driving 8x engagement vs plain posts in B2B SaaS niche.",
    url: "https://www.instagram.com/p/Cdc-templates" },
  { platform: "news",        severity: 59, spike: 0, feedback: "pending",
    content: "YC W26 batch: 14 startups named agent-* or cmo-*. Crowded naming space.",
    url: "https://ycombinator.com/batches/w26" },
  { platform: "tiktok",      severity: 57, spike: 0, feedback: "approved",
    content: "Behind-the-scenes tour of a marketing ops team using 3 agents in parallel — 480k views.",
    url: "https://www.tiktok.com/@marketing-ops/video/7485510100" },
  { platform: "google_trends", severity: 55, spike: 0, feedback: "pending",
    content: "'AI marketing agent' query volume +340% in 90 days. 'AI marketing CMO' +210%.",
    url: "https://trends.google.com/trends/q=ai-marketing-agent" },
  { platform: "twitter",     severity: 54, spike: 0, feedback: "pending",
    content: "@swyx: 'The studio layer for agents is the missing piece. Frameworks without studios is like git without GitHub.'",
    url: "https://twitter.com/swyx/status/1819012981" },
  { platform: "news",        severity: 51, spike: 0, feedback: "pending",
    content: "Stripe ships agent-friendly API surface: machine-readable errors, schema introspection, dry-run on every mutator.",
    url: "https://stripe.com/blog/agent-dx-2026" },
  { platform: "instagram",   severity: 48, spike: 0, feedback: "pending",
    content: "Dark-mode dashboard screenshots are outperforming light-mode 3:1 in B2B ads this quarter.",
    url: "https://www.instagram.com/p/Cdc-darkmode" },
  { platform: "reddit",      severity: 46, spike: 0, feedback: "dismissed",
    content: "r/marketing thread on AI fatigue — 'another AI tool, no thanks'. 260 upvotes, mostly agency folks.",
    url: "https://reddit.com/r/marketing/comments/ai-fatigue-2026" },
  { platform: "news",        severity: 44, spike: 0, feedback: "pending",
    content: "Vercel ships AI Gateway with usage-based pricing. Pressure on BYOAI positioning across the stack.",
    url: "https://vercel.com/blog/ai-gateway-ga" },
  { platform: "tiktok",      severity: 42, spike: 0, feedback: "pending",
    content: "Dev-tool demo videos under 45s outperform 60s+ at 2.2x CTR on TikTok this week.",
    url: "https://www.tiktok.com/@creator/video/7485510099" },
  { platform: "twitter",     severity: 40, spike: 0, feedback: "pending",
    content: "@jessepollak: 'Onchain marketing tools are the next wave.' — flag-level signal, watch adjacent space.",
    url: "https://twitter.com/jessepollak/status/1819019992" },
  { platform: "news",        severity: 38, spike: 0, feedback: "pending",
    content: "Postiz open-sources more schedulers; positions as 'Buffer killer'.",
    url: "https://github.com/gitroomhq/postiz-app" },
  { platform: "reddit",      severity: 36, spike: 0, feedback: "pending",
    content: "r/startups: 'I built a landing page in 20 minutes with an agent' — 1.8k upvotes.",
    url: "https://reddit.com/r/startups/comments/agent-landing-page" },
  { platform: "google_trends", severity: 34, spike: 0, feedback: "pending",
    content: "'Claude Code' query volume +180% week over week. Agent IDEs are breaking out.",
    url: "https://trends.google.com/trends/q=claude-code" },
  { platform: "tiktok",      severity: 30, spike: 0, feedback: "pending",
    content: "'My AI marketing department' format is hitting — raw vertical video, text overlays, 8-12s clips.",
    url: "https://www.tiktok.com/@marketing-ai/video/7485510066" },
  { platform: "instagram",   severity: 28, spike: 0, feedback: "pending",
    content: "Short-form carousel template with animated count-up stats outperforming static by 2.8x.",
    url: "https://www.instagram.com/p/Cdc-carousels" },
]

const OPPORTUNITIES = [
  { skill: "seo-content",        priority: 92, status: "pending",
    reason: "Search 'AI marketing agent' trending +340% — own the comparison query before competitors do.",
    prerequisites: JSON.stringify({ needs: ["brand/keyword-plan.md"], nice_to_have: ["Exa API key"] }) },
  { skill: "content-atomizer",   priority: 87, status: "pending",
    reason: "Founder talk from last week has 3 hooks worth atomizing into 12 social posts + 2 newsletter sections.",
    prerequisites: JSON.stringify({ needs: ["transcript", "brand/voice-profile.md"] }) },
  { skill: "competitive-intel",  priority: 74, status: "started",
    reason: "3 new YC W26 entrants in the agent-platform space. Update brand/competitors.md before next briefing.",
    prerequisites: JSON.stringify({ needs: ["Exa API key"] }) },
  { skill: "landscape-scan",     priority: 68, status: "pending",
    reason: "Claims blacklist last refreshed 18 days ago — past the 14-day window for content-safe claims.",
    prerequisites: JSON.stringify({ freshness: "14d", writes: "brand/landscape.md" }) },
  { skill: "direct-response-copy", priority: 61, status: "pending",
    reason: "Homepage hero hasn't been tested against the 'agent studio' positioning — a 10-min A/B could lift signup 12-15%.",
    prerequisites: JSON.stringify({ needs: ["brand/positioning.md"] }) },
]

const ACTIVITIES = [
  { kind: "skill-run",   skill: "audience-research",  summary: "Audience personas refreshed — 3 archetypes written.",
    files: ["brand/audience.md"],          meta: { durationMs: 48200, successes: 1 } },
  { kind: "brand-write", skill: "voice-extraction",   summary: "Voice profile rewritten from 6 founder-letter samples.",
    files: ["brand/voice-profile.md"],     meta: { samplesUsed: 6 } },
  { kind: "skill-run",   skill: "competitive-intel",  summary: "Competitor table updated — added 3 YC W26 entries.",
    files: ["brand/competitors.md"],       meta: { added: 3 } },
  { kind: "skill-run",   skill: "seo-content",        summary: "Drafted 3 SEO articles against the keyword plan.",
    files: ["marketing/articles/agent-studios-vs-frameworks.md",
            "marketing/articles/why-your-marketing-team-needs-an-agent.md",
            "marketing/articles/measuring-agent-roi.md"],
    meta: { wordCount: 5420 } },
  { kind: "publish",     skill: "content-atomizer",   summary: "Atomized long-form into 8 social posts — queued via postiz.",
    files: ["marketing/social/queue.json"], meta: { platforms: ["linkedin", "bluesky", "threads"] } },
  { kind: "toast",       skill: null,                 summary: "Postiz key rotated successfully.",
    files: [],                              meta: { level: "success" } },
  { kind: "navigate",    skill: null,                 summary: "Switched to Publish tab after draft created.",
    files: [],                              meta: { tab: "publish" } },
  { kind: "skill-run",   skill: "landscape-scan",     summary: "Refreshed ecosystem snapshot + Claims Blacklist.",
    files: ["brand/landscape.md"],          meta: { claimsFlagged: 4 } },
  { kind: "brand-write", skill: "keyword-research",   summary: "Keyword plan doubled — 24 new head + long-tail entries.",
    files: ["brand/keyword-plan.md"],       meta: { added: 24 } },
  { kind: "custom",      skill: "cmo",                summary: "/cmo queued a Content Engine playbook run.",
    files: [],                              meta: { playbook: "Content Engine" } },
]

const BRIEFS = [
  { title: "Trend brief — TikTok agent framework teardown",
    skill: "landscape-scan",
    content: "@agentcore's teardown (2.1M views) benchmarks 6 agent frameworks but omits studio layers — our lane. Recommended: 90s POV TikTok replying to the video, link to our demo."
  },
  { title: "Audience brief — mid-market marketing ops",
    skill: "audience-research",
    content: "Primary archetype is a marketing-ops IC at a 40-200 person SaaS, 2-5 yrs experience, already runs 2+ agents informally via Notion + Zapier. Hook = 'let me replace your Zapier with 50 marketing skills'."
  },
  { title: "Competitive brief — YC W26 agent wave",
    skill: "competitive-intel",
    content: "14 W26 startups use agent-* or cmo-* naming. Most are framework plays; 2 are studio plays (one overlap with our positioning). Watchlist populated."
  },
]

const PUBLISH_LOG = [
  { adapter: "postiz",    providers: ["linkedin", "bluesky", "threads"], items: 3, failed: 0,
    content: "demo: 'The studio is the missing layer' — founder POV on agent frameworks." },
  { adapter: "typefully", providers: ["x"],                              items: 1, failed: 0,
    content: "demo: thread teardown — 'Why your agent needs a studio (and not just a framework).'" },
  { adapter: "postiz",    providers: ["mastodon", "bluesky"],            items: 2, failed: 0,
    content: "demo: reshare — Bain 82% stat about in-house GTM automation." },
  { adapter: "resend",    providers: ["email"],                          items: 1, failed: 0,
    content: "demo: launch-day newsletter — 'Parallel now ships with an activity panel.'" },
  { adapter: "postiz",    providers: ["linkedin"],                       items: 1, failed: 1,
    content: "demo: LinkedIn carousel — 'A day with your marketing department'. 1 failed (rate-limited)." },
  { adapter: "file",      providers: ["notion"],                         items: 4, failed: 0,
    content: "demo: internal digest — 4 shortform items handed to the ops team." },
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
// ---------------------------------------------------------------------------

let inserted = { signals: 0, opportunities: 0, activities: 0, briefs: 0, publish: 0 }

// Signals
const signalStmt = db.prepare(
  "INSERT INTO signals (platform, content, url, severity, spike_detected, feedback, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))",
)
SIGNALS.forEach((s, i) => {
  const ageHours = Math.round(i * 1.4)
  const ageOffset = `-${ageHours} hours`
  const content = `${DEMO_SENTINEL} ${s.content}`
  const metadata = JSON.stringify({ source: "demo-seed", index: i })
  signalStmt.run(s.platform, content, s.url, s.severity, s.spike, s.feedback, metadata, ageOffset)
  inserted.signals++
})

// Opportunities
const oppStmt = db.prepare(
  "INSERT INTO opportunities (skill, reason, priority, prerequisites, status, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', ?))",
)
OPPORTUNITIES.forEach((o, i) => {
  const age = `-${i * 2} hours`
  oppStmt.run(o.skill, `${DEMO_SENTINEL} ${o.reason}`, o.priority, o.prerequisites, o.status, age)
  inserted.opportunities++
})

// Activity
const activityStmt = db.prepare(
  "INSERT INTO activity (kind, skill, summary, detail, files_changed, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))",
)
ACTIVITIES.forEach((a, i) => {
  const ageMin = i * 17
  const age = `-${ageMin} minutes`
  activityStmt.run(
    a.kind,
    a.skill,
    `${DEMO_SENTINEL} ${a.summary}`,
    null,
    JSON.stringify(a.files),
    JSON.stringify(a.meta),
    age,
  )
  inserted.activities++
})

// Briefs
const briefStmt = db.prepare(
  "INSERT INTO briefs (title, content, skill, brand_files_read, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))",
)
BRIEFS.forEach((b, i) => {
  const age = `-${i + 1} days`
  briefStmt.run(
    b.title,
    `${DEMO_SENTINEL} ${b.content}`,
    b.skill,
    JSON.stringify(["brand/voice-profile.md", "brand/audience.md", "brand/competitors.md"]),
    age,
  )
  inserted.briefs++
})

// Publish log
const publishStmt = db.prepare(
  "INSERT INTO publish_log (adapter, providers, content_preview, result, items_published, items_failed, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))",
)
PUBLISH_LOG.forEach((p, i) => {
  const age = `-${i * 3 + 1} hours`
  publishStmt.run(
    p.adapter,
    JSON.stringify(p.providers),
    p.content,
    JSON.stringify({ ok: true, items: p.items, failed: p.failed }),
    p.items,
    p.failed,
    age,
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
