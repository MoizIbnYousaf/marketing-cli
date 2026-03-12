---
name: creative
description: AI creative production engine for product photos, videos, social graphics, talking heads, and ad creative. One engine, multiple modes, shared brand kit.
---

# Creative Engine — Vibe Marketing Skills v2

**One engine. Every visual asset your brand needs.**

This skill routes you to the right creative mode, manages your brand identity across all outputs, and handles model selection so you never think about APIs — just describe what you want.

Read `./brand/` per `_system/brand-memory.md`

Follow all output formatting rules from `_system/output-format.md`

**Reads:** `voice-profile.md`, `positioning.md`, `creative-kit.md`, `stack.md`

**Writes:** `creative-kit.md`, `assets.md` (append)

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
  6. Free generation     anything else — just describe it
```

Each mode has its own playbook in `modes/`. The creative engine handles:
- Brand consistency (every mode reads from the same brand kit)
- Model selection (you describe the asset, the engine picks the model)
- Quality control (built-in review and iteration workflow)
- Batch generation (campaign-scale parallel production)

---

## First-Time Setup

### Step 1: Replicate API Key

The creative engine uses Replicate for all AI generation. You need an API token.

**Check if already configured:**
```bash
echo $REPLICATE_API_TOKEN
# or check .env file for REPLICATE_API_TOKEN=
```

**If not found:**
1. Go to [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
2. Create a new token
3. Add to your `.env` file:
   ```
   REPLICATE_API_TOKEN=r8_your_token_here
   ```
4. Replicate is pay-per-use. Most images cost $0.02-0.04. Most videos cost $0.30-1.50. No monthly commitment.

### Step 2: Test Connection

Run a quick smoke test to verify the token works:

```bash
curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  https://api.replicate.com/v1/models/google/nano-banana-pro \
  | jq '.name'
```

Expected output: `"nano-banana-pro"`

### Step 3: Verify Model Access

Check that each model in the stack is accessible:

| Model | Test Command | Expected |
|-------|-------------|----------|
| Nano Banana Pro | `curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" https://api.replicate.com/v1/models/google/nano-banana-pro \| jq '.name'` | `"nano-banana-pro"` |
| Kling 2.5 | `curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" https://api.replicate.com/v1/models/kwaivgi/kling-v2.5-turbo-pro \| jq '.name'` | `"kling-v2.5-turbo-pro"` |
| Veo 3.1 | `curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" https://api.replicate.com/v1/models/google/veo-3.1 \| jq '.name'` | `"veo-3.1"` |
| Sora 2 | `curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" https://api.replicate.com/v1/models/openai/sora-2 \| jq '.name'` | `"sora-2"` |
| Kling Lip-Sync | `curl -s -H "Authorization: Bearer $REPLICATE_API_TOKEN" https://api.replicate.com/v1/models/kwaivgi/kling-lip-sync \| jq '.name'` | `"kling-lip-sync"` |

### Step 4: Record Stack Status

After verification, record what is available in `./brand/stack.md`:

```markdown
# Creative Stack Status

## Last Verified: [date]

| Model | Status | Notes |
|-------|--------|-------|
| Nano Banana Pro (images) | Active | Default image model |
| Kling 2.5 (video) | Active | Default video model |
| Veo 3.1 (video) | Active | Hero content comparison |
| Sora 2 (video) | Active | Hero content comparison |
| Kling Lip-Sync | Active | Talking head mode |
```

### No API Token? Prompt-Only Mode

If `REPLICATE_API_TOKEN` is not set and the user wants to generate creative:

1. **Do not block the skill.** Switch to prompt-only mode.
2. Show: "No Replicate API token found — running in prompt-only mode. I'll generate optimized prompts you can paste into any image/video tool."
3. Follow the same creative workflow (brand kit, style exploration, mode selection) but instead of calling the API, output:
   - The exact prompt text, optimized for the target model
   - Recommended model and settings
   - Aspect ratio and resolution specifications
   - Negative prompt / style exclusions
4. Format prompt output as a copyable code block.
5. If the user sets up their token later, they can re-run with live generation.

This ensures the creative skill is useful even without API access — the prompt engineering and brand-consistent creative direction are valuable on their own.

---

## Brand Kit — Creative Identity

### Building the Brand Kit

On the first creative run, build `./brand/creative-kit.md`. This file is the visual DNA that every mode reads from. Without it, outputs will be inconsistent across assets.

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
- **What to avoid:** [e.g., "Stock photo vibes, clip art, neon/fluorescent colors, dark/gothic"]

## Logo
- **Path:** [relative path to logo file, or "not yet provided"]
- **Usage notes:** [e.g., "White version on dark backgrounds, primary on light"]

## Competitor Visual References
- **Competitor 1:** [name + what to learn/avoid from their visuals]
- **Competitor 2:** [name + what to learn/avoid]
- **Competitor 3:** [name + what to learn/avoid]

## Reference Screenshots
[Links or paths to screenshots of visual styles the brand admires]
```

**If the user does not have a brand kit yet:**
1. Ask for their website URL or existing social profiles
2. Analyze the visual patterns (colors, typography, mood)
3. Propose a creative kit based on what you observe
4. Refine with the user until locked

### Using the Brand Kit

Every mode reads `creative-kit.md` before generating any asset. This means:
- Color palette is injected into prompts automatically
- Typography preferences guide text rendering decisions
- Visual style keywords are appended to every prompt
- "What to avoid" items become prompt guardrails

---

## Style Exploration Process

This is the core creative methodology. It applies to every mode, every time.

### The 5-Direction Exploration

When starting any new creative project (not a one-off generation), follow this process:

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
![Preview](url)
**Strategy:** [why this approach]
**Vibe:** [emotional register]
**Risk level:** Low — category standard

### Direction 2: [Name]
![Preview](url)
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

The user rarely picks one direction entirely. They usually combine: "I like the warmth of 3 but the composition of 1." This is the valuable feedback that makes the final output distinctive.

**Step 4: Lock Style Principles**

Once direction is chosen, document the locked style:

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

With style locked, generate all campaign assets using the same principles. The brand kit + locked style = consistency across dozens of assets.

### When to Skip the 5-Direction Process

- User says "just generate [specific thing]" — they know what they want
- Single asset request with clear specifications
- Follow-up assets that should match an already-locked style
- User explicitly says "skip exploration"

---

## Smart Model Selection

The user describes what they want. The engine picks the model. This is the decision logic:

```
USER REQUEST
│
├─ Contains "image" / "photo" / "graphic" / "picture" / "thumbnail"
│  └─ Nano Banana Pro
│     Payload: references/MODEL_REGISTRY.md → Image Generation
│
├─ Contains "video" / "clip" / "animation" / "motion"
│  ├─ Is this hero/flagship content?
│  │  ├─ Yes → Run Kling 2.5 + Veo 3.1 + Sora 2 in parallel
│  │  └─ No → Kling 2.5 only
│  │
│  ├─ Has a starting image?
│  │  └─ Use I2V payload (start_image / image / input_reference)
│  └─ Text only?
│     └─ Use T2V payload
│     Payload: references/MODEL_REGISTRY.md → Video Generation
│
├─ Contains "talking head" / "presenter" / "lip sync" / "spokesperson"
│  └─ Kling Lip-Sync
│     Payload: references/MODEL_REGISTRY.md → Lip-Sync
│
├─ Contains "ad" / "advertisement" / "paid social" / "display ad"
│  └─ Route to modes/ad-creative.md
│     (uses Nano Banana Pro for stills, Kling 2.5 for video ads)
│
└─ Unclear / general
   └─ Ask: "Is this a still image, a video, or something else?"
```

**Never ask the user which model to use.** Pick the right one based on the request. The only exception is hero content, where you run multiple models in parallel and let them choose the best output.

---

## Batch Generation — Campaign Scale

For campaigns that need many assets, use Claude Code task agents to generate in parallel.

### Parallel Image Generation

When generating a set of images (e.g., 10 product photos for an e-commerce store):

```
Dispatch parallel tasks:

Task 1: Generate hero image — 16:9, dramatic lighting
Task 2: Generate product front — 1:1, clean white background
Task 3: Generate product angle — 1:1, 45-degree view
Task 4: Generate lifestyle shot — 4:5, in-context usage
Task 5: Generate detail close-up — 1:1, macro style
[... continue for all assets]
```

Each task:
1. Reads the brand kit for style consistency
2. Reads the locked style principles (if established)
3. Constructs the prompt following VISUAL_INTELLIGENCE.md guidelines
4. Calls the Replicate API with the MODEL_REGISTRY.md payload
5. Saves the output to the correct directory
6. Reports back with the image URL and quality assessment

### Parallel Video Generation (Hero Content)

For hero content comparison, dispatch three tasks simultaneously:

```
Task 1: Kling 2.5 — same prompt, same start_image
Task 2: Veo 3.1 — same prompt, adapted parameters
Task 3: Sora 2 — same prompt, adapted parameters
```

Wall-clock time = the slowest model (usually 5-8 minutes), not the sum of all three.

### Batch Limits

- Replicate has concurrent prediction limits per account (typically 5-10 for free tier, higher for paid)
- Space batches to avoid hitting rate limits
- For large batches (20+ assets), generate in waves of 5-8 with brief pauses between waves
- Monitor Replicate dashboard for any throttling

---

## File Output Conventions

All creative outputs are saved to organized directories under the project root.

### Directory Structure

```
creative-output/
├── brand/
│   ├── creative-kit.md          # Brand identity (colors, typography, style)
│   └── stack.md                 # Model availability status
│
├── explorations/
│   └── [project-name]/
│       ├── direction-1.png
│       ├── direction-2.png
│       └── ...
│
├── product-photos/
│   ├── hero/                    # Hero shots (16:9, dramatic)
│   ├── lifestyle/               # In-context lifestyle shots
│   ├── ecommerce/               # Clean product-on-white
│   └── detail/                  # Close-up / macro
│
├── videos/
│   ├── hero/                    # Flagship video content
│   ├── product-reveals/         # Product reveal animations
│   ├── social-clips/            # Short-form social video
│   └── comparisons/             # Multi-model comparison outputs
│
├── social-graphics/
│   ├── instagram/
│   │   ├── feed/                # 1:1 and 4:5 posts
│   │   └── stories/             # 9:16 stories
│   ├── linkedin/                # 1:1 and 16:9 posts
│   ├── twitter/                 # 16:9 cards
│   ├── tiktok/                  # 9:16 thumbnails
│   └── youtube/                 # 16:9 thumbnails
│
├── talking-heads/
│   ├── source-videos/           # Base presenter videos
│   ├── audio/                   # Audio files for lip-sync
│   └── output/                  # Final lip-synced videos
│
├── ad-creative/
│   ├── paid-social/             # Facebook, Instagram, LinkedIn ads
│   ├── display/                 # Banner ads, display network
│   └── video-ads/               # Video ad formats
│
└── exports/
    └── [campaign-name]/         # Final packaged deliverables
```

### Naming Convention

```
[asset-type]-[descriptor]-[aspect-ratio]-[version].ext

Examples:
hero-product-floating-16x9-v1.png
lifestyle-morning-coffee-4x5-v2.png
reveal-bottle-orbit-16x9-v1.mp4
social-announcement-sale-1x1-v1.png
talking-head-testimonial-9x16-v1.mp4
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
| Free Generation | (no mode file) | Uses brand kit + MODEL_REGISTRY directly |

---

## Reference Files

| Reference | File | What It Contains |
|-----------|------|-----------------|
| Model Registry | `references/MODEL_REGISTRY.md` | Every API payload, parameter, common mistake. The single source of truth for model calls. |
| Visual Intelligence | `references/VISUAL_INTELLIGENCE.md` | Visual psychology, anti-generic principles, style taxonomy, prompt construction, platform strategy. |

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
# From brand-voice or positioning-angles
creative_brief:
  subject: "what to create"
  audience: "who it is for"
  message: "key communication point"
  platform: "where it will be published"
  style_notes: "any visual direction"
```

### Delivering to Other Skills

```yaml
# To content-atomizer, email-sequences, etc.
creative_delivery:
  assets:
    - path: "creative-output/product-photos/hero/hero-product-16x9-v1.png"
      type: "image"
      dimensions: "1280x720"
      prompt_used: "the exact prompt"
    - path: "creative-output/videos/hero/reveal-16x9-v1.mp4"
      type: "video"
      duration: "5s"
      model_used: "kwaivgi/kling-v2.5-turbo-pro"
  brand_kit: "creative-output/brand/creative-kit.md"
  style_locked: true
```

---

## What's Next After Creative Production

After generating creative assets, suggest next steps:

```
WHAT'S NEXT

Your creative assets are generated and saved. Next moves:

→ /content-atomizer  Create platform-specific variants
                     for social distribution (~10 min)
→ /direct-response-copy  If these visuals need
                     accompanying copy — landing pages,
                     ads, or email (~15 min)
→ /start-here        Review your full project status

Or tell me what you are working on and I will route you.
```

---

*This is the entry point for all visual creative production in Vibe Marketing Skills v2. Every image, every video, every visual asset flows through this engine.*
