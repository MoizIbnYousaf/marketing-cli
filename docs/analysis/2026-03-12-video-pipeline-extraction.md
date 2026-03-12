---
title: Video Pipeline Extraction — Full Analysis
date: 2026-03-12
type: analysis
source: workflow-log (halalscreen/marketing/logs/2026-03-12-instagram-content-creation-workflow.md)
tasks: 12 (all completed)
---

# Video Pipeline Extraction — Full Analysis

Mining the HalalScreen TikTok slideshow workflow (Paper MCP → ffmpeg → Remotion) for how to turn it into proper mktg CLI skills.

## Table of Contents

1. [Skill Boundary Decomposition](#1-skill-boundary-decomposition)
2. [/video-content Skill Architecture](#2-video-content-skill-architecture)
3. [ffmpeg Bookend Architecture](#3-ffmpeg-bookend-architecture)
4. [Remotion Deep Integration](#4-remotion-deep-integration)
5. [Remotion Template System](#5-remotion-template-system)
6. [Paper → Video Handoff Protocol](#6-paper--video-handoff-protocol)
7. [Manifest & Routing Updates](#7-manifest--routing-updates)
8. [Improving Initial Slideshow Generation](#8-improving-initial-slideshow-generation)
9. [/paper-marketing Audit](#9-paper-marketing-audit)
10. [Remotion Capabilities Mining](#10-remotion-capabilities-mining)
11. [ffmpeg Advanced Techniques](#11-ffmpeg-advanced-techniques)
12. [Paper MCP Tool Usage Analysis](#12-paper-mcp-tool-usage-analysis)
13. [Cross-Skill Content Spec Format](#13-cross-skill-content-spec-format)

---

## 1. Skill Boundary Decomposition

### Workflow Phases with Natural Boundaries

```
Steps 1-7:   Brand loading + routing          → /cmo (orchestrator)
Steps 8-11:  Paper MCP design + selection      → /paper-marketing (existing #27)
Step 12:     User exports PNG from Paper UI    → Human-in-the-loop
Steps 13-15: ffmpeg slice + Remotion animate   → /video-content (NEW #28)
```

### Decision: 2 Skills + 1 Utility (NOT one mega-skill)

| Component | Type | Responsibility |
|-----------|------|---------------|
| `/paper-marketing` | Skill (existing #27) | Design: brand → Paper MCP → 5 variations → selection → handoff |
| `/video-content` | Skill (NEW #28) | Assembly + production: content spec → ffmpeg v1 → Remotion v2 → render |
| `ffmpeg-slideshow` | Reference doc | Reusable ffmpeg commands for slice/stitch/Ken Burns |

**Why composable, not monolithic:**
- `/paper-marketing` is useful WITHOUT video (static Instagram carousels)
- `/video-content` works WITHOUT Paper (manual images, Canva exports)
- Different cadence: designs change rarely, videos re-render often
- Different tools: Paper MCP agents vs ffmpeg+Remotion — mixing bloats context

**Data flow:**
```
/paper-marketing writes → marketing/content-specs/{name}.yaml
                        → marketing/handoffs/{name}-handoff.yaml
/video-content reads   → both files above + exported PNG
```

---

## 2. /video-content Skill Architecture

### Input Contract
- **Required**: `brand/creative-kit.md`, `brand/voice-profile.md`, `marketing/content-specs/{name}.yaml`
- **Optional**: `brand/positioning.md`, exported slide PNG(s), handoff YAML

### Output Contract
- `marketing/video/{name}/` — Remotion project directory
- `~/Desktop/{name}-v1.mp4` — ffmpeg quick version
- `~/Desktop/{name}-v2.mp4` — Remotion animated + ffmpeg post-processed version
- Updates `brand/assets.md` with new video asset

### Three-Tier Pipeline (ffmpeg Bookends Everything)

```
ALL TIERS:       ffmpeg PRE (slice artboard → individual PNGs)
                              ↓
Tier v1:         ffmpeg STITCH (crossfade transitions)
Tier v1.5:       ffmpeg STITCH + Ken Burns + audio
Tier v2:         Remotion ANIMATE (spring physics, archetypes, light leaks, SFX, voiceover)
                              ↓
ALL TIERS:       ffmpeg POST (audio mix, two-pass encode, thumbnail, GIF preview)
```

| Tier | Middle Layer | Build Time | Quality | Use Case |
|------|-------------|-----------|---------|----------|
| v1 Quick | ffmpeg stitch (fade) | ~5s | Static slides | Quick review, placeholder |
| v1.5 Enhanced | ffmpeg Ken Burns + audio | ~15s | Subtle motion | Good enough for most posts |
| v2 Full | Remotion + ffmpeg post | ~90s | Production | Hero content, campaigns |

### Skill Workflow (Updated)

```
Phase 1: LOAD
  1. Read content spec YAML (or create from scratch via AskUserQuestion)
  2. Read brand/creative-kit.md → extract palette, fonts, logo
  3. Read brand/voice-profile.md → extract copy rules

Phase 2: CHOOSE
  4. AskUserQuestion: tier (v1/v1.5/v2/all)
  5. AskUserQuestion: voiceover? (if v2, requires ElevenLabs API key)
  6. AskUserQuestion: background audio? (provide file or skip)

Phase 3: ffmpeg PRE (all tiers)
  7. If tall artboard: slice into individual slides (crop + 2x→1x scale)
  8. Save to marketing/video/{name}/public/slides/

Phase 4a: ffmpeg MIDDLE (v1/v1.5 only)
  9. v1: xfade stitch with platform-appropriate transitions
  10. v1.5: + Ken Burns zoompan per slide + audio mix
  11. Output: ~/Desktop/{name}-v1.mp4

Phase 4b: Remotion MIDDLE (v2)
  12. Generate brand.ts from palette
  13. Generate fonts.ts from font config
  14. Generate slide components from archetype templates
  15. Generate Root.tsx with Zod parametrizable schema + calculateMetadata
  16. Add light leaks at emotional pivots (from content spec transition_after)
  17. Add SFX: whoosh on transitions, switch on counter ticks
  18. If voiceover: generate TTS via ElevenLabs → MP3 per slide → <Audio> components
  19. If voiceover: auto-generate subtitle track
  20. bun install → Remotion Studio preview
  21. AskUserQuestion: "Preview good? Render?"
  22. bunx remotion render → raw MP4

Phase 5: ffmpeg POST (all tiers)
  23. If background audio provided: mix into final MP4 (volume 0.15, fade in/out)
  24. Two-pass encode for optimal quality/size ratio
  25. Extract thumbnail: frame at 1s mark → thumb.png
  26. Generate GIF preview: 6s, 10fps, 540px wide
  27. Platform-specific encode if needed (different bitrate for Reels vs TikTok)
  28. Output: ~/Desktop/{name}-v2.mp4 (or -v1, -v1.5)

Phase 6: REGISTER
  29. Update brand/assets.md with new video asset
  30. Log to marketing/logs/ if workflow logging active
```

### Manifest Entry
```json
{
  "source": "new",
  "category": "creative",
  "layer": "execution",
  "tier": "nice-to-have",
  "reads": ["voice-profile.md", "creative-kit.md", "positioning.md", "assets.md"],
  "writes": ["assets.md"],
  "depends_on": ["brand-voice"],
  "triggers": ["video content", "animate slides", "tiktok video", "remotion", "slideshow video", "social video", "reel", "short"]
}
```

---

## 3. ffmpeg Bookend Architecture

**Key insight: ffmpeg runs at BOTH ends of the pipeline, not just the middle.**

### ffmpeg PRE (Start — All Tiers)

Slices tall stacked artboard into individual slides:
```bash
# Slice: 2x artboard → 1x individual slides
ffmpeg -i input.png -vf "crop={W*2}:{H*2}:0:{i*H*2},scale={W}:{H}" slide_N.png
```

Also handles:
- 2x → 1x scale down (sharper results than 1x export)
- Format conversion if needed (WebP → PNG for Remotion compatibility)
- Image validation (check dimensions match expected)

### ffmpeg MIDDLE (v1/v1.5 — Alternative to Remotion)

**v1 Quick stitch:**
```bash
ffmpeg -i s1.png -i s2.png ... -filter_complex \
  "[0][1]xfade=transition=fade:duration=0.5:offset=3.0[v01]; ..."
```

**v1.5 Ken Burns + stitch:**
```bash
# Per slide: add subtle zoom motion
ffmpeg -loop 1 -i slide.png -vf "zoompan=z='min(zoom+0.0008,1.15)':d=105:s=1080x1920:fps=30" -t 3.5 slide_kb.mp4
# Then stitch the animated clips
ffmpeg -i s1_kb.mp4 -i s2_kb.mp4 ... -filter_complex "[0][1]xfade=..."
```

### ffmpeg POST (End — All Tiers)

After Remotion renders raw MP4 (or after v1/v1.5 stitch):

```bash
# 1. Audio mixing (background track)
ffmpeg -i video.mp4 -i ambient.mp3 \
  -filter_complex "[1:a]volume=0.15[bg];[bg]afade=t=in:d=1[bgi];[bgi]afade=t=out:st={DURATION-2}:d=2[bgf]" \
  -map 0:v -map "[bgf]" -shortest with_audio.mp4

# 2. Two-pass encode (optimal quality/size)
ffmpeg -i with_audio.mp4 -c:v libx264 -b:v 5M -pass 1 -f null /dev/null
ffmpeg -i with_audio.mp4 -c:v libx264 -b:v 5M -pass 2 -movflags +faststart final.mp4

# 3. Thumbnail extraction
ffmpeg -i final.mp4 -ss 1 -frames:v 1 thumb.png

# 4. GIF preview (for Discord/Slack/web)
ffmpeg -i final.mp4 -vf "fps=10,scale=540:-1" -t 6 preview.gif

# 5. WebM for web embedding (smaller)
ffmpeg -i final.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 preview.webm
```

### Advanced xfade Transitions (Brand-Mapped)

| Transition | Feel | Map to Content |
|-----------|------|---------------|
| `fade` | Soft dissolve | Default, most slides |
| `dissolve` | Smoother fade | Cinematic, spiritual content |
| `circleopen` | Radial reveal | "opens." moments, revelations |
| `smoothup` | Eased vertical | Cascade/list slides |
| `radial` | Clock wipe | Counter/timer slides |
| `wiperight` | Directional | Sequential progression |

### Platform Presets
| Platform | Dimensions | Max Duration | Recommended Bitrate |
|----------|-----------|-------------|-------------------|
| TikTok | 1080x1920 | 10min | 5-8 Mbps |
| Instagram Reels | 1080x1920 | 90s | 5-8 Mbps |
| YouTube Shorts | 1080x1920 | 60s | 8-12 Mbps |
| Instagram Square | 1080x1080 | 60s | 5 Mbps |
| Instagram Portrait | 1080x1350 | 60s | 5 Mbps |

---

## 4. Remotion Deep Integration

### What We Used (Baseline)
- `spring()` + `interpolate()` for animations
- `TransitionSeries` with `fade()` and `slide()` transitions
- `@remotion/google-fonts` for loading fonts
- `<Img>` for logo, `staticFile()` for assets
- `AbsoluteFill`, `Sequence` patterns

### What We Should Bake In (Full Remotion Stack)

#### Auto-Included (Every v2 Project)

**1. Sound Effects on Transitions**
Every `<TransitionSeries.Transition>` gets a synced `<Audio>` from `@remotion/sfx`:
```tsx
<TransitionSeries.Sequence durationInFrames={slideDuration}>
  <Audio src="https://remotion.media/whoosh.wav" volume={0.3} />
  <SlideComponent />
</TransitionSeries.Sequence>
```
Map SFX to content: `whoosh.wav` for slides, `switch.wav` for counter ticks, `page-turn.wav` for cascade reveals.

**2. Light Leaks at Emotional Pivots**
Content spec marks emotional pivots with `transition_after: { type: light_leak }`. Template auto-inserts:
```tsx
<TransitionSeries.Overlay durationInFrames={Math.round(0.8 * fps)}>
  <LightLeak seed={3} hueShift={45} />  {/* Gold-tinted for brand */}
</TransitionSeries.Overlay>
```
`hueShift` auto-calculated from brand accent color: gold ≈ 45, blue ≈ 240, green ≈ 120.

**3. calculateMetadata for Dynamic Duration**
No more hardcoded `Math.ceil(27 * FPS)`. Duration calculated from content spec:
```tsx
const calculateMetadata: CalculateMetadataFunction<Props> = async ({ props }) => {
  const slideDurations = props.slides.map(s => s.duration_seconds * FPS);
  const transitionDurations = props.transitions.map(t => t.duration * FPS);
  const total = slideDurations.reduce((a, b) => a + b, 0)
              - transitionDurations.reduce((a, b) => a + b, 0);
  return { durationInFrames: Math.ceil(total) };
};
```
If voiceover is enabled, duration is driven by audio length instead.

**4. Zod Parametrizable Schema**
Every project gets a schema making it editable via Remotion Studio sidebar:
```tsx
const Schema = z.object({
  bgColor: zColor().default("#0B1745"),
  accentColor: zColor().default("#D4A843"),
  textColor: zColor().default("#FFF8E7"),
  slides: z.array(z.object({
    heroText: z.string(),
    bodyText: z.string().optional(),
    labelText: z.string().optional(),
  })),
  showLogoIntro: z.boolean().default(true),
  showFooter: z.boolean().default(true),
  sfxEnabled: z.boolean().default(true),
  sfxVolume: z.number().min(0).max(1).default(0.3),
});
```

**5. Text Measuring with fitText()**
Instead of hardcoded font sizes, auto-fit hero text to container:
```tsx
const { fontSize } = fitText({
  text: heroText,
  withinWidth: 900, // slide width minus padding
  fontFamily: "Space Grotesk",
  fontWeight: "bold",
});
return <div style={{ fontSize: Math.min(fontSize, 300) }}>{heroText}</div>;
```
This handles varying text lengths across projects — "30" needs 300px, "1,247" needs smaller.

**6. Richer Transition Variety**
Map content spec transition types to Remotion transitions:
```tsx
const transitionMap = {
  fade: () => fade(),
  slide: (dir) => slide({ direction: dir }),
  wipe: () => wipe(),
  flip: () => flip(),
  clock_wipe: () => clockWipe(),
  light_leak: null, // Handled as Overlay, not Transition
};
```

#### Opt-In (User Chooses)

**7. ElevenLabs Voiceover**
If user enables voiceover:
- Generate TTS script: `generate-voiceover.ts` reads content spec slide text → calls ElevenLabs API → MP3 per slide
- Each slide gets `<Audio src={staticFile(`voiceover/slide-${i}.mp3`)} />` synced to its `<Sequence>`
- `calculateMetadata` switches to audio-driven duration (audio length determines slide timing)
- Auto-generate subtitle `.srt` from TTS timestamps
- Subtitle track rendered via `@remotion/captions`

**8. Background Music**
If user provides audio file:
- Copy to `public/audio/background.mp3`
- Wrap entire composition in `<Audio>` at low volume (0.1-0.2) with fade in/out
- OR: defer to ffmpeg POST layer for mixing (simpler, more control)

**9. Lottie Animations**
Replace manual sparkle particles with Lottie JSON from LottieFiles:
- Sparkle/shine effects on logo intro
- Confetti on CTA slides
- Subtle ambient particles on atmospheric slides

### Remotion Feature Matrix by Slide Archetype

| Archetype | SFX | Light Leak | fitText | Spring Preset | Extra |
|-----------|-----|-----------|---------|--------------|-------|
| LogoIntro | switch | No | No | bouncy | sparkle particles, radial glow |
| StatSlide | whoosh | No | YES | bouncy | counter tick interpolation |
| AnchorWord | whoosh | At pivots | YES | heavy/snappy | optional radial glow |
| EmotionalPivot | page-turn | YES (after) | No | smooth | glow pulse, typewriter |
| CascadeSlide | whoosh | No | No | smooth | staggered slide-up |
| CTASlide | switch | No | No | smooth | sequential fade-in |

---

## 5. Remotion Template System

### Decision: Code Generation (Not JSON Config)

Each slide has unique animation logic (counter tick, typewriter, cascade stagger) — JSON can't express arbitrary React. Templates are `.tsx.template` files with token placeholders.

### 6 Archetype Templates

| Archetype | Use When | Key Animation |
|-----------|----------|--------------|
| **StatSlide** | Hero is a number (30, 33) | Spring scale-up, optional counter tick |
| **AnchorWordSlide** | Hero is 1-2 words ("wait.", "opens.") | Heavy/snappy spring, optional glow |
| **EmotionalPivotSlide** | Glow pulse + typewriter | textShadow oscillation, character reveal |
| **CascadeSlide** | Multiple lines sequentially | Staggered slide-up (0.3s delay) |
| **CTASlide** | URL + handle + tagline | Sequential fade-in |
| **LogoIntroSlide** | Logo with entrance | Spring bounce, sparkle particles, radial glow |

### Spring Presets (shared module)
```typescript
export const SPRINGS = {
  bouncy: { damping: 12, stiffness: 150 },   // Numbers, logos
  smooth: { damping: 200 },                    // Transitions, subtle
  heavy: { damping: 15, stiffness: 80, mass: 2 }, // Anchor words
  snappy: { damping: 10, stiffness: 150 },    // "opens." with overshoot
} as const;
```

### Zod Parametrizable Schema
Every generated project gets a Zod schema on `<Composition>` making brand colors, slide text, and feature toggles editable via Remotion Studio sidebar:
```typescript
const Schema = z.object({
  navyColor: zColor().default("#0B1745"),
  goldColor: zColor().default("#D4A843"),
  slides: z.array(z.object({ heroText: z.string(), bodyText: z.string().optional() })),
  showLogoIntro: z.boolean().default(true),
});
```

### Generation Flow
```
Content Spec YAML → archetype selection per slide → token replacement → project scaffold
```

---

## 6. Paper → Video Handoff Protocol

### Handoff Artifact

Written by /paper-marketing after user selects variation:

```yaml
# marketing/handoffs/{spec-name}-handoff.yaml
handoff_version: 1
content_spec: marketing/content-specs/tiktok-dataled-30-second-gate.yaml
variation_selected: "Data-Led"
artboard_dimensions: { width: 1080, height: 13440 }
slide_count: 7
export_search_patterns:
  - "~/Desktop/*Data-Led*"
  - "~/Downloads/*Data-Led*"
brand_snapshot:
  palette: { navy: "#0B1745", gold: "#D4A843", cream: "#FFF8E7" }
  fonts: { display: "Space Grotesk", arabic: "Noto Naskh Arabic" }
```

### Protocol
1. `/paper-marketing` writes handoff YAML + presents export instructions
2. User exports from Paper UI (human-in-the-loop)
3. `/cmo` detects handoff, routes to `/video-content`
4. `/video-content` reads handoff, searches for exported file, proceeds

---

## 7. Manifest & Routing Updates

### /cmo Routing Table Addition
```
| "Animate slides into video" | video-content | creative |
```

### /cmo Disambiguation
```
| "video" | video-content | marketing-demo | video-content = animated slides. marketing-demo = product recording. |
| "TikTok" | video-content | content-atomizer | video-content creates video. atomizer creates text posts. |
```

### New Redirects
```
animate-slides → video-content
tiktok-video → video-content
social-video → video-content
```

### Skill Count: 27 → 28

---

## 8. Improving Initial Slideshow Generation

### The Problem

The initial Paper MCP phase (5 parallel agents designing slides) worked but had friction:
1. Agents wrote 7 slides from scratch (~7 write_html calls each, 1 per slide — batched too aggressively)
2. No shared content spec file — copy was embedded in task descriptions as plain text
3. No archetype awareness — agents didn't know which slide types (stat, anchor, cascade) they were building
4. No downstream awareness — designs were disconnected from how ffmpeg/Remotion would consume them
5. get_jsx never extracted — we reverse-engineered designs into Remotion manually

### Improvement 1: Content Spec YAML Written FIRST

Before agents spawn, /paper-marketing Phase 2d should write the approved content spec to `marketing/content-specs/{name}.yaml`. This becomes the single source of truth:

```
Phase 2d (current):  User approves copy → embedded in task descriptions as text
Phase 2d (improved): User approves copy → written to YAML → agents READ the spec file
```

Benefits:
- Agents parse structured YAML instead of extracting text from prose
- Content spec persists after Paper phase — /video-content reads it directly
- Archetype annotations (`type: stat`, `type: cascade`) guide agent design decisions
- Animation hints in spec inform visual emphasis (heavy spring → make that word HUGE)

### Improvement 2: Duplicate-First Slide Building

Instead of writing 7 slides from scratch, agents should use the duplicate_nodes pattern:

```
Current:  write_html × 7 (one call per slide, all from scratch)
Improved: write_html × 3 (build slide 1 in detail)
        → duplicate_nodes × 6 (clone slide 1 structure)
        → set_text_content × 6 (swap text per slide)
        → update_styles × ~12 (adjust colors, sizes, emphasis per slide)
        → get_screenshot × 3 (review after every 2 slides)
```

This is **40% faster** and produces **more consistent** slides because they share structural DNA. The variation is in content and emphasis, not layout structure.

### Improvement 3: Archetype-Aware Design

The content spec annotates each slide with a `type` (stat, anchor_word, cascade, cta, etc.). Agents should use this to make layout decisions:

| Spec Type | Agent Design Decision |
|-----------|---------------------|
| `stat` | Hero number HUGE (300px+), label small above, body below divider |
| `anchor_word` | One massive word fills the slide, body text small below |
| `emotional_pivot` | Centered text with glow effect, generous whitespace |
| `cascade` | Left-aligned lines with clear vertical rhythm, staggered feel |
| `cta` | Centered, ornamental, URL prominent, handle subtle |
| `logo_intro` | Logo centered, clean backdrop, no text clutter |

This means the 5 variation agents are all working from the same archetype map but applying different layout interpretations. "Data-Led" makes stat slides dominant. "Typographic" makes anchor words dominant. Same content spec, different emphasis.

### Improvement 4: get_jsx Extraction After Selection

After user selects a variation, extract the HTML/CSS from Paper before the skill ends:

```
Phase 5 (current):   User selects → done
Phase 5 (improved):  User selects → get_jsx() on selected artboard → save to handoff
```

The extracted JSX goes into the handoff YAML:
```yaml
extracted_jsx:
  slide_1: '<div style="display:flex;flex-direction:column;...">...</div>'
  slide_2: '...'
```

Benefits:
- Remotion can reference actual design CSS (font sizes, spacing, colors) instead of guessing
- Pixel-perfect fidelity between Paper design and Remotion output
- Debug tool: compare Paper JSX vs generated Remotion component

### Improvement 5: TikTok-Specific Design Conventions

The current SKILL.md has no platform-specific guidance. TikTok has different conventions:

| Convention | Why | How to Implement |
|-----------|-----|-----------------|
| Hook in first 1-3 seconds | TikTok users scroll fast | Slide 1 must have the most visually striking element |
| Text must be readable at phone size | Small screens, fast scanning | Minimum 48px body text, 120px hero text |
| Safe zones | TikTok UI overlaps bottom/top | Keep content in center 70% (avoid top 150px, bottom 300px) |
| High contrast | Bright ambient viewing | Use navy/cream contrast, avoid subtle grays |
| Pattern interrupts every 2-3 slides | Maintain attention | Alternate navy/navy_deep backgrounds, vary slide types |

Add to SKILL.md as `references/platform-conventions.md` with per-platform rules.

### Improvement 6: Parallel Agent Quality Controls

Current agents self-review via screenshots but have no quality rubric. Add:

```markdown
## Agent Review Rubric (screenshot every 2-3 writes)

After each screenshot, rate against these criteria:
1. **Text readability**: Can every word be read at 50% zoom? If not, increase size.
2. **Brand fidelity**: Does this look like the brand? Check palette, fonts, voice.
3. **Archetype match**: Does this slide match its spec type? (stat = big number, cascade = sequential lines)
4. **Safe zones**: Is content within the center 70% (platform-dependent)?
5. **Visual rhythm**: Does this slide feel different from the previous one? (alternate bg, vary scale)
6. **Hierarchy**: Is the most important element the most visually dominant?

If any criterion fails, fix it BEFORE moving to the next slide.
```

### Improvement 7: Structured Variation Selection

Phase 5 should always output a comparison matrix, even if user picks fast:

```
| Criterion | Typographic | Data-Led | Atmospheric | Bold Minimal | Split |
|-----------|------------|----------|-------------|-------------|-------|
| Hook strength (slide 1) | 8/10 | 9/10 | 7/10 | 8/10 | 7/10 |
| Text readability | 9/10 | 8/10 | 7/10 | 10/10 | 8/10 |
| Brand fidelity | 9/10 | 9/10 | 8/10 | 9/10 | 8/10 |
| Visual variety across slides | 7/10 | 9/10 | 8/10 | 6/10 | 9/10 |
| Video animation potential | 7/10 | 9/10 | 8/10 | 8/10 | 7/10 |
| TOTAL | 40 | 44 | 38 | 41 | 39 |
| Best for | Quotes, manifestos | Stats, proof points | Spiritual, reverent | Simple CTAs | Comparisons |
```

This helps the user make an informed choice AND documents WHY a variation won.

### Improvement 8: 5 Different Scripts, Not 5 Layouts of 1 Script

**This is the biggest paradigm shift.**

Currently: 5 agents get the SAME copy and create 5 visual interpretations. User picks 1, throws away 4. That's 80% waste.

The better model: generate 5 **different narrative scripts** first, then design each with a matching visual direction. Now ALL 5 are publishable — you post them across different days, platforms, or audiences.

```
Current:    1 script  × 5 visual layouts  = 1 usable output (pick 1, waste 4)
Improved:   5 scripts × 5 visual layouts  = 5 usable outputs (post all 5)
```

**How this works in practice:**

Given the HalalScreen positioning angle "The 30-Second Active Gate", generate 5 different narrative approaches:

| Script | Hook | Story Arc | CTA Angle |
|--------|------|-----------|-----------|
| 1. Stat-Led | "30 seconds." | Number → proof → mechanism → payoff | "Do Dhikr. Unlock Your Phone." |
| 2. Problem-Agitate | "Every app blocker makes you wait." | Pain → twist → solution | "There's a better way." |
| 3. Social Proof | "4.9 stars. 10K downloads." | Evidence → why → join the movement | "Join 10K Muslims" |
| 4. Storytelling | "My phone was the first thing I touched every morning." | Before → moment of change → after | "What changed?" |
| 5. Provocative | "You unlock your phone 150 times a day." | Shocking stat → reframe → spiritual flip | "What if each one started with remembrance?" |

Each script has a DIFFERENT narrative, DIFFERENT hook, DIFFERENT proof points. And each gets a visual direction that MATCHES its story:

| Script | Best Visual Direction | Why |
|--------|---------------------|-----|
| Stat-Led | Data-Led (giant numbers) | Numbers ARE the design |
| Problem-Agitate | Contrast Play (tension) | Before/after, problem/solution |
| Social Proof | Structured (grid, stars) | Evidence-based, organized |
| Storytelling | Atmospheric (personal) | Emotional, intimate |
| Provocative | Bold Minimal (one idea) | Let the provocation breathe |

**New Phase 2 Flow:**

```
Phase 2a: Determine content type (TikTok, carousel, etc.)
Phase 2b: Generate 5 narrative scripts from positioning angle
         (NEW — slideshow scripting phase)
Phase 2c: Map each script to a visual direction
Phase 2d: Present all 5 script+design pairs for approval
Phase 2e: User approves → write 5 content spec YAMLs
```

**Implementation**: This becomes a new **slideshow-scripting** phase inside /paper-marketing (or a separate `/slideshow-script` skill that /cmo routes to before /paper-marketing). It reads `brand/positioning.md` for angles, `brand/audience.md` for pain points, and `brand/voice-profile.md` for tone — then generates 5 different narrative scripts using proven TikTok/social storytelling frameworks.

**Scripting Frameworks Available:**
- **AIDA**: Attention → Interest → Desire → Action
- **PAS**: Problem → Agitate → Solution
- **BAB**: Before → After → Bridge
- **Star-Story-Solution**: Hook character → conflict → resolution
- **Stat-Flip**: Surprising data → reframe → call to action

Each framework produces a fundamentally different narrative from the same positioning angle.

### Improvement 9: /frontend-design Skill Inside Paper Agents

The Paper MCP designer agents currently work from the Paper HTML rules reference doc alone. They should ALSO load the `/frontend-design` skill for higher-quality visual execution.

**What /frontend-design adds:**
- Swiss editorial typography principles (contrast between display and label weights)
- Deliberate spacing rhythm (tighter for related elements, generous for hero content)
- Color restraint ("one intense color moment is stronger than five")
- Scale contrast (very large headline next to small muted text)
- Asymmetric layout instinct (not everything centered, not everything on a grid)

**How to integrate:**

Each Paper MCP agent prompt gets an additional instruction:

```markdown
## Design Quality
You have the /frontend-design skill available. Follow these principles:
- Typography: maximize contrast between display (700, 200px+) and label (300, 14px)
- Spacing: tighter to group related elements, generous to let hero content breathe
- Color: one accent moment per slide, not five. Gold is your one color — use it sparingly.
- Layout: favor asymmetry over centered-everything. Offset hero text slightly.
- Scale: dramatic differences. "30" should be 3x larger than "seconds." not 1.5x.
```

This is especially powerful combined with Improvement 8 (different scripts) because now each agent is making DESIGN decisions informed by the narrative structure, not just filling the same layout template with text.

**Agent tool loading:**
```
subagent_type: "general-purpose"
prompt: "...Read the /frontend-design skill at ~/.claude/skills/frontend-design/SKILL.md
         for design principles. Apply them to your Paper MCP work..."
```

---

## 9. /paper-marketing Audit

### What Worked Well
- 5 parallel agents produced genuinely different variations
- Brand fidelity was high across all 5
- Stacked artboard pattern (1080×13440) was brilliant for slicing
- creative-kit.md gap detection and auto-fill

### Critical Gaps Found
1. **No post-design pipeline** — skill ends at Phase 6, entire video pipeline is invisible
2. **No export guidance** — Paper export gap not documented
3. **No content spec → video mapping** — content spec from Phase 2d not reused
4. **Write batching** — ~7 writes per agent (1 per slide) violates incremental-write rule
5. **No Phase 5 structured critique** — user picked fast, critique may have been skipped

### Recommended Updates
- Add Phase 5.5: Export and Handoff (handoff YAML + export instructions)
- Add write budget: "minimum 2-3 write_html calls per slide"
- Add structured comparison table in Phase 5 (always, even if user picks fast)
- Add "Next Steps" section pointing to /video-content
- Add TikTok-specific design conventions

---

## 10. Remotion Capabilities Mining

### 37 rule files analyzed. Priority findings:

| Capability | Priority | Status | Impact |
|-----------|----------|--------|--------|
| **Voiceover** (ElevenLabs TTS) | HIGH | Not used | TikTok algorithm favors audio. MASSIVE engagement boost. |
| **Light Leaks** (@remotion/light-leaks) | HIGH | Installed but unused | Gold-tinted light leak at emotional pivots |
| **Parametrizable Schema** (Zod) | HIGH | Not used | Every project editable via Studio sidebar |
| **Sound Effects** (@remotion/sfx) | HIGH | Not used | Whoosh on transitions, switch on counter tick |
| **calculateMetadata** | HIGH | Not used (hardcoded 810 frames) | Dynamic duration from slide count + audio |
| **Text Measuring** (fitText) | MEDIUM | Not used | Auto-fit text to container width |
| **Transition Variety** (wipe, flip, clockWipe) | MEDIUM | Only fade+slide used | More visual variety |
| **Subtitles** | MEDIUM | Not used | Auto-generate from voiceover TTS |
| **Lottie** | LOW | Not used | Could replace manual sparkle particles |

### Key Recommendation
Voiceover is the single highest-impact addition. ElevenLabs reads slide copy → auto-sizes duration → TikTok audio = algorithm boost. Offer as opt-in toggle in /video-content skill.

---

## 11. ffmpeg Advanced Techniques

### Beyond basic fade: what we could have used
- **Ken Burns** (zoompan) — subtle zoom/pan adds life to static slides (v1.5 tier)
- **Audio mixing** — background track at 15% volume with fade in/out
- **Advanced transitions** — dissolve (smoother), circleopen (reveal), smoothup (cascade)
- **Two-pass encoding** — better quality at same file size for TikTok upload compression
- **Concat demuxer** — faster than filter_complex for no-transition cuts

### Three-Tier Model (adopted in /video-content)
| v1 Quick | ffmpeg fade | ~5s | Static slides |
| v1.5 Enhanced | ffmpeg + Ken Burns + audio | ~15s | Subtle motion |
| v2 Animated | Remotion springs | ~60s | Full animation |

---

## 12. Paper MCP Tool Usage Analysis

### 17 tools available, 7 used. Critical misses:

| Missed Tool | Impact | Use Case |
|------------|--------|----------|
| **duplicate_nodes** | HIGH | Clone slide 1 → modify for slides 2-7 (40% faster, more consistent) |
| **get_jsx** | HIGH | Extract HTML from Paper for Remotion handoff (pixel-perfect fidelity) |
| **update_styles** | MEDIUM | Surgical fixes after screenshot review (vs rewriting entire HTML) |
| **set_text_content** | MEDIUM | Quick text changes on duplicated slides |

### Updated Workflow (for SKILL.md)
1. write_html — build slide 1 (2-3 calls)
2. get_screenshot — critique slide 1
3. **duplicate_nodes** — clone for slides 2-7
4. **set_text_content** — update text per slide
5. **update_styles** — adjust colors/layout per slide
6. get_screenshot — every 2-3 modifications
7. **get_jsx** — extract HTML for downstream handoff
8. finish_working_on_nodes — cleanup

---

## 13. Cross-Skill Content Spec Format

### The Problem
Same content flowed through 3 systems (Paper agents, ffmpeg, Remotion) with NO shared format. Manually re-typed each time.

### The Solution: `marketing/content-specs/{name}.yaml`

```yaml
spec_version: 1
platform: { name: tiktok, dimensions: { width: 1080, height: 1920 } }
positioning_angle: "The 30-Second Active Gate"

brand:
  palette: { navy: "#0B1745", gold: "#D4A843", cream: "#FFF8E7" }
  fonts: { display: "Space Grotesk", arabic: "Noto Naskh Arabic" }
  logo: { src: "logo.png", width: 280 }

slides:
  - index: 1
    type: stat
    hero: { text: "30", size: 300 }
    label: "TIME"
    body: "seconds."
    animation: { hero: { type: spring, config: bouncy } }
  # ... etc

transitions:
  default: { type: fade, duration: 0.5 }
  overrides:
    4-5: { type: light_leak, hue_shift: 45 }

audio:
  voiceover: { enabled: false }
  sfx: { transitions: "whoosh.wav" }
```

### Contract
- **Written by**: /paper-marketing Phase 2d (or /cmo brainstorm)
- **Read by**: Paper MCP agents, ffmpeg assembly, Remotion generation
- **Location**: `marketing/content-specs/{platform}-{variation}-{angle}.yaml`

---

## Implementation Checklist

### New Files to Create
- [ ] `skills/video-content/SKILL.md`
- [ ] `skills/video-content/references/ffmpeg-slideshow.md`
- [ ] `skills/video-content/references/remotion-archetypes.md`
- [ ] `skills/video-content/references/platform-presets.md`
- [ ] `skills/video-content/references/content-spec-schema.md`

### Files to Modify
- [ ] `skills-manifest.json` — add video-content (#28) + redirects
- [ ] `skills/cmo/SKILL.md` — routing table, disambiguation, video pipeline section
- [ ] `skills/paper-marketing/SKILL.md` — Phase 5.5 handoff, write budget, Paper tool updates
- [ ] `CLAUDE.md` — skill count 27 → 28
- [ ] Test files — update expected skill counts
