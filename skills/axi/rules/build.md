# Build or Review an AXI

Use when the user wants a new agent-facing CLI, or a review of an existing one against AXI.

## Checklist (map to principles.md)

1. **TOON stdout** — lists/detail/errors in TOON; JSON only internally.
2. **Minimal defaults** — 3–4 list fields; `--fields` escape hatch.
3. **Truncation** — preview + `(truncated, N chars — use --full)`.
4. **Aggregates** — `count`/`total`; inline CI/status summaries; combined operations for multi-step actions.
5. **Empty states** — explicit zero-result lines on success.
6. **Errors** — stdout structured errors; idempotent mutations; no prompts; unknown flags exit 2 with valid list.
7. **Ambient** — `setup hooks` for Claude Code + Codex + OpenCode; ship Agent Skill as secondary.
8. **Content first** — no-args home view with `bin`, `description`, live data, `help[]`.
9. **Contextual disclosure** — next-step command templates; parameterize runtime values.
10. **`--help`** — concise per subcommand.

## Scaffold path (upstream)

```sh
npx skills add kunchenguid/axi
```

That installs the upstream build skill (snapshot also at `references/upstream-axi-skill.md`). Prefer generating `SKILL.md` from the same source as the no-args home view so skill ↔ CLI never drift (`--check` in CI).

## Packaging patterns

| Pattern | When | Example |
|---|---|---|
| npm CLI + `npx -y` | Default for reusable tools | `gh-axi`, `chrome-devtools-axi` |
| Skill-embedded AXI | Internal / demo without global binary | `specops` |
| Hooks + skill | Power users want ambient context | `gh-axi setup hooks` |

## Review rubric (agent)

For each principle 1–10, cite a concrete command output from the CLI under review. Fail the review if:

- no-args prints only help text
- list output lacks total count
- mutations prompt interactively
- unknown flags are silently ignored
- errors dump raw SDK/stack traces to the agent

## Contribute upstream

After your AXI is solid, add it via the [AXI contributor workflow](https://github.com/kunchenguid/axi/blob/main/CONTRIBUTING.md) (`catalog.yaml` + `pnpm run docs:gen`).
