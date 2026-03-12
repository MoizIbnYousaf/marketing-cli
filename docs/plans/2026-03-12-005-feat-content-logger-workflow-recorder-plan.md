---
title: "feat: Content logger — record workflows to turn into skills"
type: feat
status: active
date: 2026-03-12
---

# Content Logger — Workflow Recorder

## Overview

Before building the content-creator skill, we need to **walk through the actual workflow** and log every step. The content logger records what you do — which tools you call, what brand files you read, what Paper MCP commands you run, what ffmpeg flags you use, what decisions you make — so we can later extract that into proper skills and chain them together.

Think of it as a flight recorder for marketing workflows. Do it once manually with logging on, then replay the log as a skill.

## How It Works

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User walks  │────▶│  Logger      │────▶│  Skill       │
│  through     │     │  records     │     │  extracted   │
│  workflow    │     │  every step  │     │  from log    │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Session flow:**
1. Start logger: `mktg log start "instagram carousel workflow"`
2. Do the work — create content manually with the agent's help
3. Agent logs each step to `marketing/logs/{timestamp}-{slug}.md`
4. Stop logger: `mktg log stop`
5. Review the log — see every tool call, file read/write, decision point
6. Extract into a skill — the log becomes the skeleton for content-creator SKILL.md

## What Gets Logged

Each log entry captures:

```yaml
- step: 1
  timestamp: "2026-03-12T14:30:00Z"
  action: "read"
  target: "brand/voice-profile.md"
  note: "Loaded brand voice for copy generation"

- step: 2
  timestamp: "2026-03-12T14:30:15Z"
  action: "decision"
  choice: "listicle framework"
  reason: "User chose listicle for '7 things' format"
  alternatives: ["myth-buster", "tutorial", "hot-take"]

- step: 3
  timestamp: "2026-03-12T14:31:00Z"
  action: "write"
  target: "marketing/content/2026-03-12-stop-doing-this/slides/copy.md"
  note: "Wrote 7 slide copy blocks using brand voice"

- step: 4
  timestamp: "2026-03-12T14:32:00Z"
  action: "tool"
  tool: "mcp__paper__create_artboard"
  args: { name: "Slide 1: Hook", width: 1080, height: 1080 }
  note: "Created 1080x1080 artboard for IG carousel"

- step: 5
  timestamp: "2026-03-12T14:32:30Z"
  action: "tool"
  tool: "mcp__paper__write_html"
  args: { html: "<div style='...'>...</div>" }
  note: "Designed hook slide with brand colors"

- step: 6
  timestamp: "2026-03-12T14:35:00Z"
  action: "tool"
  tool: "ffmpeg"
  command: "ffmpeg -framerate 1/3 -i slide_%d.png -c:v libx264 output.mp4"
  note: "Stitched 7 slides into carousel video at 3s/slide"
```

## Log Output Format

File: `marketing/logs/2026-03-12-instagram-carousel-workflow.md`

```markdown
---
title: Instagram Carousel Workflow
type: workflow-log
date: 2026-03-12
steps: 14
tools_used: [paper-mcp, ffmpeg, read, write]
brand_files_read: [voice-profile.md, creative-kit.md, audience.md]
output_files: [slides/slide_01.png, ..., video.mp4, caption.md]
duration_minutes: 12
---

# Workflow Log: Instagram Carousel

## Context
- Project: akhi-ai
- Content type: Instagram carousel (7 slides)
- Framework: Listicle
- Topic: "7 marketing skills every founder needs"

## Steps

### Step 1: Load Brand Context
- Read `brand/voice-profile.md` → extracted tone (bold, direct, no fluff)
- Read `brand/creative-kit.md` → extracted colors (#1a1a2e bg, #e94560 accent, Inter font)
- Read `brand/audience.md` → target: solo founders, technical, time-poor

### Step 2: Choose Framework
- Decision: **Listicle** (7 items = 7 slides + hook + CTA = 9 total)
- Why: User wanted "tips" format, listicle maps 1:1

### Step 3: Write Copy
- Hook: "Stop wasting time on marketing that doesn't work"
- Slides 2-8: One tip per slide, 2-3 lines each, brand voice
- CTA: "Save this. Follow @akhi.ai for more."
- Hashtags: #marketing #founder #startup #growthhacking

### Step 4: Design in Paper MCP
- Created artboard "Carousel" at 1080x1080
- Slide 1 (hook): Dark bg, large white text, accent underline
- Slides 2-8: Consistent layout — number + tip + subtle icon
- Slide 9 (CTA): Logo + handle + "Follow for more"
- Screenshotted every 2 slides for review

### Step 5: Export
- Screenshotted each slide → PNGs in slides/
- ffmpeg stitched into MP4 (3s/slide, 27s total)

### Step 6: Write Caption
- Generated caption.md with full text + hashtags

## Extracted Patterns (for skill creation)
- Brand files needed: voice-profile.md, creative-kit.md, audience.md
- Tool chain: Paper MCP → screenshot → ffmpeg
- Slide structure: hook → N content slides → CTA
- Design tokens: bg color, accent color, font family from creative-kit.md
- Timing: 3s per slide works for carousels, 2s for fast-paced reels
```

## Implementation

This is intentionally simple — a logging format, not a CLI command. The agent just:

1. Creates the log file at session start
2. Appends to it after each meaningful action
3. Writes the "Extracted Patterns" section at the end

The `/cmo` skill gets a small addition:

```markdown
## Workflow Recording Mode

When the user says "log this", "record this workflow", or "walk me through it":
1. Create `marketing/logs/{date}-{slug}.md` with YAML frontmatter
2. Log every step: what you read, what you decided, what tools you called
3. At the end, write an "Extracted Patterns" section summarizing:
   - Which brand files were needed
   - Which tools were called in what order
   - What the decision points were
   - What the output structure looked like
4. This log becomes the blueprint for a new skill
```

## Files to Create

- `skills/content-creator/rules/workflow-logging.md` (NEW) — logging format and rules

## Files to Modify

- `skills/cmo/SKILL.md` — add "Workflow Recording Mode" section

## Why This Matters

We don't know the exact content creation workflow yet. By logging the first few manual runs, we capture:
- The real tool sequence (not what we planned, what actually worked)
- Decision points that need to become AskUserQuestion prompts in the skill
- Edge cases we didn't think of
- The actual ffmpeg/Remotion flags that produce good output
- How Paper MCP HTML actually looks for different slide types

One good log = one good skill. Three logs = a battle-tested skill.
