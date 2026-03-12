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
3. [ffmpeg Assembly Layer](#3-ffmpeg-assembly-layer)
4. [Remotion Template System](#4-remotion-template-system)
5. [Paper → Video Handoff Protocol](#5-paper--video-handoff-protocol)
6. [Manifest & Routing Updates](#6-manifest--routing-updates)
7. [/paper-marketing Audit](#7-paper-marketing-audit)
8. [Remotion Capabilities Mining](#8-remotion-capabilities-mining)
9. [ffmpeg Advanced Techniques](#9-ffmpeg-advanced-techniques)
10. [Paper MCP Tool Usage Analysis](#10-paper-mcp-tool-usage-analysis)
11. [Cross-Skill Content Spec Format](#11-cross-skill-content-spec-format)

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
- **Optional**: `brand/positioning.md`, exported slide PNG(s)

### Output Contract
- `marketing/video/{name}/` — Remotion project directory
- `~/Desktop/{name}-v1.mp4` — ffmpeg quick version
- `~/Desktop/{name}-v2.mp4` — Remotion animated version
- Updates `brand/assets.md` with new video asset

### Three-Tier Pipeline

| Tier | Tool | Build Time | Quality | Use Case |
|------|------|-----------|---------|----------|
| v1 Quick | ffmpeg fade | ~5s | Static slides | Quick review, placeholder |
| v1.5 Enhanced | ffmpeg + Ken Burns + audio | ~15s | Subtle motion | Good enough for most posts |
| v2 Animated | Remotion + spring physics | ~60s | Full animation | Hero content, campaigns |

### Skill Workflow
1. Load content spec YAML (or create from scratch)
2. Load brand tokens from creative-kit.md
3. AskUserQuestion: choose tier (v1/v1.5/v2/all)
4. If tall artboard: ffmpeg slice into individual slides
5. v1/v1.5: ffmpeg assembly with transitions + optional Ken Burns
6. v2: Remotion project scaffolding from archetype templates
7. bun install → Remotion Studio preview → render MP4
8. Register in brand/assets.md

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

## 3. ffmpeg Assembly Layer

Lives at `skills/video-content/references/ffmpeg-slideshow.md`.

### Key Commands

**Slice tall artboard:**
```bash
ffmpeg -i input.png -vf "crop={W*2}:{H*2}:0:{i*H*2},scale={W}:{H}" slide_N.png
```

**Stitch with crossfade:**
```bash
# Offset formula: offset_N = (N * slide_duration) - (N * fade_duration)
ffmpeg -i s1.png -i s2.png ... -filter_complex \
  "[0][1]xfade=transition=fade:duration=0.5:offset=3.0[v01]; ..."
```

**Ken Burns (v1.5):**
```bash
ffmpeg -loop 1 -i slide.png -vf "zoompan=z='min(zoom+0.0008,1.15)':d=105:s=1080x1920:fps=30" -t 3.5 slide_kb.mp4
```

**Audio mixing:**
```bash
ffmpeg -i video.mp4 -i ambient.mp3 -filter_complex "[1:a]volume=0.15[bg]" -map 0:v -map "[bg]" -shortest output.mp4
```

### Advanced xfade Transitions
- `dissolve` — smoother than fade, cinematic
- `circleopen` — radial reveal, good for "opens." moments
- `smoothup` — eased vertical slide, good for cascades
- `radial` — clock wipe, good for counter/timer slides

### Platform Presets
| Platform | Dimensions | Max Duration |
|----------|-----------|-------------|
| TikTok | 1080x1920 | 10min |
| Instagram Reels | 1080x1920 | 90s |
| YouTube Shorts | 1080x1920 | 60s |
| Instagram Square | 1080x1080 | 60s |
| Instagram Portrait | 1080x1350 | 60s |

---

## 4. Remotion Template System

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

## 5. Paper → Video Handoff Protocol

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

## 6. Manifest & Routing Updates

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

## 7. /paper-marketing Audit

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

## 8. Remotion Capabilities Mining

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

## 9. ffmpeg Advanced Techniques

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

## 10. Paper MCP Tool Usage Analysis

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

## 11. Cross-Skill Content Spec Format

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
