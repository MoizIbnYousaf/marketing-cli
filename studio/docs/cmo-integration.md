# /cmo ↔ Studio Integration Guide

> Read by /cmo (the skill) at runtime to learn how to drive a running studio.
> The full HTTP contract lives in [cmo-api.md](./cmo-api.md). This file is
> the ergonomic setup guide — when to call what, in what order.

---

## 1. Detect the studio

Before doing anything fancy, check whether the studio is running on this machine:

```bash
STUDIO=${STUDIO_BASE:-http://localhost:${STUDIO_PORT:-3001}}
curl -fsS -m 2 "$STUDIO/api/health" > /dev/null && echo "studio_up" || echo "studio_down"
```

`/api/health` returns `{ok:true, version, ts, subscribers}` with a 200 when the studio is alive. If it isn't, /cmo just behaves as it would in a CLI-only setup — no harm done.

If `STUDIO_BASE` is available, prefer it. Otherwise derive the API base from `STUDIO_PORT` or the default `3001`.

Cache the result for the rest of the turn — don't hammer the health endpoint.

If the user explicitly wants the visual dashboard and Studio is not
running, /cmo should launch it through the CLI rather than relying on a hidden
hook:

```bash
mktg studio --open --intent cmo --session <id>
```

Use the preview path for agent-safe discovery and tests:

```bash
mktg studio --dry-run --json --intent cmo --session <id>
```

That command opens `http://localhost:3000/dashboard?mode=cmo&session=<id>`.
`mktg studio` resolves to the bundled launcher under
`studio/bin/mktg-studio.ts` inside the installed `marketing-cli` package.

---

## 2. The five verbs /cmo uses

Every /cmo turn that the user should see in the dashboard maps to **at most five** HTTP calls:

| Verb | Endpoint | Use when |
|---|---|---|
| **Log** | `POST /api/activity/log` | After running a skill, writing a brand file, sending a publish, etc. — one entry per discrete action |
| **Note** | `POST /api/brand/note` | When you've written or modified a `brand/*.md` file. Also fires `brand-file-changed` so dependent tabs refresh. |
| **Push** | `POST /api/opportunities/push` | When analysis surfaces a recommended next action |
| **Toast** | `POST /api/toast` | For inline confirmations the user should see immediately ("Posted 3 threads to LinkedIn") |
| **Navigate** | `POST /api/navigate` | When the result of your work lives on a specific tab and the user should look there. Valid tabs: `pulse`, `content`, `publish`, `brand`. Use `{"tab":"content"}` for generated assets and draft campaigns. |

A typical turn is `log → ... → note → log → push → toast → navigate`. Each call is fire-and-forget, takes <50ms, and the dashboard reacts in real time via SSE.

---

## 3. Re-usable bash snippets

Drop these in shell helpers or curl them inline. All assume `STUDIO=${STUDIO_BASE:-http://localhost:3001}`.

### Log a skill run

```bash
curl -fsS -X POST $STUDIO/api/activity/log \
  -H 'content-type: application/json' \
  -d '{"kind":"skill-run","skill":"landscape-scan","summary":"Refreshed landscape, 5 new claims"}'
```

### Note a brand file write

```bash
# jq -Rs . safely JSON-encodes the excerpt, including newlines and quotes.
# `sed 's/"/\\"/g'` is NOT enough — it leaves literal newlines in the string
# which makes the JSON body invalid and the server returns 400.
EXCERPT=$(head -c 800 brand/voice-profile.md | jq -Rs .)
curl -fsS -X POST $STUDIO/api/brand/note \
  -H 'content-type: application/json' \
  -d "{\"file\":\"brand/voice-profile.md\",\"excerpt\":$EXCERPT}"
```

### Push an opportunity

```bash
curl -fsS -X POST $STUDIO/api/opportunities/push \
  -H 'content-type: application/json' \
  -d '{"skill":"seo-content","reason":"You have a keyword plan but no published articles","priority":80}'
```

### Toast

```bash
curl -fsS -X POST $STUDIO/api/toast \
  -H 'content-type: application/json' \
  -d '{"level":"success","message":"New launch creative is ready in Content"}'
```

### Navigate

```bash
curl -fsS -X POST $STUDIO/api/navigate \
  -H 'content-type: application/json' \
  -d '{"tab":"content"}'
```

### Discover the API

```bash
# Full route list
curl -fsS $STUDIO/api/schema | jq '.routes[].path'

# One route's details
curl -fsS "$STUDIO/api/schema?route=/api/activity/log" | jq

# Cheat-sheet
curl -fsS $STUDIO/api/help | jq '.data.entryPoints'
```

---

## 4. Worked example — "Refresh the competitive landscape"

User says: *Refresh the competitive landscape.*

```bash
STUDIO=${STUDIO_BASE:-http://localhost:3001}

# 1. Tell the dashboard you've started
curl -fsS -X POST $STUDIO/api/activity/log -H 'content-type: application/json' -d '{
  "kind": "skill-run",
  "skill": "competitive-intel",
  "summary": "Refreshing competitive landscape"
}'

# 2. Do the actual work — read brand/positioning.md, run web research,
#    write brand/competitors.md
# (ordinary /cmo skill execution here — not an HTTP call)

# 3. Note the brand-file write so dependent tabs refresh
EXCERPT=$(head -c 800 brand/competitors.md | jq -Rs .)
curl -fsS -X POST $STUDIO/api/brand/note -H 'content-type: application/json' \
  -d "{\"file\":\"brand/competitors.md\",\"excerpt\":$EXCERPT}"

# 4. Mark the skill complete with details
curl -fsS -X POST $STUDIO/api/activity/log -H 'content-type: application/json' -d '{
  "kind": "skill-run",
  "skill": "competitive-intel",
  "summary": "Done — found 3 new competitors, 2 positioning gaps",
  "filesChanged": ["brand/competitors.md"],
  "meta": {"newCompetitors": 3, "gaps": 2}
}'

# 5. If gaps surfaced, push an opportunity
curl -fsS -X POST $STUDIO/api/opportunities/push -H 'content-type: application/json' -d '{
  "skill": "competitor-alternatives",
  "reason": "2 positioning gaps — write 'X vs Y' SEO pages",
  "priority": 75
}'

# 6. Toast + navigate so the user sees the result
curl -fsS -X POST $STUDIO/api/toast -H 'content-type: application/json' -d '{
  "level": "success",
  "message": "Launch creative is ready in Content"
}'

curl -fsS -X POST $STUDIO/api/navigate -H 'content-type: application/json' -d '{
  "tab": "content"
}'
```

The Activity panel renders each `activity-new` event in real time. Content reflects generated assets and drafts, Pulse gets the new action, and Brand keeps the source-of-truth files.

---

## 5. Onboarding — the foundation flow

When a fresh user goes through onboarding, the studio kicks off the foundation research via `POST /api/onboarding/foundation`. /cmo does NOT need to call this directly — the dashboard does it.

What /cmo SHOULD do once it's invoked after onboarding:

1. The studio's foundation runner can populate `brand/voice-profile.md`, `brand/audience.md`, `brand/competitors.md` from templates (or scrape via `mktg init --from <url>`). These are placeholder content.
2. /cmo's first job is to read those files and produce real research — overwriting the templates with brand-specific content.
3. Per file written, fire `POST /api/brand/note` so the dashboard activity feed shows the work landing.
4. After all 3 are populated, fire `POST /api/toast {"level":"success","message":"Foundation research complete"}` and `POST /api/navigate {"tab":"pulse"}`.

The dashboard surfaces three lanes during onboarding (`mktg-brand-researcher`, `mktg-audience-researcher`, `mktg-competitive-scanner`). Each lane corresponds to one file — when /cmo writes the file, the dashboard knows from the file watcher + `brand/note`.

---

## 6. Listening to the dashboard from /cmo

Less common but useful: /cmo can subscribe to `GET /api/events` (SSE) to know what the user is doing. For example:

```bash
curl -fsS -N $STUDIO/api/events | while read -r line; do
  case "$line" in
    *publish-completed*) echo "user published — maybe queue a follow-up";;
    *navigate*) echo "user changed tabs";;
  esac
done
```

This is overkill for most turns; only set it up if you're building an autonomous loop.

---

## 7. Limitations and footguns

**The studio cannot spawn /cmo.** The Bun server runs in its own process and has no way to invoke a Claude Code session. The onboarding `/api/onboarding/foundation` endpoint can only seed templates or run `mktg init --from <url>` for a quick scrape — real per-skill agent work needs /cmo running in the user's terminal. This is by design (no AGPL-style coupling, no API key sprawl).

**Rate limits.** Every mutating endpoint is rate-limited to 60 requests/minute per IP. /cmo's typical turn is 4–6 calls — well under the limit. Bursts above that get a `429` with `Retry-After`.

**Error envelope.** Every error is `{ok:false, error:{code, message, fix?}}`. The `fix` field is agent-actionable — read it and follow it. Don't retry blindly on `BAD_INPUT`; fix the field named in `fix` first.

**Idempotency.** Most endpoints are idempotent by intent (logging the same activity twice creates two rows; that's fine for a feed). Use `?dryRun=true` on any mutating POST to preview the response shape without writing.

**Dry-run for development.** Every mutating POST honors `?dryRun=true` and returns `{ok:true, dryRun:true}` without side effects. Use it to validate request shape before going live.

---

## 8. When the studio isn't running

If `/api/health` doesn't respond, /cmo falls back to its CLI-only behavior — write brand files, run skills, do the work. The user sees output in the terminal. When they next open the studio, the file watcher picks up the writes and surfaces them.

This is the correct behavior — /cmo never blocks on the studio.
