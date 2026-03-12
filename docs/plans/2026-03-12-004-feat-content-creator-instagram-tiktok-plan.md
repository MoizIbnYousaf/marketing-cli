---
title: "feat: End-to-end content creator for Instagram and TikTok"
type: feat
status: active
date: 2026-03-12
---

# End-to-End Content Creator for Instagram & TikTok

## Overview

The mktg CLI has 26 skills that write copy, strategy, and specs — but nothing that **produces actual visual content**. The content-atomizer writes captions and carousel briefs. The creative skill writes image prompts and video scripts. But nobody renders the final asset. The gap: copy exists, visuals don't.

This plan adds a `content-creator` skill that produces **ready-to-post Instagram carousels and TikTok/Reels videos** by chaining three tools the agent already has:

1. **Paper MCP** — HTML canvas where the agent designs slides (text overlays, brand colors, layouts)
2. **ffmpeg** — Screenshots → stitched video, format conversion, GIF optimization
3. **Remotion** — React-based video composition with transitions, timing, motion

The pipeline: **Brand voice → Copy → Paper MCP slides → Screenshot → Remotion/ffmpeg → MP4/carousel images**

## Problem Statement

| What exists | What's missing |
|---|---|
| content-atomizer writes Instagram captions + "carousel brief" | No actual carousel images generated |
| creative writes video scripts + Remotion code templates | Nobody renders the video |
| marketing-demo records product walkthroughs | No original content creation (only product demos) |
| brand/voice-profile.md defines the voice | Voice doesn't flow into visual content |
| brand/creative-kit.md defines colors/fonts | Colors/fonts don't render into assets |

**Result:** Every content skill stops at text. The agent has to manually create visuals. For Instagram and TikTok, where 90%+ of engagement comes from the visual, this is the critical missing piece.

## Proposed Solution

### New Skill: `content-creator`

A single skill that handles the full pipeline from idea → finished content. It reads brand files, writes copy, designs slides in Paper MCP, and renders final assets.

### The Pipeline

```
INPUT                    DESIGN                    RENDER                  OUTPUT
─────                    ──────                    ──────                  ──────

brand/voice-profile.md ─┐
brand/audience.md ──────┤
brand/positioning.md ───┤
brand/creative-kit.md ──┘
        │
        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│  Write Copy     │───▶│  Paper MCP       │───▶│  Render         │───▶│  Final Asset │
│                 │    │                  │    │                 │    │              │
│  • Hook (1-2s)  │    │  • create_artboard│   │  • Screenshot   │    │  • .png set  │
│  • Slide text   │    │  • write_html()  │    │    each slide   │    │  • .mp4 reel │
│  • CTA          │    │  • get_screenshot│    │  • ffmpeg stitch│    │  • .gif      │
│  • Hashtags     │    │  • per-slide     │    │  • OR Remotion  │    │  • caption   │
│  • Caption      │    │    design        │    │    compose      │    │  • hashtags  │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
```

### Content Types

| Type | Platform | Paper MCP | Render Method | Output |
|------|----------|-----------|---------------|--------|
| **Carousel** | Instagram | 7-10 slides, 1080x1080 | Screenshot each → PNG set | 7-10 .png files + caption |
| **Single post** | Instagram | 1 slide, 1080x1080 | Screenshot → PNG | 1 .png + caption |
| **Reel** | Instagram/TikTok | 5-8 slides, 1080x1920 | Remotion compose with transitions → MP4 | .mp4 (15-60s) + caption |
| **Story** | Instagram | 3-5 slides, 1080x1920 | Screenshot → PNG set or ffmpeg → MP4 | .png set or .mp4 |
| **TikTok video** | TikTok | 5-10 slides, 1080x1920 | Remotion compose → MP4 | .mp4 (15-60s) + caption |

### Slide Design System (Paper MCP)

Each slide is an HTML artboard designed in Paper MCP with brand-consistent styling:

```html
<!-- Example: Carousel slide with hook text -->
<div style="display: flex; flex-direction: column; justify-content: center;
            align-items: center; width: 1080px; height: 1080px;
            background: #1a1a2e; padding: 80px; font-family: 'Inter';">
  <h1 style="color: #ffffff; font-size: 64px; font-weight: 800;
             text-align: center; line-height: 1.2;">
    Stop doing this one thing<br/>in your marketing
  </h1>
  <p style="color: #a0a0b0; font-size: 28px; margin-top: 40px;">
    Swipe to see why →
  </p>
</div>
```

**Design tokens pulled from brand/creative-kit.md:**
- Primary/secondary colors → slide backgrounds, accents
- Font family → all text elements
- Logo → optional watermark on final slide

**Slide archetypes:**
1. **Hook slide** — Bold statement, large text, contrasting background (first slide = first 1-2s of video)
2. **Content slide** — One point per slide, icon + text, consistent layout
3. **Evidence slide** — Stat, quote, or proof point with emphasis styling
4. **CTA slide** — Follow/save/link prompt, brand logo, handle

### Video Composition (Remotion/ffmpeg)

For Reels and TikTok videos, slides become video frames:

**Quick mode (ffmpeg):**
```bash
# Stitch screenshots into video with 3s per slide
ffmpeg -framerate 1/3 -i slide_%d.png -c:v libx264 -pix_fmt yuv420p -vf "scale=1080:1920" output.mp4
```

**Polished mode (Remotion):**
- Each slide is a `<Sequence>` with configurable duration
- Transitions between slides (fade, slide-in, scale)
- Text animation (word-by-word reveal for hooks)
- Background music bed (optional, from local library)
- Auto-generated captions overlay

### Content Frameworks

The skill ships with proven content frameworks for Instagram/TikTok:

| Framework | Slides | Best For | Example |
|-----------|--------|----------|---------|
| **Listicle** | Hook + 5-7 items + CTA | Tips, mistakes, tools | "7 marketing skills you need" |
| **Before/After** | Hook + Before + After + How + CTA | Transformations | "Your landing page vs mine" |
| **Myth Buster** | Hook + Myth + Truth + Proof + CTA | Authority building | "SEO is dead? Actually..." |
| **Tutorial** | Hook + Step 1-5 + Result + CTA | How-to content | "Build a brand voice in 10 min" |
| **Hot Take** | Hook + Contrarian claim + Evidence + Nuance + CTA | Engagement bait | "Stop writing blog posts" |
| **Story** | Hook + Problem + Journey + Lesson + CTA | Personal brand | "How I got 10k followers" |
| **Comparison** | Hook + Option A + Option B + Verdict + CTA | Decision content | "Notion vs Linear for teams" |

## Technical Approach

### File Structure

```
skills/
  content-creator/
    SKILL.md                          # Main skill file
    rules/
      slide-design-system.md          # Paper MCP design tokens + archetypes
      content-frameworks.md           # 7 frameworks with slide-by-slide structure
      platform-specs.md               # IG/TikTok dimensions, limits, best practices
    references/
      example-hooks.md                # 50+ proven hook templates
      hashtag-strategy.md             # Hashtag research methodology

agents/
  research/
    content-creator-agent.md          # Parallel agent for content creation
```

### Skill Workflow (SKILL.md)

```
## On Activation

1. Read brand/ files: voice-profile.md, audience.md, positioning.md, creative-kit.md
2. Determine content type based on user request:
   - "carousel" / "post" → Instagram carousel
   - "reel" / "video" / "tiktok" → Short-form video
   - "story" → Instagram story
   - Unclear → ask with AskUserQuestion
3. Select content framework (or let user choose)
4. Write copy for each slide using brand voice
5. Design each slide in Paper MCP:
   a. create_artboard (platform dimensions)
   b. get_font_family_info (verify brand fonts)
   c. write_html for each slide (one visual group per call)
   d. get_screenshot after every 2-3 slides to self-review
6. Export:
   - Carousel → screenshot each slide → save PNGs to marketing/content/
   - Video → screenshot all → ffmpeg stitch OR Remotion compose → save MP4
7. Generate caption + hashtags
8. Write manifest to marketing/content/YYYY-MM-DD-{slug}/:
   - slides/ (PNG files)
   - video.mp4 (if video)
   - caption.md (caption + hashtags + posting notes)
   - meta.yaml (framework used, brand files read, platform target)
9. Append to brand/assets.md
```

### Paper MCP Integration

**Tool sequence per slide:**
```
mcp__paper__create_artboard("Slide 1: Hook", width, height)
mcp__paper__write_html(artboardId, html, "insert-children")
mcp__paper__get_screenshot(artboardId)  // review
// repeat for each slide
mcp__paper__finish_working_on_nodes()
```

**Design tokens from brand/creative-kit.md → Paper HTML:**
```
creative-kit.md says:           Paper HTML becomes:
  primary: #1a1a2e              background: #1a1a2e
  accent: #e94560               color: #e94560 (for emphasis)
  font: Inter                   font-family: 'Inter'
  style: bold, minimal          font-weight: 800, clean layouts
```

### Rendering Pipeline

**For carousels (PNG output):**
```
Paper MCP artboards → get_screenshot() per slide → save to marketing/content/{slug}/slides/
```

**For video (MP4 output) — Quick mode:**
```bash
# Collect all slide screenshots
ffmpeg -framerate 1/3 \
  -i marketing/content/{slug}/slides/slide_%d.png \
  -c:v libx264 -pix_fmt yuv420p \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  marketing/content/{slug}/video.mp4
```

**For video (MP4 output) — Polished mode (Remotion):**
```typescript
// Generate a Remotion composition from slide images
export const ContentReel: React.FC = () => {
  const slides = ["slide_1.png", "slide_2.png", ...];
  return (
    <Composition
      id="ContentReel"
      component={SlideShow}
      durationInFrames={slides.length * 90} // 3s per slide at 30fps
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ slides, transition: "fade" }}
    />
  );
};
```

### Content Output Structure

```
marketing/content/
  2026-03-12-stop-doing-this/
    slides/
      slide_01_hook.png
      slide_02_point1.png
      slide_03_point2.png
      ...
      slide_07_cta.png
    video.mp4                    # If reel/tiktok
    caption.md                   # Full caption + hashtags
    meta.yaml                    # Metadata for tracking
```

**caption.md format:**
```markdown
---
platform: instagram
type: carousel
framework: listicle
slides: 7
date: 2026-03-12
brand: akhi-ai
---

Stop doing this one thing in your marketing 🛑

Here's what most founders get wrong about content:

1. They write for everyone (write for one person)
2. They post once and forget (repurpose everything)
...

Save this for later. Follow @akhi.ai for more.

#marketing #startup #founder #contentstrategy #growthhacking
```

## Manifest Updates

### skills-manifest.json — add content-creator

```json
"content-creator": {
  "source": "new",
  "category": "creative",
  "layer": "execution",
  "tier": "must-have",
  "reads": ["voice-profile.md", "audience.md", "positioning.md", "creative-kit.md"],
  "writes": ["assets.md"],
  "depends_on": ["brand-voice"],
  "triggers": [
    "create content", "instagram post", "tiktok video", "carousel",
    "reel", "make a post", "social content", "create slides",
    "content for instagram", "content for tiktok", "make a video"
  ],
  "review_interval_days": 7
}
```

### agents-manifest.json — add content-creator agent

```json
"content-creator-agent": {
  "category": "research",
  "file": "research/content-creator-agent.md",
  "writes": ["assets.md"],
  "reads": ["voice-profile.md", "audience.md", "positioning.md", "creative-kit.md"],
  "references_skill": "content-creator",
  "tier": "must-have"
}
```

### /cmo routing table — add entries

```
| Need | Skill | When | Layer |
| Create Instagram carousel | `content-creator` | Have brand, need visual content | Execution |
| Create TikTok video | `content-creator --mode video` | Need short-form video | Execution |
| Create Instagram reel | `content-creator --mode reel` | Need video reel | Execution |
```

### /cmo disambiguation — add entries

```
| User says | Route to | Not this one | Why |
| "make a post" | `content-creator` | `content-atomizer` | Creator makes visuals. Atomizer writes text only. |
| "carousel" | `content-creator` | `content-atomizer` | Creator renders slides. Atomizer writes briefs. |
| "reel" / "tiktok" | `content-creator --mode video` | `marketing-demo` | Creator makes original content. Demo records product. |
```

## Implementation Phases

### Phase 1: Carousel Engine (MVP)

**Deliverables:**
- `skills/content-creator/SKILL.md` — core skill with carousel workflow
- `skills/content-creator/rules/slide-design-system.md` — Paper MCP design tokens
- `skills/content-creator/rules/content-frameworks.md` — 7 frameworks
- `skills/content-creator/rules/platform-specs.md` — IG/TikTok dimensions
- `skills/content-creator/references/example-hooks.md` — hook templates
- Update `skills-manifest.json` with content-creator entry
- Update `skills/cmo/SKILL.md` routing table

**Flow:** Brand files → pick framework → write copy → Paper MCP slides → screenshot → PNG carousel + caption

**Acceptance criteria:**
- [ ] Skill reads brand/voice-profile.md and brand/creative-kit.md
- [ ] Skill creates 7-10 Paper MCP artboards at 1080x1080
- [ ] Each slide uses brand colors, fonts, and voice
- [ ] Screenshots exported as PNG set
- [ ] Caption + hashtags written to caption.md
- [ ] Output saved to marketing/content/{date}-{slug}/
- [ ] brand/assets.md appended with new content entry

### Phase 2: Video Engine

**Deliverables:**
- Add video mode to content-creator SKILL.md
- ffmpeg quick-stitch pipeline (slides → MP4)
- Remotion composition template for polished mode
- 9:16 vertical format support (1080x1920)
- `agents/research/content-creator-agent.md` — parallel agent

**Flow:** Carousel slides (9:16) → ffmpeg stitch with timing → OR Remotion compose with transitions → MP4

**Acceptance criteria:**
- [ ] `--mode video` or `--mode reel` produces MP4
- [ ] Quick mode: ffmpeg stitches slides at 3s/slide
- [ ] Polished mode: Remotion adds transitions between slides
- [ ] Video saved to marketing/content/{date}-{slug}/video.mp4
- [ ] Content-creator agent can be spawned by /cmo for parallel work

### Phase 3: Content Calendar & Batch

**Deliverables:**
- Batch mode: generate a week's worth of content at once
- Content calendar integration (schedule in meta.yaml)
- A/B variant generation (same content, different hooks)
- Performance tracking integration with brand/learnings.md

**Acceptance criteria:**
- [ ] `--batch 7` generates 7 days of content
- [ ] Each piece uses a different framework to avoid monotony
- [ ] Calendar metadata in meta.yaml (suggested post time, day)
- [ ] Learnings from brand/learnings.md influence framework selection

## Allowed Tools

```yaml
allowed-tools:
  - Bash(ffmpeg *)
  - Bash(npx remotion *)
  - mcp__paper__get_basic_info
  - mcp__paper__get_font_family_info
  - mcp__paper__create_artboard
  - mcp__paper__write_html
  - mcp__paper__get_screenshot
  - mcp__paper__finish_working_on_nodes
  - Bash(mktg *)
```

## Dependencies & Risks

| Risk | Mitigation |
|------|------------|
| Paper MCP not running | Skill checks Paper availability first; falls back to HTML file + browser screenshot via ply |
| Font not available in Paper | Always call get_font_family_info before designing; fallback to Inter/system fonts |
| ffmpeg output quality | Use high bitrate settings; test on actual IG/TikTok upload |
| Remotion not installed | Quick mode (ffmpeg-only) works without Remotion; polished mode is optional |
| Slide count too many for video | Cap at 10 slides max for video; 3s per slide = 30s max (sweet spot for Reels) |
| Brand files missing | Progressive enhancement — skill works with zero context using defaults |

## Files to Create

- `skills/content-creator/SKILL.md` (NEW)
- `skills/content-creator/rules/slide-design-system.md` (NEW)
- `skills/content-creator/rules/content-frameworks.md` (NEW)
- `skills/content-creator/rules/platform-specs.md` (NEW)
- `skills/content-creator/references/example-hooks.md` (NEW)
- `agents/research/content-creator-agent.md` (NEW)

## Files to Modify

- `skills-manifest.json` — add content-creator entry
- `agents-manifest.json` — add content-creator-agent entry
- `skills/cmo/SKILL.md` — add routing + disambiguation entries
- `CLAUDE.md` — update skill count (26 → 27), add content-creator to Creative line
- `tests/manifest.test.ts` — update skill count assertion (26 → 27)

## Verification

1. `bun test` — all tests pass with new skill in manifest
2. `mktg list --json` — content-creator shows as installed
3. `mktg doctor` — all checks pass
4. Run `/content-creator` in a project with brand files → produces carousel PNGs
5. Run `/content-creator --mode video` → produces MP4 via ffmpeg
6. Run `/cmo` → "make a carousel" routes to content-creator, not content-atomizer
