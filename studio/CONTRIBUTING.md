# Contributing to Studio

Studio ships inside `marketing-cli` as a workspace member under `studio/`.
Issues and PRs go to the `marketing-cli` repo.

## Filing issues

File issues at <https://github.com/MoizIbnYousaf/marketing-cli/issues>. Tag
Studio-specific reports with the `studio` label so they route correctly.

For end-user how-to questions, check `docs/SUPPORT-RUNBOOK.md` first.

## Where issues belong

Everything lives in one tracker now. Use labels to route:

| Area | Label |
|------|-------|
| Studio dashboard, server.ts, SSE, Pulse/Signals/Publish/Brand/Settings | `studio` |
| `marketing-cli` CLI commands, `mktg init`, skills, agents | `cli` |

## Local setup

```bash
git clone https://github.com/MoizIbnYousaf/marketing-cli
cd marketing-cli
bun install                                              # wires the workspace
bun --cwd studio run start:studio                        # API :3001 + dashboard :3000
```

## Style + standards

- No em-dashes anywhere -- the linter rejects them (`bun run lint:em-dash`).
- Real file I/O in tests; no mocks.
- Every HTTP route must follow the 21/21 Agent DX contract, validated by `tests/agent-dx.test.ts`.
- Run `bun test` before any commit.

## Reporting security issues

See [SECURITY.md](./SECURITY.md). Do not open public issues for security reports.
