---
name: creative
description: "AI creative production engine for product photos, videos, social graphics, talking heads, and ad creative. One engine, multiple modes, shared brand kit. Triggers on: image, video, ad creative, hero image, social graphics, banner, thumbnail, product photo, creative assets, visual content, generate image, make a video, social post graphic, ad design, talking head."
category: creative
tier: must-have
reads:
  - brand/voice-profile.md
  - brand/positioning.md
  - brand/creative-kit.md
writes:
  - brand/creative-kit.md
  - brand/assets.md
triggers:
  - image
  - video
  - ad creative
  - hero image
  - social graphics
  - banner
  - thumbnail
  - product photo
  - creative assets
  - visual content
  - generate image
  - make a video
  - talking head
  - ad design
---

# Creative Engine

**One engine. Every visual asset your brand needs.**

This skill routes you to the right creative mode, manages your brand identity across all outputs, and handles prompt construction so you describe what you want and get production-ready assets.

Read `brand/` context per project conventions. Follow all output formatting rules from the project's output format conventions.

---

## On Activation

When this skill is activated:

1. Read `brand/creative-kit.md` — if it does not exist, run the Brand Kit setup (see below)
2. Read `brand/stack.md` — detect which image/video tools are available in the project
3. Read `brand/voice-profile.md` and `brand/positioning.md` for brand context
4. Ask the user what they are making (see mode selection below)
5. If a style has been locked previously for this project, load it from `brand/creative-kit.md` under "Locked Style Principles"

If `brand/stack.md` does not exist or lists no generation tools, default to **prompt-only mode** — generate optimized prompts the user can paste into any image/video tool.

---

## What Are We Making?

When this skill is invoked, start here:

```
What are we making?

  1. Product photos      hero shots, lifestyle, e-commerce flats
  2. Product videos      reveals, orbits, demos, unboxings
  3. Social graphics     posts, stories, thumbnails, ads
  4. Talking head        presenters, UGC-style, testimonials
  5. Ad creative         paid social, display, video ads
  6. Free generation     anything else — describe it
```

Each mode has its own playbook in `modes/`. The creative engine handles:
- Brand consistency (every mode reads from the same brand kit)
- Model selection (reads `brand/stack.md` for available tools, picks the right one)
- Quality control (built-in review and iteration workflow)
- Batch generation (campaign-scale parallel production)

---

## First-Time Setup

### Step 1: Detect Available Tools

Check `brand/stack.md` for what generation tools are configured. The stack file should list available tools with their type and status:

```markdown
# Creative Stack

## Last Verified: [date]

| Tool | Type | Status | Notes |
|------|------|--------|-------|
| [image model/tool] | image | Active | Default image generation |
| [video model/tool] | video | Active | Default video generation |
| remotion | video-edit | Active | Programmatic video composition |
| ffmpeg | processing | Active | Video/image processing |
```

If `brand/stack.md` does not exist, create it by probing the environment:

```bash
# Check for ffmpeg
which ffmpeg && ffmpeg -version | head -1

# Check for remotion
bunx remotion --version 2>/dev/null || npx remotion --version 2>/dev/null

# Check for any configured API tokens (image/video generation)
# Look in .env for relevant keys without printing values
grep -l "API" .env 2>/dev/null
```

Record what is available. The skill adapts to whatever tools exist.

### Step 2: Prompt-Only Mode (No Generation Tools)

If no image/video generation tools are detected:

1. **Do not block the skill.** Switch to prompt-only mode.
2. Show: "No generation tools detected — running in prompt-only mode. I'll generate optimized prompts you can paste into any image/video tool."
3. Follow the same creative workflow (brand kit, style exploration, mode selection) but output:
   - The exact prompt text, optimized for the target tool
   - Recommended tool/model and settings
   - Aspect ratio and resolution specifications
   - Style exclusions and guardrails
4. Format prompt output as a copyable code block.

The prompt engineering and brand-consistent creative direction are valuable on their own.

---

## Brand Kit — Creative Identity

### Building the Brand Kit

On the first creative run, build `brand/creative-kit.md`. This file is the visual DNA that every mode reads from. Without it, outputs will be inconsistent across assets.

**Prompt the user for:**

```markdown
# Brand Creative Kit

## Brand Colors
- **Primary:** [hex + name, e.g., #2563EB "Electric Blue"]
- **Secondary:** [hex + name]
- **Accent:** [hex + name]
- **Background:** [hex + name, e.g., #0F172A "Deep Navy"]
- **Text:** [hex + name, e.g., #F8FAFC "Near White"]

## Typography Direction
- **Headlines:** [style, e.g., "Bold, modern sans-serif, high impact"]
- **Body:** [style, e.g., "Clean, readable, neutral weight"]
- **Display/Hero:** [style, e.g., "Oversized, condensed, all-caps for impact"]

## Visual Style
- **Photography preference:** [e.g., "Lifestyle over studio, warm natural light"]
- **Illustration style:** [e.g., "Flat vector with subtle gradients, no outlines"]
- **Overall mood:** [e.g., "Confident, warm, premium but not pretentious"]
- **What to avoid:** [e.g., "Stock photo vibes, clip art, neon/fluorescent colors"]

## Logo
- **Path:** [relative path to logo file, or "not yet provided"]
- **Usage notes:** [e.g., "White version on dark backgrounds, primary on light"]

## Competitor Visual References
- **Competitor 1:** [name + what to learn/avoid from their visuals]
- **Competitor 2:** [name + what to learn/avoid]

## Reference Screenshots
[Links or paths to screenshots of visual styles the brand admires]
```

**If the user does not have a brand kit yet:**
1. Ask for their website URL or existing social profiles
2. Analyze the visual patterns (colors, typography, mood)
3. Propose a creative kit based on what you observe
4. Refine with the user until locked

### Using the Brand Kit

Every mode reads `creative-kit.md` before generating any asset:
- Color palette is injected into prompts automatically
- Typography preferences guide text rendering decisions
- Visual style keywords are appended to every prompt
- "What to avoid" items become prompt guardrails

---

## Style Exploration Process

This is the core creative methodology. It applies to every mode, every time.

### The 5-Direction Exploration

When starting any new creative project (not a one-off generation):

**Step 1: Generate 5 Different Approaches**

Do not generate 5 similar images. Generate 5 genuinely different creative directions:

```
Direction 1: [Name] — The safe, expected approach for this category
Direction 2: [Name] — The opposite of Direction 1
Direction 3: [Name] — Borrowed from a completely different industry
Direction 4: [Name] — Emotion-first (prioritizes feeling over information)
Direction 5: [Name] — The wild card (break a convention)
```

Each direction should have a distinct visual strategy — different lighting, composition, color treatment, mood, and reference point.

**Step 2: Present All 5 for Review**

```markdown
## Creative Direction Exploration

### Direction 1: [Name]
![Preview](path-or-url)
**Strategy:** [why this approach]
**Vibe:** [emotional register]
**Risk level:** Low — category standard

### Direction 2: [Name]
![Preview](path-or-url)
**Strategy:** [why this approach]
**Vibe:** [emotional register]
**Risk level:** Medium — against convention

[... repeat for all 5]

---

**Which direction resonates?**
- Pick one to develop
- Combine elements: "I like the lighting from 2 with the composition of 4"
- Request variations on any direction
- Start over with different constraints
```

**Step 3: User Picks Direction or Combines Elements**

The user rarely picks one direction entirely. They usually combine: "I like the warmth of 3 but the composition of 1." This is the valuable feedback.

**Step 4: Lock Style Principles**

Once direction is chosen, document the locked style in `brand/creative-kit.md`:

```markdown
## Locked Style Principles

**Color Treatment:** [specific palette and grading]
**Lighting:** [specific direction, quality, temperature]
**Composition:** [specific framing and layout rules]
**Mood:** [specific emotional register]
**Technical:** [camera reference, texture, processing]
**Anti-patterns:** [what specifically to avoid]
```

**Step 5: Execute at Scale Using Locked Principles**

With style locked, generate all campaign assets using the same principles. Brand kit + locked style = consistency across dozens of assets.

### When to Skip the 5-Direction Process

- User says "just generate [specific thing]" — they know what they want
- Single asset request with clear specifications
- Follow-up assets that should match an already-locked style
- User explicitly says "skip exploration"

---

## Smart Model Selection

Read `brand/stack.md` for available tools. The user describes what they want — the engine picks the tool. Never ask the user which model to use.

```
USER REQUEST
|
+-- Contains "image" / "photo" / "graphic" / "picture" / "thumbnail"
|   --> Use default image tool from brand/stack.md
|
+-- Contains "video" / "clip" / "animation" / "motion"
|   +-- Is this hero/flagship content?
|   |   +-- Yes --> Run multiple video tools in parallel (if available)
|   |   +-- No --> Use default video tool from brand/stack.md
|   +-- Needs editing/composition? --> Use remotion
|   +-- Needs processing (trim, resize, convert)? --> Use ffmpeg
|
+-- Contains "talking head" / "presenter" / "lip sync"
|   --> Use lip-sync tool from brand/stack.md
|   --> Use ffmpeg for post-processing
|
+-- Contains "ad" / "advertisement" / "paid social" / "display ad"
|   --> Route to modes/ad-creative.md
|   --> Uses image tool for stills, video tool for video ads
|
+-- Unclear / general
    --> Ask: "Is this a still image, a video, or something else?"
```

### Video Composition with Remotion

For composed videos (multi-clip sequences, text overlays, transitions):
- Use remotion for programmatic video composition
- Use ffmpeg for processing (trim, resize, format conversion, concatenation)
- Individual clips can come from any generation tool; remotion assembles them

### Tier Strategy — Test Cheap, Ship Quality

If `brand/stack.md` lists multiple tools at different quality/cost tiers:

```
TESTING       --> Cheapest/fastest tool for exploring directions
PRODUCTION    --> Default quality tool for final assets
PREMIUM       --> Best quality tool for hero/flagship content
```

Generate many cheap variants to find what works, then regenerate winners at production quality.

---

## Batch Generation — Campaign Scale

For campaigns that need many assets, use parallel task agents.

### Parallel Image Generation

When generating a set of images (e.g., 10 product photos):

```
Task 1: Generate hero image — 16:9, dramatic lighting
Task 2: Generate product front — 1:1, clean white background
Task 3: Generate product angle — 1:1, 45-degree view
Task 4: Generate lifestyle shot — 4:5, in-context usage
Task 5: Generate detail close-up — 1:1, macro style
```

Each task:
1. Reads the brand kit for style consistency
2. Reads the locked style principles (if established)
3. Constructs the prompt following references/VISUAL_INTELLIGENCE.md guidelines
4. Calls the generation tool with the correct payload
5. Saves the output to the correct directory
6. Reports back with the result and quality assessment

### Batch Limits

- Space batches to avoid hitting rate limits on generation APIs
- For large batches (20+ assets), generate in waves of 5-8
- Monitor for throttling and back off when needed

---

## File Output Conventions

### Directory Structure

```
marketing/creative/
+-- explorations/
|   +-- [project-name]/
|       +-- direction-1.png
|       +-- direction-2.png
|
+-- product-photos/
|   +-- hero/
|   +-- lifestyle/
|   +-- ecommerce/
|   +-- detail/
|
+-- videos/
|   +-- hero/
|   +-- product-reveals/
|   +-- social-clips/
|
+-- social-graphics/
|   +-- instagram/
|   +-- linkedin/
|   +-- twitter/
|   +-- tiktok/
|   +-- youtube/
|
+-- talking-heads/
|   +-- source-videos/
|   +-- audio/
|   +-- output/
|
+-- ad-creative/
|   +-- paid-social/
|   +-- display/
|   +-- video-ads/
|
+-- exports/
    +-- [campaign-name]/
```

### Naming Convention

```
[asset-type]-[descriptor]-[aspect-ratio]-[version].ext

Examples:
hero-product-floating-16x9-v1.png
lifestyle-morning-coffee-4x5-v2.png
reveal-bottle-orbit-16x9-v1.mp4
social-announcement-sale-1x1-v1.png
```

---

## Mode Files

Each mode contains the specific playbook for that asset type:

| Mode | File | What It Covers |
|------|------|----------------|
| Product Photos | `modes/product-photos.md` | Hero shots, lifestyle, e-commerce flats, detail close-ups |
| Product Videos | `modes/product-videos.md` | Reveals, orbits, demos, unboxings, before/after |
| Social Graphics | `modes/social-graphics.md` | Platform-specific posts, stories, thumbnails |
| Talking Head | `modes/talking-head.md` | Presenter videos, UGC-style, testimonials, lip-sync |
| Ad Creative | `modes/ad-creative.md` | Paid social, display, video ads, A/B variants |
| Free Generation | (no mode file) | Uses brand kit + stack directly |

---

## Quality Gate

Before delivering any creative asset, verify:

### Technical
- [ ] Resolution appropriate for intended use
- [ ] No AI artifacts (distorted hands, melted text, impossible geometry)
- [ ] Sharp focus on primary subject
- [ ] Correct aspect ratio for platform

### Brand Alignment
- [ ] Colors match creative-kit.md palette
- [ ] Typography direction is consistent
- [ ] Mood matches brand personality
- [ ] Nothing in the "what to avoid" list appears

### Strategic
- [ ] Asset serves its communication goal
- [ ] Composition supports the intended use (text space if needed)
- [ ] Visual hierarchy is clear (one focal point, one message)
- [ ] Differentiated from competitors (not category-generic)

### Platform
- [ ] Correct dimensions for target platform
- [ ] Works at thumbnail/preview size
- [ ] Hooks within 3 seconds (video)
- [ ] Text legible at mobile size (if applicable)

---

## Handoff Protocols

### Receiving Work from Other Skills

The creative engine can receive briefs from other skills:

```yaml
creative_brief:
  subject: "what to create"
  audience: "who it is for"
  message: "key communication point"
  platform: "where it will be published"
  style_notes: "any visual direction"
```

### Delivering to Other Skills

```yaml
creative_delivery:
  assets:
    - path: "marketing/creative/product-photos/hero/hero-product-16x9-v1.png"
      type: "image"
      dimensions: "1280x720"
      prompt_used: "the exact prompt"
    - path: "marketing/creative/videos/hero/reveal-16x9-v1.mp4"
      type: "video"
      duration: "5s"
      tool_used: "from brand/stack.md"
  brand_kit: "brand/creative-kit.md"
  style_locked: true
```

---

## What's Next After Creative Production

After generating creative assets, suggest next steps:

```
WHAT'S NEXT

Your creative assets are generated and saved. Next moves:

> /content-atomizer  Create platform-specific variants
                     for social distribution (~10 min)
> /direct-response-copy  If these visuals need
                     accompanying copy — landing pages,
                     ads, or email (~15 min)
> /cmo               Review your full project status

Or tell me what you are working on and I will route you.
```
