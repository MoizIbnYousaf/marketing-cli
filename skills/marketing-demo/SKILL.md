---
name: marketing-demo
description: |
  Record product demos and walkthroughs for marketing assets. Two modes: quick screenshot-stitch demos via ply + ffmpeg, or polished Remotion compositions. Use when the user mentions product demo, demo video, walkthrough video, feature showcase, screen recording, GIF demo, product tour, onboarding video, visual tutorial, feature walkthrough, or wants to show their product in action. Even if they just say 'show what it does' or 'make a video of the app' — this is the skill.
allowed-tools:
  - Bash(ply *)
  - Bash(ffmpeg *)
  - Bash(npx remotion *)
---

# /marketing-demo — Product Demo Recorder

Record product demos for marketing. Two production paths: quick (ply + ffmpeg) for rough demos, polished (Remotion) for branded marketing videos.

For brand memory protocol, see /cmo [rules/brand-memory.md](../cmo/rules/brand-memory.md).

## On Activation

1. Read `brand/creative-kit.md` for colors, fonts, logo paths.
2. Read `brand/voice-profile.md` for tone guidance on text overlays.
3. Read `brand/stack.md` to confirm available tools.
4. Check tool availability:
   ```bash
   command -v ply && echo "ply: ready" || echo "ply: missing"
   command -v ffmpeg && echo "ffmpeg: ready" || echo "ffmpeg: missing"
   command -v npx && echo "remotion: available" || echo "remotion: unavailable"
   ```
5. If `ply` or `ffmpeg` missing, warn and suggest install.

## Shot Duration Rules

| Demo Type | Duration per Shot | Notes |
|-----------|------------------|-------|
| Quick overview | 0.5-1s | Fast cuts, build excitement |
| Feature demo | 2-3s | Time to read + comprehend |
| Walkthrough | 4-5s | Instructional pacing |
| Social clip | 1-2s | Attention-grabbing, fast |

## Step 1: Determine Demo Type

| Type | Duration | Resolution | Format | Use Case |
|------|----------|-----------|--------|----------|
| Hero demo | 15-30s | 1280x800 | MP4 | Landing page above-fold |
| Feature highlight | 5-15s | 1280x800 | GIF/MP4 | Feature section, docs |
| Full walkthrough | 60-180s | 1280x800 | MP4 | YouTube, sales deck |
| Social clip | 5-15s | 1080x1080 | MP4 | Instagram, Twitter/X |
| Email GIF | 3-8s | 600x400 | GIF | Email campaigns |
| How-to | 30-90s | 1280x800 | MP4 | Help docs, onboarding |

Ask the user which type, or infer from context.

## Step 2: Plan Shot List

Before recording, plan each shot:

```markdown
## Shot List

1. [Action: Navigate to landing page]
   - URL: https://example.com
   - Wait: 1s for load
   - Highlight: Hero section

2. [Action: Click "Get Started" button]
   - Wait: transition animation
   - Highlight: Signup form

3. [Action: Fill demo data]
   - Type: demo@example.com
   - Highlight: Success state
```

Each shot = one `ply` screenshot or interaction sequence.

## Step 3: Choose Production Mode

### Mode A: Quick Demo (ply + ffmpeg)

Fast, rough demos from screenshots stitched into video.

**Capture screenshots:**
```bash
# Navigate and screenshot each shot
ply navigate "https://example.com"
ply screenshot --output marketing/demos/shot-01.png
ply click "Get Started"
ply screenshot --output marketing/demos/shot-02.png
```

**Stitch with ffmpeg:**
```bash
# MP4 from screenshots (2 seconds per frame)
ffmpeg -framerate 0.5 -i marketing/demos/shot-%02d.png \
  -c:v libx264 -pix_fmt yuv420p \
  -vf "scale=1280:800:force_original_aspect_ratio=decrease,pad=1280:800:(ow-iw)/2:(oh-ih)/2" \
  marketing/demos/demo.mp4

# Preview GIF (lower quality, smaller file)
ffmpeg -i marketing/demos/demo.mp4 \
  -vf "fps=10,scale=640:-1:flags=lanczos" \
  -c:v gif marketing/demos/demo-preview.gif

# Email GIF (600px wide, optimized)
ffmpeg -i marketing/demos/demo.mp4 \
  -vf "fps=8,scale=600:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  marketing/demos/demo-email.gif

# Square crop for social (1080x1080)
ffmpeg -i marketing/demos/demo.mp4 \
  -vf "crop=min(iw\,ih):min(iw\,ih),scale=1080:1080" \
  marketing/demos/demo-square.mp4
```

### Mode B: Polished Demo (Remotion)

For marketing-grade output with transitions, text overlays, branded intros.

**Generate Remotion composition:**
```bash
# Initialize if needed
npx remotion init marketing/demos/remotion-demo

# Render final video
npx remotion render marketing/demos/remotion-demo/src/index.tsx \
  --output marketing/demos/demo-polished.mp4
```

**Composition structure:**
```
src/
├── index.tsx          # Root composition
├── Intro.tsx          # Branded intro (logo, tagline)
├── DemoScene.tsx      # Screenshot with text overlay
├── Transition.tsx     # Fade/slide between scenes
└── Outro.tsx          # CTA + URL
```

**Key Remotion patterns:**
- Use `<Img>` for screenshots, `<AbsoluteFill>` for layout
- `useCurrentFrame()` + `interpolate()` for animations
- Pull brand colors from `brand/creative-kit.md`
- 30fps for smooth playback, 1280x720 or 1920x1080
- Add text overlays calling out features with `<Sequence>`

### Error Recovery

If ply interaction fails at shot N (page doesn't load, element not found, timeout), skip to shot N+1 and document the failure in the shot list. After all shots complete, review skipped shots and retry once. If still failing, use manual screenshots as fallback.

## Step 4: Convert & Output

All outputs go to `marketing/demos/`. Name by type:

| Output | Filename | Notes |
|--------|----------|-------|
| MP4 (desktop) | `demo-hero.mp4` | H.264, 1280x800 |
| MP4 (social) | `demo-social-1080.mp4` | Square, 1080x1080 |
| GIF (preview) | `demo-preview.gif` | 640px wide, <5MB |
| GIF (email) | `demo-email.gif` | 600px wide, <2MB |
| MP4 (polished) | `demo-polished.mp4` | Remotion output |

## Step 5: Completion Summary

```markdown
## Demo Assets Created

| Asset | Size | Format | Suggested Use |
|-------|------|--------|--------------|
| demo-hero.mp4 | 1.2MB | MP4 1280x800 | Landing page hero |
| demo-preview.gif | 3.4MB | GIF 640px | README, docs |
| demo-email.gif | 1.1MB | GIF 600px | Email campaigns |
| demo-social-1080.mp4 | 800KB | MP4 1080x1080 | Instagram, X |

All assets saved to `marketing/demos/`.
```

## Viewport Configs

| Platform | Width | Height | Scale |
|----------|-------|--------|-------|
| Desktop | 1280 | 800 | 1x |
| Desktop HD | 1920 | 1080 | 1x |
| Mobile | 390 | 844 | 2x |
| Instagram | 1080 | 1080 | 1x |
| Twitter/X | 1200 | 675 | 1x |
| Email | 600 | 400 | 1x |

## Related Skills

- `/creative` — Ad visuals, product photos (static assets, not demos)
- `/content-atomizer` — Turn demo into platform-specific posts
- `/page-cro` — Audit the page the demo showcases
