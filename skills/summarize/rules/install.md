---
name: summarize-cli-installation
description: |
  Install the `summarize` CLI (chained-in from steipete/summarize) and verify it is ready for mktg to orchestrate.
  Package: https://www.npmjs.com/package/@steipete/summarize
  Source: https://github.com/steipete/summarize
  Homepage: https://summarize.sh
---

# summarize CLI Installation

`summarize` is a **chained-in** CLI — mktg does not vendor or fork it. The user installs it once from upstream and mktg orchestrates it. This mirrors how the `firecrawl` skill works.

## Prerequisites

- **Node.js 22+** is required. Check with `node --version`. If missing, install via:
  - macOS: `brew install node@22`
  - Linux/WSL: use [nvm](https://github.com/nvm-sh/nvm) → `nvm install 22 && nvm use 22`
  - Windows: https://nodejs.org/en/download
- **A working shell and `PATH`** that picks up global npm or Homebrew binaries.

## Quick install (recommended)

Pick ONE of the three paths below.

### Option 1 — npm global (cross-platform, easiest)

```bash
npm i -g @steipete/summarize
```

### Option 2 — Homebrew (macOS / Linuxbrew)

```bash
brew install summarize
```

Homebrew ships `summarize` from `homebrew/core`.

### Option 3 — npx (no install, every invocation re-downloads)

```bash
npx -y @steipete/summarize "<input>"
```

Use this only for one-off trials. For anything mktg routes through, prefer Option 1 or 2 so the binary stays resident.

## Verify

```bash
summarize --version
```

Expected: a version string like `1.x.x` on stdout, exit code 0. If you see `command not found`, skip to "If installation fails" below.

Additional readiness check:

```bash
summarize --help | head -20
```

Should print the help banner with `Usage: summarize <input> [flags]`.

## Optional local dependencies (NOT required for mktg's Pillar 3 role)

Upstream `summarize` can also transcribe audio, extract slides, and fetch URLs. mktg **does not use those features** — Pillar 1 (`mktg-transcribe`), Pillar 4 (`firecrawl`), and Pillar 2 (`mktg-x`) own ingestion. You can skip all of these and still have a fully working mktg chain-in:

- `ffmpeg` — only needed for upstream's `--slides` mode (not used by mktg)
- `yt-dlp` — only needed for upstream's YouTube slide extraction (not used by mktg)
- `tesseract` — only needed for upstream's `--slides-ocr` (not used by mktg)

If you also want to use upstream `summarize` directly for URL/YouTube/PDF work outside mktg, install `ffmpeg` + `yt-dlp` via Homebrew. For mktg purposes, they are not dependencies.

## Optional model provider credentials

`summarize` routes text through an LLM. It auto-selects the best available provider from what you've configured. For mktg's needs, you can use **any** of:

- **Coding CLI providers** (zero API key, uses your existing login):
  - `claude` — Claude Code CLI, authenticated via `claude auth`
  - `codex` — Codex CLI, authenticated via `codex login`
  - `gemini` — Gemini CLI
  - `opencode` — OpenCode runtime
- **API keys** (if you prefer cloud models):
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `GOOGLE_API_KEY` / `GEMINI_API_KEY`
  - `GROQ_API_KEY`
  - `OPENROUTER_API_KEY` (free tier: `summarize refresh-free`)

**mktg recommendation:** if you already have Claude Code installed (which you almost certainly do if you're reading this), let `summarize` fall back to `--cli claude`. Zero new keys, zero new bills, zero new auth flows. Set it once:

```bash
summarize /tmp/test.txt --cli claude --plain
```

If the run succeeds, you're done — `--model auto` will prefer `claude` automatically in the future.

## If installation fails

### `command not found: summarize`

1. Check your npm global bin path is on `PATH`:
   ```bash
   npm bin -g
   echo $PATH
   ```
   If the global bin dir is missing, add it to `~/.zshrc` / `~/.bashrc`.
2. Try npx as a sanity check:
   ```bash
   npx -y @steipete/summarize --version
   ```
   If that works but `summarize` alone doesn't, the binary never got symlinked — reinstall with `npm i -g --force @steipete/summarize`.
3. On Homebrew: run `brew doctor` and `brew link summarize`.

### `node: not found` or Node version errors

The package requires **Node 22+**. Upgrade:
- `brew install node@22 && brew link --overwrite node@22`
- `nvm install 22 && nvm alias default 22`

### `EACCES` permission errors on global install

Do NOT use `sudo`. Instead, fix npm's global prefix:
```bash
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
npm i -g @steipete/summarize
```

### "No model provider available"

If `summarize --version` works but running it fails with "no provider", configure one — see "Optional model provider credentials" above. The fastest path is `--cli claude` if Claude Code is installed.

### Windows / WSL notes

- WSL2 on Ubuntu: install Node 22 via `nvm`, then `npm i -g @steipete/summarize`. Homebrew on Linuxbrew works too.
- Native Windows PowerShell: use `npm i -g @steipete/summarize`. Make sure `%APPDATA%\npm` is on your PATH.

## Verify from mktg

After install, run `mktg doctor` — the summarize chain-in check turns green when the doctor entry is present. Until then, verify manually:

```bash
summarize --version && echo "OK: summarize is chained in"
```

## Upgrade path

```bash
npm update -g @steipete/summarize
# or
brew upgrade summarize
```

Upstream releases are frequent; upgrade every few weeks to pick up new provider and model support. mktg tracks a review interval of 180 days on the skill manifest — treat that as the *minimum* cadence for re-reading this file, not the upper bound.
