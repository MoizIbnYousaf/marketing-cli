# Content Spec YAML Schema

The content spec is the shared contract between all skills in the video pipeline. Written by `/slideshow-script`, read by `/paper-marketing` agents, ffmpeg, and Remotion.

## Schema

```yaml
# Required fields
spec_version: 1                    # Schema version
project: string                    # Project name (kebab-case)
content_type: string               # tiktok-slideshow | instagram-carousel | instagram-post | youtube-short
scripting_framework: string        # AIDA | PAS | BAB | star-story-solution | stat-flip

# Platform spec
platform:
  name: string                     # tiktok | instagram | youtube
  width: number                    # pixels (1080)
  height: number                   # pixels (1920 for 9:16, 1350 for 4:5)
  aspect: string                   # "9:16" | "4:5" | "1:1" | "16:9"

# Brand context
positioning_angle: string          # Which angle from positioning.md
visual_direction: string           # typographic | data-led | atmospheric | editorial | bold-minimal | contrast-play | split | structured

# Slide content
slides:
  - index: number                  # 1-based slide number
    type: string                   # stat | anchor_word | emotional_pivot | cascade | cta | logo_intro | comparison | question
    headline: string | null        # Primary text (can be a number for stat type)
    subhead: string | null         # Secondary text
    body: string | null            # Body text (can include Arabic/special characters)
    label: string | null           # Small section label (e.g., "BREATH SYSTEM")
    animation_hint: string         # spring_bouncy | spring_smooth | spring_heavy | spring_snappy
    role: string                   # attention | interest | desire | action | problem | agitate | solution | before | after | bridge | star | story | hook

# CTA (always present)
cta:
  url: string                      # Primary URL
  tagline: string                  # Signature phrase
  handle: string | null            # Social handle (@username)

# Voice rules (copied from brand)
voice_constraints:
  tone: string                     # e.g., "calm, certain, mindful"
  avoid: string[]                  # Words/patterns to never use
  signature_phrases: string[]      # Available brand phrases
```

## File Naming

```
marketing/content-specs/{project}-{framework}.yaml
```

Examples:
- `marketing/content-specs/lumi-aida.yaml`
- `marketing/content-specs/lumi-pas.yaml`
- `marketing/content-specs/myapp-stat-flip.yaml`

## Consumers

| Consumer | What They Read | How They Use It |
|----------|---------------|-----------------|
| /paper-marketing agents | `slides[].type`, `slides[].headline/subhead/body`, `visual_direction` | Layout decisions, text content, archetype-aware design |
| ffmpeg (v1/v1.5) | `slides[].index`, `platform.width/height` | Slice coordinates, crossfade timing |
| Remotion (v2) | `slides[].type`, `slides[].animation_hint`, full slide content | Archetype component selection, spring configs, text |
| /video-content | `platform`, `cta`, `voice_constraints` | Output format, overlays, TTS voice settings |

## Validation Rules

1. `spec_version` must be `1`
2. At least 3 slides, at most 12
3. First slide must have `role: hook` or `role: attention` or `role: problem` or `role: stat`
4. Last slide must have `type: cta`
5. Every slide must have at least `headline` OR `body`
6. `animation_hint` must be one of: `spring_bouncy`, `spring_smooth`, `spring_heavy`, `spring_snappy`
7. `type` must be one of: `stat`, `anchor_word`, `emotional_pivot`, `cascade`, `cta`, `logo_intro`, `comparison`, `question`
