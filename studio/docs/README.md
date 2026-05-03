# Studio Docs

Studio is the local-first dashboard that ships inside `marketing-cli`, driven by `/cmo` (Claude Code) over HTTP. These docs describe how to run it, how `/cmo` talks to it, and what each tab does.

## Start here

- [`SHIPPING.md`](./SHIPPING.md) — install, prerequisites, first run.
- [`DEMO.md`](./DEMO.md) — guided tour of the dashboard with screenshots.
- [`FAQ.md`](./FAQ.md) — common questions and gotchas.

## Architecture and integration

- [`architecture.md`](./architecture.md) — CLI brain, studio dashboard, publish backend split.
- [`tab-mapping.md`](./tab-mapping.md) — what each tab renders and what data it reads.
- [`cmo-integration.md`](./cmo-integration.md) — how `/cmo` drives the studio.
- [`cmo-api.md`](./cmo-api.md) — the HTTP surface `/cmo` calls.

## Operator + developer

- [`SUPPORT-RUNBOOK.md`](./SUPPORT-RUNBOOK.md) — diagnosing common runtime issues.
- [`DEVELOPER.md`](./DEVELOPER.md) — local development setup and conventions.

## Navigation

Primary surfaces: **Pulse, Signals, Publish, Brand, Settings**. Trend radar is a Signals mode. Audience summary and recommended next actions live inside Pulse.
