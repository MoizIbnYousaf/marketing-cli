# FAQ

Pre-emptive answers to the questions we expect most often. For anything that looks like a problem, go to `docs/SUPPORT-RUNBOOK.md` first -- the runbook is actionable; this page is conceptual.

---

## Product

### What is Studio?
A local-first marketing dashboard that runs on your machine. A Bun API server on `:3001` + a Next.js dashboard on `:3000`, driven by the `/cmo` skill in your Claude Code terminal. Studio ships inside `marketing-cli` and launches via `mktg studio`. You don't type in a chat window inside Studio; you talk to `/cmo` in Claude Code, `/cmo` runs 50 marketing skills, and Studio visualizes the state -- Pulse, Signals, Publish, Brand, and Settings.

### What isn't Studio?
- It is not a hosted SaaS. No cloud account, no login.
- It is not a Claude wrapper. It never calls the Anthropic API. `/cmo` does, in Claude Code.
- It is not a Postiz fork. It talks to Postiz over their public HTTP API with a bare `Authorization` header and no `@postiz/*` imports (AGPL firewall).
- It is not a replacement for a marketing team. It is one for a solo operator who wants leverage.

### Who is this for?
Solo builders, small teams, and founders who want to run their own marketing without setting up a full stack. If you already have a marketing team with HubSpot + Sprout + a brand agency, you're not the target.

### Why two processes (`:3000` + `:3001`)?
Separation of concerns. The Bun server owns SQLite, the `brand/` watcher, and the SSE stream. The Next dashboard is a pure UI that reads/writes through the API. Either can restart without bringing down the other.

### Why does `/cmo` live in Claude Code instead of the studio?
Because the studio is not an LLM wrapper. `/cmo` has 2,400 lines of orchestration knowledge + routes to 50 skills; it needs a real agent runtime. Claude Code already has the auth, the tool loop, and the file-write primitives. The studio is eyes, `/cmo` is brain.

### Do I need Claude Code?
For the full experience, yes. You can open the dashboard and use every read-only surface without it (browse signals, view brand files, read the publish queue). But every "do something smart" action -- generate content, refresh trends, rewrite voice -- runs `/cmo` under the hood.

### Does it work offline?
Partially. The dashboard, SQLite, brand file editing, and reading existing signals work offline. `/cmo` requires network. Any skill that calls Exa / Firecrawl / Postiz / Typefully requires network. The studio surfaces an offline banner for dashboards that depend on network data (in progress).

---

## Data & privacy

### Where is my data stored?
Entirely on your machine:
- `./brand/*.md` -- 10 markdown files that are your brand memory
- `./marketing.db` -- SQLite for signals, activity, skill runs, publish log
- `./.env.local` -- API keys (plaintext)

Nothing is uploaded unless `/cmo` runs a skill that explicitly calls an external API (Postiz, Resend, Exa, Firecrawl, Typefully). You control which keys are set.

### Are my API keys encrypted?
No. `.env.local` is plaintext. Anyone with access to the project directory can read them. `.env.local` is gitignored by default. If your threat model needs encryption, use a tool like `direnv` + `sops` or your OS keychain and export at shell-launch.

### Does anything phone home?
The studio itself does not. `/cmo` and skills you invoke do, to the APIs you configured. There is no telemetry from the studio server.

### Can I run it on a shared machine?
You can, but the data directory will be visible to anyone who reaches your project dir. There is no auth on `:3000` or `:3001`. Do not run the studio on a shared or publicly-reachable machine without a firewall + reverse proxy + auth.

### Can I sync `brand/` across machines?
Yes -- `brand/` is plain markdown in your project. Commit to git + push, or Dropbox/iCloud the folder. The SQLite DB (`marketing.db`) is not portable across machines cleanly; consider each machine its own.

---

## Skills & agents

### What's a skill?
A structured Markdown file under `skills/<name>/SKILL.md` that tells `/cmo` how to do one thing. 50 ship out of the box -- brand voice extraction, keyword research, content atomizer, Postiz publishing, native publishing, etc. `mktg list --json` shows them all.

### What's an agent?
A sub-agent `/cmo` spawns in parallel. 5 ship: 3 researchers (brand, audience, competitors) and 2 reviewers (content, SEO). Agents write to specific brand files; `/cmo` never writes where an agent owns.

### Skills never call skills?
Correct. That's the contract. `/cmo` orchestrates; skills are leaf nodes. If skill A needs skill B's output, it goes through `/cmo`, not through a direct call.

### Can I add my own skill?
Yes. `skills/create-skill/SKILL.md` is the how-to. Drop a new `SKILL.md` under `skills/<name>/`, run `mktg update` to re-install into `~/.claude/skills/`, restart Claude Code to index it.

### Can I override a built-in skill?
Yes, by editing `~/.claude/skills/<name>/SKILL.md` directly. `mktg update` will re-copy the bundled version on next run -- so commit your overrides to a fork or keep a patch.

---

## Integrations

### Postiz -- which plan do I need?
Any plan with API access. The hosted plan works; self-hosted works. The studio hits:
- `GET /public/v1/integrations` -- list connected providers
- `POST /public/v1/posts` -- create post (draft / schedule / now, depending on your Postiz plan -- see H1-55 re: "Post now" semantics)
- `GET /public/v1/posts?startDate=...&endDate=...` -- scheduled/published queue
- `GET /public/v1/is-connected` -- heartbeat

Rate limit: 30 POST `/posts` per hour per org.

Postiz remains the network-publishing backend when configured. The native Studio publish surface also keeps a local provider registry, queue, and history for `x`, `tiktok`, `instagram`, `reddit`, and `linkedin`.

### Do I need Exa / Firecrawl / Typefully / Resend / Gemini?
No -- all optional. Each key unlocks a subset of skills:
- Exa → most research skills (landscape-scan, competitive-intel, audience-research, mktg-x)
- Firecrawl → scraping-heavy skills (landscape-scan, mktg init --from <url>)
- Typefully → `typefully` skill (X / LinkedIn threads)
- Resend → `email-sequences`, `send-email`, `resend-inbound`, `newsletter`
- Gemini → `image-gen`, `creative` image modes (uses `gemini-3.1-flash-image-preview` per project rule)

### Why no Twitter / X API support?
The `mktg-x` skill reads via authenticated scraping, not the X API (`xterminal` under the hood). Faster + no paid tier. Publishing to X starts in the native local queue/history, then uses Typefully, Postiz, or browser automation for real external posting depending on the configured credentials and workflow.

---

## Dev & contributions

### I found a bug. Where do I file it?
- Visible in the dashboard: `docs/SUPPORT-RUNBOOK.md` first, then `github.com/MoizIbnYousaf/marketing-cli/issues`. Studio ships inside the same repo, so the CLI tracker is the right place.
- Under the hood in `/cmo` or a skill: same tracker. Include the skill name + /cmo transcript.

### Where's the architecture doc?
- `studio/CLAUDE.md` -- the full Studio contract (driver/dashboard, API surface, AGPL firewall rules).
- `docs/architecture.md` -- code-level architecture.
- `docs/cmo-integration.md` -- how `/cmo` ↔ studio HTTP + SSE traffic flows.

### How do I run the tests?
```sh
bun run test          # unit + server + integration (171 tests last audit)
bun run test:e2e      # Playwright against a live server
bun run typecheck     # tsc --noEmit
```

### Bun vs Node -- which?
The **server** (`server.ts`) and bin launcher (`bin/mktg-studio.ts`) are `bun run` only. The Next dashboard compiles under Node 20+. You need both on PATH.

### Why Tailwind v4 instead of v3?
For `@theme` custom-properties. The studio colors live in CSS variables, not Tailwind config. See `app/globals.css`.

---

## Customization

### Can I change the colors?
Edit `app/globals.css` -- the `@theme` block + `.dark` override hold the palette. Gold (`#a0733c`) is the accent; change it in both places. Note: `--color-primary` and `--color-secondary` are not currently defined (G1 F01 / issue #52); use `--color-accent` for brand hue.

### Can I hide tabs I don't use?
Edit the shared workspace navigation contract first, then keep the sidebar, workspace tabs, mobile dock, command palette, shortcuts, and `/api/navigate` remaps in lockstep. The current primary surfaces are `pulse`, `signals`, `publish`, `brand`, and `settings`; legacy `trends`, `audience`, and `opportunities` must keep remapping to their new homes instead of hard-breaking.

### Can I swap Postiz for something else?
Yes. Implement an adapter in `marketing-cli/src/commands/publish.ts` (the CLI-side publish registry). The studio picks up new adapters automatically via `mktg publish --list-adapters --json`.

---

## Misc

### What's Bug #8?
A historical SSE subscription drop in the dashboard, fixed at `4957afd`. The Activity panel would silently stop receiving events a few seconds after mount. Resolution: hoisted `<SSEBridge />` to the root layout and hardened `EventSource.onerror` to recover from stuck CONNECTING states.

### Why no em-dashes in docs?
A 2026-04-13 style audit pulled 51 of them from public docs. Em-dash is a writing-assistant tell. See the broader style guide in `CLAUDE.md`. If you add one in an audit doc it will be caught on next review.

### What does "local-first" mean here?
Your data, your disk, your control. The studio works without an internet connection for everything that doesn't depend on external APIs. SQLite > remote DB. Markdown > database. File watcher > webhooks. Git > cloud sync. State lives on your filesystem, versioned with your project, portable between machines.

### How does this compare to hosted alternatives?
See `brand/competitors.md` after running `/cmo run mktg-competitive-scanner`. The short version: hosted marketing stacks optimize for team collaboration + enterprise controls. Studio optimizes for one operator with leverage, local data ownership, and an agent brain.
