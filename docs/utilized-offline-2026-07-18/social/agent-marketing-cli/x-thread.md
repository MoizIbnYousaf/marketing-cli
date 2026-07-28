# X — Thread · Agent-Native Marketing CLI

**1/**
I got tired of re-explaining our brand to the coding agent every session.

So we shipped mktg — an agent-native marketing playbook CLI.

**2/**
What you get on `npm i -g marketing-cli`:

→ 64 versioned skills (manifest-backed)
→ 6 research/review agents
→ persistent `brand/` memory
→ `/cmo` orchestrator
→ Studio dashboard (`mktg studio`) in the same package

**3/**
Design rule that matters for agents:

Skills work at zero context (L0).
Brand memory enhances them.
It never gates them.

No 40-field questionnaire before the first sentence.

**4/**
`/cmo` foundation spawn: 3 research agents in parallel write voice, audience, competitors into real files under `brand/`.

Chat residue ≠ compounding memory.

**5/**
Agent DX is boring on purpose (and tested):

• JSON when piped
• `--dry-run` on mutations
• `--fields` for context discipline
• CI enforces 21/21 Agent DX axes

**6/**
Anti-positioning (so we don't confuse people):

≠ social scheduler SaaS
≠ paste-once prompt pack
≠ "AI that writes your LinkedIn"

It's infrastructure for marketing work your agent can run.

**7/**
First 10 minutes:

```
npm i -g marketing-cli
mktg init
# then /cmo in your coding agent
```

GitHub: marketing-cli · feedback welcome from Claude Code / Cursor builders.
