# Developer handbook: Studio

Two processes, one dashboard, one SQLite file. Read this once and you should
be able to add a route, add a tab, or debug a /cmo integration without asking.

Studio lives under `studio/` inside the `marketing-cli` repo as a bun
workspace member. Run all commands from a checkout of `marketing-cli`.

## Prerequisites

| Tool | Version | Why |
|------|---------|-----|
| Bun  | ≥ 1.3   | Runtime for both the server and the tests; also drives Next.js dev |
| Node | ≥ 20    | Fallback typing (`@types/node`) |
| marketing-cli | ≥ 0.3.0 | The CLI Studio shells out to. End users get it via `npm i -g marketing-cli`; locally use the workspace checkout. |
| Claude Code | any | `/cmo` runs inside Claude Code; Studio is its dashboard |

## First run

```bash
# from the marketing-cli repo root
bun install                              # wires the workspace
cp studio/.env.example studio/.env.local # fill POSTIZ_API_KEY etc. if you have them
bun --cwd studio run start:studio        # API + dashboard, single launcher
# or:
bun --cwd studio run start:studio:open   # also opens the dashboard
```

You'll see a banner with all the URLs. Ctrl+C stops both processes cleanly.

To run the studio against an external project instead of the repo-local
`brand/` + `marketing.db`, set:

```bash
MKTG_PROJECT_ROOT=/path/to/target-project bun run start:studio
```

`MKTG_PROJECT_ROOT` becomes the default root for both the brand directory
and the SQLite file. Narrower overrides still win:

- `MKTG_BRAND_DIR`
- `MKTG_STUDIO_DB`

## Demo mode

Want the dashboard populated for screenshots, demos, or UX exploration
without waiting for real `/cmo` activity? Seed the SQLite file with
realistic fixtures:

```bash
bun run seed:demo                # insert 44 rows
bun run seed:demo -- --reset     # clear prior demo rows first, then insert
```

The script lives at `scripts/seed-demo.ts`. It populates the studio with:

| Table           | Rows | Notes                                          |
|-----------------|------|------------------------------------------------|
| `signals`       | 20   | TikTok, Instagram, news — half are spikes      |
| `opportunities` | 5    | Ranked next-actions surfaced in Pulse          |
| `activity`      | 10   | Skill runs + brand writes + publishes          |
| `briefs`        | 3    | Intelligence briefs for the Pulse tab          |
| `publish_log`   | 6    | Historical publishes across multiple platforms |

Every inserted row is tagged with a `demo:` sentinel prefix on its
summary / reason / content_preview field, so `--reset` only clears
seeded rows — real `/cmo` data is never touched. Safe to run repeatedly.

**Imagined brand:** _Parallel_ — a SaaS that lets marketing teams run
agent workflows across their stack. Mid-market, bootstrapped, indie-tech
voice. The fixtures read like a real product would, not lorem ipsum.

**From the dashboard:** the command palette (`Cmd+K`) has a **"Seed demo
data"** entry that opens a copy-to-clipboard dialog with the runnable
command — same one-liner as above, but no terminal switch required.
`components/demo/demo-seed-button.tsx` surfaces the same action inline
on the empty-state screens of each tab.

> Seeding writes to `marketing.db` — that's the same SQLite file the live
> server reads. Don't leave demo rows in a production-like environment;
> run `bun run seed:demo -- --reset` to clean up before handing the
> project off.

## The two-process model

```
┌─────────────────────┐     ┌─────────────────────┐
│  Next.js dashboard  │───▶│  Bun API server      │
│  :3000 (DASHBOARD_  │◀SSE│  :3001 (STUDIO_PORT) │
│   PORT)             │     │  SQLite + brand/*    │
└─────────────────────┘     └─────────────────────┘
                                    ▲
                                    │ HTTP
                            ┌───────┴───────┐
                            │ /cmo (Claude   │
                            │ Code session)  │
                            └────────────────┘
```

- **`server.ts`** — the API surface. JSON only, 21/21 on Agent DX
  (validated by `tests/agent-dx.test.ts`). Bun.serve, SQLite, SSE,
  brand/ watcher.
- **Next.js dashboard** — Next.js 16 + Tailwind v4 + Zustand stores. Reads
  from the API via SWR, subscribes to SSE via `sse-bridge.tsx`.
- **SQLite** (`marketing.db`) — activity feed, opportunities, signals, publish
  log, postiz cache, metric baselines. Migrations in `db/migrations/*.sql`.

## Where things live

```
bin/mktg-studio.ts         Single-command launcher (see docs/SHIPPING.md)
server.ts                  Bun.serve API — ROUTE_SCHEMA lists every route
lib/
  dx.ts                    wrapRoute(), error codes, rate limiter, field mask
  output.ts                errEnv(), applyFieldsFromUrl(), ndjsonResponse()
  validators.ts            rejectControlChars, sandboxPath, parseJsonInput, ...
  sqlite.ts                getDb(), queryAll, queryOne, execute
  sse.ts                   globalEmitter + per-job emitters + useSSE hook
  jobs.ts                  in-memory job queue (skill runs, mktg init, ...)
  mktg.ts                  typed wrapper around `mktg <cmd> --json`
  postiz.ts                raw fetch client for the postiz REST API (AGPL firewall)
  watcher.ts               Bun.watch on brand/ → SSE events
components/
  workspace/               tabs: pulse, signals, publish, brand
  activity-panel/          the right-hand feed (powered by SSE)
  command-palette/         ⌘K palette (drives skills + navigation)
  settings/                API-key onboarding + doctor health
  providers/               sse-bridge, swr-provider, motion-provider
app/
  page.tsx                 /  → redirects to /onboarding or /dashboard
  onboarding/              first-run wizard
  (dashboard)/             the real dashboard (layout, tabs, sidebar)
db/
  schema.sql               first-boot DDL
  migrations/*.sql         idempotent migrations (tracked in schema_version)
tests/
  unit/                    validators, severity, sqlite, ndjson
  server/                  health + schema smoke tests
  integration/             full server spawn + round-trip (dryrun, fields, SSE, etc.)
  dx/probes.test.ts        reusable Agent DX probe functions
  agent-dx.test.ts         the 21/21 compliance suite
docs/
  cmo-api.md               /cmo → studio HTTP contract
  DEVELOPER.md             this file
  SHIPPING.md              how the bin works + ops notes
  (audit artifacts archived in 0.2.1; see git history at tag v0.2.0)
brand/                     marketing memory (10 files — see mktg/brand/SCHEMA.md)
```

## Adding a new API route

1. Add the handler inside the `fetch(req)` block in `server.ts` — pattern-match
   on `method` + `url.pathname`.
2. Wrap user-supplied strings in validators from `lib/validators.ts`.
3. For mutations, honor `isDryRun(url)` — return `{ok: true, dryRun: true}`
   before any write.
4. For list responses, prefer `respondList(req, url, items, corsHeaders)` —
   it handles `?fields=` + NDJSON + the JSON envelope.
5. Add an entry to `ROUTE_SCHEMA` with `method`, `path`, `description`, and any
   of `body`, `params`, `accepts`, `dryRun`, `errors[]`.
6. Document the route in `docs/cmo-api.md` with a curl example + error codes.
7. Add a probe to `tests/agent-dx.test.ts` if the route exercises a new axis.

## Adding a new dashboard tab

1. Create `components/workspace/<tab>/` with an index component that uses SWR
   for reads and `useSSEBridge` for live updates.
2. Export it from the tab registry so the workspace switcher knows about it.
3. Add a case to `components/workspace/brand-workspace.tsx` in both the
   desktop and mobile switch blocks.
4. Add an icon + label to `components/workspace/workspace-tabs.tsx` and
   `mobile-tab-dock.tsx`.
5. Add any new server routes per the section above — point your SWR hooks
   at them.

## Testing

```bash
bun test                    # unit + server + integration + DX audit (≈5s)
bun test tests/unit         # fast, no server boot
bun test tests/integration  # spawns the server per file
bun x tsc --noEmit          # type safety
```

Each test file that needs the server uses `tests/integration/helpers.ts` or
its own `beforeAll(spawn(...))`, with the scratch port hard-coded per file so
they can run in parallel without clashing.

## How `/cmo` drives the studio

The studio is a dashboard for `/cmo`, not a chatbot UI. `/cmo` runs inside
Claude Code and writes to the studio via HTTP. Read
[`docs/cmo-api.md`](./cmo-api.md) for the full contract — the short version:

- `POST /api/activity/log` → append to the feed
- `POST /api/opportunities/push` → queue a recommended action
- `POST /api/navigate` → switch tabs
- `POST /api/toast` / `POST /api/highlight` → UX hints
- `POST /api/brand/note` → tell the studio that a brand/ file was updated

The studio listens on `GET /api/events` (SSE) and re-renders as events flow in.

## How `/api/schema` self-describes the surface

Any agent — `/cmo` or a future one — can call `GET /api/schema` to discover
every route with its method, description, body shape, dryRun flag, and
possible error codes. Single-entry lookup: `GET /api/schema?route=/api/activity`.
Machine-readable cheat-sheet: `GET /api/help`.

## Troubleshooting

- **Launcher says port X is in use** — kill the process with
  `lsof -ti:X | xargs kill -9`, or set `STUDIO_PORT` / `DASHBOARD_PORT` in
  `.env.local`.
- **`mktg: command not found`** — `npm i -g marketing-cli`. Studio shells out to it for `mktg list`, `mktg publish`, etc.
- **Postiz endpoints return 401** — set `POSTIZ_API_KEY` and `POSTIZ_API_BASE`
  in `.env.local`; verify with `mktg doctor`.
- **Dashboard 500s on a page** — check the `[next]` output in the CLI banner;
  hot reload picks up file changes but module-not-found errors require a
  restart (Ctrl+C, then `bun run start:studio`).
- **SQLite errors on boot** — delete `marketing.db*` and let migrations
  rebuild. Your activity feed and signals are ephemeral; brand/ files are
  the real source of truth.
