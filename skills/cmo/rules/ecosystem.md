# Ecosystem  -  External Tools, MCP, and Browser Variants

/cmo doesn't re-implement tools mktg has already chained. It routes to the skill that wraps the tool. This file documents every external tool in the mktg ecosystem, when /cmo invokes it, and which skill owns the wrapping.

**Detection:** always start with `mktg doctor --json` to see which tools are installed and which are missing. Don't route to a tool the user hasn't installed  -  surface the install hint first.

---

## External CLIs

| Tool | What it does | CMO uses when… | Wrapped by |
|---|---|---|---|
| `firecrawl` | Web scrape, search, crawl of known URLs | User provides a URL + "scrape this"; `competitive-intel` / `landscape-scan` need current data from competitor sites. | `competitive-intel`, `landscape-scan`, `/firecrawl` skill directly |
| `ffmpeg` | Video assembly, encoding (ffmpeg Quick + Enhanced tiers) | Any video output that doesn't need React/Remotion  -  slides → mp4, Ken Burns effects, audio mux. | `video-content` (tiers 1 + 2) |
| `remotion` | Programmatic React video compositions | Polished animated video with precise timing, typography, and brand-calibrated visual system. | `video-content` (tier 3) |
| `whisper-cli` (whisper.cpp) | Speech-to-text | Transcribe audio/video for atomization. Source for `content-atomizer` on podcasts, videos, voicemails. | `mktg transcribe` |
| `yt-dlp` | Media download | Pull YouTube/TikTok/podcast sources for transcription. | `mktg transcribe` |
| `gh` | GitHub CLI | Fallback when `gh-axi` is unavailable. Prefer AXI for agent GitHub work. | `startup-launcher`, `app-store-changelog` |
| `gh-axi` | Agent-ergonomic GitHub CLI (AXI) | Issues, PRs, CI runs, releases — prefer over raw `gh` / GitHub MCP. | `/axi` router |
| `chrome-devtools-axi` | Agent-ergonomic browser CLI (AXI) | Navigate/click/fill/extract with combined ops + `--query`. Prefer over eager chrome-devtools-mcp. | `/axi` router |
| `summarize` (steipete/summarize) | Token-bounded text compression | Compress long pasted content before passing to downstream skills. | `/summarize` skill directly |
| `playwright-cli` | Browser automation backend | Logged-in marketing distribution profiles. For general browsing/extraction prefer `chrome-devtools-axi` via `/axi`. | Browser profile skills |

### AXI catalog router (`/axi`)

**What it is:** [AXI](https://axi.md) — 10 principles for agent-ergonomic CLIs + an official/community catalog (`gh-axi`, `chrome-devtools-axi`, `lavish-axi`, `quota-axi`, plus Slack/Notion/AWS/… community AXIs).

**CMO routes to `/axi` when:**
- The request is GitHub ops (PR/CI/issues/releases) — `/axi` → `gh-axi`.
- The request needs interactive browser automation (not static URL fetch) — `/axi` → `chrome-devtools-axi`.
- The user asks about AXI, TOON, or "AXI vs MCP".
- Building/reviewing an agent-facing CLI.

**CMO does NOT route to `/axi` when:** marketing copy/SEO/publish (stay in `/cmo`), known-URL scrape (`firecrawl` / `exa-contents`), or open-ended web search (`exa-search`).

---

## Browser distribution profiles

When a platform has no usable API, /cmo routes to the browser. Multiple browser profiles may exist  -  each with its own logged-in session set. Pick the profile that matches the account the user wants to post from.

| Profile | Accounts / services | CMO uses when… |
|---|---|---|
| Default browser profile | Shared local browser session | Generic automation, no specific account matters. |
| Project browser profile | Project-specific logged-in accounts | The project declares a browser profile in `brand/stack.md`. |
| Maintainer browser profile | Maintainer-owned services | Local maintainer workflows only; not part of the public package contract. |

**Routing rule per project (cross-ref `rules/context-switch.md`):** project's `brand/stack.md` should name the canonical browser profile if the project has browser-distribution needs. CMO reads stack.md to pick the right profile.

---

## MCP servers

### Exa - first-class skills + MCP

**What it is:** Semantic web research platform. Distinct from firecrawl:
- `firecrawl` - fetch/crawl a **known URL** (you have the link, want deep site content / browser).
- `Exa` - **semantic search** and Agent research across the web with citations (you have a question, want grounded answers with sources).

**First-class skills (bundled from [exa-labs/agent-skills](https://github.com/exa-labs/agent-skills)):**

| Skill | Use when |
|---|---|
| `exa-search` | Open-ended discovery (`POST /search` / MCP `web_search_exa`) |
| `exa-contents` | Known-URL extraction (`POST /contents` / MCP `web_fetch_exa`) |
| `company-research` | Company deep dives + company lists (Exa Agent) |
| `lead-generation` | ICP prospect lists + CSV (Exa Agent) |
| `build-with-exa` | API/SDK integration cookbook (`references/`) |

**CMO routes to Exa skills when:**
- `landscape-scan` needs current market data - top players, recent moves, category trends.
- `competitive-intel` needs competitor discovery beyond a known list - call `company-research` / `exa-search`.
- `audience-research` needs audience watering holes + professional bios.
- `keyword-research` needs live SERP gap analysis.
- User asks for leads / prospect lists - `lead-generation`.
- Any "is this still true?" claim check - `/last30days` for social; Exa for web.

**Wired via:** `.mcp.json` at the repo root (Exa MCP with search + fetch + advanced + agent tools) and `EXA_API_KEY` on the skill manifest (`mktg doctor` surfaces `integration-EXA_API_KEY`). If Exa is unavailable, skills that depend on it degrade to `firecrawl` + manual sourcing (lower quality, but not blocked).

---

## The API-vs-Browser Fork (critical routing decision)

For every distribution request, /cmo picks one of two paths. Get this wrong and you silently fail.

| Platform | Path | Skill |
|---|---|---|
| X / Twitter | Local queue/API | `mktg publish --adapter mktg-native` for local queue; `typefully` for real threads |
| LinkedIn | Local queue/API | `mktg publish --adapter mktg-native`; Postiz or Typefully when connected externally |
| Bluesky / Mastodon / Threads | API | `postiz` or `typefully` |
| Reddit | Local queue/API/browser | `mktg publish --adapter mktg-native`; Postiz or browser profile for external posting |
| Instagram | Local queue/API/browser | `mktg publish --adapter mktg-native`; Postiz or browser profile for external posting |
| TikTok | Local queue/API/browser | `mktg publish --adapter mktg-native`; Postiz or browser profile for external posting |
| YouTube | API (via postiz) OR browser | `postiz` if configured, else browser profile |
| Pinterest | API | `postiz` |
| Discord | API | `postiz` |
| Slack | API | `postiz` |
| Facebook | **Browser only** (no postiz, no Typefully) | browser profile |
| Any transactional email | API | `send-email` (Resend) |
| Any marketing email sequence | API | `email-sequences` (to the project's configured ESP from `stack.md`) |
| Any App Store marketing | Hybrid  -  `asc` CLI for metadata, browser profile for screenshots upload | `app-store-screenshots`, `app-store-changelog` |

**Decision flow:**

1. Is the platform in the native rollout (`x`, `tiktok`, `instagram`, `reddit`, `linkedin`)?
   - YES → use `mktg publish --adapter mktg-native` for local queue/history and Studio-native workflow.
2. Does the user need real external network posting now?
   - YES → check Postiz/Typefully/browser availability before claiming anything shipped.
3. Is the user's `POSTIZ_API_KEY` set?
   - YES → use Postiz for supported external social providers; keep Typefully reserved for X/threads specialist flows and fallback.
   - NO → fall back to Typefully for X/LinkedIn/Threads/Bluesky/Mastodon where it fits; fall back to browser profile or file for Reddit/IG/TikTok.
4. Is this an X thread?
   - YES → always Typefully (thread UX is canonical there).
5. Does `brand/stack.md` specify a browser profile?
   - YES → use that profile for browser path.
   - NO → ask for the browser profile to use before external posting.

---

## Skills that ARE the wrappers (don't re-implement)

Anytime a user asks for something that an ecosystem tool does, don't call the tool directly  -  route to the skill that wraps it. The wrapping skill handles error cases, auth, retries, and brand calibration.

| User says… | Route to | Don't… |
|---|---|---|
| "scrape this site" | `/firecrawl` | …call `firecrawl` CLI directly from `/cmo`. |
| "search the web" / "research online" | `/exa-search` | …call Exa MCP tools ad hoc without the skill. |
| "research this company" | `/company-research` | …raw Agent API without the skill wrapper. |
| "generate leads" / "prospect list" | `/lead-generation` | …confuse with `lead-magnet`. |
| "transcribe this video" | `mktg transcribe` | …pipe `yt-dlp \| whisper-cli` manually. |
| "make a video from slides" | `video-content` | …shell out to ffmpeg inline. |
| "summarize this" | `/summarize` | …ask the LLM to compress; use the `summarize` CLI for token-bounded output. |
| "post to Instagram" | `postiz` (if configured) else configured browser profile | …tell the user to do it manually. |
| "research this market" | `landscape-scan` | …call `exa-search` alone; landscape-scan does the full chain with Claims Blacklist. |

---

## Install hints

`mktg doctor` surfaces install commands per missing tool. If any of these fail at invocation time, `/cmo` tells the user exactly what to install before retrying:

| Tool | Install |
|---|---|
| `firecrawl` | `npm i -g firecrawl` + `FIRECRAWL_API_KEY` |
| `ffmpeg` | `brew install ffmpeg` |
| `remotion` | `npm i -g @remotion/cli` |
| `playwright-cli` | `npm i -g @playwright/cli` |
| `gh` | `brew install gh` |
| `whisper-cli` | `brew install whisper-cpp` |
| `yt-dlp` | `brew install yt-dlp` |
| `summarize` | `npm i -g @steipete/summarize` |
| Exa (MCP + skills) | Set `EXA_API_KEY` from https://dashboard.exa.ai/api-keys; repo ships `.mcp.json` |
| `higgsfield` | `npm i -g @higgsfield/cli && higgsfield auth login` |

Ecosystem table authoritative source: `CLAUDE.md` at repo root. This rules file mirrors the CMO-relevant slice; when they drift, CLAUDE.md wins.
