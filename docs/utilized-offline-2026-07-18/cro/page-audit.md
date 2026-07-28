# Page CRO Audit — `marketing/campaigns/mktg-launch/landing.md`

**Audited:** 2026-07-18  
**Source:** Problem-aware campaign landing (exists)  
**Also applies to:** GitHub README hero + npm package above-fold  

---

## Scorecard

| Area | Score (1–5) | Finding |
|------|-------------|---------|
| Brand-first hero | 3 | Headline leads with the problem; **mktg** appears in subhead, not as hero-level brand signal |
| Single job above fold | 4 | Clear problem → playbook → install path |
| Proof density | 5 | 64 / 6 / brand memory / DX / Studio table is strong |
| CTA clarity | 4 | Install command present; primary button label slightly generic ("Install on npm") |
| Objection handling | 4 | "What it is not" section works |
| Progressive disclosure | 3 | How-it-works asks humans to "write minimum memory" before `/cmo` — fights L0 story |
| Trust / anti-hype | 5 | Vocabulary on-brand; no banned hype |
| Distraction | 4 | Tertiary checklist CTA OK below primary |

**Overall:** Strong bones. Biggest lift = brand-first H1 + align onboarding with progressive enhancement.

---

## Before → after copy fixes

### 1) Hero (brand-first)

**Before**
```text
Headline: Your coding agent forgets the brand every session.
Subhead: mktg is the agent-native marketing playbook — …
```

**After**
```text
Brand: mktg
Headline: Your coding agent already ships product. Now give it a marketing playbook.
Subhead: One CLI install → 64 skills, 6 research agents, and brand memory that compounds.
Support: Your agent forgets the brand every session — unless memory lives in files.
```

### 2) Primary CTA label

**Before:** `Install on npm`  
**After:** Show the command as the button/label: `npm i -g marketing-cli`  
Secondary stays GitHub. Tertiary checklist unchanged.

### 3) How-it-works step 3 (L0 alignment)

**Before:** "Write the minimum memory (voice, positioning, audience)" then ask `/cmo`  
**After:**
```text
3. Ask /cmo for a foundation pass — research agents can draft brand/ files
4. Edit what they got wrong (you're the editor, not the stenographer)
5. Re-run skills; memory sharpens — never gates
```

### 4) npm short description

**Before (typical):** `Marketing CLI with AI skills`  
**After:** `Agent-native marketing playbook — 64 skills, brand memory, /cmo. npm i -g marketing-cli`

### 5) GitHub README hero (mirror landing after)

```text
# mktg

Your coding agent already ships product. Now give it a marketing playbook.

Install one CLI. 64 skills, 6 research agents, brand memory that compounds.

CLI for the agent. Studio for the human.

npm i -g marketing-cli && mktg init
```

---

## Keep as-is
- Proof table (excellent)  
- Anti-positioning bullets  
- Closing line on progressive enhancement  
- `mktg doctor --json` microcopy  

---

## Priority order
1. P0 — Brand-first hero + command-as-CTA  
2. P0 — Fix how-it-works to lead with `/cmo` foundation (L0)  
3. P1 — Sync npm + README to same after-copy  
4. P2 — A/B support line under subhead (problem vs identity)

See also: `marketing/psychology/enhancements.md` for principle rationale.
