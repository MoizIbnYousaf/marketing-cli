# Data Contracts — Handoff YAML and Content Spec YAML

Two YAML files bridge the skills in the video pipeline. Both use filesystem paths relative to the project root.

## Handoff YAML

**Written by:** `/paper-marketing` Phase 6
**Read by:** `/video-content` Phase 1
**Path:** `marketing/handoffs/{name}-handoff.yaml`

```yaml
handoff_version: 1
project: lumi                           # Project name
content_type: tiktok-slideshow                 # Content type
selected_variation: data-led                   # Which design direction was chosen

artboard:
  name: "Marketing: Data-Led"                  # Paper artboard name
  width: 1080                                  # Target width (pixels)
  height: 13440                                # Total height (all slides stacked)
  slide_count: 7                               # Number of slides
  slide_height: 1920                           # Per-slide height (height / slide_count)

content_spec: "marketing/content-specs/lumi-statflip.yaml"  # Path to content spec

brand_snapshot:
  bg_primary: "#0B1745"                        # Navy
  bg_deep: "#060E2A"                           # Navy deep
  accent: "#D4A843"                            # Gold
  accent_muted: "rgba(212, 168, 67, 0.18)"    # Gold muted
  text_primary: "#FFF8E7"                      # Cream
  text_muted: "rgba(255, 248, 231, 0.5)"      # Cream muted
  divider: "rgba(212, 168, 67, 0.35)"         # Gold divider
  font_display: "Space Grotesk"                # Display font
  font_display_weights: [300, 400, 700]        # Available weights
  font_body: "Space Grotesk"                   # Body font (may differ)
  font_body_weights: [300, 400]

export_search_pattern: "Data-Led@2x.png"       # Filename pattern for user's export

extracted_jsx:                                  # Optional: HTML/CSS per slide from Paper
  slide_1: '<div style="display:flex;...">...</div>'
  slide_2: '<div style="display:flex;...">...</div>'
  # ... one per slide
```

### Required Fields for Each Consumer

| Field | ffmpeg slice | ffmpeg stitch | Remotion v2 |
|-------|-------------|---------------|-------------|
| `artboard.slide_count` | YES | YES | YES |
| `artboard.slide_height` | YES | No | No |
| `artboard.width` | YES | No | No |
| `brand_snapshot.*` | No | No | YES |
| `content_spec` | No | No | YES |
| `export_search_pattern` | YES | No | No |
| `extracted_jsx` | No | No | Optional |

## Content Spec YAML

**Written by:** `/slideshow-script` Phase 6 (or `/paper-marketing` Phase 2d when standalone)
**Read by:** `/paper-marketing` agents, `/video-content` for Remotion
**Path:** `marketing/content-specs/{project}-{framework}.yaml`

See `skills/slideshow-script/references/content-spec-schema.md` for the full schema.

### Key Fields for Each Consumer

| Field | Paper agents | ffmpeg | Remotion |
|-------|-------------|--------|---------|
| `slides[].headline/subhead/body` | YES — text content | No | YES — text content |
| `slides[].type` | YES — archetype design | No | YES — component selection |
| `slides[].animation_hint` | No | No | YES — spring config |
| `slides[].role` | Informational | No | No |
| `visual_direction` | YES — layout brief | No | No |
| `platform.width/height` | YES — artboard dims | YES — output dims | YES — composition dims |
| `voice_constraints` | YES — copy rules | No | Optional — TTS |
| `cta` | YES — final slide | No | YES — CTA slide |

## Animation Hint Values

Always use the `spring_` prefix. These map directly to Remotion spring configs:

| Hint | Spring Config | Use Case |
|------|--------------|----------|
| `spring_bouncy` | `{ damping: 12, stiffness: 150 }` | Numbers, logos — overshoot |
| `spring_smooth` | `{ damping: 200 }` | Transitions, subtle — no bounce |
| `spring_heavy` | `{ damping: 15, stiffness: 80, mass: 2 }` | Dramatic anchor words |
| `spring_snappy` | `{ damping: 10, stiffness: 150 }` | Action words — sharp pop |

## Error Handling

| Error | Recovery |
|-------|---------|
| Content spec YAML missing | Ask user: "Run /slideshow-script first, or provide content manually?" |
| Handoff YAML missing | Ask user: "Run /paper-marketing first, or provide PNG path manually?" |
| Image height not divisible by slide_count | Round down, warn user about potential cropping |
| Content spec has invalid animation_hint | Default to `spring_smooth`, warn |
| Handoff brand_snapshot missing fields | Fall back to reading `brand/creative-kit.md` directly |
