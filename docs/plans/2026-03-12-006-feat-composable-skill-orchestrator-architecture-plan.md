---
title: "feat: Composable Skill Orchestrator Architecture"
type: feat
status: active
date: 2026-03-12
origin: docs/analysis/2026-03-12-video-pipeline-extraction.md
---

# Composable Skill Orchestrator Architecture

## Overview

Skills are Lego blocks. Orchestrators are recipes.

The current mktg CLI has 27 atomic skills that `/cmo` routes to individually. This plan adds **orchestrator skills** — skills that chain multiple atomic skills together for specific workflows — while keeping each atomic skill independently usable.

First orchestrator: `/tiktok-slideshow` which chains:
1. `/slideshow-script` (NEW #28) — generates 5 narrative scripts from a positioning angle
2. `/paper-marketing` (existing #27, updated) — designs 5 visual variations matched to scripts
3. `/video-content` (NEW #29) — ffmpeg slice + Remotion animate + ffmpeg post-process

Each block is reusable for other orchestrators:
- `/instagram-carousel` = `/slideshow-script` → `/paper-marketing` (no video)
- `/youtube-short` = `/slideshow-script` → `/paper-marketing` → `/video-content` (16:9)
- `/reels-batch` = `/slideshow-script` (10 scripts) → `/paper-marketing` → `/video-content` × 10

## Problem Statement

The HalalScreen TikTok workflow (2026-03-12) proved the full pipeline works: Paper MCP → ffmpeg → Remotion. But it was manual orchestration — the agent had to figure out each step. And it produced 5 visual variations of 1 script (80% waste). The system needs:

1. **Scripting phase** — generate 5 different narrative scripts so all outputs are publishable
2. **Video assembly skill** — codify the ffmpeg bookend + Remotion pipeline as a reusable skill
3. **Orchestrator pattern** — chain skills together so `/tiktok-slideshow` "just works"
4. **Updated Paper workflow** — integrate /frontend-design, duplicate_nodes, get_jsx extraction

## Proposed Solution

### Architecture

```
Atomic Skills (Lego blocks):
  /slideshow-script   → generates narrative scripts from brand positioning
  /paper-marketing    → designs visual content in Paper MCP (updated)
  /video-content      → assembles video from static slides (ffmpeg + Remotion)

Orchestrator Skills (Recipes):
  /tiktok-slideshow   → chains script → design → video for TikTok 1080x1920

Data Contract (filesystem):
  marketing/content-specs/{name}.yaml  → written by /slideshow-script
  marketing/handoffs/{name}-handoff.yaml → written by /paper-marketing
  marketing/video/{name}/              → written by /video-content
```

### Constraint: Skills Never Call Skills

Orchestrators follow the same pattern as `/cmo` — they are SKILL.md documents that teach the agent HOW to chain. The agent reads the orchestrator, loads each atomic skill in sequence, and passes data through filesystem artifacts. No programmatic invocation.

## Technical Approach

### New Skill: `/slideshow-script` (#28)

**Purpose:** Generate 5 different narrative scripts from a single positioning angle using proven storytelling frameworks.

**Reads:** `voice-profile.md`, `positioning.md`, `audience.md`
**Writes:** `marketing/content-specs/{name}.yaml` (5 specs)

**5 Scripting Frameworks:**

| Framework | Structure | Best For |
|-----------|-----------|----------|
| AIDA | Attention → Interest → Desire → Action | Broad awareness |
| PAS | Problem → Agitate → Solution | Pain-driven |
| BAB | Before → After → Bridge | Transformation |
| Star-Story-Solution | Hook character → conflict → resolution | Emotional |
| Stat-Flip | Surprising data → reframe → CTA | Data-driven |

**Workflow:**
1. Read brand files (positioning angles, audience pain points, voice rules)
2. Select positioning angle (user chooses or skill picks primary)
3. Generate 5 scripts using 5 different frameworks
4. Each script: hook, 5-7 slides, CTA — all different narratives
5. Write 5 content spec YAMLs with slide archetypes annotated
6. Present all 5 to user for approval

**Content Spec YAML format:**
```yaml
spec_version: 1
project: halalscreen
content_type: tiktok-slideshow
platform: { name: tiktok, width: 1080, height: 1920, aspect: "9:16" }
positioning_angle: "The 30-Second Active Gate"
scripting_framework: AIDA
slides:
  - index: 1
    type: stat
    headline: "30"
    subhead: "seconds."
    body: null
    animation_hint: spring_bouncy
  - index: 2
    type: anchor_word
    headline: "SubhanAllah"
    subhead: "That's how long 33 takes."
    body: "سُبْحَانَ ٱللَّٰهِ"
    animation_hint: spring_heavy
cta:
  url: "halalscreen.com"
  tagline: "Remembrance before everything."
voice_constraints:
  tone: "calm, certain"
  avoid: ["hype", "guilt", "exclamation marks"]
```

### New Skill: `/video-content` (#29)

**Purpose:** Three-tier video pipeline from static slides to animated video.

**Reads:** `creative-kit.md`, content specs, handoff YAMLs
**Writes:** `assets.md` (appends new video asset)

**Three Tiers:**

| Tier | Method | Time | When |
|------|--------|------|------|
| v1 Quick | ffmpeg crossfade | ~5s | Draft review |
| v1.5 Enhanced | ffmpeg Ken Burns + audio | ~15s | Good enough |
| v2 Full | Remotion animated + ffmpeg post | ~90s | Production |

**ffmpeg Bookend Architecture:**
```
START: ffmpeg slice (tall artboard → individual PNGs, 2x→1x scale)
  ↓
MIDDLE: Remotion animate (spring physics, SFX, light leaks, transitions)
  ↓
END: ffmpeg post (audio mix, two-pass encode, thumbnail, GIF preview)
```

**Remotion Auto-Includes (v2):**
- SFX on every transition (`@remotion/sfx`: whoosh, switch, page-turn)
- Light leaks at emotional pivots (`@remotion/light-leaks`, hueShift for brand color)
- `calculateMetadata` for dynamic duration
- Zod parametrizable schema (edit in Studio sidebar)
- `fitText()` for auto-sizing hero text
- 6 slide archetypes: LogoIntro, StatSlide, AnchorWordSlide, EmotionalPivotSlide, CascadeSlide, CTASlide

**Remotion Opt-In:**
- ElevenLabs voiceover + auto-subtitles
- Custom SFX beyond defaults

### New Skill: `/tiktok-slideshow` (#30 — Orchestrator)

**Purpose:** Chain `/slideshow-script` → `/paper-marketing` → `/video-content` for TikTok.

**Workflow:**
```
Phase 1: SCRIPT
  Load /slideshow-script skill
  → User picks positioning angle
  → 5 narrative scripts generated (5 frameworks)
  → 5 content spec YAMLs written
  → User approves scripts

Phase 2: DESIGN
  Load /paper-marketing skill (updated)
  → Each agent gets a UNIQUE script + matched visual direction
  → 5 parallel agents design in Paper MCP
  → User selects favorite(s)
  → get_jsx extraction + handoff YAML written
  → User exports PNG from Paper UI

Phase 3: VIDEO
  Load /video-content skill
  → ffmpeg slices exported PNG into individual slides
  → User picks tier (Quick / Enhanced / Full)
  → If v2: Remotion scaffolds + renders
  → ffmpeg post-processes (audio, encode, thumbnail)
  → TikTok-ready MP4

Human-in-the-loop gates:
  - After Phase 1: approve scripts
  - After Phase 2: select variation, export from Paper UI
  - After Phase 3: approve final video (or re-render)
```

### Updated Skill: `/paper-marketing` (#27)

Key updates from the video pipeline extraction analysis:

1. **Phase 2b (NEW):** Accept content spec YAML (from /slideshow-script or manual)
2. **Phase 5.5 (NEW):** Export handoff — `get_jsx()` extraction, write handoff YAML
3. **Agent improvements:**
   - Load `/frontend-design` skill for design quality
   - Use `duplicate_nodes` pattern (40% faster)
   - `set_text_content` + `update_styles` for surgical edits
   - Archetype-aware design (stat → big number, cascade → sequential lines)
   - Agent quality rubric (6-point checklist per screenshot)
4. **Platform conventions:** TikTok safe zones, minimum text sizes, hook-first
5. **5 scripts × 5 designs:** Each agent gets a unique script matched to a visual direction

### `/cmo` Updates

**New routing table entries:**

| Need | Skill | When | Layer |
|------|-------|------|-------|
| Generate slideshow scripts | `slideshow-script` | Have positioning, need narrative scripts | Creative |
| Assemble video from slides | `video-content` | Have slides/PNGs, need video | Creative |
| TikTok slideshow end-to-end | `tiktok-slideshow` | Want complete TikTok content pipeline | Creative |

**New disambiguation:**

| User says | Route to | Not this one | Why |
|-----------|----------|--------------|-----|
| "TikTok video" | `tiktok-slideshow` | `video-content` | Orchestrator handles full pipeline |
| "video from slides" | `video-content` | `tiktok-slideshow` | Already has slides, just needs assembly |
| "slideshow script" | `slideshow-script` | `content-atomizer` | Scripts for visual slideshows, not text posts |
| "marketing video" | `tiktok-slideshow` or `marketing-demo` | `creative` | Slideshow = tiktok-slideshow. Product recording = marketing-demo |

**New redirects:**
```
"tiktok": "tiktok-slideshow"
"tiktok-video": "tiktok-slideshow"
"slideshow": "tiktok-slideshow"
"video-assembly": "video-content"
"video-render": "video-content"
```

## Implementation Phases

### Phase 1: New Atomic Skills

**Files to create:**
- `skills/slideshow-script/SKILL.md`
- `skills/slideshow-script/references/frameworks.md`
- `skills/slideshow-script/references/content-spec-schema.md`
- `skills/video-content/SKILL.md`
- `skills/video-content/references/remotion-archetypes.md`
- `skills/video-content/references/ffmpeg-recipes.md`
- `skills/video-content/rules/three-tiers.md`

### Phase 2: Orchestrator Skill

**Files to create:**
- `skills/tiktok-slideshow/SKILL.md`

### Phase 3: Update Existing Skills

**Files to modify:**
- `skills/paper-marketing/SKILL.md` — add Phase 2b, 5.5, agent improvements
- `skills/paper-marketing/references/platform-conventions.md` (NEW)
- `skills/paper-marketing/references/agent-quality-rubric.md` (NEW)
- `skills/cmo/SKILL.md` — new routing, disambiguation, redirects

### Phase 4: Update Manifests and CLAUDE.md

**Files to modify:**
- `skills-manifest.json` — add slideshow-script (#28), video-content (#29), tiktok-slideshow (#30)
- `src/types.ts` — add "orchestrator" to SkillCategory if needed
- `CLAUDE.md` — update skill count 27→30, document orchestrator pattern

## Acceptance Criteria

- [ ] `/slideshow-script` SKILL.md generates 5 different narrative scripts using 5 frameworks
- [ ] `/video-content` SKILL.md documents three-tier pipeline with ffmpeg bookend
- [ ] `/tiktok-slideshow` SKILL.md chains all 3 skills with human-in-the-loop gates
- [ ] `/paper-marketing` updated with Phase 2b, 5.5, agent improvements, /frontend-design
- [ ] `/cmo` routing table includes all 3 new skills with disambiguation
- [ ] `skills-manifest.json` has entries for all 3 new skills with correct reads/writes/depends_on
- [ ] New redirects added (tiktok, slideshow, video-assembly, etc.)
- [ ] `CLAUDE.md` updated with skill count and orchestrator pattern documentation
- [ ] All existing tests pass (`bun test`)
- [ ] Build succeeds (`bun build src/cli.ts --outdir dist --target node`)

## Sources & References

- **Origin analysis:** [docs/analysis/2026-03-12-video-pipeline-extraction.md](docs/analysis/2026-03-12-video-pipeline-extraction.md) — 13-section extraction from HalalScreen TikTok production
- **Supersedes:** [docs/plans/2026-03-12-004-feat-content-creator-instagram-tiktok-plan.md](docs/plans/2026-03-12-004-feat-content-creator-instagram-tiktok-plan.md) — monolithic content-creator approach replaced by composable blocks
- **HalalScreen workflow log:** `halalscreen/marketing/logs/2026-03-12-instagram-content-creation-workflow.md`
- **Remotion patterns:** memory/feedback_remotion_patterns.md — spring configs, slide archetypes
- **Video pipeline:** memory/project_video_pipeline.md — proven Paper → ffmpeg → Remotion pipeline
