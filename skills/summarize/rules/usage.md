---
name: summarize-cli-usage
description: |
  Idiomatic usage patterns, flag combinations, and output shapes for the `summarize` CLI when orchestrated from mktg.
  Package: https://www.npmjs.com/package/@steipete/summarize
  Source: https://github.com/steipete/summarize
---

# summarize CLI Usage Patterns

How mktg skills and orchestrators should drive `summarize` in practice. Read [install.md](install.md) first if the binary is not present.

## Input shapes

`summarize` accepts three input modes. Use them in this order of preference for mktg work:

### 1. File path (preferred)

```bash
summarize /path/to/input.md --length short --plain
```

- Cleanest for agents. No quoting hell, no size limits beyond the LLM provider's own.
- Writes output to stdout. Redirect with `>` or `-o` patterns.
- Works with `.md`, `.txt`, `.json`, `.yaml`, `.xml`, plus `.pdf` if you want the upstream provider routing — but for mktg's Pillar 3 role, stick to plain text/markdown.

### 2. Stdin via `-`

```bash
cat /tmp/article.md | summarize - --length medium --plain
pbpaste | summarize - --length short --plain
mktg transcribe "<url>" --json | jq -r '.data.transcript' | summarize - --plain
```

- Use for piped chains (most common in mktg: `mktg-transcribe` → `summarize`).
- **50MB cap** upstream. Huge transcripts should be written to a file first, then use mode 1.
- Whitespace-only stdin is rejected with an error — don't pipe blank input.
- The literal `-` argument is how you tell summarize to read stdin. Forget it and you'll get "missing input".

### 3. URL / direct media (AVOID in mktg)

Upstream summarize accepts URLs, YouTube, podcasts, and PDFs directly. **Do not use this mode in mktg skills.** Pillar 1 (`mktg-transcribe`), Pillar 4 (`firecrawl`), and Pillar 2 (`mktg-x`) own ingestion. Let them extract, then hand the raw text to summarize.

## Output shapes

### Plain text (default for Pillar 3 chains)

```bash
summarize input.md --length short --plain --no-color
```

- `--plain` strips ANSI/OSC markdown rendering. Agents want the raw text.
- `--no-color` is belt-and-suspenders — some TTYs sneak color back in.
- Output goes to stdout. Redirect or capture as needed.

### JSON envelope (for agent consumption with metadata)

```bash
summarize input.md --length short --plain --json > .summarize/out.json
```

Produces a machine-readable envelope. Parse it with `jq`:

```bash
jq -r '.summary' .summarize/out.json       # the actual condensed text
jq '.metrics' .summarize/out.json          # model used, tokens, latency
jq -r '.prompt' .summarize/out.json        # the prompt sent to the LLM
```

- **Always write JSON output to `.summarize/`**, never into stdout-to-context. A single run can exceed 10KB of envelope noise.
- `.summarize/` should be in `.gitignore`. Treat it the same way firecrawl treats `.firecrawl/`.

### Extract-only (skip summarization, get the raw extract)

```bash
summarize "<url>" --extract --format md
```

Not used by mktg — this is the upstream URL fetching path, which belongs to firecrawl in our system. Documented here for completeness.

## Length presets

`--length` is a **guideline**, not a hard cap. Upstream picks a character target:

| Preset | Target chars | When to use |
|---|---|---|
| `short` (or `s`) | ~900 (600–1,200) | Preview cards, hooks, one-sentence-gist requests |
| `medium` (or `m`) | ~1,800 (1,200–2,500) | **Default.** Exec summaries, TL;DR at the top of a memo |
| `long` (or `l`) | ~4,200 (2,500–6,000) | Detailed digests, newsletter intros, podcast rundowns |
| `xl` | ~9,000 (6,000–14,000) | Thorough condensations, long-form pre-reads |
| `xxl` | ~17,000 (14,000–22,000) | Near-full summaries (rare — if you want this, you probably want the full text) |
| Numeric (`--length 2500`) | Exact char target | When you have a specific UI slot to fill. Minimum 50. |

**Hard cap:** if you truly need the output to never exceed N tokens, add `--max-output-tokens <count>` (minimum 16). Prefer `--length` unless you need a provider-enforced ceiling.

**Short-input behavior:** when the extracted content is shorter than the requested length, upstream returns the content as-is without calling the LLM. Override with `--force-summary` if you need the LLM to run regardless (rare). mktg's On Activation check catches this *before* the subprocess call anyway — aim to not waste the round-trip.

## Model selection

mktg defaults to `--model auto` (which upstream picks automatically — you don't need to pass it). Auto ordering:

1. If `--cli <provider>` is explicit, use that.
2. If `cli.enabled` is set in `~/.summarize/config.json`, use those CLI providers in order.
3. If API keys are set for cloud providers, use them.
4. Fallback: try coding CLI providers (`claude`, `gemini`, `codex`, `agent`, `openclaw`, `opencode`) in order.

**Recommended default for mktg:**

```bash
summarize <input> --cli claude --plain --length short
```

`--cli claude` routes to Claude Code (which the user almost certainly already has authenticated if they're using mktg). Zero new credentials, zero new rate limits.

To force a specific model:

```bash
summarize input.md --model anthropic/claude-sonnet-4-5 --plain
summarize input.md --model openai/gpt-5-mini --plain
summarize input.md --model google/gemini-3-flash --plain
```

Model IDs follow `<provider>/<model>`. Full list in upstream README. Don't hard-code a specific model in skills — let `--model auto` + `--cli claude` do the right thing.

## Timeouts and retries

```bash
summarize input.md --timeout 2m --retries 1
```

- `--timeout` accepts `30s`, `2m`, `5000ms`. Default is `2m`.
- `--retries` sets LLM retry attempts on timeout. Default is `1`.
- For agent loops, bump to `--timeout 5m --retries 2` if inputs are large (>20K chars).

## Verbose / diagnostics

```bash
summarize input.md --plain --verbose
```

- `--verbose` writes debug/diagnostics to **stderr**. Never parse stderr as the summary.
- Useful when debugging "why did this pick model X" or "why did it fail silently".
- `--metrics detailed` prints extra metrics. Default is `on`.

## When to prefer summarize vs direct LLM summarization

**Prefer summarize (chain-in) when:**
- You want consistent output shape across agent loops (same CLI, same flags, same provider selection).
- You want free provider fallback via `--cli claude` / `--cli codex` / `--cli gemini`.
- You're in a pipeline (`mktg-transcribe | summarize | ...`) where a dedicated subprocess is cleaner than an inline LLM call.
- You want metrics/telemetry for summarization specifically (input chars, output chars, model, latency).

**Prefer direct LLM summarization (no chain-in) when:**
- The calling skill already has an LLM round-trip in flight and the summary is a byproduct.
- The input is short enough that the subprocess overhead outweighs the LLM call cost.
- The user doesn't have `summarize` installed and you're at L0 progressive-enhancement degradation — write the summary inline.

**Never use summarize when:**
- The content is structured data (JSON/CSV/code). Explain it natively instead.
- The input is already short (<500 words, <3000 chars). Return as-is.
- The caller explicitly wants the full content preserved (brand memory, legal, verbatim quotes).

## Common pitfalls

1. **Forgetting `--plain`.** Without it, output is streamed ANSI/OSC markdown with cursor codes. Looks pretty in a TTY, breaks in agent loops. Always pass `--plain` for programmatic consumption.
2. **Forgetting the `-` for stdin.** `cat foo | summarize` fails. You need `cat foo | summarize -`.
3. **Piping huge blobs directly into shell args.** Never `summarize "$(cat bigfile)"`. Always use mode 1 (file path) or mode 2 (stdin `-`). Shell argv has limits and escaping is a nightmare.
4. **Reading long summaries into agent context.** Use `.summarize/` file output + `head`/`grep` like firecrawl does.
5. **Assuming `--json` gives you just the summary.** The envelope includes metrics, prompt, and diagnostics. Use `jq -r '.summary'` to pluck the condensed text.
6. **Using upstream's URL/YouTube/PDF modes inside mktg.** Ingestion belongs to other pillars. Keep this skill scoped to text-in → text-out.
7. **Chaining `--force-summary` by default.** Only use it when you have a specific reason to force the LLM call over short content. Default off.
8. **Not handling exit codes.** If `summarize` fails (timeout, provider error, no content), it exits non-zero. Agents should check `$?` or equivalent and degrade gracefully — the caller's original content is still valid without a TL;DR.

## Parallelization

Independent summarization calls can run in parallel:

```bash
summarize article-1.md --plain --length short > .summarize/1.md &
summarize article-2.md --plain --length short > .summarize/2.md &
summarize article-3.md --plain --length short > .summarize/3.md &
wait
```

Watch out for provider rate limits — if you're using the same API key across 10 parallel calls, you'll hit 429s. Coding CLI providers (`--cli claude` etc.) are serialized locally so parallelism there is capped by your local CLI runtime.

## Cheat sheet

```bash
# Default mktg invocation
summarize input.md --plain --length short

# With claude fallback (zero new auth)
summarize input.md --cli claude --plain --length short

# Stdin from a pipe
cat input.md | summarize - --plain --length medium

# JSON envelope for telemetry
summarize input.md --plain --length short --json > .summarize/out.json

# Long-form digest
summarize input.md --plain --length long

# Hard token cap for UI slots
summarize input.md --plain --length 1200 --max-output-tokens 400
```
