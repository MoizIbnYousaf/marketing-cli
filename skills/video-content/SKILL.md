---
name: video-content
description: >
  Three-tier video pipeline: ffmpeg Quick → ffmpeg Enhanced (Ken Burns) →
  Remotion Animated. Takes static slides (from Paper MCP export or any PNGs)
  and produces platform-ready video. ffmpeg bookend architecture: ffmpeg at
  START (slice artboard into slides) and END (audio mix, two-pass encode,
  thumbnail, GIF preview). Triggers on "make video", "video from slides",
  "animate slides", "render video", "video content", "assemble video",
  "ffmpeg video", "remotion render".
allowed-tools:
  - Bash(mktg status *)
  - Bash(ffmpeg *)
  - Bash(bun *)
  - Bash(bunx remotion *)
---

# /video-content — Video Assembly Pipeline

Three-tier video pipeline from static slides to platform-ready video. ffmpeg bookends every tier — slicing at the start, post-processing at the end.

For three-tier details, see [rules/three-tiers.md](rules/three-tiers.md).
For Remotion slide archetypes, see [references/remotion-archetypes.md](references/remotion-archetypes.md).
For ffmpeg recipes, see [references/ffmpeg-recipes.md](references/ffmpeg-recipes.md).

## ffmpeg Bookend Architecture

```
START (always): ffmpeg slice
  Input:  tall artboard PNG (e.g., 2160×26880 @ 2x) OR individual slide PNGs
  Output: individual slide PNGs at target resolution (1080×1920)
  Method: crop=W:H:0:Y per slide, scale to target

MIDDLE (tier-dependent):
  v1 Quick:    ffmpeg crossfade stitch
  v1.5 Enhanced: ffmpeg Ken Burns + audio
  v2 Full:     Remotion animate with spring physics

END (always): ffmpeg post-process
  - Audio mixing (background music, SFX from Remotion)
  - Two-pass H.264 encode (CRF 18, movflags +faststart)
  - Thumbnail extraction (best frame or slide 1)
  - GIF preview (first 3 seconds, 480px wide)
  - Platform-specific encode (TikTok, Instagram, YouTube presets)
```

## Workflow

### Phase 1: Detect Input

Check for these artifacts (in order of preference):

1. **Handoff YAML** at `marketing/handoffs/{name}-handoff.yaml` — written by /paper-marketing
2. **Content spec YAML** at `marketing/content-specs/{name}.yaml` — written by /slideshow-script
3. **Exported PNG** — user provides path to tall artboard export
4. **Slide directory** — user provides path to individual slide PNGs

If handoff YAML exists, read it for:
- `export_search_pattern` — filename pattern for the exported PNG
- `artboard.width`, `artboard.height`, `artboard.slide_count` — for ffmpeg slice coordinates
- `brand_snapshot` — full palette + fonts for Remotion `brand.ts` generation
- `content_spec` — path to the content spec YAML for slide types and animation hints
- `extracted_jsx` — optional HTML/CSS per slide for pixel-perfect Remotion reference

Both handoff YAML and content spec YAML are needed for v2 Full tier. Handoff provides export/brand info, content spec provides slide content and animation hints.

If no artifacts exist, ask the user:
```
"What slides should I turn into a video?"

Options:
1. "I have a Paper export PNG" — provide path
2. "I have individual slide PNGs" — provide directory
3. "Run /paper-marketing first" — go back to design phase
```

### Phase 2: ffmpeg Slice (START bookend)

If input is a tall artboard (not individual slides):

```bash
# Detect slide count from image height
SLIDE_HEIGHT=$((IMAGE_HEIGHT / SLIDE_COUNT))

# Slice each slide
for i in $(seq 0 $((SLIDE_COUNT - 1))); do
  Y=$((i * SLIDE_HEIGHT))
  ffmpeg -i input.png \
    -vf "crop=${IMAGE_WIDTH}:${SLIDE_HEIGHT}:0:${Y},scale=${TARGET_W}:${TARGET_H}" \
    slides/slide_$((i + 1)).png
done
```

If input is already individual slides, skip to Phase 3.

### Phase 3: Select Tier

Use AskUserQuestion:
```
"Which video tier?"

1. "v1 Quick" (~5 seconds) — ffmpeg crossfade, no animation. Good for draft review.
2. "v1.5 Enhanced" (~15 seconds) — ffmpeg Ken Burns + background audio. Good enough to post.
3. "v2 Full" (~90 seconds) — Remotion animated with spring physics, SFX, light leaks. Production quality.
```

### Phase 4: Assemble (tier-dependent)

#### v1 Quick — ffmpeg Crossfade

```bash
# 3.5s per slide, 0.5s crossfade, H.264 CRF 18
ffmpeg -loop 1 -t 3.5 -i slide_1.png \
       -loop 1 -t 3.5 -i slide_2.png \
       ... \
       -filter_complex "xfade=transition=fade:duration=0.5:offset=3.0,..." \
       -c:v libx264 -crf 18 -pix_fmt yuv420p \
       -movflags +faststart output_v1.mp4
```

#### v1.5 Enhanced — Ken Burns + Audio

```bash
# Ken Burns: zoompan with subtle zoom + pan per slide
ffmpeg -loop 1 -t 4 -i slide_1.png \
  -vf "zoompan=z='min(zoom+0.0015,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1080x1920:fps=30" \
  ...
# Then stitch with xfade + add background audio
```

See [references/ffmpeg-recipes.md](references/ffmpeg-recipes.md) for full Ken Burns and audio mixing commands.

#### v2 Full — Remotion Animate

1. **Scaffold Remotion project** (if not exists):
   ```bash
   mkdir -p marketing/video/{name}
   cd marketing/video/{name}
   bun init -y
   bun add remotion @remotion/cli @remotion/transitions @remotion/google-fonts @remotion/layout-utils
   ```

2. **Read content spec YAML** for slide content + archetypes

3. **Generate slide components** using archetypes from [references/remotion-archetypes.md](references/remotion-archetypes.md):
   - Map `type: stat` → StatSlide component
   - Map `type: anchor_word` → AnchorWordSlide component
   - Map `type: emotional_pivot` → EmotionalPivotSlide component
   - etc.

4. **Auto-include in every v2 project:**
   - SFX on transitions: `@remotion/sfx` (whoosh, switch, page-turn mapped to archetype)
   - Light leaks at emotional pivots: `@remotion/light-leaks` with `hueShift` for brand color
   - `calculateMetadata` for dynamic duration based on slide count
   - Zod parametrizable schema (colors, text editable in Studio)
   - `fitText()` from `@remotion/layout-utils` for auto-sizing hero text

5. **Opt-in features** (ask user):
   - ElevenLabs voiceover + auto-subtitles
   - Custom SFX beyond defaults

6. **Render:**
   ```bash
   bunx remotion render src/index.ts TikTokSlideshow output_v2.mp4
   ```

Read the remotion-best-practices skill at `~/.claude/skills/remotion-best-practices/SKILL.md` for animation rules, and load specific rule files as needed (transitions.md, timing.md, text-animations.md, etc.).

### Phase 5: ffmpeg Post-Process (END bookend)

Always runs, regardless of tier:

```bash
# 1. Audio mix (if background music provided)
ffmpeg -i video.mp4 -i music.mp3 \
  -filter_complex "[1:a]volume=0.15[bg];[0:a][bg]amix=inputs=2" \
  -c:v copy mixed.mp4

# 2. Two-pass encode for optimal quality/size
ffmpeg -i mixed.mp4 -c:v libx264 -b:v 4M -pass 1 -f null /dev/null
ffmpeg -i mixed.mp4 -c:v libx264 -b:v 4M -pass 2 -movflags +faststart final.mp4

# 3. Thumbnail (slide 1 or best frame)
ffmpeg -i final.mp4 -vf "select=eq(n\,0)" -frames:v 1 thumbnail.png

# 4. GIF preview (first 3 seconds, 480px wide)
ffmpeg -i final.mp4 -t 3 -vf "fps=12,scale=480:-1" preview.gif

# 5. Platform-specific encode
# TikTok: H.264, 1080x1920, 30fps, CRF 18, AAC 128k
# Instagram: H.264, 1080x1350 or 1080x1920, 30fps, max 60s
# YouTube: H.264, 1080x1920, 30fps, CRF 16 (higher quality)
```

### Phase 6: Output and Register

**Output directory:** `marketing/video/{name}/`
```
marketing/video/halalscreen-aida/
├── slides/           # Individual slide PNGs
├── output_v1.mp4     # Quick version (if made)
├── output_v1.5.mp4   # Enhanced version (if made)
├── output_v2.mp4     # Full version (if made)
├── thumbnail.png     # Best frame
├── preview.gif       # 3-second preview
└── src/              # Remotion project (v2 only)
```

Update `brand/assets.md` with new video asset entry.

Report:
```
Video ready:
  File: marketing/video/{name}/output_{tier}.mp4
  Duration: {seconds}s
  Size: {MB} MB
  Resolution: {width}x{height}
  Thumbnail: marketing/video/{name}/thumbnail.png
  Preview GIF: marketing/video/{name}/preview.gif
```

## Standalone Usage

This skill works independently:
- `/video-content` alone — provide any slide PNGs, get video
- `/paper-marketing` → `/video-content` — design + assemble (no scripting)
- `/slideshow-script` → `/video-content` — skip Paper, use existing images
- Any PNG source → `/video-content` — works with Canva exports, screenshots, anything

## Prerequisites

- `ffmpeg` installed (8.0+)
- `bun` installed (for Remotion v2)
- For v2: Remotion packages installed automatically during scaffold

## Principles

- **ffmpeg bookends everything** — slice at start, post-process at end, regardless of tier
- **Tiers are progressive** — v1 is instant, v1.5 is better, v2 is production. User chooses speed vs quality.
- **Content spec drives everything** — slide types, animation hints, and voice constraints come from YAML
- **Remotion best practices** — always load the remotion-best-practices skill for v2 work
- **No hardcoded content** — all text, colors, and timing come from content spec + brand files
