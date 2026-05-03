# /cmo → Studio HTTP API

The studio runs a local Bun server on `http://localhost:3001` (configurable via `STUDIO_PORT`). `/cmo` (running in the user's Claude Code session) drives the dashboard by hitting these endpoints. The dashboard subscribes to `/api/events` (SSE) and re-renders as events stream in.

This file is the contract. Every endpoint is JSON-in / JSON-out. Every mutating endpoint accepts `?dryRun=true`. Every input is validated and hardened — control characters, traversal-style paths, oversized bodies, and unsafe JSON keys are rejected at the boundary.

> **Discovery:** `GET /api/schema` returns a machine-readable list of every route, its method, params, and body shape. Use it when writing new tooling instead of hard-coding paths.

---

## Conventions

- **Base URL:** `http://localhost:3001`
- **Content-Type:** `application/json`
- **Response envelope (success):** `{"ok": true, "data": <T>, "meta?": {...}}`
- **Response envelope (error):** `{"ok": false, "error": {"code": "<CODE>", "message": "<msg>", "fix": "<hint>"}}`
- **Degraded but OK:** when an upstream (postiz, mktg CLI) is unreachable but the route itself succeeded, you get `{"ok": true, "data": [], "degraded": true, "degradedReason": "<msg>"}`. The route is fine; the *upstream* is degraded.
- **Meta sibling:** surface-feeding GETs (Pulse, Content, Publish, Brand, Briefs, Intelligence, Research, Activity) include a top-level `meta` object with at minimum `fetchedAt: ISO8601`. The frontend uses it to render "X minutes ago" stale chips per the freshness windows in `CLAUDE.md` (14d landscape, 30d personas, 90d keywords, 180d creative-kit/stack). `meta` is dropped on NDJSON responses (it's a stream-of-items by definition); fetch in JSON mode if you need it.
- **Dry-run:** append `?dryRun=true` to any mutating endpoint to validate without writing
- **Field mask:** any GET marked with `params: ["fields"]` accepts `?fields=a,b.c.d` (dot-notation, smart pivot for collection responses, structured BAD_INPUT on unknown fields with `available` list)
- **NDJSON streaming:** any GET marked with `accepts: ["application/x-ndjson"]` returns one JSON-encoded item per line when the request sends `Accept: application/x-ndjson`
- **SSE channel:** `GET /api/events` — emits `{type, payload, ts}` events
- **CORS:** `localhost:3000` and `127.0.0.1:3000` (Next.js dev server)

### Error codes

`error.code` is one of:

| Code | HTTP | Meaning |
|---|---|---|
| `BAD_INPUT` | 400 | Schema or validator rejection. `fix` names the field |
| `NOT_FOUND` | 404 | Resource missing |
| `UNAUTHORIZED` | 401 | Missing/invalid credentials (e.g. `POSTIZ_API_KEY`) |
| `CONFLICT` | 409 | Optimistic-lock failure (e.g. `POST /api/brand/write` with stale `expectedMtime`). `fix` names the reload-and-merge path |
| `CONFIRM_REQUIRED` | 400 | Destructive route called without `?confirm=true` |
| `RATE_LIMITED` | 429 | Local studio limit (60 mutating req/min/IP). Response includes `Retry-After` header |
| `UPSTREAM_FAILED` | 502 | External service (mktg CLI, postiz) failed |
| `PARSE_ERROR` | 4xx/5xx | Couldn't parse upstream response |
| `INTERNAL` | 500 | Unhandled server error |

### Rate limit (60 mutating requests / minute / IP)

The studio applies a sliding-window rate limit to every mutating route (POST/PUT/PATCH/DELETE). GETs are unthrottled — they're idempotent. The 61st mutating request inside the window returns:

```bash
curl -s -i -X POST http://localhost:3001/api/toast \
  -H 'content-type: application/json' \
  -d '{"level":"info","message":"x"}'
```

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 39

{"ok":false,"error":{"code":"RATE_LIMITED","message":"Rate limit exceeded — retry in 39s","fix":"Back off — the studio allows 60 mutating requests per minute per client"}}
```

**Backend:** the limiter is pluggable via the `RATE_LIMIT_STORE` env var:

| Value | Behavior |
|---|---|
| `memory` (default) | Per-process Map. Fast, zero overhead, resets on restart |
| `sqlite` | Backed by the `rate_limits` table in `marketing.db`. Survives restarts and shares state across processes that point at the same DB file |

If the SQLite store has a write hiccup, the limiter **fails open** and tags the response with `X-Rate-Limit-Degraded: true` instead of dropping requests. /cmo can read that header and decide whether to back off voluntarily.

### Example error

```json
{
  "ok": false,
  "error": {
    "code": "BAD_INPUT",
    "message": "Path traversal is not allowed",
    "fix": "Send a project-relative path under brand/"
  }
}
```

---

## Section 1 — Activity feed (the live log)

The right-hand Activity panel renders this stream. Anything `/cmo` does that the user should see → log it here.

### `POST /api/activity/log`

Append an entry to the activity feed. Fires `activity-new` SSE event.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | string | yes | One of `skill-run`, `brand-write`, `publish`, `toast`, `navigate`, `custom` |
| `skill` | string | no | Skill name (lowercase, dots/dashes/underscores only) |
| `summary` | string | yes | One-line description (≤500 chars) |
| `detail` | string | no | Long-form detail (≤8 000 chars) |
| `filesChanged` | string[] | no | Brand files written this turn |
| `meta` | object | no | Free-form JSON for kind-specific extras |

**Response** — wrapRoute envelope; `data.id` is the SQLite row id of the newly inserted row (use it as a stable handle for `DELETE /api/activity/:id`).

```json
{
  "ok": true,
  "data": {
    "id": 394,
    "kind": "skill-run",
    "skill": "cmo",
    "summary": "Refreshed landscape and Claims Blacklist",
    "detail": null,
    "filesChanged": ["brand/landscape.md"],
    "meta": null,
    "createdAt": "2026-04-17T01:24:12.096Z"
  },
  "meta": { ... }
}
```

**Example**

```bash
$ curl -s -X POST http://localhost:3001/api/activity/log \
    -H 'content-type: application/json' \
    -d '{
      "kind": "skill-run",
      "skill": "landscape-scan",
      "summary": "Refreshed landscape and Claims Blacklist",
      "filesChanged": ["brand/landscape.md"]
    }' | jq '.data.id'
394
```

### `GET /api/activity?kind=&skill=&limit=&offset=&fields=`

Read recent activity (default `limit=50`, max `500`).

Supports `?fields=` projection and NDJSON streaming.

**Examples**

```bash
# default
curl 'http://localhost:3001/api/activity?kind=skill-run&limit=10'

# project just two columns
curl 'http://localhost:3001/api/activity?limit=10&fields=kind,summary'

# stream as NDJSON, one row per line
curl -H 'Accept: application/x-ndjson' \
  'http://localhost:3001/api/activity?limit=100'
```

### `DELETE /api/activity/:id?confirm=true`

Delete one activity row by id. **Destructive** — refused without
`?confirm=true`. Fires `activity-deleted` SSE so the Activity panel can
drop the row in real time.

| URL parameter | Required | Notes |
|---|---|---|
| `:id` | yes | Positive integer; row id from `GET /api/activity` |
| `?confirm=true` | yes | Refused without — see error envelope below |
| `?dryRun=true` | no | Returns `{ok:true, dryRun:true}` without writing |

**Live walkthrough — every state of the confirm rail:**

```bash
# 1. Without confirm → CONFIRM_REQUIRED
$ curl -s -X DELETE http://localhost:3001/api/activity/423 | jq
{
  "ok": false,
  "error": {
    "code": "CONFIRM_REQUIRED",
    "message": "This route is destructive and requires explicit confirmation",
    "fix": "Add ?confirm=true to the URL to confirm this destructive action"
  }
}

# 2. With dryRun → no side effect, row preserved
$ curl -s -X DELETE "http://localhost:3001/api/activity/423?confirm=true&dryRun=true" | jq
{ "ok": true, "dryRun": true }

# 3. For real → row deleted, activity-deleted SSE fired
$ curl -s -X DELETE "http://localhost:3001/api/activity/423?confirm=true" | jq
{ "ok": true, "data": { "id": 423, "deleted": true } }

# 4. Already-gone id → NOT_FOUND with fix hint
$ curl -s -X DELETE "http://localhost:3001/api/activity/423?confirm=true" | jq
{
  "ok": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "activity row 423 does not exist",
    "fix": "GET /api/activity to list valid ids"
  }
}
```

---

## Section 2 — Recommendations / Opportunities

Pulse lists ranked actions /cmo wants the user to take. Push to it any time you want to surface a recommendation.

### `POST /api/opportunities/push`

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `skill` | string | yes | Skill name (validated) |
| `reason` | string | yes | Why this matters now (≤2 000 chars) |
| `priority` | number | no | 0–100, higher = ranked higher |
| `prerequisites` | object | no | `{brandFiles: [...], integrations: [...]}` etc. |

**Example**

```bash
curl -X POST http://localhost:3001/api/opportunities/push \
  -H 'content-type: application/json' \
  -d '{
    "skill": "seo-content",
    "reason": "You have a keyword plan but no published articles yet.",
    "priority": 80,
    "prerequisites": {"brandFiles": ["keyword-plan.md"]}
  }'
```

Fires SSE `opportunity-new`.

### `GET /api/opportunities`

Returns pending opportunities ordered by priority.

> **Bare-shape exception (T29).** This endpoint, `GET /api/audience/profiles`, and `GET /api/briefs` skip the `{ok, data, meta}` wrapRoute envelope and return a structured object the matching dashboard tab consumes directly. Don't normalize their responses with `applyFields` or expect `body.data` here.

```bash
$ curl -s http://localhost:3001/api/opportunities | jq 'keys'
[
  "actions",
  "fetchedAt",
  "opportunities",
  "watchItems"
]
```

`opportunities[]` rows are mapped from the SQLite `opportunities` table to `{hook, archetype, urgency}` shape that Pulse renders as recommended next actions. `urgency` is bucketed off `priority`: `>=80` → `now`, `>=50` → `soon`, else `watch`.

The two sibling endpoints follow the same convention:
- `GET /api/audience/profiles` → `{profiles, platformIntelligence, byTheNumbers, fetchedAt}`
- `GET /api/briefs` → `{agents, briefs, fetchedAt}`

---

## Section 3 — Dashboard navigation + UX hints

These don't write to the database — they fire SSE events the dashboard reacts to.

### `POST /api/navigate`

Switch the dashboard to a tab.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `tab` | enum | yes | `pulse` \| `content` \| `publish` \| `brand` |
| `filter` | object | no | Tab-specific filter to apply on arrival |

Legacy callers that send `signals`, `trends`, `audience`, or `opportunities` are remapped before SSE emit: `signals` and `trends` open `content`; `audience` and `opportunities` open `pulse`.

**Example**

```bash
curl -X POST http://localhost:3001/api/navigate \
  -H 'content-type: application/json' \
  -d '{"tab": "publish"}'
```

Fires SSE `navigate`.

### `POST /api/toast`

Show a transient toast.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `level` | enum | yes | `info` \| `success` \| `warn` \| `error` |
| `message` | string | yes | ≤500 chars |
| `duration` | number | no | ms (500 – 60 000), default 4 000 |

**Example**

```bash
curl -X POST http://localhost:3001/api/toast \
  -H 'content-type: application/json' \
  -d '{"level": "success", "message": "Wrote brand/voice-profile.md (118 lines)"}'
```

Fires SSE `toast`.

### `POST /api/highlight`

Pulse a tab or element to draw attention. The dashboard chooses how to render the highlight (border ring, badge, etc.).

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `tab` | string | yes | Tab id |
| `selector` | string | no | Optional CSS selector inside the tab |
| `reason` | string | no | Free-form (shown in tooltip) |

**Example**

```bash
curl -X POST http://localhost:3001/api/highlight \
  -H 'content-type: application/json' \
  -d '{"tab": "publish", "reason": "First post is queued — review and approve"}'
```

Fires SSE `highlight`.

---

## Section 4 — Brand file write notifications

When /cmo writes a brand file (via direct write or `mktg brand write`), tell the studio so the activity feed shows it and dependent tabs refresh.

### `POST /api/brand/note`

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | string | yes | Project-relative path under `brand/` (sandboxed) |
| `excerpt` | string | yes | First few lines for the activity feed (≤8 000 chars) |

**Example**

```bash
curl -X POST http://localhost:3001/api/brand/note \
  -H 'content-type: application/json' \
  -d '{
    "file": "brand/voice-profile.md",
    "excerpt": "## Voice\nDirect, candid, occasionally dry. We never use marketing-speak."
  }'
```

Fires both `activity-new` and `brand-file-changed` SSE events.

---

## Section 5 — Skill execution (on behalf of the user)

These exist already; covered for completeness.

| Endpoint | Purpose |
|---|---|
| `POST /api/skill/run` | Queue a skill execution job |
| `POST /api/cmo/playbook` | Queue a named /cmo playbook |
| `GET /api/jobs/:id` | Poll job status |
| `GET /api/jobs/:id/stream` | SSE stream of job log |

---

## Section 5b — Onboarding + brand lifecycle

The studio drives onboarding via three endpoints. /cmo doesn't normally call them — the dashboard or settings UI does — but they're documented here so /cmo can react to the SSE events they emit.

### `POST /api/onboarding/foundation`

Spawns three "research lanes" (brand, audience, competitive) in parallel. Returns immediately with one job id per agent; progress streams over SSE.

**Body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `from` | string (URL) | no | When set, the studio runs `mktg init --from <url>` to scrape and populate brand/. |
| `seed` | boolean | no | When `true` (default), missing brand files are seeded from templates so the dashboard has data to render. Set `false` to require real research. |

**Response**

```json
{"ok": true, "data": {
  "jobIds": {
    "mktg-brand-researcher": "foundation_<...>",
    "mktg-audience-researcher": "foundation_<...>",
    "mktg-competitive-scanner": "foundation_<...>"
  },
  "agents": ["mktg-brand-researcher", "mktg-audience-researcher", "mktg-competitive-scanner"],
  "note": "..."
}}
```

Subscribe to `/api/events` (or `/api/onboarding/stream`) for `foundation:progress` and `foundation:complete` events.

### `POST /api/brand/refresh`

Same plumbing as the foundation endpoint — re-runs research and re-emits progress events. Use when the user clicks "Refresh research" in Settings.

### `POST /api/brand/reset?confirm=true`

**Destructive.** Wipes `brand/` files back to templates. Requires `?confirm=true` per the safety-rails contract; without it returns:

```json
{"ok": false, "error": {"code": "CONFIRM_REQUIRED", "message": "...", "fix": "Add ?confirm=true to the URL to confirm this destructive action"}}
```

Fires `brand-file-changed` for each file affected.

### `GET /api/onboarding/stream`

SSE stream filtered to onboarding events (`foundation:progress`, `foundation:complete`). Subscribe from the dashboard's onboarding step-building component to render the 3-lane progress UI.

### `GET /api/settings/env/status`

Returns `{KEY: "set"|"unset"}` for each known env var. **Never** returns the values — only whether each key is present in `.env.local` or `process.env`.

```json
{"ok": true, "data": {
  "POSTIZ_API_KEY": "unset",
  "POSTIZ_API_BASE": "set",
  "TYPEFULLY_API_KEY": "unset",
  "EXA_API_KEY": "set",
  "FIRECRAWL_API_KEY": "unset",
  "RESEND_API_KEY": "unset"
}}
```

Used by Settings → Env section to show first-load green dots without exposing secrets.

---

## Section 5c — Brand docs editor

Four endpoints power the in-studio brand-files editor (a markdown editor surface). All four route paths through the wrapRoute layer — structured errors, dryRun, rate limits, JSON Schema enrichment.

### `GET /api/brand/files`

List every `brand/*.md` with freshness chips.

```bash
curl -s http://localhost:3001/api/brand/files | jq '.data[0]'
```

```json
{
  "name": "voice-profile.md",
  "path": "brand/voice-profile.md",
  "bytes": 1021,
  "mtime": "2026-04-17T00:26:02.118Z",
  "exists": true,
  "freshnessWindow": 30,
  "freshness": "template",
  "ageDays": 0.024,
  "skill": "brand-voice",
  "purpose": "How the brand sounds"
}
```

`freshness` is one of `fresh | stale | template | missing`. Template detection uses both a char-count heuristic (<600 chars) and a hash-match against the seed shipped by the mktg CLI.

Supports `?fields=` projection and `Accept: application/x-ndjson`.

### `GET /api/brand/read?file=voice-profile.md`

```bash
curl -s 'http://localhost:3001/api/brand/read?file=voice-profile.md' | jq '.data | {bytes, mtime, freshness}'
```

Returns `{file, content, mtime, bytes, freshness, ageDays}` with `meta.fetchedAt`. Path traversal returns 400 with `code: PATH_TRAVERSAL`. Non-existent files return 404 with `code: NOT_FOUND`.

### `POST /api/brand/write`

Atomic write (stage-and-rename) with optional optimistic-lock via `expectedMtime`. Fires `brand-file-changed` and `activity-new` SSE events on success.

```bash
curl -s -X POST http://localhost:3001/api/brand/write \
  -H 'content-type: application/json' \
  -d '{"file":"voice-profile.md","content":"…markdown…","expectedMtime":"2026-04-17T00:26:02.118Z"}'
```

```json
{"ok":true,"data":{"file":"voice-profile.md","mtime":"2026-04-17T01:00:51.238Z","bytes":1021,"deltaChars":0}}
```

If `expectedMtime` doesn't match the on-disk mtime, the wire returns **HTTP 409** with the structured envelope:

```json
{
  "ok": false,
  "error": {
    "code": "CONFLICT",
    "message": "File modified elsewhere at 2026-04-17T01:00:51.238Z",
    "fix": "Reload (GET /api/brand/read?file=voice-profile.md) and merge — your expectedMtime was 1999-01-01T00:00:00.000Z"
  }
}
```

Activity feed gets a `brand-write` entry: `Wrote brand/voice-profile.md (+N chars)`.

### `POST /api/brand/regenerate`

Queue the owning skill (per `brand/SCHEMA.md`) to re-research a single file. Returns immediately with a `jobId`; /cmo (running in the user's Claude Code session) executes the actual research.

```bash
curl -s -X POST http://localhost:3001/api/brand/regenerate \
  -H 'content-type: application/json' \
  -d '{"file":"voice-profile.md"}'
```

```json
{
  "ok": true,
  "data": {
    "jobId": "206663d6-6aa5-4ba8-a9f5-d20320d15549",
    "skill": "brand-voice",
    "file": "voice-profile.md",
    "note": "Queued via job 206663d6-… — /cmo executes the skill in the user's Claude Code session"
  },
  "meta": {"fetchedAt": "2026-04-17T01:00:52.365Z"}
}
```

Fires `skill-start` (immediately), `activity-new` (skill-run row in the Activity panel), and the standard `job-created` / `job-started` / `job-completed` lifecycle. /cmo is expected to fire `skill-complete` when the research lands.

Returns BAD_INPUT for files with no owning skill (`assets.md`, `learnings.md`, `stack.md`).

---

## Section 6 — Publishing helpers

The Publish tab calls these directly, but /cmo can too.

| Endpoint | Purpose |
|---|---|
| `GET /api/publish/adapters` | List `mktg publish` adapters |
| `GET /api/publish/integrations?adapter=postiz` | List connected Postiz accounts |
| `GET /api/publish/scheduled?startDate=&endDate=` | Read Postiz queue (cached read-through) |
| `GET /api/publish/history` | Read local publish log |
| `POST /api/publish` | Send a publish manifest through `mktg publish` |

---

## Section 7 — Reading dashboard state

Read endpoints /cmo can hit before deciding what to do next.

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Server up + subscriber count |
| `GET /api/schema` | All routes, body shapes, params |
| `GET /api/schema?route=<path>` | Just the entry for one path |
| `GET /api/help` | Agent cheat-sheet (envelopes, error codes, entry points) |
| `GET /api/pulse/decision-feed` | Pulse cards |
| `GET /api/signals?platform=&filter=` | Signal feed |
| `GET /api/audience/profiles` | Persona cards |
| `GET /api/opportunities` | Pending recommendations |
| `GET /api/intelligence/latest` | Most recent briefs |
| `GET /api/research/active` | Running research jobs |
| `GET /api/skills` | All 50 skills + routing metadata |
| `GET /api/catalog/list` | Upstream catalogs (postiz, etc.) |

### `GET /api/schema`

Returns the full registry. Every route you could hit, with its method,
description, declared body shape, `dryRun`/`confirm` flags, and the error
codes it can emit.

POST/PUT/PATCH routes that have a registered Zod schema also include an
`inputSchema` field — JSON Schema 2020-12 — derived from the same Zod
validator the handler uses. This is the source of truth: an agent can feed
it to its tool-call validator and never drift from the wire contract.

```bash
curl -s http://localhost:3001/api/schema | jq '.routes | length'
# → 57
curl -s "http://localhost:3001/api/schema?route=/api/activity" | jq '.routes[0]'
# → {"method":"GET","path":"/api/activity","accepts":["application/x-ndjson"],...}
```

**Live JSON Schema example** — `POST /api/activity/log`:

```bash
curl -s "http://localhost:3001/api/schema?route=/api/activity/log" | jq '.routes[0].inputSchema'
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "kind":         { "type": "string", "minLength": 1, "maxLength": 64 },
    "skill":        { "type": "string", "minLength": 1, "maxLength": 128 },
    "summary":      { "type": "string", "minLength": 1, "maxLength": 500 },
    "detail":       { "type": "string", "maxLength": 8000 },
    "filesChanged": { "type": "array", "items": {"type":"string","maxLength":512}, "maxItems": 50 },
    "meta":         { "type": "object", "propertyNames": {"type":"string"}, "additionalProperties": {} }
  },
  "required": ["kind", "summary"],
  "additionalProperties": false
}
```

Enums surface too — `POST /api/navigate`:

```bash
curl -s "http://localhost:3001/api/schema?route=/api/navigate" | jq '.routes[0].inputSchema.properties.tab'
# → {"type":"string","enum":["pulse","content","publish","brand"]}
```

Unknown paths 404 with the structured error envelope:

```bash
curl -s -w '\nHTTP %{http_code}\n' "http://localhost:3001/api/schema?route=/nope"
# → {"ok":false,"error":{"code":"NOT_FOUND","message":"Route not registered: /nope","fix":"Call GET /api/schema with no query to list every registered path"}}
# HTTP 404
```

### `GET /api/help`

Machine-readable cheat-sheet. Same content an agent would otherwise need
to reason out of prose — envelopes, error-code vocabulary, recognised query
params, the top entry points.

```bash
curl -s http://localhost:3001/api/help | jq '.data.errorCodes'
# → ["BAD_INPUT","NOT_FOUND","UNAUTHORIZED","RATE_LIMITED","UPSTREAM_FAILED","PARSE_ERROR","INTERNAL"]
curl -s http://localhost:3001/api/help | jq '.data.entryPoints[].path'
```

---

## Section 8 — SSE event reference

All events flow through `GET /api/events` with envelope `{type, payload, ts}`.

| Event type | Payload shape | Emitted by |
|---|---|---|
| `connected` | `{channel}` | initial heartbeat |
| `activity-new` | `Activity` row | `POST /api/activity/log`, `POST /api/brand/note` |
| `activity-deleted` | `{id}` | `DELETE /api/activity/:id?confirm=true` |
| `opportunity-new` | Opportunity row | `POST /api/opportunities/push` |
| `navigate` | `{tab, filter}` | `POST /api/navigate` |
| `toast` | `{level, message, duration}` | `POST /api/toast` |
| `highlight` | `{tab, selector, reason}` | `POST /api/highlight` |
| `brand-file-changed` | `{file}` | `POST /api/brand/note`, `POST /api/brand/reset`, foundation runner, file watcher |
| `publish-completed` | `{adapter, published, failed}` | `POST /api/publish` |
| `foundation:progress` | `{agent, status, filesChanged?, note?, error?, durationMs?}` where `status ∈ {queued, running, complete, failed}` | `POST /api/onboarding/foundation`, `POST /api/brand/refresh` |
| `foundation:complete` | `{durationMs, success, agents:[FoundationProgressPayload]}` | foundation runner — fires once after all 3 agents settle |
| `skill-start` | `{skill, file?, jobId?}` | `POST /api/brand/regenerate` — fires immediately when a skill is queued |
| `skill-complete` | `{skill, file?, filesChanged?, jobId?}` | /cmo posts back via `POST /api/activity/log` after the skill writes its output |
| `job-created` / `job-started` / `job-log` / `job-completed` / `job-failed` / `job-cancelled` | job summary | `lib/jobs.ts` |

---

## Section 9 — Idiomatic /cmo flow

A typical /cmo turn that runs a skill and updates the dashboard:

```
1. POST /api/activity/log     {"kind":"skill-run","skill":"landscape-scan","summary":"Starting landscape scan…"}
2. (do the work — write brand/landscape.md, etc.)
3. POST /api/brand/note       {"file":"brand/landscape.md","excerpt":"…first 4-6 lines…"}
4. POST /api/activity/log     {"kind":"skill-run","skill":"landscape-scan","summary":"Done — 18 sources, 5 new claims","filesChanged":["brand/landscape.md"]}
5. POST /api/opportunities/push {"skill":"competitor-alternatives","reason":"You now have a fresh landscape — write 3 'X vs Y' pages","priority":75}
6. POST /api/navigate         {"tab":"content"}
7. POST /api/toast            {"level":"success","message":"Launch creative is ready in Content"}
```

Each call is fire-and-forget. The dashboard sees them in real time.

---

## Section 10 — Input hardening (the agent is not a trusted operator)

Every endpoint runs inputs through `lib/validators.ts`:

- **`rejectControlChars`** — rejects `\x00-\x08`, `\x0B`, `\x0C`, `\x0E-\x1F`, `\x7F`, `\x80-\x9F` in any user-provided string field
- **`validateResourceId`** — skill / adapter / catalog names must match `[a-z0-9][a-z0-9._-]*`, ≤128 chars
- **`sandboxPath`** — `file` fields under `/api/brand/note` resolve relative to project root and reject traversal + symlinks
- **`detectDoubleEncoding`** — paths/IDs reject double-percent-encoded payloads
- **`parseJsonInput`** — JSON bodies capped at 64 KB, prototype-pollution keys (`__proto__`, `constructor`) rejected
- **`?dryRun=true`** — supported on every mutating endpoint; returns `{ok:true, dryRun:true}` without writing

If you hit `400 Bad Request`, the body explains exactly which field tripped which rule.
