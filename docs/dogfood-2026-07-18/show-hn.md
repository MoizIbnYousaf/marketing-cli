# Show HN: mktg – agent-native marketing playbook CLI

I got tired of re-explaining our brand to the coding agent every session.

`marketing-cli` (`mktg`) installs 64 marketing skills + 6 research agents into Claude Code / Cursor-style skill dirs, keeps persistent `brand/` memory, and ships a local Studio dashboard in the same npm package.

```
npm i -g marketing-cli
mktg init
# then in the agent: /cmo
```

Interesting bits for this crowd:
- Agent DX contract enforced in CI (JSON, --dry-run, --fields, input hardening)
- `/cmo` routes marketing; new `/axi` router prefers AXI CLIs (gh-axi, etc.) over eager MCP
- Exa skills for research; Postiz catalog firewalled via raw HTTP (AGPL stays out of the tree)
- Skills work with zero brand context; memory only enhances

Repo: https://github.com/MoizIbnYousaf/marketing-cli
