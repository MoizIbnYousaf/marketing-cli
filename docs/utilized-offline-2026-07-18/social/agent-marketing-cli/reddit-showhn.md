# Reddit / Show HN style — Agent-native marketing playbook CLI

**Title:** Show HN: mktg – agent-native marketing playbook (64 skills, brand memory, local Studio)

---

I got tired of re-explaining brand voice to Claude Code / Cursor every session.

`marketing-cli` (`mktg`) installs marketing skills + research agents into your agent's skill dirs, keeps persistent `brand/` memory in the repo, and ships a local Studio dashboard in the same npm package.

**What it is**
- 64 versioned skills (SKILL.md + manifest; drop-in contract)
- 6 agents for parallel research/review
- `/cmo` orchestrates marketing; `/axi` routes agent-ergonomic tools
- Progressive enhancement: skills run at L0 with zero brand files; memory sharpens later
- Agent DX: JSON when piped, `--dry-run`, `--fields`; 21/21 axes tested in CI

**What it isn't**
- Not a hosted social scheduler (you can plug Postiz/etc. as catalogs)
- Not a prompt pack — installable, versioned, testable
- Not claiming to replace an enterprise marketing org

**Install**
```bash
npm i -g marketing-cli
mktg init
mktg doctor
```

Studio: `mktg studio` (Next.js + Bun API, local).

Happy to answer questions about the skill contract, brand schema, or why we firewalled AGPL catalogs behind raw HTTP instead of linking SDKs.
