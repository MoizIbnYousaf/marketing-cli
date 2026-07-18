# The 10 AXI Principles

Source of truth summary: [`principles.yaml`](https://github.com/kunchenguid/axi/blob/main/principles.yaml).
Full build-oriented specification: [references/upstream-axi-skill.md](../references/upstream-axi-skill.md) (upstream `.agents/skills/axi/SKILL.md`).
Read the [TOON spec](https://toonformat.dev/reference/spec.html) before implementing principle 1.

## Efficiency

### 1. Token-efficient output

Use [TOON](https://toonformat.dev/) on stdout (~40% savings vs JSON). Convert at the output boundary; keep internals on JSON.

```
issues[2]{number,title,state}:
  42,Fix login bug,open
  43,Add dark mode,open
```

### 2. Minimal default schemas

Default list items: 3–4 fields, not 10+. Offer `--fields` for expansion. Long bodies belong in detail views.

### 3. Content truncation

Truncate large text with a size hint and `--full` escape hatch. Never omit the field entirely.

```
body: First 500 chars...
  ... (truncated, 8432 chars total — use --full)
```

## Robustness

### 4. Pre-computed aggregates

Include `count` / `total` and cheap derived summaries (e.g. `checks: "27 passed, 0 failed"`) so agents skip follow-up calls. Applied to **actions** too: combined ops (`open`, `fill --submit`, `click --query`) are aggregates over navigate+snapshot+filter.

### 5. Definitive empty states

Say `0 results` with context. Empty stdout is indistinguishable from silent failure.

### 6. Structured errors & exit codes

- Idempotent mutations → exit 0 on no-op
- Structured errors on **stdout** (not raw dependency leaks)
- No interactive prompts — flags only
- Unknown flags → exit 2 with valid-flag list (self-correcting in one turn)
- stdout = data/errors/suggestions; stderr = debug; exit 0/1/2

## Discoverability

### 7. Ambient context

Primary: opt-in session hooks (`setup hooks`) for Claude Code / Codex / OpenCode that inject a compact directory-scoped home view.
Secondary: installable Agent Skill generated from the same home-view guidance (`npx skills add …`).

### 8. Content first

No-args shows live state + `bin` + one-line `description`, not a usage manual.

### 9. Contextual disclosure

Append `help[]` next-step **command templates**. Carry fixed disambiguating flags; parameterize runtime values (`<id>`, `"…"`). Omit when the answer is self-contained.

### 10. Consistent way to get help

Every subcommand supports concise `--help` (flags, defaults, 2–3 examples). Do not dump the entire CLI manual.
