# Support Runbook

For every known user-facing problem, one page with **Symptom → Cause → Fix**. Every command here has been run against the studio at commit `a0d4abf` (main) on macOS + bun 1.x + node 20+. If a command fails, file it as a bug against this document first.

This runbook is the first stop for triage. If a problem isn't here, it goes in `docs/FAQ.md` once resolved, or opens an issue at github.com/MoizIbnYousaf/marketing-cli.

Conventions:
- All commands assume your cwd is the project root (the dir that has `brand/`, `package.json`, and `marketing.db`).
- `mktg` refers to the global install (`npm i -g marketing-cli`). Studio ships inside that package.
- `mktg studio` boots the Next + Bun launcher bundled under `studio/`.
- Studio runs on **two ports:** `3000` (Next dashboard) and `3001` (Bun API). Both must be up.

---

## Contents

1. [Installation problems](#1-installation-problems)
2. [First-run problems](#2-first-run-problems)
3. [/cmo problems](#3-cmo-problems)
4. [Postiz problems](#4-postiz-problems)
5. [Data problems](#5-data-problems)
6. [Dashboard problems](#6-dashboard-problems)
7. [Performance](#7-performance)
8. [Uninstall](#8-uninstall)
9. [Diagnostics](#9-diagnostics)

---

## 1. Installation problems

### 1.1 `command not found: mktg`
**Symptom:** `$ mktg` → `zsh: command not found: mktg`.
**Cause:** either the CLI wasn't installed globally, or your shell PATH doesn't include the npm global bin.
**Fix:**
```sh
npm i -g marketing-cli
command -v mktg                       # should print an absolute path
# if not, find npm's global prefix and make sure it's on PATH
npm prefix -g                         # e.g. /opt/homebrew
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

### 1.2 `command not found: mktg studio`
**Symptom:** `mktg studio` errors out even though `marketing-cli` is installed.
**Cause:** your installed CLI is stale. `marketing-cli@0.3.0` registers `mktg studio` as a top-level subcommand and bundles the Studio launcher under `studio/`. Older versions don't ship Studio.
**Fix (preferred, 0.3.0+):**
```sh
npm i -g marketing-cli@latest         # upgrade to the published version
mktg --version                        # must print 0.3.0 or later
mktg studio                           # launches both processes
```
**Fix (working from a marketing-cli checkout):**
```sh
cd ~/projects/mktgmono/marketing-cli  # repo root
bun install                           # wires the workspace
bun --cwd studio run start:studio     # boots Bun server + Next dashboard
# then open http://localhost:3000
```

### 1.3 `EACCES: permission denied` on `npm i -g`
**Symptom:** `npm ERR! code EACCES … /usr/local/lib/node_modules`.
**Cause:** npm's global prefix points at a dir you don't own. Common on macOS with the bundled Node.
**Fix (safe):**
```sh
# set npm's global prefix to your home dir
mkdir -p ~/.npm-global
npm config set prefix "~/.npm-global"
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
npm i -g marketing-cli
```
Don't use `sudo npm i -g`. It works, but it leaves you in a half-root state where future installs fail strangely.

### 1.4 Bun not found
**Symptom:** `mktg studio: bun: command not found` when the launcher tries to start `bun run server.ts`.
**Cause:** Bun isn't installed. The studio's server is a `bun run` script, not a Node script.
**Fix:**
```sh
curl -fsSL https://bun.sh/install | bash
exec $SHELL -l                        # pick up the new PATH
bun --version                         # should print 1.x
```

### 1.5 Port `3000` or `3001` already in use
**Symptom:** `Error: listen EADDRINUSE :::3000` or `:::3001` on launch.
**Cause:** another Next app, the studio from a previous crashed run, or an unrelated local service is holding the port.
**Fix:**
```sh
lsof -iTCP:3000 -sTCP:LISTEN          # see what owns it
lsof -iTCP:3001 -sTCP:LISTEN
# kill the offending PID (verify first, don't blind-kill)
kill -9 <PID>
# or relaunch the studio on different ports
DASHBOARD_PORT=3002 STUDIO_PORT=3003 bun run start:studio
```

### 1.6 Node version too old
**Symptom:** cryptic build error mentioning `???.mjs` or `Unexpected token '?'`.
**Cause:** the studio uses Next 16 which requires Node ≥ 20.
**Fix:**
```sh
node -v                               # should be >= v20
# if not, install via nvm or the official installer
nvm install 20 && nvm use 20
```

---

## 2. First-run problems

### 2.1 Empty `brand/` folder
**Symptom:** Brand tab shows 10 missing files; Pulse shows empty cards.
**Cause:** you haven't run `mktg init` yet, or `mktg init --yes` scaffolded only the SCHEMA.
**Fix:**
```sh
mktg init --yes --json               # writes brand/ + installs skills
ls brand/                             # should list 10 .md files
```
Then run `/cmo` in your Claude Code terminal in this project dir -- it will spawn `mktg-brand-researcher`, `mktg-audience-researcher`, `mktg-competitive-scanner` in parallel and populate the three core brand files.

### 2.2 "Studio won't start" (`mktg studio` exits immediately)
**Symptom:** launcher prints a banner and quits before the dashboard loads.
**Cause:** either `bun` or `node`/Next failed to boot. The launcher prints both process tags (`[server]` and `[next]`) -- the first one to exit wins.
**Fix:**
```sh
bun run start:studio 2>&1 | tee /tmp/studio.log
# read the last 40 lines of /tmp/studio.log to see which process failed
tail -n 40 /tmp/studio.log
# common root causes:
#  - missing .env.local         → `cp .env.example .env.local`
#  - SQLite migration failed    → `rm marketing.db` and relaunch (data loss!)
#  - port collision (see 1.5)
```

### 2.3 Activity panel stays blank
**Symptom:** dashboard loads, every tab loads, but the right-side Activity panel says "No activity yet" indefinitely -- even after running a skill in `/cmo`.
**Cause:** /cmo isn't posting to the studio's `/api/activity` endpoint. Happens when `STUDIO_API_BASE` in /cmo's env doesn't match the studio's port, or when the studio's SSE bridge dropped (Bug #8 -- fixed at `4957afd`, verify you're on main).
**Fix:**
```sh
# confirm the studio is on 3001 and subscribers > 0
curl -s http://localhost:3001/api/health
# if subscribers is 0 with a dashboard open, your SSE connection dropped
# refresh the dashboard in the browser; then re-check health
# if it's still 0, grep your Claude Code session for STUDIO_API_BASE
grep -i STUDIO_API_BASE ~/.claude/settings.json .env.local 2>/dev/null
# ensure it's exactly `http://localhost:3001`
```

### 2.4 Browser can't connect (`ERR_CONNECTION_REFUSED` on `localhost:3000`)
**Symptom:** nothing at `http://localhost:3000`.
**Cause:** the Next dev server crashed or bound to a different port. Check both tags in the launcher output.
**Fix:**
```sh
# see what's actually listening
lsof -iTCP -sTCP:LISTEN | grep -E "3000|3001"
# if nothing is on 3000, restart the studio
pkill -f "next dev" ; pkill -f "server.ts"
bun run start:studio
```

### 2.5 Onboarding wizard hangs on "Building your marketing brain…"
**Symptom:** onboarding advances to step 4 but the three agent lanes stay on "Waiting" forever. Reconnecting chip stuck.
**Cause:** SSE connection never opened. Either the studio server on `:3001` isn't running, or the onboarding POST to `/api/onboarding/foundation` failed silently.
**Fix:**
```sh
# verify the server is up
curl -s http://localhost:3001/api/health
# manually POST the foundation trigger to see the response
curl -s -X POST http://localhost:3001/api/onboarding/foundation
# if 404, you are on a pre-onboarding build; skip onboarding and go straight to /dashboard
# if 5xx, check server logs (the bun process tag in the launcher output)
```
If still stuck after 30 s, click Skip → /dashboard, then trigger the three agents manually in `/cmo`:
```
/cmo run mktg-brand-researcher
/cmo run mktg-audience-researcher
/cmo run mktg-competitive-scanner
```

---

## 3. /cmo problems

### 3.1 `/cmo not found` in Claude Code
**Symptom:** typing `/cmo` in Claude Code says "skill not found" or silently does nothing.
**Cause:** Claude Code doesn't see the `cmo` skill in `~/.claude/skills/cmo/SKILL.md`. Either it wasn't installed, or Claude Code's skill index is stale.
**Fix:**
```sh
mktg init --yes                       # re-installs all 50 skills including cmo
ls ~/.claude/skills/cmo/              # should list SKILL.md + rules/
# then fully restart Claude Code (Cmd+Q, reopen) to pick up new skills
```

### 3.2 Claude Code isn't installed
**Symptom:** you don't have `claude` on PATH; /cmo is not reachable at all.
**Cause:** you ran the studio without installing Claude Code first.
**Fix:** install Claude Code: https://claude.ai/code. Restart your terminal. Then proceed with § 3.1.

### 3.3 /cmo hangs mid-skill
**Symptom:** /cmo starts a skill (e.g., `landscape-scan`), then the terminal just sits there for minutes with no progress. The Activity panel shows a `running` row that never advances.
**Cause:** most likely a long research skill with slow external APIs (Exa, Firecrawl). Some skills legitimately take 3–5 minutes.
**Fix:** wait another 5 minutes. If still no output:
```sh
# in a separate terminal
ps aux | grep -E "claude|exa|firecrawl" | grep -v grep
# if you see a stuck process, kill it
# then mark the abandoned Activity row via the API:
curl -s -X POST http://localhost:3001/api/activity \
  -H "Content-Type: application/json" \
  -d '{"kind":"notice","summary":"abandoned run","meta":{"reason":"user-cancelled"}}'
```
The studio's server-side cleanup for zombie `running` rows is on the roadmap. For now, manually dismiss.

### 3.4 Skill errors out with `ENOENT` on a brand file
**Symptom:** a skill that depends on `brand/voice-profile.md` fails immediately.
**Cause:** the prerequisite brand file doesn't exist or is template-only.
**Fix:**
```sh
mktg doctor --json | python3 -c "import json,sys; d=json.load(sys.stdin); [print(c) for c in d['checks'] if c['status']=='warn']"
# for each template-only file, ask /cmo to regenerate:
# e.g. /cmo regenerate voice-profile
```

### 3.5 /cmo writes output to the wrong dir
**Symptom:** a skill wrote to `~/Downloads/brand/` or a sibling repo's `brand/`.
**Cause:** /cmo's cwd is wrong. It inherits from the Claude Code terminal.
**Fix:** confirm Claude Code was launched in the studio's project dir. If not, quit, `cd` into the studio project, relaunch Claude Code. `pwd` inside the Claude Code session confirms.

---

## 4. Postiz problems

### 4.1 `Postiz not configured` in the Publish tab
**Symptom:** Publish tab shows "Postiz not configured / mktg publish exited with code 1".
**Cause:** `POSTIZ_API_KEY` isn't set in `.env.local`.
**Fix:** Settings → API keys → paste your Postiz key → Save. Or directly:
```sh
echo 'POSTIZ_API_KEY=ptz_your_key_here' >> .env.local
echo 'POSTIZ_API_BASE=https://api.postiz.com' >> .env.local
# restart the studio so the server re-reads .env.local
```

### 4.2 `Invalid POSTIZ_API_KEY (Invalid API key)`
**Symptom:** Publish shows "Postiz unavailable -- Invalid POSTIZ_API_KEY".
**Cause:** your key was mistyped, was rotated in Postiz, or is for a different env (sandbox vs prod).
**Fix:**
```sh
# test the key directly against Postiz
curl -s -H "Authorization: $POSTIZ_API_KEY" \
  "${POSTIZ_API_BASE:-https://api.postiz.com}/public/v1/integrations" | head
# if you get "Invalid API key", rotate at https://postiz.com/api-keys and redo § 4.1
```
Note: the `Authorization` header is **bare key**, no `Bearer` prefix.

### 4.3 "Rate limit exceeded"
**Symptom:** publish fails with 429; rate-limit badge turns red.
**Cause:** Postiz caps at 30 POST `/public/v1/posts` per org per hour.
**Fix:** wait for the window to reset (hover the rate-limit badge for the reset time). In the meantime:
```sh
# check the exact reset window
curl -s -H "Authorization: $POSTIZ_API_KEY" \
  "${POSTIZ_API_BASE}/public/v1/is-connected" | head
```
Schedule posts with real timestamps instead of `Post now` to spread load.

### 4.4 Wrong `POSTIZ_API_BASE`
**Symptom:** connect succeeds locally but Publish returns 404 on every POST.
**Cause:** you set `POSTIZ_API_BASE` to `https://postiz.com` (the marketing site) instead of the API host, or you pointed at a Docker self-host app root where Postiz serves the backend under `/api`.
**Fix:** in Settings set base to `https://api.postiz.com` for hosted. For Docker self-host, either `http://localhost:4007` or `http://localhost:4007/api` works; Studio retries the `/api` form automatically when the root form returns 404. Trailing slashes are stripped automatically.
Run `mktg publish --adapter postiz --diagnose --json` from the project root to verify the same route resolution outside the UI.

### 4.5 No integrations listed even though Postiz works
**Symptom:** Connected Providers card is empty; curl to Postiz returns an integrations array.
**Cause:** stale SWR cache in the dashboard. The default refresh interval is 60 s.
**Fix:** click the Refresh button on the Connected accounts card, or reload the page.

### 4.6 Image posts do not attach media
**Symptom:** a Postiz draft is created, but it has no image/video attached.
**Cause:** the manifest is missing `metadata.mediaPaths` or `metadata.mediaUrls`, or the file path is outside the active project root.
**Fix:** keep generated assets inside the project and include them in the publish manifest:
```json
{
  "metadata": {
    "providers": ["x"],
    "mediaPaths": ["brand/assets/launch-card.png"]
  }
}
```
Public URLs can use `metadata.mediaUrls`; Studio/CLI sends those through Postiz `/public/v1/upload-from-url`.

---

## 5. Data problems

### 5.1 Brand file went stale
**Symptom:** Brand tab shows a yellow "stale" dot next to a file; Settings → Brand file health shows the age in months.
**Cause:** each brand file has a freshness TTL (30 days for voice/audience/positioning/competitors, 14 for landscape, 90 for keyword-plan, 180 for creative-kit/stack, append-only for assets/learnings).
**Fix:**
```sh
# per-file regenerate via /cmo
# in Claude Code: /cmo regenerate voice-profile
# or use the mktg brand command
mktg brand --help
```

### 5.2 SQLite `database is locked`
**Symptom:** `SqliteError: database is locked` in the server log; the dashboard shows "Couldn't load" everywhere.
**Cause:** two processes held write-locks at once. Usually caused by a second `bun run server.ts` started manually while the launcher's is still running.
**Fix:**
```sh
# list processes touching the DB
lsof marketing.db
# pick one and keep it; kill the duplicates
pkill -f "server.ts"
bun run start:studio
```
If locks persist, move the DB aside and let the server recreate it (loses SQLite data -- brand files + .env.local are untouched):
```sh
cp marketing.db marketing.db.bak
rm marketing.db
bun run start:studio
```

### 5.3 Lost unsaved edits in the Brand editor
**Symptom:** you typed in the Brand editor, switched tab, came back, changes are gone.
**Cause:** the editor debounces autosave by 1.5 s. If you switched tabs before the timer fired, the save was cancelled. Known issue; tracked in the issue list.
**Mitigation:** always press Cmd+S before switching tabs. Cmd+S bypasses the debounce.

### 5.4 /cmo wrote over my manual edits
**Symptom:** you hand-edited `brand/voice-profile.md`, then ran `/cmo regenerate voice-profile`, and your edits are gone.
**Cause:** regenerate is destructive. There is no auto-backup (yet -- tracked as H1-104 / H1-110).
**Fix (prevention):** before asking /cmo to regenerate any brand file:
```sh
cp brand/voice-profile.md brand/voice-profile.md.bak
# OR commit to git first -- git is the cleanest undo
git add brand/voice-profile.md && git commit -m "snapshot before regenerate"
```

### 5.5 `marketing.db` is huge (> 100 MB)
**Symptom:** repo is slow to clone, index is large.
**Cause:** accumulated skill_runs + activity + signals over weeks of use.
**Fix:** prune old rows (no CLI command yet, use sqlite3 directly):
```sh
sqlite3 marketing.db "DELETE FROM skill_runs WHERE created_at < datetime('now', '-30 days');"
sqlite3 marketing.db "DELETE FROM signals WHERE created_at < datetime('now', '-30 days') AND feedback = 'dismissed';"
sqlite3 marketing.db "VACUUM;"
```

---

## 6. Dashboard problems

### 6.1 A tab won't load (spinner forever)
**Symptom:** a workspace tab stays in its loading skeleton past 15 s; network tab shows the API call is pending.
**Cause:** the server is slow or the endpoint threw. Known hot spots: Settings at wide viewports (A6, issue #51), Trends when `/api/trends/feed` is down (G4-10).
**Fix:**
```sh
# check server health
curl -s http://localhost:3001/api/health
# probe the specific endpoint; replace signals with the failing tab's source
curl -s http://localhost:3001/api/signals | head
# if a 5xx, check server logs
tail -n 100 /tmp/studio.log
```

### 6.2 Dashboard shows a red Next.js "Runtime TypeError" page
**Symptom:** full-viewport red error page with a stack trace instead of the dashboard.
**Cause:** a fetch returned a non-array where an array was expected (G4-65/G4-66). Most commonly happens on error responses, but can happen when a brand file is missing shape.
**Fix (immediate):**
1. Click the Next.js "X" to dismiss; the dashboard renders again until the next errant fetch.
2. Reload the page; if the error recurs, the underlying endpoint is broken -- see § 6.1.

### 6.3 Updates aren't live (SSE issue -- Bug #8)
**Symptom:** /cmo runs a skill but the Activity panel never shows the row. Only full page reload shows it.
**Cause:** SSE subscription dropped. The fix for this landed at `4957afd` (Bug #8). If you're on that commit or later and still seeing it, the connection is dropping mid-session.
**Fix:**
```sh
# verify you're post-fix
git log --oneline 4957afd -1
# live subscriber count
curl -s http://localhost:3001/api/health | python3 -c "import json,sys; print(json.load(sys.stdin).get('subscribers'))"
# open the dashboard; subscribers should go to 1
# if it stays at 0, the SSEBridge didn't mount -- hard-refresh (Cmd+Shift+R)
```

### 6.4 Dark mode / theme glitches (buttons with no background)
**Symptom:** default buttons look like plain text -- no background color, hard to click.
**Cause:** the shadcn `Button` default variant references `--color-primary` which is not defined in the theme (G1 F01). Fix is landing in A7 / task #52.
**Workaround:** use `variant="accent"` or `variant="outline"` for any button you author until A7 lands. Existing default buttons will visually repair themselves automatically once the token is defined.

### 6.5 Command palette (Cmd+K) doesn't open
**Symptom:** pressing Cmd+K does nothing.
**Cause:** focus was inside an input/textarea, and the shortcut was intercepted by the browser or the element.
**Fix:** click outside any input first, then press Cmd+K. Or focus the page body.

---

## 7. Performance

### 7.1 Dashboard is slow with a large `brand/`
**Symptom:** Settings page hangs 10+ s; Brand tab is laggy.
**Cause:** `Settings → Brand file health` is rendered by an async server component that stats every brand/ file at render time (G4-48). Larger files + slow disk = long render. This is the root of issue #51 (A6).
**Fix (workaround until A6 lands):**
- Navigate to a different section of Settings (API keys, Integrations) which don't pay that cost.
- Keep `brand/` under 1 MB per file.
- Close extra brand files in your editor to reduce disk pressure.

### 7.2 File watcher is spiking CPU
**Symptom:** `bun` or `node` process at 100% CPU when no one is typing.
**Cause:** `Bun.watch` on `brand/` firing on every macOS Spotlight index. Not critical but wasteful.
**Fix:**
```sh
# exclude brand/ from Spotlight
sudo mdutil -i off brand/
# or move brand/ out of an indexed dir
```

### 7.3 Large number of activity rows (300+)
**Symptom:** Activity panel scroll jank.
**Cause:** no virtualization yet (H1-36). Activity is rendered as a regular `<ul>`.
**Mitigation:** narrow the Activity filter to a single kind or a single skill. Switch the time window to `1h` or `6h`.

### 7.4 Cold first render is slow
**Symptom:** first load of a tab takes 2–5 s.
**Cause:** Next 16 + Turbopack; initial chunk compile. Subsequent loads are fast.
**Fix:** none needed. This is dev-mode behavior. `bun run build && bun run start` for production builds, which are snappy.

---

## 8. Uninstall

### 8.1 Reset everything in the studio
**Symptom:** you want a clean slate -- forget brand, forget SQLite, forget keys.
**Fix:**
```sh
# Inside the studio project dir:
rm -rf brand/          # deletes all brand files
rm marketing.db        # deletes all signals / activity / skill_runs / briefs
rm .env.local          # deletes API keys
rm -rf .next/          # deletes build cache (safe)
mktg init --yes        # rescaffolds brand/ templates
```
Warning: `rm brand/` is destructive. If you've invested any time, commit to git first: `git add brand/ && git commit -m "pre-reset snapshot"`.

### 8.2 Remove the globally-installed CLI
```sh
npm uninstall -g marketing-cli
rm -rf ~/.claude/skills/cmo ~/.claude/skills/mktg-*   # removes installed skills
rm -rf ~/.claude/agents/mktg-*                         # removes installed agents
```

### 8.3 Where state lives on disk (reference)
| Path | Contents | Removable? |
|---|---|---|
| `./brand/*.md` | Brand memory | yes (destructive) |
| `./marketing.db` | SQLite: signals, activity, skill_runs, briefs, publish_log | yes (destructive) |
| `./.env.local` | API keys (plaintext) | yes |
| `./.next/` | Build cache | yes (safe) |
| `./node_modules/` | Deps | yes (safe; `bun install` rebuilds) |
| `~/.claude/skills/` | Installed Claude Code skills | keep unless uninstalling mktg |
| `~/.claude/agents/` | Installed Claude Code agents | keep unless uninstalling mktg |
| `~/.npm/` | npm cache | keep |

---

## 9. Diagnostics

### 9.1 `mktg doctor`
First-line triage for anything except dashboard UI. Checks brand profiles, brand content freshness, append-only files, skills, agents, skill graph cycles, CLI deps (bun, gws, playwright-cli, ffmpeg, remotion, firecrawl, whisper-cpp, yt-dlp, summarize, gh), and integration env vars.
```sh
mktg doctor --json | python3 -m json.tool | less
# only warnings / failures
mktg doctor --json | python3 -c "import json,sys; d=json.load(sys.stdin); [print(c['name'], c['status'], c.get('detail','')) for c in d['checks'] if c['status']!='pass']"
```

### 9.2 `/api/health`
First-line triage for the studio server.
```sh
curl -s http://localhost:3001/api/health
# ok: { "ok": true, "version": "0.1.0", "ts": "...", "subscribers": N }
# N should be 1+ when a dashboard is open
```

### 9.3 `/api/schema`
Lists every API route the server exposes. Useful when a UI component expects an endpoint that isn't there.
```sh
curl -s http://localhost:3001/api/schema | python3 -c "import json,sys; d=json.load(sys.stdin); [print(r['method'], r['path']) for r in d['routes']]"
```

### 9.4 `mktg status`
Project state snapshot: brand completeness, skills, recent activity.
```sh
mktg status --json | python3 -m json.tool
```

### 9.5 Log locations
| Source | Path |
|---|---|
| Studio server (`server.ts`) | stdout of `bun run start:studio` -- redirect with `2>&1 \| tee /tmp/studio.log` |
| Next dashboard | stdout of the same launcher, prefixed `[next]` |
| SQLite (if needed) | `marketing.db` -- open with `sqlite3 marketing.db` |
| mktg CLI | writes to stdout; capture with `2>&1 \| tee /tmp/mktg.log` |
| Claude Code (/cmo) | terminal where you ran `claude` -- review scrollback |

### 9.6 Reporting a bug
Include in the report:
1. `mktg --version` → version string
2. `node --version` + `bun --version`
3. Last 40 lines of `tail /tmp/studio.log`
4. `curl -s http://localhost:3001/api/health`
5. Exact repro steps + screenshot of the failure

Open at: `https://github.com/MoizIbnYousaf/marketing-cli/issues/new`. Studio ships inside the same repo, so the CLI tracker is the right place.

---

## Cross-reference

| Symptom | Runbook § |
|---|---|
| Studio server on :3001 unreachable | 2.2 / 2.4 |
| `mktg studio` not found | 1.2 |
| Settings page very slow or blank | 7.1 |
| Default buttons invisible | 6.4 |
| Brand editor lost edits | 5.3 |
| `/cmo` regenerate clobbers manual edits | 5.4 |
| Runtime TypeError red page | 6.2 |
| Bug #8 (SSE drop) | 6.3 |
