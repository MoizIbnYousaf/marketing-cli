# Studio API Index

This is the /cmo routing index for `mktg-studio`. Runtime Studio schema wins:
if this file conflicts with `GET /api/schema`, trust the running Studio.

## Detect And Discover

```bash
STUDIO=${STUDIO_BASE:-http://localhost:3001}
curl -fsS -m 2 "$STUDIO/api/health" >/dev/null
curl -fsS "$STUDIO/api/schema" | jq '.routes[].path'
curl -fsS "$STUDIO/api/schema?route=/api/navigate" | jq
```

If health is not reachable, continue in CLI-only mode. Studio is a reflector,
not a durable dependency.

## Boot Studio Explicitly

Do not rely on hidden Claude hooks or browser automation to start Studio. If the
user asks for a visual dashboard, or if the best next step is easier to
inspect in Studio, use the CLI launcher:

```bash
mktg studio --open --intent cmo --session <id>
```

For agent-safe discovery, preview first:

```bash
mktg studio --dry-run --json --intent cmo --session <id>
```

The preview response returns the exact `urls.dashboard` value, for example:

```text
http://localhost:3000/dashboard?mode=cmo&session=<id>
```

`mktg studio` prefers a sibling `mktg-studio/bin/mktg-studio.ts` checkout,
then `MKTG_STUDIO_BIN`, then `mktg-studio` on PATH. Preview mode is always
side-effect free; launch mode starts the local Bun API and Next.js dashboard.

## Primary Navigation Contract

Current primary tabs:

```text
pulse, signals, publish, brand
```

Legacy callers are remapped by the Studio server:

| Legacy tab | Current destination |
|---|---|
| `trends` | `signals` with `filter.mode = "radar"` |
| `audience` | `pulse` |
| `opportunities` | `pulse` |

Trend radar is not its own tab. Use:

```json
{"tab":"signals","filter":{"mode":"radar"}}
```

## Agent-Verbs

| Verb | Endpoint | Use |
|---|---|---|
| Schema fetch | `GET /api/schema` | Discover live route, body, enum, and dry-run support. |
| Log | `POST /api/activity/log` | Append one meaningful action to the Activity panel. |
| Brand note | `POST /api/brand/note` | Tell Studio that /cmo wrote or edited a brand file externally. |
| Brand write | `POST /api/brand/write` | Atomic Studio-mediated brand write with optimistic locking. |
| Push action | `POST /api/opportunities/push` | Add a next action that Pulse can surface. |
| Navigate | `POST /api/navigate` | Move the dashboard to the user's next useful view. |
| Toast | `POST /api/toast` | Short transient user-visible confirmation. |
| Brand refresh | `POST /api/brand/refresh` | Re-run/refresh foundation data when the user explicitly wants it. |

## Payload Patterns

Log:

```json
{
  "kind": "skill-run",
  "skill": "landscape-scan",
  "summary": "Refreshed landscape and wrote brand/landscape.md",
  "filesChanged": ["brand/landscape.md"]
}
```

Push next action:

```json
{
  "skill": "seo-content",
  "reason": "Fresh keyword plan exists but no launch article has been drafted.",
  "priority": 80
}
```

Navigate to Publish:

```json
{"tab":"publish","filter":{"adapter":"mktg-native"}}
```

Navigate to Trend radar:

```json
{"tab":"signals","filter":{"mode":"radar"}}
```

## What To Mirror

- Skill runs that produce user-visible artifacts.
- Brand file writes and refreshes.
- Native, Postiz, Typefully, Resend, or file publish actions.
- Recommended next actions that should appear on Pulse.
- One navigation event when the user's attention should move.

## What Not To Mirror

- Read-only setup checks such as `mktg status`, `mktg doctor`, `mktg list`, or `mktg schema`.
- Dry-runs, unless the user explicitly asked to inspect a preview.
- Internal scratch work, prompt planning, or failed probes that do not change user-visible state.
- Repeated navigations during one turn.

## Order Of Operations

1. `POST /api/activity/log` for the start or completion event.
2. `POST /api/brand/note` or `POST /api/brand/write` if brand memory changed.
3. `POST /api/opportunities/push` if a next action exists.
4. `POST /api/navigate` if the user should look somewhere specific.
5. `POST /api/toast` for the short confirmation.

Keep calls fire-and-forget. If Studio returns non-2xx, continue the real work
and do not block the user on dashboard reflection.
