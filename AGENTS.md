# Marketing Agents

> [!IMPORTANT]
> **For CLI runtime usage**, read `CONTEXT.md`.
> **For /cmo runtime indexes**, read `skills/cmo/rules/cli-runtime-index.md`,
> `skills/cmo/rules/publish-index.md`, and
> `skills/cmo/rules/studio-api-index.md`.
> **For development standards**, read `CLAUDE.md`.
> This file covers the 5 marketing sub-agents and the drop-in contracts for skills and agents.

5 sub-agents that `/cmo` spawns for parallel research and review. Installed to `~/.claude/agents/` by `mktg init` and `mktg update`.

## Agent Registry

| Agent | Category | Writes | Reads skill | Spawned by |
|---|---|---|---|---|
| `mktg-brand-researcher` | research | `brand/voice-profile.md` | `brand-voice` | `/cmo` foundation |
| `mktg-audience-researcher` | research | `brand/audience.md` | `audience-research` | `/cmo` foundation |
| `mktg-competitive-scanner` | research | `brand/competitors.md` | `competitive-intel` | `/cmo` foundation |
| `mktg-content-reviewer` | review | none (scores only) | reads `brand/voice-profile.md` | on demand |
| `mktg-seo-analyst` | review | none (scores only) | reads `brand/keyword-plan.md` | on demand |

## How Agents Work

1. **Registry:** `agents-manifest.json` is the source of truth for all agent metadata.
2. **Installation:** `mktg init` and `mktg update` copy agent `.md` files from the package to `~/.claude/agents/`.
3. **Spawning:** `/cmo` spawns all 3 research agents in a single message for maximum parallelism.
4. **Autonomy:** Agents do not ask questions. They research, analyze, and write.
5. **Isolation:** Agents never call other agents. `/cmo` orchestrates.

## Security Posture

> [!IMPORTANT]
> **The agent is not a trusted operator.** Assume all inputs can be adversarial.

| Rule | Detail |
|---|---|
| File writes | Constrained to `brand/`, `marketing/`, `.mktg/` via `sandboxPath()` |
| Resource IDs | Reject `..`, absolute paths, control characters |
| CLI output | Use `--json` for all calls. TTY output is for humans, JSON is the agent contract. |
| Mutations | Use `--dry-run` before any mutating operation |
| Context window | Use `--fields` to minimize payload size |

## Drop-in Skill Contract

Add a new marketing skill without touching CLI code.

### Steps

1. Create `skills/<skill-name>/SKILL.md`
2. Add an entry to `skills-manifest.json`
3. Run `mktg update` to install

### SKILL.md Requirements

| Requirement | Detail |
|---|---|
| Max length | 500 lines. Offload depth to `references/` subdirectory. |
| Frontmatter | `name` and `description` (pushy triggers that combat undertriggering) |
| On Activation | Read brand/ files with fallback behavior for missing files |
| Anti-Patterns | Include WHY each pattern is wrong, plus what to do instead |
| Progressive enhancement | Work at L0 (zero context), improve at L4 (full brand) |
| Voice file reference | Always `voice-profile.md`, never `voice.md` |
| Brand file paths | Always use `brand/` prefix in frontmatter reads |

### CORRECT vs WRONG

```yaml
# CORRECT frontmatter
---
name: seo-content
description: >-
  Create SEO-optimized content. Use when writing blog posts, articles,
  landing page copy, or any content targeting search rankings.
reads:
  - brand/voice-profile.md
  - brand/keyword-plan.md
---
```

```yaml
# WRONG: vague trigger, missing brand prefix, wrong voice file
---
name: seo-content
description: Helps with SEO content.
reads:
  - voice.md
  - keyword-plan.md
---
```

## Drop-in Agent Contract

Add a new marketing agent without touching CLI code.

### Steps

1. Create the agent `.md` file in `agents/research/` or `agents/review/`
2. Add an entry to `agents-manifest.json` with: `category`, `file`, `reads`, `writes`, `skill`, `tier`
3. Run `mktg update` to install

### Agent Rules

| Rule | Detail |
|---|---|
| Never ask questions | Research, analyze, write. Autonomy is the default. |
| Never call other agents | `/cmo` orchestrates all agent coordination. |
| Write to `brand/` only | All output goes to the project's `brand/` directory. |
| Reference a skill | Each agent follows one skill's methodology. |

## Drop-in Catalog Contract

Add a new upstream catalog without touching CLI code. Catalogs are external OSS projects mktg builds on top of via REST API (not vendored source, not linked SDKs).

### Steps

1. Create an entry in `catalogs-manifest.json` under `catalogs.<name>` matching the `CatalogEntry` shape (see `src/types.ts`).
2. Implement whatever the `capabilities` advertise:
   - `publish_adapters[]` → add the adapter to `ADAPTERS` and `ADAPTER_ENV_VARS` in `src/commands/publish.ts`.
   - `scheduling_adapters[]` → reserved for cal.com-style catalogs; future.
   - `email_adapters[]` → reserved for listmonk-style catalogs; future.
   - `skills[]` → create the corresponding `skills/<skill-name>/SKILL.md` and register in `skills-manifest.json`.
3. Run `mktg catalog list --json` to verify the entry loaded. `loadCatalogManifest` runs here and rejects adapter-name collisions (`CATALOG_COLLISION`), licenses outside the allowlist (`CATALOG_LICENSE_DENIED`), and malformed entries (`CATALOG_MANIFEST_INVALID`) as structured errors. (`mktg catalog sync` is the wrong command for this; it checks upstream version drift against GitHub releases, not manifest validity.)
4. (Optional) Run `mktg doctor --json` to verify env vars in `auth.credential_envs` are set for the new catalog.

### Catalog Entry Requirements

| Requirement | Detail |
|---|---|
| `name` | Lowercase, validated via `validateResourceId`: no `..`, no slashes, no spaces. |
| `license` | SPDX identifier. Matched against the allowlist in `src/core/catalogs.ts`. AGPL requires `transport: "http"`. |
| `version_pinned` | An upstream tag (not `main`). `mktg catalog sync` diffs this against latest. |
| `transport` | `"sdk"` ONLY if the upstream's SDK license permits linking. Otherwise `"http"` and `sdk_reference: null`. |
| `auth` | Fully declared: `style`, `base_env`, `credential_envs`, `header_format`. Skill and adapter code never hardcodes env names; it reads from the catalog entry. |
| `capabilities` | At least one non-empty capability array. A catalog with zero capabilities is rejected at load time. |

### Security Posture

> [!IMPORTANT]
> Catalogs are external services. All responses are untrusted input.

| Rule | Detail |
|---|---|
| License check | `loadCatalogManifest` rejects catalogs with licenses not on the allowlist, fails loudly. |
| Adapter collision | If two catalogs declare the same `capabilities.publish_adapters[i]`, load throws a named error, which prevents silent last-write-wins in `src/commands/publish.ts`. |
| Raw-fetch mandate | AGPL catalogs MUST use `transport: "http"`. A `package.json` test asserts banned SDK packages are absent. |
| Sandbox | State files for catalogs (sent-markers, caches) live under `.mktg/publish/` or `.mktg/cache/`, sandboxed via `sandboxPath()`. |
| Credential scope | Env vars only. Catalogs never persist credentials to `brand/` or repo-tracked files. |
| Frontmatter ↔ manifest drift | For catalog-contributed skills, `tests/integration/catalog-manifest.test.ts` asserts the skill's frontmatter `env_vars` equals `catalog.auth.base_env ∪ catalog.auth.credential_envs`. |

## Adding a CLI Command

Every new command in `src/commands/` must satisfy:

| Requirement | How |
|---|---|
| Typed return | `CommandResult<T>` with typed data |
| JSON output | `--json` flag, auto via `!isTTY()` |
| Dry run | `--dry-run` for mutating operations |
| Field filtering | `--fields` with dot-notation |
| Destructive guard | `--confirm` for destructive ops |
| Error guidance | Include `fix` field in error checks |
| Schema | Add entry in `schema.ts` with `responseSchema` |
| Streaming | `--ndjson` for list-like output |

After creating the handler, register it in `src/cli.ts`.
