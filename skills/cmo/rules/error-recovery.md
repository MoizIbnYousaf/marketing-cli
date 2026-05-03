# Error Recovery & Degraded-Mode Playbook

/cmo fails gracefully. Every error has a named recovery path. Never silently retry, never shrug and route elsewhere, never ship partial state. When something breaks, tell the user exactly what happened, show the fix, and offer the next move.

---

## Recovery matrix

| Failure | Detection | /cmo response |
|---|---|---|
| **Brand file missing** | `mktg status --json` returns `brand.missing: ["voice-profile.md"]` | Warn. Offer to run the foundation skill that writes that file. Don't auto-run — ask: *"voice-profile.md is missing. I can run /brand-voice now — 5 minutes. OK?"* |
| **Brand file template (unpopulated)** | `mktg context --json` shows `status: "template"` on a file | Same as missing. Template ≠ populated. Offer to populate via the appropriate skill. |
| **Brand file stale** | `mktg brand freshness --json` shows `status: "stale"` (>30 days for profiles, >90 for config, >14 for landscape) | Warn before running downstream skills. *"voice-profile.md is 42 days old. I can refresh it (5 min) before writing copy, or proceed with the current version — which?"* |
| **Integration unconfigured** (e.g., `POSTIZ_API_KEY` unset) | `mktg catalog info postiz --json --fields configured,missing_envs` returns `configured: false` | Surface the `missing_envs[0]` value in a `fix` field: *"Postiz isn't configured. Set `POSTIZ_API_KEY` — see `mktg catalog info postiz`. Until then, I can fall back to Typefully for X/LinkedIn/Threads/Bluesky/Mastodon; Reddit/IG/TikTok stay write-only."* Don't block — degrade with honesty. |
| **Skill prerequisite missing** | `mktg skill check <name> --json` returns `satisfied: false` with `missing.skills` or `missing.brandFiles` | Name the missing prereq + propose the fix: *"Can't run `/seo-content` yet — it needs brand/keyword-plan.md. I'll run /keyword-research first (3 min), then come back."* |
| **Rate limit hit** (e.g., postiz 30/hour, Typefully quota) | Adapter returns HTTP 429 with `Retry-After` header; adapter surfaces `RATE_LIMIT` detail | Checkpoint the batch. Communicate: *"Postiz rate limit hit — 12 of 20 posts shipped. Remaining 8 paused. Resume after ~1200s, or save for tomorrow?"* Persist state in `.mktg/publish/<campaign>-postiz.json` (the sent-marker file) so resume is lossless. |
| **Sent-marker exists (idempotency)** | Adapter returns `status: "skipped", detail: "dedupe: sent-marker match"` | Inform the user the post is already scheduled. Show the prior draft ID. *"This post already shipped on 2026-04-12 (draft abc123). Want to force re-send? You'll need to clear `.mktg/publish/<campaign>-postiz.json` or change the campaign name."* |
| **Claims Blacklist violation** | `mktg brand claims --json` returns a blacklisted claim that appears in proposed output | Refuse. Surface the blacklist entry + offer an alternative: *"'fastest' is on your Claims Blacklist (landscape.md flagged 3 competitors with quantified speed benchmarks). Want to drop the claim or rephrase as '~40% faster than X under [specific conditions]'?"* |
| **Content-reviewer gate FAIL** | `mktg-content-reviewer` agent returns low score + drift report | Loop back to the content skill with the specific rewrite recommendations. Don't ship drifted content. |
| **SEO-analyst gate FAIL** | `mktg-seo-analyst` agent returns low keyword coverage | Loop back. Don't ship an SEO article that misses its target keywords. |
| **Skill runs but errors mid-way** | `mktg run <skill>` returns non-zero exit + structured error | Surface exit code + error message + suggestions from the result envelope. Don't silently retry — ask: *"`/seo-content` failed: [error]. Suggestions: [list]. Want me to retry, fix the upstream input, or bail?"* |
| **Network / unreachable upstream** | Fetch timeout, DNS failure, connection refused | Distinguish transient vs permanent. On first failure, retry once with backoff. On second failure, stop and report. |
| **Tool missing** (e.g., no `ffmpeg` installed) | `mktg doctor --json` check fails | Surface the install command from CLAUDE.md Ecosystem table. Offer to run the install ONLY if the user approves (never auto-install system tools). |
| **Multiple skills competing** (ambiguous routing) | `/cmo` can't disambiguate with the decision tree | Ask ONE clarifying question, not five. *"This could go to /seo-content (ranks) or /direct-response-copy (converts). Which goal?"* |
| **Circular dependency in plan** | `mktg skill graph --json` shows a cycle | Flag as a manifest bug; don't attempt to run. Fall back to the most independent skill in the cluster. |
| **Corrupt state file** (sent-marker, cache, .mktg/plan.json) | JSON parse error on read | Back up the corrupt file to `*.bak`, start fresh, warn the user. Adapter precedent: `SENT_MARKER_CORRUPT` detail. |
| **Studio offline** | `GET $STUDIO/api/health` not reachable OR returns non-200 | Revert to standalone mode immediately. Do NOT POST `/api/activity/log`, `/api/navigate`, `/api/toast`, or `/api/brand/refresh` — they would fail silently and waste work. Log once to stderr: `studio offline — operating in standalone mode`. Continue the skill run to completion. If the studio comes back mid-session, do NOT backfill — the studio is a reflector, not a durable sink. Next refresh of the dashboard re-reads SQLite + `brand/` and picks up state. |
| **SSE subscribers dropped** | After the studio publishes an event, the dashboard pane doesn't update (visible via websocket close frames or stale UI during a live skill run) | This is a studio-side bug. /cmo detects by hashing the last 3 activity POSTs and checking if the studio's rendered activity log lags. If lag detected, /cmo back-offs activity posting for 60 seconds and logs once: `studio SSE drop suspected — pausing activity fan-out`. After 60s, resume; the studio's reconnect logic should have re-subscribed. Do NOT queue activities during the backoff — they'd be stale by the time they arrive. |
| **Postiz rate limit — 30 POST/hour cap** | Postiz returns HTTP 429 with `Retry-After` header on `POST /public/v1/posts`. `mktg catalog status --json` shows `postiz.rate.remaining === 0` | Surface to user immediately with exact numbers: *"Postiz rate-limited — 30/30 posts used this hour, resets at HH:MM. I have 8 posts waiting."* Offer three fallbacks in order: (1) If Typefully is configured AND the remaining posts target X/LinkedIn/Threads/Bluesky/Mastodon, route those to `typefully` and surface which platforms stay queued; (2) If neither is available for the remaining platforms (Reddit/IG/TikTok/etc.), switch to the `file` adapter — write drafts to `.mktg/publish/<campaign>/` and tell the user *"Saved 8 drafts locally. Run `mktg publish --adapter postiz --resume` after HH:MM to ship."*; (3) Last resort: pause the batch, persist the remaining manifest, surface the resume command. NEVER silently wait the hour — the user should know work is blocked. |
| **Postiz instance unreachable** (not rate-limit; network or instance down) | Fetch to `${POSTIZ_API_BASE}` times out or returns 5xx | Degrade with honesty per the standard postiz fallback: route covered platforms to Typefully, file-only the rest. Tell the user the postiz base URL that failed so they can check their self-host or confirm `api.postiz.com` status. Don't retry until the user resumes. |

---

## Degraded-mode invariants

**Never silently retry.** Retries hide real failures and waste quota. One retry with backoff on transient errors; surface everything else.

**Never ship partial state without telling the user.** If a campaign of 20 posts had 12 succeed and 8 fail, say so. Don't claim success.

**Never route around a failure without acknowledging it.** If `postiz` is down and you fall back to Typefully, tell the user: *"Postiz unreachable — routing to Typefully for the platforms it covers. Reddit/IG/TikTok are file-only until postiz is back."*

**Never auto-populate a brand file.** If `voice-profile.md` is missing, `/cmo` offers to run `/brand-voice` — it doesn't run unasked. The user controls what lands in `brand/`.

**Never violate Claims Blacklist, even under pressure.** If the user insists on a blacklisted claim, refuse and explain why. The Blacklist exists because the user already flagged those claims as unfounded; bypassing them means shipping lies.

---

## When to stop vs when to continue

Stop and ask:
- Destructive operations (any `--confirm` path).
- Claims Blacklist violations.
- Partial campaign failures.
- Multiple valid routing options.
- Cross-project context unclear.

Continue and inform:
- Transient network errors (retry once, then stop).
- Degraded fallbacks (postiz→typefully, API→browser).
- Stale data warnings (user can accept the staleness).
- Missing but non-blocking brand files (offer to populate, let user defer).

---

## Error shape the user sees

When /cmo surfaces an error, include:

1. **What happened** — one sentence, specific.
2. **Why** — the technical cause if useful.
3. **Fix** — literal command or action the user takes.
4. **Next** — what /cmo will do if the user resolves it.

Example (good):
> *"Postiz refused the LinkedIn draft — `UNCONNECTED_PROVIDER: linkedin`. Your instance has only `linkedin-page` connected. Either connect a personal LinkedIn in postiz UI, or I can switch the post to `linkedin-page`. Which?"*

Example (bad):
> *"Error publishing. Please try again."*

The good version names the provider, the exact missing identifier, the fix, and the alternative path. The bad version forces the user to guess.

---

## Logging failures to `brand/learnings.md`

Every non-transient failure worth remembering goes into the learnings file:

```bash
mktg brand append-learning --input '{
  "date": "2026-04-15",
  "action": "Tried to post to Pinterest via postiz",
  "result": "Failed — UNCONNECTED_PROVIDER",
  "learning": "This instance has no Pinterest integration connected",
  "nextStep": "Connect Pinterest in postiz UI or route file-only"
}'
```

Future sessions read this; /cmo avoids re-running the same failed path. See `rules/learning-loop.md` for the full compounding protocol.
