# Security Policy

## Scope

`mktg-studio` is the local-first dashboard companion to `marketing-cli`. It runs on the user's laptop (`http://localhost:3000` + `:3001`), reads `brand/*.md` from disk, talks to a local SQLite database, and exposes an HTTP API that `/cmo` drives via Bash. The studio never calls the Anthropic API directly and stores no data outside the user's machine.

In scope:

- Cross-site scripting (XSS), HTML injection in the dashboard
- Path traversal in `/api/brand/read`, `/api/brand/write`
- Authentication/authorization gaps in any HTTP route
- SQL injection in any SQLite query path
- Server-side request forgery (SSRF) via studio-driven fetches
- Secret leakage from `.env.local` or `.mktg-studio/`
- Insecure dependency advisories

Out of scope:

- Vulnerabilities in `marketing-cli` (the CLI) — report against [`MoizIbnYousaf/marketing-cli`](https://github.com/MoizIbnYousaf/marketing-cli/security)
- Vulnerabilities in Postiz — report upstream at [`gitroomhq/postiz-app`](https://github.com/gitroomhq/postiz-app)
- Self-XSS that requires the user to paste malicious content

## Reporting a vulnerability

Email **moizibnyousaf@gmail.com** with the subject line `[mktg-studio security]`. Or, once the repository is public, file a [GitHub Security Advisory](https://github.com/MoizIbnYousaf/marketing-cli/security/advisories/new).

Please do not open a public issue.

Expect an initial response within 72 hours. Confirmed vulnerabilities receive a fix timeline in the advisory.

## Disclosure window

Responsible disclosure: please give us 90 days from initial report before public disclosure. Reporters are credited unless they request anonymity.

## Threat model

The studio assumes:

- The local user is trusted (they run the studio on their own machine).
- The local network may be hostile (so the API binds to `localhost` only and is not exposed externally by default).
- Inputs from `/cmo` over HTTP are NOT trusted — every endpoint validates path inputs, JSON shapes, and applies `?dryRun=true` / `?confirm=true` safety rails on mutations.
- Inputs from the browser UI are NOT trusted — the same validators apply server-side.

See `docs/architecture.md` and `CLAUDE.md` for the full driver/dashboard contract.
