# Free Tool Strategy — Agent DX Scorecard (feeds mktg installs)

## Recommendation
Ship a **free, no-login Agent DX Scorecard** that grades any CLI/skill pack (or a paste of command help + README) against the same axes mktg already enforces (machine-readable output, dry-run, fields filtering, schema, safety rails, etc.).

Secondary candidate (parked): Brand Memory Template Generator — still valuable, but the scorecard creates sharper contrast vs prompt packs and drives "this is what good looks like → install mktg."

## Job to be done
"I think my agent tooling is fine… is it?"  
Builders discover gaps → see mktg as the reference implementation → install.

## Offer

| Element | Detail |
|---------|--------|
| Name | Agent DX Scorecard |
| Format | Static web page + optional `npx`/`bunx` checker later |
| Input | GitHub repo URL **or** paste of `--help` + sample JSON output |
| Output | Score /21 (or checklist %), axis-by-axis notes, "fix next" list |
| CTA | "See a 21/21 reference: `npm i -g marketing-cli`" |

## Why this tool (not a generic quiz)

| Criterion | Fit |
|-----------|-----|
| Aligned with positioning | Agent DX is a concrete differentiator (21/21 in CI) |
| Useful without mktg | Yes — works on any CLI |
| Shares well | Screenshots of scorecards on X/HN |
| Hard to clone as a prompt | Rubric is specific; we publish it openly anyway |
| Feeds install | Natural "install the playbook that already passes" |

## Funnel

```
Discovery (HN / X / directories)
    → Scorecard (free, instant)
    → Gap report ("no --dry-run", "no JSON envelope")
    → Compare to mktg reference
    → npm i -g marketing-cli
    → mktg init → /cmo
```

Optional email capture **after** results (not before). Soft: "Send me the rubric PDF." Skip if it hurts trust.

## Rubric axes (public)

Mirror mktg's Agent DX themes (wording for humans):

1. Machine-readable output (JSON / NDJSON)  
2. Raw payload input (`--input`)  
3. Schema introspection  
4. Context-window discipline (`--fields`, size warnings)  
5. Input hardening  
6. Safety rails (`--dry-run`, `--confirm`)  
7. Knowledge packaging (AGENTS.md / skill docs)  

(Collapse to a short public checklist of ~7–10 items for the MVP; deep 21-axis view can link to docs.)

## MVP scope (1 week of builder time)

- [ ] Single HTML page (or tiny Next route) — dark charcoal + warm accent  
- [ ] Checklist UI with examples of pass/fail  
- [ ] Manual mode: user self-scores with guidance  
- [ ] Results card with copy-to-clipboard summary for social  
- [ ] CTA block with install command + GitHub  
- [ ] UTM: `utm_source=dx-scorecard`

**Out of scope for MVP:** automatic GitHub cloning, auth, paid reports.

## Distribution

| Channel | Play |
|---------|------|
| Show HN | "Show HN: Agent DX Scorecard — grade your CLI for agent use" |
| X / LI | Atomize "most CLIs fail dry-run" insight |
| README | Badge: "Agent DX reference: 21/21" linking to scorecard |
| npm page | "Validate your tools" link |
| Newsletter issue | Teach one axis per issue + link tool |

## Success metrics

| Metric | Target (first 60 days) |
|--------|-------------------------|
| Scorecard completions | Track page events if available |
| CTA clicks to npm/GitHub | Primary |
| Installs with utm | Best signal |
| Social shares of result cards | Qualitative |

## Risks & ethics

- Don't shame other OSS authors; frame as shared standard.  
- Don't claim proprietary ownership of "agent DX" as a phrase.  
- Don't dark-pattern email gates.  
- Don't auto-fail tools for missing Studio — Studio is mktg-specific.

## Parked alternative: Brand Memory Template Generator

Static form → downloads a starter `brand/*.md` zip aligned to SCHEMA.md.  
Great lead magnet for newsletter; weaker contrast vs competitors than the scorecard. Revisit as tool #2 after scorecard ships.

## One-liner
Free Agent DX Scorecard grades any CLI for agent use; mktg is the installable playbook that already aims at 21/21.
