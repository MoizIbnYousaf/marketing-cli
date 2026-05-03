# Quality Gate — AI Slop Audit

After ANY content skill produces text output (copy, emails, social posts, SEO articles, lead magnets, landing pages), run this quality gate before presenting to the user.

## When to Apply

Apply after these skills produce output:
- `direct-response-copy` (all modes: generate, edit, cold email)
- `seo-content` (single article and programmatic)
- `email-sequences` (all sequence types)
- `content-atomizer` (all platform variants)
- `newsletter` (editorial content)
- `lead-magnet` (all written sections)
- `social-campaign` (Phase 3 is this audit)
- `competitor-alternatives` (comparison copy)

Do NOT apply to:
- Research output (audience profiles, competitive intel, keyword plans)
- Strategy documents (launch plans, pricing analysis)
- Technical output (schema markup, SEO audit reports)

## How to Audit

1. Read the full reference: [references/ai-slop-patterns.md](../references/ai-slop-patterns.md)
2. Read the output in sequence, not paragraph by paragraph
3. Check structural patterns (em dashes, triple anaphora, dramatic reveals)
4. Check transition filler ("Here's why", "Here's the thing", "The reality is")
5. Check vocabulary tells ("landscape", "delve", "nuanced", "multifaceted")
6. If multiple pieces: check batch-level patterns (uniform openings, identical rhythm)
7. Fix anything that fails — rewrite, don't just flag
8. If `brand/voice-profile.md` exists, compare output against the documented voice

## The Rule

**If the output reads like AI wrote it, rewrite it until it doesn't.** The quality gate is not a checklist to pass — it's a standard to meet. Every piece of text that leaves /cmo should sound like a human who happens to be very good at marketing wrote it.

---

## Full Pre-Ship Pipeline

The AI slop audit is one of four gates. Before any content ships (landing page goes live, email sequence triggers, posts schedule, article publishes), run them in this order:

| # | Gate | Purpose | How /cmo invokes | Fail behavior |
|---|---|---|---|---|
| 1 | `editorial-first-pass` | Structural check — hook, thesis, promise, stakes. Fastest gate; kills obvious misses early. | `/editorial-first-pass <path>` — returns pass/fail + rework recommendations. | On fail: bounce back to the content skill for a second pass. Don't proceed to gate 2. |
| 2 | `ai-check` + this AI slop audit | Line-by-line pattern detection against the full reference at `references/ai-slop-patterns.md`. | Invoked automatically by content skills in their own post-production; /cmo runs it on batches (e.g., atomizer output). | On fail: rewrite the flagged lines in place. Don't pass slop to a reviewer. |
| 3 | `mktg-content-reviewer` agent | Voice-profile consistency — does this sound like the brand documented in `brand/voice-profile.md`? | Spawn via Agent tool — see `rules/sub-agents.md` for the pattern. Returns structured score + drift report. | On fail: loop back to the content skill with the specific rewrite recommendations. |
| 4 | `mktg-seo-analyst` agent (SEO assets only) | Keyword-plan adherence — primary/secondary keywords, search intent match, on-page basics, AI search readiness. | Spawn via Agent tool. Reads `brand/keyword-plan.md` + `brand/audience.md` + `brand/competitors.md`. | On fail: loop back with keyword-gap recommendations. |

**Which gates apply to which outputs:**

| Output | Gate 1 | Gate 2 | Gate 3 | Gate 4 |
|---|---|---|---|---|
| Landing page (`direct-response-copy`) | ✓ | ✓ | ✓ | ✓ if SEO is a goal |
| Sales copy, cold email | ✓ | ✓ | ✓ | — |
| SEO article (`seo-content`) | ✓ | ✓ | ✓ | ✓ |
| Email sequence (`email-sequences`) | ✓ (per email) | ✓ | ✓ (batch) | — |
| Newsletter issue (`newsletter`) | ✓ | ✓ | ✓ | — |
| Lead magnet (`lead-magnet`) | ✓ | ✓ | ✓ | — |
| Atomized social posts (`content-atomizer`) | — (platform-native check instead) | ✓ (batch-level) | ✓ (batch) | — |
| Comparison page (`competitor-alternatives`) | ✓ | ✓ | ✓ | ✓ |
| AI-search asset (`ai-seo`) | ✓ | ✓ | ✓ | ✓ |
| Research / strategy output | — | — | — | — (no gates on research) |
| Visual assets | — (visual review happens in `visual-style` → `brand-kit-playground`) | — | — | — |

**Skipping gates is an anti-pattern.** /cmo doesn't skip gates to save time. If the user demands a skip, surface the risk first:

> *"You want to ship the landing page without the content-reviewer gate. That risks voice drift — my last review on similar content flagged 3 tone issues. OK with you?"*

The user can override. /cmo never silently bypasses.

---

## Named pipeline: `pre-ship-gates`

When /cmo needs to run the full gate chain on one asset:

```
PIPELINE: pre-ship-gates
INPUT:    <file path>
STEPS:
  1. /editorial-first-pass <path>   → PASS required
  2. AI slop audit (this file)      → rewrite in place
  3. Agent: mktg-content-reviewer   → score ≥ threshold required
  4. Agent: mktg-seo-analyst        → score ≥ threshold required (SEO assets only)
OUTPUT:   ready-to-ship flag + final asset path
FAIL:     return to the content skill with aggregated recommendations
```

Announce the pipeline to the user before running — they see the investment up front, approve once, and let it compound.
