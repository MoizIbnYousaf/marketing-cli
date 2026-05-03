# CMO ↔ Studio Integration

The mktg-studio dashboard (Bun API + Next.js UI, default ports 3001 + 3000, or the ports printed by `mktg studio`) is a local visual layer that /cmo *drives* from Claude Code. The studio never initiates skill runs; it reflects state. Every user-visible action the studio shows — an activity row, a tab switch, a toast, a refreshed brand file — is /cmo POSTing to the studio's HTTP surface.

## When the studio is running

Detect with a single HEAD request:

```bash
STUDIO=${STUDIO_BASE:-http://localhost:3001}
curl -s -o /dev/null -w "%{http_code}" "$STUDIO/api/health"
# 200 → studio is live. Anything else → studio is offline or starting.
```

If 200, /cmo is in **studio-attached mode** and MUST mirror key side effects to the studio via HTTP. If not 200, /cmo is in **standalone mode** — work exactly as before, no HTTP calls.

There is no retry loop. Studio absence is not an error; it's a state.

## When the user wants Studio open

Launch Studio explicitly through `mktg`; do not rely on hidden hooks or
browser automation:

```bash
mktg studio --dry-run --json --intent cmo --session <id>
mktg studio --open --intent cmo --session <id>
```

The dry-run is side-effect free and returns `urls.dashboard`, usually:

```text
http://localhost:3000/dashboard?mode=cmo&session=<id>
```

The launcher prefers the sibling `mktg-studio/bin/mktg-studio.ts` checkout,
then `MKTG_STUDIO_BIN`, then `mktg-studio` on PATH. Once health returns 200,
switch to studio-attached mode and use the verbs below.

## The studio verbs

Most are mutating POSTs /cmo sends outbound; schema-fetch is a read-only GET /cmo calls before the first POST of a session to resolve payload schemas at runtime. Never hardcode shapes — the studio's schema is the source of truth.

| Verb | Endpoint | Purpose | When /cmo uses it |
|---|---|---|---|
| schema-fetch | `GET /api/schema` | Resolve every endpoint's request + response shape at runtime | Once per session, before the first mutating POST. Cache the result for the rest of the session. |
| activity | `POST /api/activity/log` | Append a row to the live Activity panel | After any skill run, any brand file write, any publish, any non-trivial CLI invocation |
| brand-note | `POST /api/brand/note` | Tell Studio that /cmo wrote a brand file externally | After direct edits to `brand/*.md` |
| brand-write | `POST /api/brand/write` | Atomic Studio-mediated brand write with optimistic locking | When /cmo wants Studio to own the write + refresh event |
| push-action | `POST /api/opportunities/push` | Add a recommended next action that Pulse can surface | When analysis produces a concrete next move |
| navigate | `POST /api/navigate` | Switch the active tab + apply filters | When routing a user from one concern to another (e.g., drafted a post → switch to Publish tab) |
| toast | `POST /api/toast` | Fire a one-off sonner toast | For transient user-facing notifications — "brand voice refreshed", "postiz draft created", etc. |
| brand-refresh | `POST /api/brand/refresh` | Invalidate brand-backed SWR caches | Immediately after `brand/*.md` is written or appended |

Every body is JSON. `/api/schema` is agent-native by design — same contract as `mktg schema --json` — so a teammate agent extending /cmo can self-discover the studio surface with one curl.

## What to mirror vs what to hide

**Mirror (post to studio):**
- Skill runs that write brand files → `activity` + `brand/refresh`
- Publish actions (Typefully / postiz / Resend drafts) → `activity` + `navigate` to Publish tab + `toast`
- Native publish actions (`mktg-native`) → `activity` + `navigate` to Publish tab + `toast`
- Signal collection, competitive scans, landscape refreshes → `activity` + `navigate` to Signals or Signals/Trend radar
- Opportunity recommendations → `activity` + `opportunities/push` so Pulse can surface the next action

**Hide (do not post):**
- Read-only CLI invocations (`mktg status`, `mktg list`, `mktg plan next`) — these are /cmo's own context gathering, not user-visible events
- Dry-run previews (`--dry-run` anywhere) — never mirror a preview as if it were an action
- Failed integration checks that /cmo is about to guide the user through — surface as a toast only after the user opts in to setup
- Internal learnings appended to `brand/learnings.md` from the `--learning` flag — the brand refresh event will show the file changed, which is enough

## Activity row shape

```jsonc
{
  "kind": "skill-run" | "brand-write" | "publish" | "navigate" | "toast",
  "skill": "seo-content",               // optional, when kind === "skill-run"
  "summary": "Drafted 3 SEO articles for 'anti-course course' positioning",
  "filesChanged": ["brand/assets.md"],  // optional
  "meta": {
    "result": "success" | "partial" | "failed"
  }
}
```

/cmo NEVER sends the full skill output. The activity log is a log, not a storage layer. Full artifacts live in brand files and the SQLite `skill_runs` table (written by the mktg CLI, not by /cmo directly).

## Navigate payload — use sparingly

```jsonc
{
  "tab": "publish" | "signals" | "brand" | "pulse",
  "filter": { "adapter": "mktg-native" }   // optional, tab-specific
}
```

Only navigate when the user's next logical move is on a specific tab. Trend radar lives inside Signals, so use `{"tab":"signals","filter":{"mode":"radar"}}`. Legacy tabs are remapped by Studio (`trends` → Signals/Trend radar, `audience` and `opportunities` → Pulse), but new callers should send only `pulse`, `signals`, `publish`, or `brand`. Do not navigate on every skill run — that thrashes the UI. A good rule: navigate at most once per user turn, at the moment their attention needs to shift.

## Toast — transient only

Toasts disappear. Use them for ephemeral confirmations, never for information the user might need to reference later. "Posted to LinkedIn", "Brand voice refreshed", "Landscape stale — refreshing now" — yes. A 200-word strategic recommendation — no, that goes in the chat (Claude Code terminal) where it persists.

## Order of operations

When a skill run produces a brand file write AND a publish AND a tab switch, the order matters:

1. `POST /api/activity/log` first — records the event, appears in the Activity panel immediately
2. `POST /api/brand/note`, `POST /api/brand/write`, or `POST /api/brand/refresh` second (if brand file changed) — invalidates SWR so the tab shows fresh data
3. `POST /api/opportunities/push` third (if a next action should appear on Pulse)
4. `POST /api/navigate` fourth (if tab should switch) — user arrives on a tab that already has the latest data
5. `POST /api/toast` last — confirmation on top of the already-correct view

Posting navigate before refresh risks showing the user stale data on the destination tab.

## Failure handling

Every /cmo → studio POST is fire-and-forget. If the studio returns non-2xx, /cmo:

1. Logs a single-line note to stderr — "studio POST failed: {endpoint} {code}"
2. Continues the skill run to completion
3. Does NOT retry, does NOT queue, does NOT surface the failure to the user

The studio is a dashboard, not a durable sink. If a row is lost, the skill's actual output (brand files, publish_log SQLite row) is the source of truth and will re-surface on the next dashboard reload.

## Schema introspection (the schema-fetch verb in detail)

First action on a studio-attached session, before any mutating POST:

```bash
STUDIO=${STUDIO_BASE:-http://localhost:3001}
curl -s "$STUDIO/api/schema" > /tmp/studio-schema.json
jq '.routes[] | select(.path == "/api/activity/log")' /tmp/studio-schema.json
```

The response shape mirrors `mktg schema --json`: every endpoint lists its request body shape, response body shape, enum values, and required-vs-optional fields. /cmo uses this to:

1. Validate its own outbound payloads before POSTing (reject bad payloads locally, don't spam the studio with 400s).
2. Discover new endpoints added in newer studio versions without a CLI update.
3. Surface version drift: if /cmo's expected shape and the studio's declared shape diverge, log once to stderr and fall back to the minimal common subset.

Cache for the session — the studio's schema is stable within a single run. Refresh on studio restart or when /cmo itself restarts.

## Never

- Never import `@postiz/*` — AGPL firewall, enforced by test.
- Never initiate a Claude Code session from the studio. /cmo is always invoked from the user's terminal.
- Do not delegate intelligence to `POST /api/skill/run` unless explicitly operating Studio's local skill-runner surface. /cmo remains the orchestrator; the studio reflects.
- Never store API keys in the studio. The mktg CLI reads its own env vars; the studio's settings panel writes to `.env.local` which the next `mktg` invocation picks up.
