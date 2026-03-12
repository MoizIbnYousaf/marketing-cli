---
title: "feat: Add brainstorm and marketing-demo skills (24 → 26)"
type: feat
status: draft
date: 2026-03-12
origin: "PR #11 (feat/issue-6), PR #15 (feat/issue-10)"
---

# feat: Add brainstorm and marketing-demo skills

## Summary

Add two new skills — `brainstorm` and `marketing-demo` — taking the best ideas from PR #11 and PR #15 but rebuilt to fit properly into the mktg architecture. Neither PR is merged; this is a clean implementation informed by both.

Skill count: 24 → 26. Tests, manifest, /cmo routing table, and CLAUDE.md all update.

---

## PR Analysis

### PR #11: brainstorm skill — What to keep

**Good ideas:**
- Phase structure (Assess Clarity → Understand Challenge → Explore Approaches → Capture Brief → Handoff) is solid
- "Phase 0: Assess Clarity" gate that skips brainstorming when the request is already specific
- Structured marketing brief output format with YAML frontmatter
- Anti-patterns table (asking 5 questions at once, jumping to tactics, etc.)
- YAGNI principles for marketing — actively resist complexity
- Incremental validation pattern (pause after each section to check alignment)
- Channel selection trade-off matrix (audience, budget, timeline, bandwidth, compounding)
- Output to `marketing/brainstorms/YYYY-MM-DD-<topic>-brainstorm.md`

**What to change:**
- **Missing /cmo integration.** The PR's brainstorm skill is standalone — /cmo has no routing to it. The whole point is that /cmo routes HERE when the agent doesn't know what to do, and brainstorm output feeds BACK into /cmo's routing.
- **Too long (304 lines).** Trim to <250. The "Marketing-Specific Brainstorm Patterns" section (campaign concept, content strategy, channel selection, audience targeting, positioning alternatives) is 80+ lines of tables that overlap with existing skills. Cut it — those skills exist for deep dives.
- **Category wrong.** PR uses `category: strategy`. Should be `category: foundation` — brainstorming precedes strategy, it's the entry point when direction is unclear.
- **Tier wrong.** PR uses `tier: foundation` (not a valid tier value). Should be `tier: must-have` — this is the fallback when /cmo can't route.
- **Writes to wrong dir.** PR writes to `marketing/brainstorms/`. Fine, but the brief output should also be readable by other skills as a structured input. Add a `## Structured Handoff` section at the bottom of the brief with `next-skill:` field so /cmo knows where to route next.
- **No `depends-on` or `allowed-tools`.** Add them for consistency.
- **`reads` lists `brand/voice-profile.md` but frontmatter says `brand/voice.md`.** Fix to `brand/voice-profile.md` (that's the actual filename per `brand.ts`).

### PR #15: marketing-demo skill — What to keep

**Good ideas:**
- Demo type taxonomy (hero demo, feature highlight, full walkthrough, social clip, email GIF, how-to) with durations and format specs
- Shot list planning before recording — structured approach
- Platform-specific viewport configs (1280x800 desktop, 1080x1080 Instagram square, 600x400 email)
- ffmpeg conversion recipes for MP4, GIF, email-optimized GIF, square crop
- Framerate guidance per demo type
- Completion summary with asset table and suggested usage
- Output to `marketing/demos/`

**What to change:**
- **Uses `agent-browser` CLI which doesn't exist in stack.** The mktg stack uses `playwright-cli` / `ply` for browser automation (per `brand/stack.md` template). Replace all `agent-browser` references with `ply` commands.
- **No Remotion integration.** The PR only does screenshot-to-ffmpeg stitching. The skill should support TWO paths: (A) screenshot-stitch for quick demos via ply + ffmpeg, and (B) Remotion compositions for polished marketing videos with transitions, text overlays, branded intros. Remotion is already in `brand/stack.md`.
- **`reads` lists `brand/voice.md`.** Fix to `brand/voice-profile.md`.
- **Too long (392 lines).** Trim. The upload/distribute section (rclone, PR editing) is out of scope — that's distribution, not demo creation. Cut to <300 lines.
- **Missing `depends-on`.** Should depend on `brand-voice` (for branded demos) and reference `creative` skill for visual direction.
- **test-landing-page skill ignored** as instructed — we only take the marketing-demo concept.

---

## New Skill Specifications

### 1. `brainstorm` skill

**File:** `skills/brainstorm/SKILL.md`

**Frontmatter:**
```yaml
---
name: brainstorm
description: |
  Structured marketing brainstorming when direction is unclear. Use when the agent doesn't know which skill to run, the user's request has multiple valid interpretations, or campaign/content/channel strategy needs exploration before execution. Produces a structured marketing brief that feeds back into /cmo for skill routing. Triggers on: brainstorm, help me think through, what should we market, explore approaches, I don't know where to start, what campaign, how should we position.
category: foundation
tier: must-have
reads:
  - brand/voice-profile.md
  - brand/audience.md
  - brand/positioning.md
  - brand/learnings.md
writes:
  - marketing/brainstorms/
depends-on: []
triggers:
  - brainstorm
  - help me think through
  - what should we market
  - explore approaches
  - I don't know where to start
  - what campaign
  - how should we position
  - what should I do next
  - marketing ideas
allowed-tools: []
---
```

**Structure (target: ~220 lines):**

1. **On Activation** — Read brand/ files if they exist. Works standalone at zero context.
2. **Phase 0: Assess Clarity** — Gate check. If the request is already specific, suggest skipping to the relevant execution skill via /cmo.
3. **Phase 1: Understand the Challenge** — One question at a time. Multiple choice preferred. Topics: goal, product, audience, channels, constraints, competition.
4. **Phase 2: Explore Approaches** — 2-3 concrete strategic directions. Each has: core angle, channels, audience fit, pros/cons, best-when.
5. **Phase 3: Capture Marketing Brief** — Structured markdown with YAML frontmatter. Key addition vs PR: include a `## Structured Handoff` block:
   ```yaml
   ## Structured Handoff
   next-skill: launch-strategy  # or whichever skill fits
   confidence: high
   context-summary: "B2B SaaS launch targeting developer audience via SEO + community"
   ```
6. **Phase 4: Route Back to /cmo** — Don't just list options. Explicitly state: "The brainstorm is complete. Run `/cmo` to execute the next step, or invoke `/<next-skill>` directly."
7. **Anti-Patterns** — Keep the table from PR #11 (it's good).
8. **YAGNI Principles** — Keep from PR #11 (resist complexity).

**Key difference from PR:** The brief output includes `next-skill:` in its handoff block. /cmo reads this to auto-route after brainstorming. This closes the loop.

### 2. `marketing-demo` skill

**File:** `skills/marketing-demo/SKILL.md`

**Frontmatter:**
```yaml
---
name: marketing-demo
description: |
  Record product demos and walkthroughs for marketing assets. Supports two modes: quick screenshot-stitch demos via ply + ffmpeg, and polished Remotion compositions with transitions and branded overlays. Use when the user wants a product demo video, walkthrough GIF, feature showcase, social media clip, or any visual asset showing the product in action. Triggers on: product demo, demo video, walkthrough, feature showcase, record demo, marketing video, GIF demo, product tour.
category: creative
tier: nice-to-have
reads:
  - brand/voice-profile.md
  - brand/positioning.md
  - brand/creative-kit.md
  - brand/stack.md
writes:
  - marketing/demos/
depends-on:
  - brand-voice
triggers:
  - product demo
  - demo video
  - walkthrough video
  - feature showcase
  - record demo
  - marketing video
  - screen recording
  - GIF demo
  - product tour
allowed-tools:
  - Bash(ply *)
  - Bash(ffmpeg *)
  - Bash(npx remotion *)
---
```

**Structure (target: ~280 lines):**

1. **On Activation** — Read brand/ files. Check `brand/stack.md` for available tools. Check ply, ffmpeg, Remotion availability.
2. **Prerequisites check** — `command -v ply`, `command -v ffmpeg`, optionally `command -v npx` for Remotion.
3. **Determine Demo Type** — Same taxonomy from PR (hero, feature highlight, full walkthrough, social clip, email GIF, how-to) with duration/format table.
4. **Plan Shot List** — Keep from PR. Structured shot-by-shot plan before recording.
5. **Mode A: Quick Demo (ply + ffmpeg)** — Screenshot capture using `ply` commands (not `agent-browser`). Then ffmpeg stitching. Keep the ffmpeg recipes from PR (MP4, preview GIF, email GIF, square crop). This is for fast, rough demos.
6. **Mode B: Polished Demo (Remotion)** — For marketing-grade output. Generate a Remotion composition with:
   - Branded intro/outro (colors from `brand/creative-kit.md`)
   - Text overlays for feature callouts
   - Smooth transitions between scenes
   - Render via `npx remotion render`
   - Reference the `remotion-best-practices` skill in `all-skills/` for patterns (but don't depend on it — inline the key patterns).
7. **Convert & Output** — ffmpeg recipes for format conversion. Output to `marketing/demos/`.
8. **Completion Summary** — Asset table with sizes, formats, suggested usage per platform.

**Key differences from PR:**
- Uses `ply` instead of `agent-browser`
- Adds Remotion path for polished output
- Reads `brand/creative-kit.md` for branded visuals
- Reads `brand/stack.md` to check tool availability
- Drops the upload/distribute section (that's distribution, not this skill's job)
- Category is `creative` (not `content`) to sit alongside the existing `creative` skill

---

## /cmo Integration

### Changes to `skills/cmo/SKILL.md`

1. **Update skill count** in the opening line: "24 marketing skills" → "26 marketing skills"

2. **Add brainstorm to the Workflow section** — Insert before the existing 5-level escalation:
   ```
   0. **Unclear** — Direction unknown. Run `brainstorm` to explore before committing to a path.
   ```

3. **Add two rows to the Skill Routing Table:**

   | Need | Skill | When | Layer |
   |------|-------|------|-------|
   | Explore marketing direction | `brainstorm` | User is vague, multiple valid paths, or says "I don't know" | Foundation |
   | Record product demo | `marketing-demo` | Need video/GIF assets showing the product | Creative |

4. **Add brainstorm to Disambiguation table:**

   | User says | Route to | Not this one | Why |
   |-----------|----------|--------------|-----|
   | "what should I do" | `brainstorm` | `cmo` (directly) | Brainstorm explores; /cmo executes a known path. |
   | "demo video" | `marketing-demo` | `creative` | marketing-demo records product. creative generates ad visuals. |

5. **Add /cmo auto-routing from brainstorm output.** Add to Guardrails section:
   ```
   - After `brainstorm` completes, read `marketing/brainstorms/*.md` for the `next-skill:` field. Route to that skill automatically unless the user overrides.
   ```

6. **Update the "First 30 Minutes" section** — Add a note:
   ```
   If the user's goal is unclear, start with `brainstorm` BEFORE foundation skills. Brainstorm determines the direction; foundation skills build the brand.
   ```

### Changes to `skills/cmo/SKILL.md` — Skill Redirects table

Add:
```
| "marketing-ideas" | `brainstorm` |
```

Currently `marketing-ideas` redirects to `cmo` in the manifest. Change it to redirect to `brainstorm` instead (both in the SKILL.md table and `skills-manifest.json` redirects).

---

## Manifest Updates

### `skills-manifest.json` — Add two entries

```json
"brainstorm": {
  "source": "new",
  "category": "foundation",
  "layer": "foundation",
  "tier": "must-have",
  "reads": ["voice-profile.md", "audience.md", "positioning.md", "learnings.md"],
  "writes": [],
  "depends_on": [],
  "triggers": ["brainstorm", "help me think through", "what should we market", "explore approaches", "I don't know where to start", "what campaign", "how should we position", "what should I do next", "marketing ideas"],
  "review_interval_days": 30
},
"marketing-demo": {
  "source": "new",
  "category": "creative",
  "layer": "execution",
  "tier": "nice-to-have",
  "reads": ["voice-profile.md", "positioning.md", "creative-kit.md", "stack.md"],
  "writes": [],
  "depends_on": ["brand-voice"],
  "triggers": ["product demo", "demo video", "walkthrough video", "feature showcase", "record demo", "marketing video", "screen recording", "GIF demo", "product tour"],
  "review_interval_days": 90
}
```

### `skills-manifest.json` — Update redirects

```json
"marketing-ideas": "brainstorm"
```

(Change from current `"marketing-ideas": "cmo"`)

---

## Test Updates (24 → 26)

Every hardcoded `24` in tests becomes `26`. Affected files and lines:

| File | What changes |
|------|-------------|
| `tests/manifest.test.ts:36` | `toHaveLength(24)` → `toHaveLength(26)` |
| `tests/skills.test.ts:30` | `toHaveLength(24)` → `toHaveLength(26)` |
| `tests/skills.test.ts:43` | `toHaveLength(24)` → `toHaveLength(26)` |
| `tests/skills.test.ts:106` | `toBe(24)` → `toBe(26)` |
| `tests/skills.test.ts:127` | `toHaveLength(24)` → `toHaveLength(26)` |
| `tests/skills.test.ts:151` | Comment: "all 24" → "all 26" |
| `tests/skills.test.ts:172` | `toBe(24)` → `toBe(26)` |
| `tests/skills.test.ts:180` | `toBe(24)` → `toBe(26)` |
| `tests/list.test.ts:16` | Test name: "returns 24 skills" → "returns 26 skills" |
| `tests/list.test.ts:21` | `toBe(24)` → `toBe(26)` |
| `tests/cli.test.ts:70` | `toBe(24)` → `toBe(26)` |
| `tests/status.test.ts:70` | `toBe(24)` → `toBe(26)` |
| `tests/types.test.ts:20` | `count: 24` → `count: 26` |
| `tests/pipeline.test.ts:38` | `toBe(24)` → `toBe(26)` |
| `tests/pipeline.test.ts:100` | `toBe(24)` → `toBe(26)` |
| `tests/pipeline.test.ts:122` | Test name + assertions: 24 → 26 |
| `tests/pipeline.test.ts:127-128` | `toBe(24)` and `toHaveLength(24)` → 26 |
| `tests/pipeline.test.ts:159-160` | `toBe(24)` → `toBe(26)` |

**New test coverage needed:**
- `tests/manifest.test.ts` — Verify `brainstorm` and `marketing-demo` entries exist with correct metadata
- `tests/skills.test.ts` — Verify both new SKILL.md files exist on disk and have valid frontmatter
- `tests/pipeline.test.ts` — Verify `mktg list` includes both new skills in output

---

## CLAUDE.md Updates

1. **Skills count:** "24 marketing skills" → "26 marketing skills" (appears in "What This Is" section and "Four components" list)
2. **Skills list:** Add to Foundation line: `brainstorm`. Add to Creative line: `marketing-demo`
3. **Commands section:** Update `mktg list --json` reference from "24 skills" if mentioned
4. **/cmo skill description** in the opening: "Orchestrates 24 marketing skills" → "Orchestrates 26 marketing skills"

---

## Complete File List

### Created (2 files)
- `skills/brainstorm/SKILL.md`
- `skills/marketing-demo/SKILL.md`

### Modified (8+ files)
- `skills-manifest.json` — Add 2 entries + update redirect
- `skills/cmo/SKILL.md` — Routing table, disambiguation, guardrails, workflow, skill count
- `CLAUDE.md` — Skill count, skill list
- `tests/manifest.test.ts` — 24 → 26
- `tests/skills.test.ts` — 24 → 26 + new skill validation
- `tests/list.test.ts` — 24 → 26
- `tests/cli.test.ts` — 24 → 26
- `tests/status.test.ts` — 24 → 26
- `tests/types.test.ts` — 24 → 26
- `tests/pipeline.test.ts` — 24 → 26

---

## Implementation Order

1. Add `skills/brainstorm/SKILL.md` and `skills/marketing-demo/SKILL.md`
2. Update `skills-manifest.json` (2 entries + redirect change)
3. Update `skills/cmo/SKILL.md` (routing, disambiguation, guardrails, counts)
4. Update `CLAUDE.md` (counts and skill list)
5. Update all test files (24 → 26)
6. Run `bun test` to verify
7. Run `bun x tsc --noEmit` to verify types
