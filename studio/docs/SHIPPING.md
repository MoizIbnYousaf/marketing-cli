# Shipping: how the Studio launcher runs

Studio ships inside `marketing-cli` as a workspace member under `studio/`.
The launcher is the single command that starts the Bun API server and the
Next.js dashboard, streams their output with prefixes, waits for both to
respond, prints a banner, and takes them both down cleanly on Ctrl+C.

End users reach it through `mktg studio`, which the CLI registers as a
top-level subcommand from `marketing-cli@0.3.0`. The subcommand resolves
to `studio/bin/mktg-studio.ts`.

## The binary

Source: `studio/bin/mktg-studio.ts`. Registered inside the workspace
`package.json`:

```json
"bin": { "mktg-studio": "./bin/mktg-studio.ts" }
```

The CLI's `mktg studio` command shells out to this file. From a checkout
of `marketing-cli`, run it directly via the workspace script aliases:

```bash
bun --cwd studio run start:studio          # launch both processes
bun --cwd studio run start:studio:open     # same, plus open the dashboard
```

## What the launcher does, in order

1. **Parses flags.** `--help` prints usage; `--open` opens the dashboard URL
   in the default browser after boot. `MKTG_STUDIO_OPEN=true` is the env-var
   equivalent.
2. **Loads `.env.local`.** Plain `KEY=VALUE` (single- and double-quoted values
   supported, `#` comments skipped). Shell env always wins — the file only
   fills in what the shell didn't set.
3. **Resolves ports.** `STUDIO_PORT` (API, default 3001) and `DASHBOARD_PORT`
   (Next.js, default 3000).
4. **Probes each port.** If either is taken, exits with a non-zero code and a
   `fix` line telling you exactly how to free it (`lsof -ti:PORT | xargs kill -9`).
5. **Spawns both children.** `bun run server.ts` and `bun run next dev -p $DASHBOARD_PORT`.
6. **Tags their output.** Prefixes every line with `[server]` or `[next]`.
7. **Waits for readiness.** Polls `GET /api/health` and `GET /` with a 30 s
   timeout; if either side misses the window, both are killed.
8. **Prints the banner.** URLs for dashboard, API, schema, help.
9. **Forwards signals.** SIGINT/SIGTERM to the parent cleanly stops both
   children (SIGINT to the server for its graceful shutdown; SIGTERM to Next.js).

## Environment variable order of precedence

Highest first:

1. Actual process env (e.g. `STUDIO_PORT=4000 bun run start:studio`)
2. `.env.local` in the repo root
3. Hardcoded defaults baked into `bin/mktg-studio.ts`

There is no `.env` fallback — we deliberately keep `.env.local` as the only
file the launcher reads, to match Next.js' own precedence.

## Port conflict handling

The launcher fails fast rather than hunting for a free port. The reasoning:
agents and humans should always hit the same URL. Picking a random port makes
`/cmo` guess-and-check, and the banner becomes the single source of truth for
where the dashboard lives.

If you routinely need different ports, set them in `.env.local`:

```dotenv
STUDIO_PORT=4001
DASHBOARD_PORT=4000
```

## Daemonizing (v2 territory)

Today `mktg-studio` is a foreground process — start it in a terminal and
leave the terminal open. For a v2 `--detach` flag we'd:

- `Bun.spawn` the launcher itself with `stdio: "ignore"` and `detached: true`
- Write a `~/.mktg-studio/mktg-studio.pid` file
- Add `mktg-studio stop` that reads the pid file and sends SIGINT
- Redirect output to `~/.mktg-studio/logs/mktg-studio.log`

Not built yet — `tmux new -s mktg-studio 'bun run start:studio'` is the
current workaround.

## Log format

- Dashboard output is Next.js' default (pretty printed).
- Server output is whatever `server.ts` emits today (plain prints) +
  structured JSON lines from `lib/logger.ts::logAccess` (when/if they are
  wired). The shape is `{ts, method, path, status, ms, ip?, ua?}` — one line
  per request, JSON-parseable with `jq`.

Tail the launcher with `bun run start:studio | jq -R 'fromjson? // .'` to
pretty-print JSON lines alongside regular prints.

## Health check endpoints

- `GET http://localhost:3001/api/health` — cheap liveness probe. `{"ok": true, ...}`.
- `GET http://localhost:3001/api/schema` — the full route list.
- `GET http://localhost:3001/api/help` — the agent cheat-sheet.

A reverse proxy or init system probe can use `/api/health` as readiness — it
touches only the globalEmitter, not SQLite or the postiz API.

## Graceful shutdown

- Ctrl+C in the launcher terminal: SIGINT. Forwards to both children, waits
  up to 5 s, then SIGKILLs any stragglers.
- If either child exits unexpectedly, the launcher tears down the other and
  exits with the child's status code.

## Upstream dependencies

- **mktg CLI** — `npm i -g marketing-cli`. The studio shells out for `mktg
  publish`, `mktg status`, `mktg schema`, etc. Not required to boot but
  required for most mutations to actually do anything.
- **Postiz** — `api.postiz.com` or self-hosted. AGPL firewall: we talk to
  it via HTTP only, never import `@postiz/*`.
- **Claude Code** — `/cmo` lives here. The studio never calls the Anthropic
  API directly; it waits for `/cmo` to call back via `/api/activity/log` etc.
