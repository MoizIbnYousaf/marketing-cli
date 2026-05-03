// lib/types/publish.ts
// All types for the Publish tab.
// No @postiz/* imports — AGPL firewall.

// ─── Integration (connected provider) ─────────────────────────────────────

export type PublishIntegration = {
  id: string
  providerIdentifier: string // "linkedin" | "bluesky" | "reddit" | "mastodon" | "threads" | "x" | ...
  name: string               // display name (account handle / page name)
  picture: string            // avatar URL
  profile: string            // username / handle
  connected: boolean         // false → auth expired, needs reconnect in Postiz
  lastChecked?: string       // ISO 8601
}

// ─── Scheduled / published post ───────────────────────────────────────────

export type PostStatus = "draft" | "scheduled" | "published" | "failed"

export type ScheduledPost = {
  id: string
  content: string            // raw text (no HTML)
  providers: string[]        // list of providerIdentifier strings
  scheduledAt: string        // ISO 8601
  status: PostStatus
  integrationIds?: string[]  // postiz integration DB IDs
}

// ─── Publish adapter (from mktg CLI) ──────────────────────────────────────

export type PublishAdapter = {
  name: string               // "postiz" | "typefully" | "resend" | "file"
  configured: boolean
  envVar?: string
}

// ─── Draft request (POST /api/publish) ────────────────────────────────────

export type CreateDraftRequest = {
  content: string
  integrationIds: string[]   // postiz integration DB IDs to post to
  scheduledAt?: string       // ISO 8601 — if omitted, creates draft
  dryRun?: boolean
}

export type CreateDraftResult = {
  ok: true
  adapter: string
  draftsCreated: number
  postIds: string[]
} | {
  ok: false
  error: string
  code?: "auth-missing" | "rate-limited" | "bad-request" | "server-error" | "network"
}

// ─── Publish history (SQLite publish_log) ─────────────────────────────────

export type PublishHistoryRow = {
  id: number
  adapter: string
  providers: string[]        // JSON parsed
  contentPreview: string
  result: unknown            // raw CommandResult from mktg CLI
  itemsPublished: number
  itemsFailed: number
  createdAt: string
}

// ─── Character limits by provider ─────────────────────────────────────────
// Source: derived from postiz textSlicer + platform docs

export const PROVIDER_CHAR_LIMITS: Record<string, number> = {
  linkedin: 3000,
  x: 280,
  twitter: 280,
  bluesky: 300,
  mastodon: 500,
  threads: 500,
  reddit: 40000,
  facebook: 63206,
  instagram: 2200,
  tiktok: 2200,
  youtube: 5000,
  pinterest: 500,
}

export const DEFAULT_CHAR_LIMIT = 2200

export function getCharLimit(providerIdentifier: string): number {
  return PROVIDER_CHAR_LIMITS[providerIdentifier.toLowerCase()] ?? DEFAULT_CHAR_LIMIT
}

// ─── Provider display metadata ─────────────────────────────────────────────

export type ProviderMeta = {
  identifier: string
  label: string
  color: string    // tailwind color class for accent
}

export const PROVIDER_META: Record<string, ProviderMeta> = {
  linkedin: { identifier: "linkedin", label: "LinkedIn", color: "text-blue-600" },
  bluesky:  { identifier: "bluesky",  label: "Bluesky",  color: "text-sky-500" },
  x:        { identifier: "x",        label: "X",         color: "text-foreground" },
  twitter:  { identifier: "twitter",  label: "Twitter",   color: "text-sky-400" },
  reddit:   { identifier: "reddit",   label: "Reddit",    color: "text-orange-500" },
  mastodon: { identifier: "mastodon", label: "Mastodon",  color: "text-violet-500" },
  threads:  { identifier: "threads",  label: "Threads",   color: "text-foreground" },
  facebook: { identifier: "facebook", label: "Facebook",  color: "text-blue-500" },
  instagram:{ identifier: "instagram",label: "Instagram", color: "text-pink-500" },
  tiktok:   { identifier: "tiktok",   label: "TikTok",    color: "text-foreground" },
  youtube:  { identifier: "youtube",  label: "YouTube",   color: "text-red-500" },
  pinterest:{ identifier: "pinterest",label: "Pinterest", color: "text-red-600" },
}

export function getProviderMeta(identifier: string): ProviderMeta {
  return (
    PROVIDER_META[identifier.toLowerCase()] ?? {
      identifier,
      label: identifier.charAt(0).toUpperCase() + identifier.slice(1),
      color: "text-muted-foreground",
    }
  )
}

// ─── Rate limit state ──────────────────────────────────────────────────────

export type RateLimitState = {
  used: number      // posts created this hour
  limit: number     // always 30
  resetsAt?: string // ISO 8601 — when the window resets
}
