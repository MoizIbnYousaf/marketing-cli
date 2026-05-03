---
name: mktg-x-auth
description: |
  How to obtain, export, verify, and refresh the X/Twitter auth credentials
  (MKTG_X_AUTH_TOKEN + MKTG_X_CT0) required by the mktg-x skill.
---

# X Auth Setup for mktg-x

mktg-x authenticates to X's web GraphQL API using two browser session cookies: `auth_token` (session) and `ct0` (CSRF). No developer account, no API keys, no OAuth flow — just your logged-in browser session.

## What you need

| Credential | Env var (primary) | Env var (fallback) | What it is |
|---|---|---|---|
| Session token | `MKTG_X_AUTH_TOKEN` | `TWITTER_AUTH_TOKEN` or `AUTH_TOKEN` when `MKTG_X_ENABLE_LEGACY_ENV=1` | Your x.com login session cookie |
| CSRF token | `MKTG_X_CT0` | `TWITTER_CT0` or `CT0` when `MKTG_X_ENABLE_LEGACY_ENV=1` | Cross-site request forgery token, required on every API call |

Both are required. The script checks in priority order: primary env var → fallback env vars → browser cookie extraction (interactive only, see warnings below).

## How to get the tokens

### Method 1 — Browser DevTools (recommended for agents)

1. Open **x.com** in your browser and log in
2. Open DevTools (Cmd+Opt+I on macOS, F12 on Windows/Linux)
3. Go to **Application** → **Cookies** → `https://x.com`
4. Find `auth_token` — copy the value
5. Find `ct0` — copy the value
6. Export both:

```bash
export MKTG_X_AUTH_TOKEN="<paste auth_token value>"
export MKTG_X_CT0="<paste ct0 value>"
```

To persist across shell sessions, add both lines to your `~/.zshrc` or `~/.bashrc`.

### Method 2 — Browser cookie extraction (interactive humans only)

The script can automatically extract cookies from Safari, Chrome, or Firefox on macOS. It tries browsers in this order: Safari → Chrome → Firefox.

**WARNING — Chrome on macOS triggers a Keychain password prompt.** This is a GUI dialog — a headless agent with no TTY **will hang indefinitely** waiting for the prompt. Use Method 1 (env vars) for all agent workflows. Browser extraction is for interactive human use only.

Safari and Firefox cookies do not trigger a Keychain prompt and work in terminal sessions.

## Verifying your setup

Run `mktg doctor` — both `MKTG_X_AUTH_TOKEN` and `MKTG_X_CT0` appear in the "Integrations" section automatically (no manual doctor wiring needed). If they show as "not set", the skill will fail with exit code 2.

Quick manual test:

```bash
bun run ./scripts/fetch-x.ts whoami
```

If it returns `{ "success": true, "username": "your_handle", ... }`, credentials are valid. If it returns `{ "success": false, "error": "..." }`, check the error message.

## Token lifetimes and refresh

| Token | Typical lifetime | What happens when it expires |
|---|---|---|
| `auth_token` | Weeks to months (session-scoped) | All requests fail with 401. Re-login to x.com and re-extract. |
| `ct0` | ~1 hour | Requests fail with 403 (CSRF-specific error). Re-extract just the `ct0` cookie and re-export `MKTG_X_CT0`. The `auth_token` is usually still valid. |

**The `ct0` expiry is the most common failure mode.** When an agent sees the `ct0 CSRF token expired` error (exit code 3), the fix is:

1. Open x.com in your browser (you should still be logged in)
2. DevTools → Application → Cookies → `ct0`
3. Copy the new value
4. `export MKTG_X_CT0="<new value>"`
5. Retry the fetch

## Security

- **Never commit** `MKTG_X_AUTH_TOKEN` or `MKTG_X_CT0` to git, paste them in chat, or store them in unencrypted files. They are session cookies with **full account access** — read, post, delete, DMs, everything.
- **`mktg doctor` never reads or logs the token values** — it only checks whether the env vars are set (non-empty).
- **Treat these like passwords.** If leaked, log into x.com immediately and invalidate the session (Settings → Security → Sessions → log out all other sessions).
- **The script does not store or cache credentials.** Every invocation resolves credentials fresh from env vars or browser cookies. No config file is written.

## Fallback env var naming

For backward compatibility with shells that already export Twitter-style env var names, the script also accepts these legacy names:

| Primary (mktg) | Fallback 1 | Fallback 2 |
|---|---|---|
| `MKTG_X_AUTH_TOKEN` | `TWITTER_AUTH_TOKEN` | `AUTH_TOKEN` |
| `MKTG_X_CT0` | `TWITTER_CT0` | `CT0` |

Resolution order: mktg primary → Twitter-prefixed legacy → generic legacy. The `TWITTER_*` and unprefixed `AUTH_TOKEN`/`CT0` names are ignored unless `MKTG_X_ENABLE_LEGACY_ENV=1`, which avoids accidental collisions with unrelated `AUTH_TOKEN` values in shared shells.

## Other env vars (debug + cache overrides)

The script honors a small set of optional env vars for debugging and cache-path overrides. Each one prefers the `MKTG_X_*` name and silently falls back to a legacy `XTERMINAL_*` name so existing shell exports keep working. Set the value `1` to enable debug logs.

| Primary (mktg) | Legacy fallback | Effect |
|---|---|---|
| `MKTG_X_DEBUG_BOOKMARKS` | `XTERMINAL_DEBUG_BOOKMARKS` | Print verbose `[mktg-x][debug][bookmarks]` traces during bookmark fetches |
| `MKTG_X_DEBUG_ARTICLE` | `XTERMINAL_DEBUG_ARTICLE` | Print full article payload to stderr when extracting long-form articles |
| `MKTG_X_QUERY_IDS_CACHE` | `XTERMINAL_QUERY_IDS_CACHE` | Override the query-ID cache file path (absolute path, otherwise resolved against cwd) |
| `MKTG_X_FEATURES_CACHE` | `XTERMINAL_FEATURES_CACHE` | Override the feature-flag overrides cache file path |
| `MKTG_X_FEATURES_PATH` | `XTERMINAL_FEATURES_PATH` | Alias for `MKTG_X_FEATURES_CACHE` |
| `MKTG_X_FEATURES_JSON` | `XTERMINAL_FEATURES_JSON` | Inline JSON of feature-flag overrides applied per-process (highest precedence) |

**Cache directory.** When no override is set, query-ID and feature caches default to `~/.config/mktg-x/`. If a `~/.config/xterminal/` cache from an earlier install already exists and the new dir hasn't been seeded yet, the script reads from the legacy path so existing users don't pay a re-fetch cost on first run. New installs go straight to the new path.
