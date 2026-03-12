# Three-Tier Video Pipeline

## Tier Overview

| Tier | Method | Render Time | Quality | When to Use |
|------|--------|-------------|---------|-------------|
| **v1 Quick** | ffmpeg crossfade | ~5 seconds | Functional | Draft review, quick iteration |
| **v1.5 Enhanced** | ffmpeg Ken Burns + audio | ~15 seconds | Good | Social posting, "good enough" |
| **v2 Full** | Remotion + ffmpeg post | ~90 seconds | Production | Final content, portfolio pieces |

## v1 Quick

**What it does:** Static slides stitched with crossfade transitions.
**Tools:** ffmpeg only
**Output:** 19-21 seconds at 30fps

Parameters:
- Slide duration: 3.5 seconds
- Crossfade: 0.5 seconds (fade transition)
- Codec: H.264 CRF 18
- No audio

**When to use:** First pass to verify slide order, content accuracy, and pacing before investing in animation.

## v1.5 Enhanced

**What it does:** Ken Burns effect (subtle zoom/pan) on each slide + background audio.
**Tools:** ffmpeg only
**Output:** 25-30 seconds at 30fps

Parameters:
- Slide duration: 4 seconds
- Ken Burns: zoom 1.0→1.3 over slide duration
- Alternate: zoom-in on odd slides, zoom-out on even slides
- Crossfade: 0.5 seconds
- Background music: 15% volume with 2s fade-out
- Codec: H.264 CRF 18

**Ken Burns creates illusion of motion** from static images. Viewers perceive it as "animated" even though it's just zoom/pan on stills. Dramatically better than v1 for minimal extra effort.

**When to use:** Social media posts where v2 is overkill. Content that needs to go live fast.

## v2 Full

**What it does:** Remotion-powered spring animations, SFX, light leaks, transitions.
**Tools:** Remotion + ffmpeg post-processing
**Output:** 25-35 seconds at 30fps

Features (auto-included):
- Spring physics per slide archetype (bouncy, smooth, heavy, snappy)
- SFX on transitions (whoosh, switch, page-turn)
- Light leaks at emotional pivots
- `calculateMetadata` for dynamic duration
- Zod schema for parametrization
- `fitText()` for auto-sizing

Features (opt-in):
- ElevenLabs voiceover
- Auto-subtitles
- Custom SFX

**Remotion project structure:**
```
marketing/video/{name}/
├── src/
│   ├── index.ts         # Root + registerRoot
│   ├── Composition.tsx   # Main composition with TransitionSeries
│   ├── brand.ts          # Brand tokens from creative-kit.md
│   ├── SlideLayout.tsx   # Shared slide container (bg, footer)
│   └── slides/
│       ├── LogoIntro.tsx
│       ├── StatSlide.tsx
│       ├── AnchorWordSlide.tsx
│       ├── EmotionalPivotSlide.tsx
│       ├── CascadeSlide.tsx
│       └── CTASlide.tsx
├── public/
│   └── logo.png          # Brand logo
├── package.json
└── tsconfig.json
```

**When to use:** Production content, portfolio pieces, content that represents the brand at its best.

## Decision Guide

```
Need it in 5 seconds?          → v1 Quick
Need it posted today?           → v1.5 Enhanced
Need it to be impressive?       → v2 Full
Reviewing slide order/content?  → v1 Quick
Posting on social media?        → v1.5 Enhanced (minimum)
Building a content library?     → v2 Full
```

## Progressive Enhancement

You can always upgrade tier:
1. Start with v1 to verify content
2. Upgrade to v1.5 for quick social post
3. Later, upgrade to v2 for polished version

All three share the same slide PNGs — the input is identical. Only the assembly method changes.
