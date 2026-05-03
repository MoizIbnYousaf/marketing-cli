# Architecture: CLI Brain + Studio Surface + Publish Backends

`mktg-studio` is the local visual layer for `marketing-cli`. The Studio does
not run an LLM and does not contain an in-app chat. `/cmo` runs in the user's
Claude Code session, does the thinking, and drives Studio through localhost
HTTP endpoints.

## System Split

| Layer | Owns | Source of truth |
|---|---|---|
| `/cmo` | Marketing judgment, skill routing, copy decisions, recommendations | `marketing-cli/skills/cmo/` |
| `mktg` CLI | Brand state, command schemas, publish adapters, verification, skill registry | `marketing-cli/src/` |
| Studio API | Local HTTP contract, SQLite, SSE, brand-file reads/writes | `mktg-studio/server.ts` |
| Studio UI | Pulse, Content, Publish, Brand, Settings, Activity panel | `mktg-studio/components/` |
| Publish backends | Native local queue, Postiz drafts, Typefully drafts, Resend, file export | `mktg publish` |

## Primary Surfaces

The current navigation contract is intentionally small:

```text
Pulse, Signals, Publish, Brand, Settings
```

Signals is the standalone surface for raw intel, the Trend radar, draft
campaign review, and content. Audience summary and recommended next actions
live on Pulse. Legacy route callers are still accepted by the server:

| Legacy route | Current destination |
|---|---|
| `?tab=content` | `?tab=signals` |
| `?tab=trends` | `?tab=signals` |
| `?tab=audience` | `?tab=pulse` |
| `?tab=opportunities` | `?tab=pulse` |

## Data Flow

### /cmo reflecting work into Studio

```text
User asks /cmo for marketing work in Claude Code
  -> /cmo runs mktg commands and marketing skills
  -> /cmo writes brand/*.md or publish manifests
  -> /cmo POSTs to Studio:
       /api/activity/log
       /api/brand/note or /api/brand/write
       /api/opportunities/push
       /api/navigate
       /api/toast
  -> Bun API stores local rows and emits SSE
  -> Next.js dashboard updates Activity, Pulse, Content, Publish, or Brand
```

### Native publish flow

```text
User or /cmo creates a native provider
  -> POST /api/publish/native/providers
  -> server calls mktg publish --native-upsert-provider
  -> provider state lands in .mktg/native-publish/providers.json

User or /cmo publishes via native backend
  -> POST /api/publish {adapter:"mktg-native", manifest}
  -> server calls mktg publish --adapter mktg-native --confirm
  -> post state lands in .mktg/native-publish/posts.json
  -> SQLite publish_log records the action
  -> SSE publish-completed updates Publish and Activity
```

Initial native provider identifiers are `x`, `tiktok`, `instagram`, `reddit`,
and `linkedin`. Native is local-first queue/history. External network posting
still requires Postiz, Typefully, or browser automation.

### Postiz publish flow

```text
User or /cmo publishes through Postiz
  -> POST /api/publish {adapter:"postiz", manifest}
  -> server calls mktg publish --adapter postiz --confirm
  -> CLI calls Postiz REST endpoints over raw fetch
  -> SQLite publish_log records the result
  -> SSE publish-completed updates Publish and Activity
```

Never import `@postiz/*`. Postiz stays behind a REST boundary.

## Technology Decisions

| Decision | Choice | Why |
|---|---|---|
| Database | SQLite via `bun:sqlite` | Local-first, zero service dependency |
| Real-time | SSE | Simple server-to-client events for dashboard reflection |
| Execution | `mktg` CLI with JSON | Reuses the agent-native CLI contract |
| Memory | `brand/*.md` | Portable, visible, git-friendly brand memory |
| Auth | Single-user local v1 | No cloud account model required for core use |
| Publishing | `mktg publish` adapters | Keeps native/Postiz/Typefully/file logic in the CLI |
| Agent contract | `/api/schema` | Agents discover route shapes at runtime |

## Non-Goals

- No in-app chat panel.
- No Studio-owned Claude session.
- No direct Anthropic or Vercel AI SDK calls from Studio.
- No vendored Postiz source or SDK imports.
