# CLI Improvement Plan — marketing-cli (`mktg`)

> Sprint-persistence doc for making the CLI’s orchestration loop trustworthy.
> Status: `in_progress` (plan authored). Resume by picking the next `pending` phase.

## Reference data (don’t modify without explicit instruction)

| Field | Value |
|---|---|
| Product | `marketing-cli` / `mktg` |
| Package manager | Bun |
| North star | Agent-native playbook OS — skills are LLM playbooks; CLI owns memory, contracts, prereqs, outcomes, publish truth |
| Non-goal | Become “AI that writes LinkedIn inside the CLI” / replace the agent |
| Evidence base | Cloud dogfood 2026-07-18: 64-skill install, offline GTM pack, native publish staging |
| Related | `CONTEXT.md`, `CLAUDE.md`, `AGENTS.md`, `docs/skill-contract.md` |

### Dogfood findings that drive this plan

1. **`mktg run` ≠ work** — loads `SKILL.md`, logs `result: "success"`, often with empty `brandFilesChanged`.
2. **`mktg plan` trusts the wrong signal** — can recommend distribute after a load-only “run.”
3. **Docs oversell the load envelope** — `CONTEXT.md` says run returns brand context; it doesn’t (separate `mktg context`).
4. **Prereqs are incomplete** — brand/skill deps only; tools/envs/catalogs absent → Tier-2 skills look green then fail mid-playbook.
5. **Publish status is ambiguous** — `mktg-native --confirm` queues locally; agents read that as “posted.”
6. **Two human UIs** — `dashboard` vs `studio` confuse agents and humans.
7. **`mktg cmo` is Claude-Code-coupled** — no portable structured router for Cursor/Codex/CI.
8. **Catalog sync/status partially stubbed** — advertised behavior ≠ implementation (exit 6 / null health).

---

## Phase Status Tracker

| # | Phase | Status | PR/Commit | Notes |
|---|---|---|---|---|
| 0 | Plan authored (this doc) | `completed` | — | 2026-07-18 |
| 1 | Honest skill lifecycle (`loaded` vs `completed`) | `pending` | | Foundation for everything else |
| 2 | One-shot activation (`run --with-context`) | `pending` | | Can ship parallel to P1 after log shape lands |
| 3 | Outcome-aware `plan` / `status` / dashboard | `pending` | | Depends on P1 |
| 4 | Rich prerequisites + `--strict` | `pending` | | |
| 5 | Publish truth + promote path | `pending` | | |
| 6 | Portable `mktg route` (+ CMO runner clarity) | `pending` | | |
| 7 | Studio vs dashboard consolidation | `pending` | | |
| 8 | Studio npm resolve + doctor check | `pending` | | Small; can jump ahead |
| 9 | Catalog sync/probe (or un-advertise) | `pending` | | |
| 10 | Skill script exec allowlist | `pending` | | Bigger bet |
| 11 | Strict skill-contract enforcement | `pending` | | |
| 12 | Docs/CONTEXT/`/cmo` index sync | `pending` | | Continuous; hard gate before each release |

Status values: `pending` → `in_progress` → `completed` | `skipped` (with reason).

---

## Principles (non-negotiable)

1. **Progressive enhancement** — every skill still works at L0; brand enhances, never gates.
2. **Agent DX 21/21 preserved** — JSON, `--dry-run`, `--fields`, schemas, validators, safety rails.
3. **Skills never call skills** — CLI + `/cmo`/`route` orchestrate; skills read/write files.
4. **Honesty over magic** — statuses name what actually happened (`loaded`, `queued-local`, `unimplemented`).
5. **No mocks in tests** — real temp dirs; no fake “success” without real writes when asserting completion.
6. **Ship vertical slices** — each phase leaves `bun test` green and CONTEXT accurate.

---

## Target loop (end state)

```text
doctor → status → route|cmo → run --with-context (loaded)
  → agent produces files under brand/|marketing/|.mktg/
  → run --complete --writes … --result … (completed)
  → plan (artifact-aware next steps)
  → publish (queued-local | draft-external | sent)
```

---

## Phase 1 — Honest skill lifecycle

**Problem:** Load is logged as success; agents and `plan` believe work happened.

### Scope

| Change | Detail |
|---|---|
| Log events | `loaded` (default) vs `completed` (explicit) |
| Flags | `--complete`, `--result success\|partial\|failed`, `--writes <paths>`, keep `--learning` |
| Default | `mktg run X` logs `loaded`, not `success` |
| History | `mktg run <skill> --history --json` (or `mktg skill history`) returns both event types |
| Schema | Update `run` responseSchema + examples |
| Backward compat | Consumers that key on `result: "success"` for loads: document break; prefer alias field `event: "loaded"\|"completed"` and deprecate treating load as success |

### Acceptance criteria

- [ ] Bare `mktg run seo-content --json` → `event: "loaded"`, history entry is not counted as execution by plan
- [ ] `mktg run seo-content --complete --writes marketing/content/x.md --result success --json` validates writes exist (sandboxPath), logs `completed`
- [ ] Missing/invalid write paths → exit 2 with fix guidance (no silent success)
- [ ] Integration tests cover load vs complete; plan fixture proves load alone doesn’t unlock distribute
- [ ] `CONTEXT.md` §“Load a skill” wording matches reality

### Invasiveness

**M** — `src/commands/run.ts`, history store, plan consumers, schema, a few integration tests.

### Suggested commit series

1. Add `event` field + stop defaulting load to `success` (compat note in changelog)
2. Add `--complete` / `--writes` / `--result`
3. Wire plan/status to `completed` only (Phase 3 can finish scoring)

---

## Phase 2 — One-shot activation envelope

**Problem:** Agents need 2–3 calls (`run` + `context` + sometimes claims) before executing a skill.

### Scope

| Change | Detail |
|---|---|
| Flag | `mktg run <skill> --with-context [--budget N] --json` |
| Payload | `{ skill, content, prerequisites, priorRuns, context: { files, layer, claimsBlacklist? } }` |
| Selection | Use manifest `reads` + `CONTEXT_MATRIX`; respect token budget |
| Default | Opt-in first; consider default-on after one minor release if payload size OK |

### Acceptance criteria

- [ ] Single call returns skill body + non-template brand slices for declared `reads`
- [ ] `--fields` can trim `context.files.*` / omit `content`
- [ ] Budget overflow returns structured warning + truncated file list (no silent drop without signal)
- [ ] Docs claim in CONTEXT.md becomes true when flag is used

### Invasiveness

**S** — compose existing `context` + `run` handlers.

---

## Phase 3 — Outcome-aware plan / status / dashboard

**Problem:** Detection-order “plan” and existence heuristics recommend the wrong next move.

### Scope

| Change | Detail |
|---|---|
| Signals | Count `completed` runs; scan `marketing/` for artifacts; brand template vs populated |
| Scoring | setup → populate → refresh → execute → distribute (documented weights) |
| Distribute gate | Require artifacts under `marketing/` **or** completed run with writes — never load-only |
| Health | `ready` only when foundation non-template thresholds met (define exactly in schema) |
| Commands on tasks | Prefer `mktg run X --with-context` / `mktg route` / `mktg cmo --dry-run` over bare `mktg run` |
| Dashboard JSON | Same semantics as CLI plan (no divergent heuristics) |

### Acceptance criteria

- [ ] Fixture: brand templates → plan says populate, not distribute
- [ ] Fixture: load-only history → plan still recommends execute/content skills
- [ ] Fixture: `marketing/content/**` present → distribute tasks appear
- [ ] Schema documents ranking (no more “detection order only” lie)
- [ ] Agent DX tests updated for new plan fields

### Invasiveness

**M** — `plan.ts`, status summary fields, dashboard contract tests.

---

## Phase 4 — Rich prerequisites + `--strict`

**Problem:** Tier-2 skills pass prereq checks then fail for missing API keys/CLIs.

### Scope

| Check class | Sources |
|---|---|
| Skills | `depends_on` (existing) |
| Brand | `reads` + template detection (existing) |
| Tools | Ecosystem table / doctor tool registry |
| Envs | Manifest / skill frontmatter `env_vars` |
| Catalogs | `catalog info` configured/missing_envs |

| Flag | Behavior |
|---|---|
| default | Warn in `prerequisites` object (today’s spirit) |
| `--strict` | Unsatisfied required prereq → exit 3/4 with `remediation[]` |

### Acceptance criteria

- [ ] `mktg run postiz --json` surfaces `POSTIZ_API_KEY` missing even without `--strict`
- [ ] `mktg run postiz --strict --json` non-zero exit when key missing
- [ ] Offline skill (e.g. `content-atomizer`) remains exit 0 with empty envs
- [ ] Doctor and run remediation strings stay consistent (same install hints)

### Invasiveness

**M** — shared prereq module used by `run` + `doctor`.

---

## Phase 5 — Publish truth + promote path

**Problem:** Local queue and remote send look the same to agents.

### Scope

| Status enum | Meaning |
|---|---|
| `queued-local` | Written to `.mktg/native-publish/` |
| `draft-external` | Created as draft on Typefully/Postiz/etc. |
| `sent` | Confirmed sent/scheduled on external network |
| `written-file` | File adapter output under `.mktg/published/` |
| `failed` | Error with detail |

Additional:

- Result payload always includes `status` per item (not only published counts).
- Optional: `mktg publish --promote --from native --to postiz --dry-run/--confirm`.
- Studio labels match CLI enums 1:1 (`studio-api-index.md`).

### Acceptance criteria

- [ ] Native `--confirm` returns `queued-local`, never implies `sent`
- [ ] Typefully/Postiz success maps to `draft-external` or `sent` based on API response
- [ ] CONTEXT + publish-index document the enum
- [ ] Integration tests lock the enum strings

### Invasiveness

**M** — publish adapters + Studio contract + docs.

---

## Phase 6 — Portable routing (`mktg route`)

**Problem:** Orchestration is advertised broadly but `mktg cmo` requires Claude Code CLI.

### Scope

| Command | Behavior |
|---|---|
| `mktg route "<prompt>" --json` | Deterministic/table + heuristic route → `{ skill, playbook, confidence, rationale, nextCommand }` — **no LLM** |
| `mktg cmo` | Keep Claude spawn; document `--runner claude` (default); fail clearly if binary missing |
| Future (out of phase) | `--runner cursor\|prompt-only` |

Reuse `/cmo` disambiguation tables where possible (single source in code or generated from skill metadata).

### Acceptance criteria

- [ ] `mktg route "write a show hn post" --json` → `startup-launcher` or `launch-strategy` with confidence
- [ ] Works in CI without `claude` binary
- [ ] `mktg cmo --dry-run` still previews spawn; live path unchanged
- [ ] CMO skill docs point agents at `route` when Claude unavailable

### Invasiveness

**S** for `route` table; **L** if multi-runner is pulled in (don’t — keep out of this phase).

---

## Phase 7 — Studio vs dashboard consolidation

**Problem:** Two “open a UI” stories.

### Decision (proposed)

| Surface | Role |
|---|---|
| `mktg studio` | **Canonical human UI** (Next + Bun API) |
| `mktg dashboard` | **JSON command-center only** (no implicit server confusion), or alias → studio with deprecation warning for launcher subcommands |

### Acceptance criteria

- [ ] README / CONTEXT list one “open UI” command
- [ ] Agents using dashboard get JSON snapshots without being told to open port 4311 as the product UI
- [ ] Deprecation warning (if any) includes remove-by version

### Invasiveness

**S** (docs + alias) to **M** (code merge). Prefer S first.

---

## Phase 8 — Studio packaging resolve path

**Problem:** Launcher messaging can claim mktg-studio isn’t on npm while the tarball ships `studio/`.

### Scope

- Resolve packaged `studio/bin/mktg-studio.ts` from installed package root first.
- Rewrite install suggestions for npm users.
- `mktg doctor` check: `studio-launcher-resolves`.

### Acceptance criteria

- [ ] Fresh `npm i -g marketing-cli` (or bun link) → `mktg studio --dry-run` resolves without sibling checkout
- [ ] Doctor fails clearly when studio assets missing from install

### Invasiveness

**S**

---

## Phase 9 — Catalog sync / status honesty

**Problem:** Documented GitHub drift checks / health probes aren’t real.

### Option A (prefer): implement thin versions

- `catalog sync --dry-run` — compare `version_pinned` to latest GitHub release tag
- `catalog status --probe` — optional HTTP readiness (postiz is-connected style)

### Option B: un-advertise

- Schema + CONTEXT mark `unimplemented` until built; exit 6 stays but docs don’t promise drift checks

### Acceptance criteria

- [ ] Either A green with tests, or B with zero docs claiming live sync
- [ ] No silent `healthy: null` without `status: "unimplemented"` field

### Invasiveness

**M** for A; **S** for B.

---

## Phase 10 — Skill script exec allowlist

**Problem:** Some skills already ship `scripts/`; agents reinvent invocation.

### Scope

```bash
mktg skill exec <skill> --script <name> --input '{...}' --json
# or: mktg run <skill> --script <name> -- …
```

- Resolve install dir; sandbox cwd; allowlist skills that declare scripts in manifest/frontmatter.
- Return stdout as JSON envelope; never shell unsandboxed paths.

### Acceptance criteria

- [ ] Allowlisted skill script runs under temp project and returns structured result
- [ ] Unknown skill/script → exit 1/2
- [ ] Path escape attempts rejected by existing validators
- [ ] Non-allowlisted skills cannot exec arbitrary files

### Invasiveness

**M–L** — start with 1–2 skills (`mktg-x` or a tiny fixture skill in tests).

---

## Phase 11 — Strict skill-contract enforcement

**Problem:** Drop-in quality drift (missing Anti-Patterns, >500 lines, incomplete frontmatter).

### Scope

- `mktg skill validate --strict` and/or `mktg doctor --check-skills`
- Fail on: missing Anti-Patterns, line cap, required `reads`/`writes` for foundation tiers, broken `depends_on` DAG
- Remove e2e exemptions as skills are fixed (separate cleanup PRs OK)

### Acceptance criteria

- [ ] CI job runs strict validate on bundled skills
- [ ] Intentional exemptions are explicit in manifest, not silent test skips

### Invasiveness

**S** for the gate; skill cleanups vary.

---

## Phase 12 — Docs and runtime-index sync

**Continuous rule:** every phase that changes command semantics updates:

- `CONTEXT.md`
- `skills/cmo/rules/cli-runtime-index.md`
- `skills/cmo/rules/publish-index.md` (if publish)
- `skills/cmo/rules/studio-api-index.md` (if studio)
- `mktg schema` examples
- Changelog / release notes bullet

### Acceptance criteria

- [ ] No CONTEXT claim contradicts `mktg schema <cmd> --json`
- [ ] Dogfood script or CI snapshot: key help strings grep-tested optional

---

## Suggested shipping order (vertical slices)

```text
P1 lifecycle ─┬─► P3 plan/status
              └─► P2 --with-context (parallel after event field exists)
P4 prereqs (parallel with P2)
P5 publish truth
P6 route
P8 studio resolve (anytime)
P7 UI consolidation (after P8)
P9 catalogs
P11 skill contracts
P10 script exec (last among big bets)
P12 ongoing
```

### Milestone bundles (for PRs)

| Milestone | Phases | User-visible win |
|---|---|---|
| **M1 — Honest loop** | 1, 3, 12 (partial) | Load ≠ done; plan stops lying |
| **M2 — Faster activation** | 2, 4 | One-shot context + real prereqs |
| **M3 — Trustworthy distribute** | 5, 9 | Publish/catalog statuses you can bet on |
| **M4 — Portable orchestrate** | 6, 7, 8 | Route anywhere; one UI story |
| **M5 — Execute where scripts exist** | 10, 11 | CLI runs allowlisted engines; contracts enforced |

---

## Testing strategy (per phase)

| Layer | Requirement |
|---|---|
| Unit | History event types; prereq matrix; publish status mapping |
| Integration | Real temp dirs; `run` load/complete; plan fixtures; publish dry-run/confirm |
| DX axes | Keep 21/21; update tests if envelopes gain fields |
| Manual dogfood | Repeat offline GTM slice: load → write under `marketing/` → complete → plan → native publish; assert statuses |

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Breaking agents that parse `result: "success"` on load | Add `event` field; changelog; keep transitional dual-read in plan for one minor |
| Context payload blows token budgets | `--budget`, `--fields`, default opt-in for `--with-context` |
| Over-building script exec into a plugin host | Allowlist + JSON only; no arbitrary shell |
| Docs drift again | Phase 12 checklist on every PR template checkbox |
| Scope creep into “CLI writes the blog post” | Reaffirm non-goal; skills remain playbooks |

---

## Explicit non-goals (this plan)

- Vendoring Postiz / scheduling SaaS into the core
- Replacing `/cmo` skill markdown with a closed proprietary planner
- Guaranteeing live social posts without BYO credentials
- Auto-running all 64 skills without an agent
- Redesigning Studio UI aesthetics (unless blocked by API contract)

---

## Open decisions (resolve before or during the named phase)

| Decision | Options | Needed by |
|---|---|---|
| Rename `run` → `load`? | Keep `run` + honest events **(prefer)** vs rename + alias | P1 |
| `--with-context` default on? | Opt-in → default in next minor | P2 |
| Dashboard fate | Deprecate launcher / JSON-only / alias to studio | P7 |
| Catalog stubs | Implement vs un-advertise | P9 |
| Multi-runner CMO | Defer past P6 | post-M4 |

---

## Resume protocol

1. Read this file’s Phase Status Tracker.
2. Pick the first `pending` phase in the Suggested shipping order that isn’t blocked.
3. Open a PR named `feat(cli): <phase title>` against `main`.
4. Update the tracker row to `in_progress` / `completed` **in the same commit** as the phase work.
5. Re-dogfood the affected command with `--json` and paste a short evidence blurb in the PR.

---

## Appendix A — Command surface after M4 (sketch)

| Command | Role |
|---|---|
| `mktg run` | Load (+ optional context); `--complete` for outcomes |
| `mktg route` | Portable skill routing |
| `mktg cmo` | Claude Code orchestrator (optional runner) |
| `mktg plan` | Outcome-aware queue |
| `mktg publish` | Distribute with explicit status enum |
| `mktg studio` | Human UI |
| `mktg dashboard` | JSON snapshots (no competing product UI) |
| `mktg catalog` | Honest sync/status |
| `mktg skill exec` | Allowlisted scripts (M5) |

## Appendix B — Success metrics (qualitative)

- A new agent can complete offline GTM (article → atoms → native queue) without being misled by history.
- `mktg plan --json` after load-only does **not** recommend publish.
- `mktg publish --adapter mktg-native --confirm --json` clearly says `queued-local`.
- `mktg route` works in this cloud VM without `claude`.
- CONTEXT.md examples match schema on a fresh checkout.
