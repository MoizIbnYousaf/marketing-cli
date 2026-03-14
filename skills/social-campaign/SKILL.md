---
name: social-campaign
description: >
  End-to-end social content campaign pipeline. Takes a marketing goal and produces
  scheduled, on-brand social posts with visuals across X and LinkedIn via Typefully.
  Chains: CMO strategy, content writing with voice calibration, AI slop audit,
  selective Paper MCP visual design, and Typefully scheduling. Each phase has a
  human gate. Triggers on "social campaign", "schedule posts", "pre-launch content",
  "content calendar", "social content pipeline", "build up content".
allowed-tools:
  - Bash(mktg status *)
  - Bash(*/typefully.js *)
---

# /social-campaign — Social Content Campaign Pipeline

Orchestrator that chains 5 phases into a complete social content campaign:

```
STRATEGY  →  WRITE  →  REVIEW  →  DESIGN  →  SCHEDULE
 (plan)     (draft)   (audit)   (visuals)  (typefully)
```

Each phase is an independent block. This orchestrator is one recipe that combines them. Produces N scheduled posts with selective visuals from a single marketing goal.

## When to Use

- Pre-launch content build-up (1-2 week runway)
- Ongoing content calendar creation
- Campaign bursts around announcements
- Any time you need multiple scheduled posts with visuals

## Architecture

```
Phase 1: STRATEGY   — Plan content calendar with themes, timing, platform mix
Phase 2: WRITE      — Draft posts calibrated to real voice (not brand doc voice)
Phase 3: REVIEW     — AI slop audit + voice calibration against published posts
Phase 4: DESIGN     — Selective visual creation in Paper MCP (not every post)
Phase 5: SCHEDULE   — Upload media + schedule all posts via Typefully
```

## Workflow

### Phase 0: Load Context

1. Run `mktg status --json` to check brand health
2. Read brand files in parallel:
   - `brand/voice-profile.md` (tone, vocabulary, do's/don'ts)
   - `brand/positioning.md` (angles, headlines)
3. Load Typefully config: check default social set, list available accounts
4. Check Typefully queue: `typefully.js queue:get --start-date <today> --end-date <+N days>`
5. Check queue schedule: `typefully.js queue:schedule:get` (what days/times are slots)
6. Read recent published posts: `typefully.js drafts:list --status published --sort -created_at`

**Present context summary:**
```
Brand: loaded (voice, positioning)
Typefully: connected, default social set {id} (@{username})
Queue: {N} empty slots over next {days} days ({schedule})
Last post: "{preview}" ({date})
```

### Phase 1: STRATEGY

Plan the content calendar. This is strategic thinking, not template filling.

**Inputs needed (use AskUserQuestion if not provided):**
- What's the marketing goal? (launch, awareness, engagement, authority)
- What's the timeline? (1 week, 2 weeks, ongoing)
- Any specific themes or angles to hit?

**Planning process:**
1. Analyze the goal, timeline, and available queue slots
2. Plan N posts distributed across the timeline
3. For each post, decide:
   - **Day and time slot** (from queue schedule)
   - **Platform mix** (X only, LinkedIn only, or both)
   - **Theme** (problem awareness, value education, social proof, product tease, announcement)
   - **Content type** (observation, hot take, how-to, builder update, announcement)
4. Consider pacing: build gradually, don't front-load announcements
5. Consider variety: alternate themes, don't repeat the same structure

**Present the calendar for approval:**

```
| # | Date | Platform | Theme | Hook Direction |
|---|------|----------|-------|----------------|
```

**Gate:** User must approve calendar before Phase 2.

### Phase 2: WRITE

Draft all posts, calibrated to the user's ACTUAL voice (not just the brand doc).

**Critical: Voice Calibration**

Before writing, read 5-8 recent published posts from Typefully:
```bash
typefully.js drafts:list --status published --sort -created_at
typefully.js drafts:get <id>  # for full text of top posts
```

Analyze the real voice patterns:
- Sentence length and structure
- Use of fragments vs complete sentences
- Technical specificity level
- How they open posts (fact-first? question? observation?)
- How they close (link? command? statement?)
- Personality markers (dry humor? directness? code inline?)

**Write each post matching these patterns, NOT generic brand voice.**

For each post:
1. Write the full text
2. Determine platform (X, LinkedIn, or both)
3. If cross-platform with same content, use one draft with `--platform x,linkedin`
4. If cross-platform with different content, plan as single draft with platform-specific text

**Present all posts for approval as a numbered list with the full text.**

**Gate:** User must approve posts before Phase 3.

### Phase 3: REVIEW

Two-part quality audit. This is the most important phase for authenticity.

#### 3a: AI Slop Audit

Apply /cmo's quality gate. Read the full pattern reference at [/cmo/references/ai-slop-patterns.md](../cmo/references/ai-slop-patterns.md) and audit every post for structural patterns, transition filler, vocabulary tells, and batch-level monotony.

**This cannot be done with regex.** Read each post manually, in sequence, looking at the batch as a whole (not just individual posts).

#### 3b: Voice Calibration Check

Compare each post against the published posts from Phase 2's calibration:
- Does this sound like the same person wrote it?
- Would this blend in with their real timeline?
- Is the technical specificity level right?
- Are the sentence rhythms natural?

**Fix anything that fails either audit. Present the final versions.**

**Gate:** User approves final post text.

### Phase 4: DESIGN

Selective visual creation. NOT every post gets an image.

**Decision framework:**

| Post Type | Image? | Why |
|-----------|--------|-----|
| Personal observation / hot take | No | Text-only feels more authentic, like a real person thinking |
| Problem statement / vent | No | Raw text hits harder |
| Comparison or contrast | Yes | Visual makes the gap/difference tangible |
| Process or workflow | Yes | Flow diagram is shareable/saveable |
| Data or metrics | Yes | Numbers as visual anchors |
| Terminal/code reference | Yes | Terminal mockup shows developer credibility |
| Product announcement | Yes | Hero card with feature list |
| Builder update | No | Personal voice, no corporate graphic |

**For each post that gets an image, decide WHAT the image shows.** The image must add something the text cannot say alone. Never just repeat the tweet text as a graphic.

**Image types available in Paper MCP:**

| Type | When | Example |
|------|------|---------|
| Split comparison | Contrasting two things | "Runs" vs "Works well" with criteria |
| Terminal mockup | Code/CLI reference | macOS terminal with real commands |
| Timeline/gap visual | Before/after or evolution | Runtimes (polished) vs Tooling (bare) |
| Flow diagram | Process or steps | Numbered step cards with arrows |
| Comparison table | Feature matrix | Two columns with checkmarks vs dashes |
| Hero announcement | Launch or milestone | Product name, feature list, CTA |

**Paper MCP Workflow:**

1. `mcp__paper__get_basic_info()` to check workspace
2. `mcp__paper__get_font_family_info()` to verify brand fonts
3. Create artboards (1200x675 for X+LinkedIn compatibility)
4. Build designs incrementally (header, content, footer per artboard)
5. Screenshot and review each design
6. `mcp__paper__finish_working_on_nodes()` when done

**Design system for social cards:**
- Background: use project's dark marketing color
- Accent: use project's primary brand color
- Fonts: project's brand fonts (display, body, mono)
- Layout: header (logo + domain), content (the visual), footer (accent line + product tag)
- All inline styles, display: flex, no grid/margins/tables

**Present image plan for approval:**

```
| Post # | Image? | What It Shows |
|--------|--------|---------------|
```

**Gate:** User approves image plan. User exports PNGs from Paper after design.

### Phase 5: SCHEDULE

Upload media and schedule all posts via Typefully.

**For posts WITH images:**
1. Find exported PNGs (ask user for location if needed)
2. Upload each: `typefully.js media:upload <file_path>`
3. Create or update draft with media: `typefully.js drafts:create --platform x,linkedin --text "..." --media <media_id> --schedule <ISO_datetime>`

**For text-only posts:**
1. Create draft: `typefully.js drafts:create --platform x,linkedin --text "..." --schedule <ISO_datetime>`

**For updating existing drafts (if created earlier):**
1. Upload media: `typefully.js media:upload <file>`
2. Update draft with text AND media: `typefully.js drafts:update <draft_id> --text "..." --media <media_id> --use-default`
   (Note: `--text` is required even when only adding media)

**Scheduling options:**
- Specific time: `--schedule "2025-01-21T09:00:00Z"`
- Next queue slot: `--schedule next-free-slot`
- Publish now: `--schedule now`

**After scheduling all posts:**
1. Verify: `typefully.js drafts:list --status scheduled --sort scheduled_date`
2. Confirm each draft has correct platform, text, and media
3. Present final summary table

**Gate:** User reviews scheduled posts in Typefully UI.

## Human-in-the-Loop Gates

```
[Phase 1] → User approves content calendar
[Phase 2] → User approves post drafts
[Phase 3] → User approves after AI slop + voice audit
[Phase 4] → User approves image plan, exports PNGs from Paper
[Phase 5] → User verifies in Typefully UI
```

Each gate is an AskUserQuestion. The user can go back to any phase.

## Output

```
marketing/campaigns/{campaign-name}/
  calendar.md              # Content calendar with themes + timing
  posts/
    post-01.md             # Each post with text, platform, schedule
    post-02.md
    ...
  images/
    post-03-comparison.png # Exported from Paper
    post-06-flow.png
    ...
  campaign-log.md          # What was scheduled, draft IDs, media IDs
```

## Integration Requirements

| Integration | Required? | Check |
|-------------|-----------|-------|
| Typefully API key | Yes | `typefully.js config:show` |
| Paper MCP | Only if images needed | `mcp__paper__get_basic_info()` |
| Brand files | Recommended | `mktg status --json` |

If Typefully is not configured, guide setup before Phase 5.
If Paper MCP is not available, skip Phase 4 (text-only campaign).

## Reusable Blocks

| Block | Standalone Use |
|-------|---------------|
| Phase 1 (Strategy) | Content calendar for any channel |
| Phase 2 (Write) | Draft posts for manual publishing |
| Phase 3 (Review) | Audit any written content for AI slop |
| Phase 4 (Design) | Create visuals for any social content |
| Phase 5 (Schedule) | Schedule any drafts via Typefully |

## Anti-Patterns

| Anti-Pattern | Why It Fails | Instead |
|-------------|-------------|---------|
| Image on every post | Looks like a content calendar, not a person | Be selective; text-only posts feel authentic |
| Same card template with different text | Spam in the feed | Each image must have a unique visual concept |
| Writing from brand doc alone | Sounds like marketing copy, not the person | Calibrate against their actual published posts |
| Scheduling all at once without review | AI slop gets through | Manual line-by-line audit is non-negotiable |
| Front-loading announcements | Audience isn't warmed up | Build: awareness → value → tease → announce |

## Principles

- **Voice over brand** — Match the person's real voice, not the documented brand voice
- **Selective visuals** — Every image must earn its place; text-only is a valid choice
- **Batch coherence** — Posts should vary in structure; no two adjacent posts should use the same pattern
- **AI slop is non-negotiable** — Manual audit every time, no shortcuts
- **Skills never call skills** — This SKILL.md teaches the agent the sequence; the agent loads each skill
- **Filesystem is the bus** — Campaign state persists as files, not in conversation
- **Human gates at every phase** — No runaway agent chains
