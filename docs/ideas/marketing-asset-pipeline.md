# Idea: Marketing Asset Pipeline for mktg

> Inspired by the ASC CLI screenshots system's plan → capture → frame → review → watch workflow.

## Problem

Marketing requires generating many visual assets: landing page screenshots for A/B tests, social media post previews, email template renders, OG images, ad creatives. Today these are created manually or ad-hoc. There's no deterministic pipeline, no brand-consistent framing, no review workflow, and no way for an agent to orchestrate the full cycle.

## Concept

A `mktg assets` command that mirrors the ASC CLI screenshots workflow:

```
mktg assets plan      — Define what assets to generate (JSON plan)
mktg assets capture   — Generate raw assets (screenshots, renders)
mktg assets frame     — Apply brand treatment (overlays, device frames, templates)
mktg assets review    — Generate HTML review page with approval flow
mktg assets watch     — Watch for changes, auto-regenerate
mktg assets run       — Execute full pipeline: plan → capture → frame → review
```

## Architecture

### Directory Structure

```
marketing/
└── assets/
    ├── plans/                     # Asset generation plans (JSONC)
    │   ├── landing-page-shots.json
    │   ├── social-previews.json
    │   └── email-templates.json
    ├── raw/                       # Captured raw assets
    │   └── {plan-name}/{variant}/{asset-id}.png
    ├── framed/                    # Brand-treated output
    │   └── {plan-name}/{variant}/{asset-id}.png
    ├── templates/                 # Brand overlay templates
    │   ├── social-post.json
    │   ├── og-image.json
    │   └── email-header.json
    └── review/
        ├── manifest.json          # Structured review metadata
        ├── index.html             # Interactive HTML report
        └── approved.json          # Approval tracking
```

### Plan Format

```jsonc
{
  "version": 1,
  "name": "landing-page-variants",
  "description": "A/B test screenshots of landing page hero sections",
  "capture": {
    "provider": "playwright",      // or "browser", "url-to-image"
    "targets": [
      {
        "id": "hero-v1",
        "url": "http://localhost:3000?variant=1",
        "viewport": { "width": 1440, "height": 900 },
        "wait_for": ".hero-loaded",
        "delay_ms": 500
      },
      {
        "id": "hero-v2",
        "url": "http://localhost:3000?variant=2",
        "viewport": { "width": 1440, "height": 900 },
        "wait_for": ".hero-loaded"
      }
    ],
    "variants": ["desktop", "mobile"],  // viewport presets
    "formats": ["png", "webp"]
  },
  "frame": {
    "template": "og-image",
    "brand_overlay": true,
    "options": {
      "logo_position": "top-left",
      "gradient": "brand-primary"
    }
  }
}
```

### Provider Abstraction

Following the ASC CLI pattern of pluggable capture providers:

```typescript
interface AssetProvider {
  capture(target: CaptureTarget): Promise<CaptureResult>
}
```

**Providers:**

| Provider | Use case | Implementation |
|----------|----------|----------------|
| `playwright` | Landing page screenshots, full-page captures | Playwright CLI (`ply` skill) |
| `url-to-image` | Quick URL-to-PNG for any public page | Headless browser one-shot |
| `template` | Generate from brand templates (OG images, social cards) | Canvas/SVG rendering |
| `remotion` | Video thumbnails, animated previews | Remotion CLI |

New providers plug in without touching orchestration — same pattern as ASC CLI's AXe/macOS providers.

### Brand Framing

The ASC CLI uses Koubou for device bezels. For mktg, "framing" means applying brand treatment:

- **Logo overlay** — Position brand logo on assets
- **Color treatment** — Apply brand gradient backgrounds
- **Text overlays** — Headlines, CTAs, taglines from brand/ context
- **Device mockups** — Wrap screenshots in phone/laptop frames for social posts
- **Template composition** — Combine raw captures with brand templates

Frame templates live in `marketing/assets/templates/` and reference `brand/` for colors, fonts, logos.

### Review Workflow

Directly adapted from ASC CLI's review system:

1. **Manifest generation** — JSON manifest listing all assets with metadata (plan, variant, dimensions, status)
2. **HTML report** — Interactive page showing all assets in grid, filterable by plan/variant
3. **Approval tracking** — `approved.json` with selectors: by plan, variant, individual asset, or "all ready"
4. **Status inference** — `ready`, `missing_raw`, `invalid_dimensions`, `needs_reframe`

The agent can programmatically approve assets or flag them for human review.

### Watch Mode

File system monitoring adapted from ASC CLI:

- Watch plan files + template files + brand/ directory
- Debounce rapid changes (500ms)
- Auto-regenerate affected assets on change
- Coalesce pending work while generation runs
- Optionally regenerate review HTML

Use case: designer updates brand colors in `brand/visual-identity.md` → watch detects change → all framed assets regenerate with new colors → review page updates.

## Implementation Sketch

### Phase 1: Core Pipeline (MVP)

1. **Plan loader** — Parse JSONC plans with validation (version, targets, provider)
2. **Playwright provider** — Capture URLs with viewport/wait options via `ply`
3. **Simple framing** — Logo overlay + gradient background using sharp/canvas
4. **Review generator** — HTML report with image grid + manifest JSON
5. **`mktg assets run`** — Execute plan → capture → frame → review

### Phase 2: Multi-Provider + Templates

6. **Template provider** — Generate OG images, social cards from JSON templates
7. **Remotion provider** — Video thumbnail generation
8. **Brand-aware framing** — Pull colors/fonts/logos from `brand/` automatically
9. **Variant system** — Desktop/mobile/tablet viewport presets

### Phase 3: Watch + Automation

10. **File watcher** — Monitor plans, templates, brand/ for changes
11. **Approval CLI** — `mktg assets approve --plan landing --variant desktop`
12. **CI integration** — Generate assets on PR, post review link as comment
13. **Diff mode** — Compare current vs. approved assets, highlight changes

## CLI Interface

```bash
# Full pipeline
mktg assets run --plan landing-page-shots

# Individual steps
mktg assets capture --plan social-previews --provider playwright
mktg assets frame --plan social-previews --template og-image
mktg assets review --plan social-previews
mktg assets approve --plan social-previews --variant desktop

# Watch mode
mktg assets watch --plan landing-page-shots

# List/inspect
mktg assets list                          # Show all plans
mktg assets list --plan landing-page-shots  # Show assets in plan
mktg assets schema                        # Show plan JSON schema
```

All commands output JSON when `--json` flag is set (agent-native).

## How This Connects to Existing mktg Skills

| Skill | Asset pipeline integration |
|-------|---------------------------|
| `/page-cro` | Capture before/after screenshots for CRO analysis |
| `/direct-response-copy` | Generate landing page → capture → frame for review |
| `/content-atomizer` | Original content → social variants → capture previews |
| `/email-sequences` | Render email templates → capture → review |
| `/creative` | AI-generated images → frame with brand → review |
| `/competitor-alternatives` | Capture competitor pages → side-by-side comparison |

## Next Steps

1. Define the `AssetPlan` TypeScript type and validation
2. Implement Playwright capture provider using existing `ply` skill
3. Build simple framing with sharp (logo + gradient overlay)
4. Generate review HTML (adapt ASC CLI's template approach)
5. Wire up `mktg assets run` command
6. Test with a real project (CEO app landing page screenshots)
