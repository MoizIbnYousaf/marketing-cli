---
title: "feat: Triage and review 14 open PRs"
type: feat
status: active
date: 2026-03-12
---

# PR Review & Triage Plan

## Overview

14 open PRs on the mktg repo. Most were auto-generated from issues. Need to triage: which have good ideas worth taking, which conflict with existing work, which should be closed.

**Important context:** PRs #11 and #15 already had their best ideas extracted into brainstorm + marketing-demo skills (committed to main). Those PRs should be closed.

## The 14 PRs

### Already Superseded (CLOSE)

| PR | Title | Why Close |
|----|-------|-----------|
| #11 | marketing brainstorming skill | Best ideas already in `skills/brainstorm/SKILL.md` on main |
| #15 | test-landing-page + marketing-demo | marketing-demo already built on main. test-landing-page overlaps with page-cro |

### Docs / Research PRs (REVIEW)

| PR | Title | Lines | Risk |
|----|-------|-------|------|
| #12 | AGENTS.md with 8 agent definitions | +293 | Low — docs only |
| #21 | ASC CLI philosophy + CLAUDE.md | +? | Low — docs only |
| #23 | ASC CLI testing + CI + Makefile | +? | Medium — adds CI |
| #26 | ASC CLI screenshots + analytics research | +? | Low — docs only |
| #20 | ASC CLI distribution + install script | +? | Medium — adds install script |

### Feature PRs (REVIEW CAREFULLY)

| PR | Title | Lines | Risk |
|----|-------|-------|------|
| #17 | compound-docs skill for marketing learnings | +783 | Medium — new skill outside manifest |
| #22 | structured exit codes + ASC CLI architecture | +? | High — may conflict with errors.ts |
| #24 | deepen-plan + document-review skills | +? | Medium — ports CE skills |
| #25 | skill-creator skill | +? | Medium — meta-skill for creating skills |
| #27 | workflow skills (cmo:plan, cmo:work, etc.) | +? | High — may conflict with /cmo |
| #28 | rich skill metadata to list command | +? | High — modifies src/ |
| #29 | skill registry + frontmatter system | +? | High — modifies src/ |

## Agent Team Plan

Launch 4 parallel review agents, each handling a batch of PRs. Each agent reads the PR diff, checks for conflicts with main, and produces a verdict.

### Agent 1: Close Superseded PRs
- Close #11 with comment: "Best ideas extracted into skills/brainstorm/SKILL.md on main (commit f2d5a05)"
- Close #15 with comment: "marketing-demo built on main. test-landing-page overlaps with page-cro"

### Agent 2: Review Docs/Research PRs (#12, #20, #21, #23, #26)
For each PR:
1. `gh pr diff <num>` — read the full diff
2. Check: does it conflict with current CLAUDE.md or docs/?
3. Check: is the content accurate given our current architecture?
4. Verdict: MERGE / CLOSE / NEEDS CHANGES

Key questions:
- #12 (AGENTS.md): Do we need pre-defined agents, or do skills serve this purpose?
- #20-#26 (ASC CLI research): Are these relevant to mktg at all, or were they filed against the wrong repo?

### Agent 3: Review Feature PRs — Skills (#17, #24, #25)
For each PR:
1. `gh pr diff <num>` — read the full diff
2. Check: does it update skills-manifest.json?
3. Check: does it follow the SKILL.md frontmatter pattern?
4. Check: does it conflict with existing skills?
5. Verdict: MERGE / CLOSE / EXTRACT IDEAS

Key questions:
- #17 (compound-docs): Good idea but we already have learnings.md. Should this be a lightweight logging addition to /cmo instead of a full skill?
- #24 (deepen-plan + document-review): Are these marketing-specific or just CE ports?
- #25 (skill-creator): Meta-skill — useful for users who want to add their own skills?

### Agent 4: Review Feature PRs — CLI Changes (#22, #27, #28, #29)
For each PR:
1. `gh pr diff <num>` — read the full diff
2. Check: does it conflict with existing src/ code?
3. Check: do tests still pass if merged?
4. Check: does it follow our types/patterns (CommandResult, ok/err)?
5. Verdict: MERGE / CLOSE / EXTRACT IDEAS

Key questions:
- #22 (exit codes): We already have structured exit codes 0-6 in errors.ts. Does this conflict?
- #27 (workflow skills): Does this try to make /cmo call sub-skills directly? (violates "skills never call skills")
- #28 (rich metadata): Does list command already show what this adds?
- #29 (skill registry): Does this duplicate skills.ts functionality?

## Execution

1. Launch all 4 agents in parallel
2. Each agent produces a summary table with verdicts
3. Consolidate into a single triage decision list
4. Execute: close rejected PRs with comments, merge approved ones, create issues for "extract ideas"

## Expected Outcomes

- ~4-6 PRs closed (superseded or wrong repo)
- ~2-3 PRs merged (docs improvements, non-conflicting features)
- ~3-5 PRs closed with "good idea, extracted" notes
- 0 PRs left in limbo
