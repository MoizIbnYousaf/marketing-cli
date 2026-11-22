# 5-minute demo: Studio driven by /cmo

**The pitch.** You open Claude Code in a project. You type "check my brand
health." Claude Code shells out to `curl http://localhost:3001/api/...`,
and the dashboard at `localhost:3000` lights up -- activity panel scrolls,
opportunities populate, the active tab switches -- without you ever
clicking anything.

This file is the reproducible script. Run it cold and you should be
looking at a populated dashboard in five minutes.

## Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Bun  | ≥ 1.3   | Runtime for the API server + the launcher |
| Claude Code | any | Where `/cmo` actually runs |
| marketing-cli | ≥ 0.3.0 | `npm i -g marketing-cli`. Bundles Studio and registers `mktg studio`. |

No Anthropic SDK to install. No MCP config to register. Claude Code
already has `Bash`; that's the only contract.

## Step 1 -- Install marketing-cli

```bash
npm i -g marketing-cli           # ships the CLI + bundled Studio
mktg init                        # seed brand/ files in your project
```

Studio lives under `studio/` inside the published `marketing-cli` package;
no separate install. Working from a checkout of the repo? `bun install` at
the root wires the workspace, then `bun --cwd studio run start:studio`.

## Step 2 -- Boot Studio

```bash
mktg studio
```

You should see a banner:

```
  mktg-studio · ready

    → dashboard  http://localhost:3000
    → api        http://localhost:3001
    → schema     http://localhost:3001/api/schema
    → help       http://localhost:3001/api/help

  Ctrl+C to stop.
```

→ screenshot: `docs/screenshots/dashboard-pulse.png`

Sanity check from a second terminal:

```bash
curl -fsS http://localhost:3001/api/health | jq
# → { ok: true, version: "<marketing-cli version>", ts: "...", subscribers: 0 }
```

## Step 3 -- Seed demo data (optional, makes the dashboard non-empty)

```bash
bun run seed:demo
```

→ inserts 20 signals + 5 opportunities + 10 activity entries + 3 briefs +
6 publish-log rows tagged with a `demo:` sentinel so they're easy to
clear later.

## Step 4 -- Drive it from Claude Code

Open Claude Code in a fresh terminal (any project -- doesn't have to be
this repo). Type any of these prompts and watch the browser at
`localhost:3000`:

Every route except `/api/health`, `/api/schema`, `/api/help` and
`/api/auth/bootstrap` needs the Studio bearer token, or it answers
`401 UNAUTHORIZED`. The examples below send it as `$AUTH`:

```bash
AUTH="Authorization: Bearer $(cat ~/.mktg/.runtime/studio-token)"
```

### "What endpoints does the studio expose?"

`/cmo` runs `curl -fsS http://localhost:3001/api/schema | jq` →
returns the full route registry. Try it with the route filter:
`curl -fsS "http://localhost:3001/api/schema?route=/api/activity/log" | jq`
→ one entry with method, params, accepts, dryRun flag.

### "Log that I just ran landscape-scan -- 45 seconds, wrote brand/landscape.md"

`/cmo` runs:

```bash
curl -fsS -X POST http://localhost:3001/api/activity/log \
  -H "$AUTH" -H 'content-type: application/json' \
  -d '{"kind":"skill-run","skill":"landscape-scan","summary":"45s, 5 new claims","filesChanged":["brand/landscape.md"]}'
```

→ Activity panel on the right side scrolls to show the new entry **within
500ms** (SSE).

→ screenshot: `docs/screenshots/activity-panel-stream.png`

### "Switch the dashboard to Pulse"

```bash
curl -fsS -X POST http://localhost:3001/api/navigate \
  -H "$AUTH" -H 'content-type: application/json' \
  -d '{"tab":"pulse"}'
```

→ Browser tab switches; URL becomes `/dashboard`.

### "Recommend keyword-research as the next thing -- explain why"

```bash
curl -fsS -X POST http://localhost:3001/api/opportunities/push \
  -H "$AUTH" -H 'content-type: application/json' \
  -d '{"skill":"keyword-research","reason":"You have a landscape but no keyword-plan yet -- that gates seo-content","priority":80}'
```

→ Pulse gets a new next-action card with the reason + priority. Open Pulse
with `g p` or the command palette.

### "Update brand/voice-profile.md -- make it more casual"

`/cmo` reads the current file + mtime, edits in-memory, then atomically
writes:

```bash
RES=$(curl -fsS -H "$AUTH" http://localhost:3001/api/brand/read?file=voice-profile.md)
MTIME=$(echo "$RES" | jq -r .data.mtime)
CONTENT=$(jq -Rs . < new-voice.md)

curl -fsS -X POST http://localhost:3001/api/brand/write \
  -H "$AUTH" -H 'content-type: application/json' \
  -d "{\"file\":\"voice-profile.md\",\"content\":$CONTENT,\"expectedMtime\":\"$MTIME\"}"
```

→ The atomic write fires `brand-file-changed` + `activity-new` SSE
events; dependent surfaces (Pulse, Signals/Trend radar, Brand) re-fetch.

→ screenshot: `docs/screenshots/brand-voice-profile-editing.png`

→ Optimistic-lock test: while /cmo's write is in flight, edit the same
file in a text editor. /cmo's POST returns `409 CONFLICT` with a `fix`
hint pointing at `/api/brand/read` to re-fetch + merge.

## Deeper walkthroughs

Each canonical flow (brand refresh, publish, /cmo soak, signals) has a
reproducible script under `tests/e2e/real-pipeline/`. Run them locally:
`bun test tests/e2e/real-pipeline`.

## What this proves

- **The plumbing is real**: a single user prompt routes through Claude
  Code → Bash → curl → HTTP → SQLite/SSE → React → the user's eyeballs.
- **No special protocol**: every action is the same `curl` you'd type by
  hand. Claude Code doesn't need an SDK or a tool registry.
- **Optimistic locking** keeps `/cmo` from clobbering user edits during a
  brand-file write.
- **Graceful degradation**: if the studio is down, `curl` exits non-zero
  and `/cmo` falls back to CLI-only behaviour. Nothing throws or hangs.

## Verifying without Claude Code

The whole loop is curl. You can drive it from any terminal:

```bash
# the full loop, one curl per step
STUDIO=http://localhost:3001
AUTH="Authorization: Bearer $(cat ~/.mktg/.runtime/studio-token)"
curl -fsS   $STUDIO/api/health | jq
curl -fsS   "$STUDIO/api/schema?route=/api/activity/log" | jq
curl -fsS -X POST $STUDIO/api/activity/log \
       -H "$AUTH" -H 'content-type: application/json' \
       -d '{"kind":"skill-run","skill":"landscape-scan","summary":"hi"}' | jq
curl -fsS -X POST $STUDIO/api/navigate \
       -H "$AUTH" -H 'content-type: application/json' \
       -d '{"tab":"pulse"}' | jq
curl -fsS -X POST $STUDIO/api/opportunities/push \
       -H "$AUTH" -H 'content-type: application/json' \
       -d '{"skill":"keyword-research","reason":"no plan yet","priority":80}' | jq
```

The dashboard reacts to every POST identically -- the SSE channel doesn't
care whether the caller was an agent or a human.

## What's still rough

Headlines from the maintainer's known-gap list:

- The studio doesn't yet expose UI-only state (palette open, scroll
  position, focused element) -- `GET /api/ui/state` is not implemented,
  deferred until production users ask.
- `mktg publish` through Studio requires `marketing-cli ≥ 0.3.0` (postiz
  adapter, stdin-JSON manifest, and the bundled Studio launcher). If your
  global is older, `npm i -g marketing-cli@latest` before Step 4. Verify
  with `mktg --version`.

## Reset

```bash
bun run seed:demo -- --reset    # clear demo rows; real /cmo data is untouched
```

Or stop the launcher with Ctrl+C and delete `marketing.db*` for a
fully-clean slate.
