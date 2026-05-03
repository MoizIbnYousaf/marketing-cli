# Publish Index

This is the /cmo routing index for distribution. Runtime schema wins:
if this file conflicts with `mktg schema publish --json` or
`mktg publish --list-adapters --json`, trust the live CLI output.

## Current Adapters

Refresh before a publishing session:

```bash
mktg publish --list-adapters --json
mktg publish --adapter mktg-native --list-integrations --json
mktg publish --adapter postiz --list-integrations --json
mktg publish --adapter postiz --diagnose --json
mktg catalog info postiz --json --fields configured,missing_envs,resolved_base
```

| Adapter | Role | Credentials | Reality |
|---|---|---|---|
| `mktg-native` | Local agent-first publish backend | None | Stores workspace account, providers, queue, history under `.mktg/native-publish/`. This is the current native Studio backend. |
| `postiz` | External social provider catalog | `POSTIZ_API_KEY`, `POSTIZ_API_BASE` | Creates Postiz drafts through the REST API. Hosted or self-hosted; Docker roots like `http://localhost:4007` are retried through `/api`. |
| `typefully` | X/threads specialist and fallback | `TYPEFULLY_API_KEY` | Creates Typefully drafts. Best for threads and X-specific workflows. |
| `resend` | Email send path | `RESEND_API_KEY` | Transactional/email distribution. |
| `file` | Always-on local export | None | Writes publish artifacts to disk for manual or later posting. |

## Native Backend

Initial native provider rollout is deliberately small:

```text
x, tiktok, instagram, reddit, linkedin
```

Native backend commands:

```bash
mktg publish --native-account --json
mktg publish --native-upsert-provider --input '{"identifier":"linkedin","name":"Acme LinkedIn","profile":"acme"}' --json
mktg publish --adapter mktg-native --list-integrations --json
mktg publish --native-list-posts --json
```

Native publish manifest shape:

```json
{
  "name": "campaign-name",
  "items": [
    {
      "type": "social",
      "adapter": "mktg-native",
      "content": "Post copy",
      "metadata": {
        "providers": ["linkedin"],
        "postType": "schedule",
        "date": "2026-04-24T10:00:00.000Z"
      }
    }
  ]
}
```

Important: `mktg-native` is local-first. It records drafts, scheduled
items, published-local state, and queue history. It does not magically own
third-party OAuth yet; use Postiz or browser automation when real external
network posting is required.

## Platform Routing

| Platform | Default route | Fallback route | Notes |
|---|---|---|---|
| X | `mktg-native` for local queue; `typefully` for real threads | Postiz if connected, then file | X thread UX remains Typefully-specialist. |
| TikTok | `mktg-native` for local queue | Postiz if connected, then browser profile, then file | Browser path is account/session dependent. |
| Instagram | `mktg-native` for local queue | Postiz if connected, then browser profile, then file | Browser path is account/session dependent. |
| Reddit | `mktg-native` for local queue | Postiz if connected, then browser profile, then file | Respect subreddit rules and manual review. |
| LinkedIn | `mktg-native` for local queue | Postiz or Typefully if connected, then file | Personal vs company page must be explicit. |

## Safe Publish Sequence

1. Generate platform-native copy first. Do not dump one generic post everywhere.
2. Run `mktg publish --list-adapters --json`.
3. If using native, ensure providers exist with `--adapter mktg-native --list-integrations`.
4. If using Postiz, run `mktg publish --adapter postiz --diagnose --json` before live drafting.
5. Run a dry-run publish first:

```bash
mktg publish --adapter mktg-native --dry-run --input '<manifest-json>' --json
```

6. Only after user approval, execute:

```bash
mktg publish --adapter mktg-native --confirm --input '<manifest-json>' --json
```

7. Mirror meaningful publishes to Studio with `/api/activity/log`,
`/api/navigate {"tab":"publish"}`, and an honest toast.

## Failure Policy

- If native target resolution fails, add or correct the provider first.
- If Postiz is unconfigured, surface `missing_envs` from `mktg catalog info postiz`.
- If Postiz self-hosting fails, run `mktg publish --adapter postiz --diagnose --json` and check whether the base should be the Docker app root (`http://localhost:4007`) or backend path (`http://localhost:4007/api`).
- If a live provider is down, do not pretend the content posted. Save to native or file and tell the user the external posting step is still pending.
- If rate-limited, persist the remaining work and give a concrete resume path.
