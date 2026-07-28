# Show HN: mktg – agent-native marketing playbook CLI

I got tired of re-explaining our brand to the coding agent every session.

`marketing-cli` (`mktg`) installs marketing skills and research agents into Claude Code / Cursor-style skill directories, keeps persistent `brand/` memory in the repo, and ships a local Studio dashboard in the same npm package.

## What it does

- 64 versioned skills (SKILL.md + manifest; drop-in contract)
- 6 agents for parallel research / review
- `/cmo` orchestrates marketing work; `/axi` routes agent-ergonomic tools
- Progressive enhancement: skills run with zero brand files; memory sharpens later
- Agent-oriented CLI behavior: JSON when piped, `--dry-run`, `--fields`
- `mktg studio` for humans reviewing artifacts locally

## What it is not

- Not a hosted social media scheduler (schedulers can plug in as catalogs/adapters)
- Not a one-off prompt pack
- Not a claim that it replaces an enterprise marketing team

## Install

```bash
npm i -g marketing-cli
mktg init
mktg doctor
```

Then run `/cmo` from your coding agent to start a foundation pass into `brand/`.

Happy to answer questions about the skill contract, brand schema, Agent DX tests, or why AGPL upstream catalogs are accessed over HTTP instead of linking SDKs.
