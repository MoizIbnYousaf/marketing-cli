# Research: ASC CLI Screenshots & Analytics Systems

## Overview

The ASC CLI has two mature subsystems worth studying for mktg:

1. **Screenshots system** — automated App Store screenshot capture, device framing, review, and file watching
2. **Analytics system** — daily download/star tracking with chart generation

Both follow patterns directly applicable to marketing automation: deterministic pipelines, provider abstractions, progressive data reduction, and automated review workflows.

---

## Part 1: Screenshots System

### Architecture

```
internal/screenshots/
├── types.go              # Type definitions + plan validation framework
├── plan.go               # JSONC plan loading, parsing, validation
├── capture.go            # Provider abstraction + capture orchestration
├── frame.go              # Koubou YAML-based device framing (6 devices)
├── review.go             # HTML/JSON manifest generation for review
├── watch.go              # File system monitoring + auto-regeneration
├── run.go                # Plan execution engine (step-by-step automation)
├── provider_axe.go       # AXe CLI provider (iOS simulators)
├── provider_macos.go     # Native macOS screencapture + Swift
└── review_actions.go     # Approval flow utilities
```

### Core Workflow: Plan → Capture → Frame → Review → Watch

**Plan phase** — Deterministic automation sequences defined in JSONC files. Version 1 enforced with strict validation. Six action types: `launch`, `tap`, `type`, `key_sequence`, `wait`, `wait_for`, `screenshot`. Configurable post-action delays. Structured validation errors with typed codes.

**Capture phase** — Provider-agnostic capture via a `Provider` interface (`Capture(ctx, req) → pngPath`). Two implementations: AXe (iOS simulators via `xcrun simctl`) and macOS (native `screencapture` via embedded Swift). Provider selected by string constant. Post-capture image validation for dimensions and format.

**Frame phase** — Raw screenshots wrapped in device bezels using Koubou (pinned v0.14.0). Two modes: input mode (raw → framed) and config mode (custom YAML). Supports 6 devices: `iphone-air`, `iphone-17-pro`, `iphone-17-pro-max`, `iphone-16e`, `iphone-17`, `mac`. Mac uses canvas mode with title/subtitle overlays instead of bezels.

**Review phase** — Scans framed directory, generates `ReviewManifest` (JSON) + interactive HTML report. Infers locale/device from path structure (`{locale}/{device}/{screenshot_id}`). Approval tracking via `approved.json` with combinable selectors (by key, locale, device, or "all ready").

**Watch phase** — Monitors config + asset directories for changes. 500ms debounce. Auto-regenerates framed screenshots and review HTML. Uses generation coalescer to queue pending work while generation runs.

### Directory Structure

```
screenshots/
├── raw/                           # Captured raw screenshots
│   └── {locale}/{device}/{id}.png
├── framed/                        # Device-framed output
│   └── {locale}/{device}/{id}.png
└── review/
    ├── manifest.json              # Structured review metadata
    ├── index.html                 # Interactive HTML report
    └── approved.json              # Approval state
```

### Key Design Patterns

| Pattern | How it works | Why it matters |
|---------|-------------|----------------|
| **Provider abstraction** | `Provider` interface with `Capture(ctx, req)` signature. AXe and macOS implementations. Selection by string constant. | New capture backends (browser, remote device) plug in without touching orchestration code. |
| **Plan-driven automation** | JSONC files define step sequences. Validated on load with typed error codes. | Deterministic, reproducible runs. Plans are versionable, shareable, diffable. |
| **Validation-first** | Every boundary validates: plan load, capture destination, image dimensions, Koubou version. | Failures surface early with actionable messages instead of cascading silently. |
| **Context threading** | All operations accept `context.Context`. Custom `waitContext()` for delays. | Clean cancellation throughout the pipeline. |
| **Type-safe enums** | `StepAction`, `FrameDevice` as string types with constants and parse functions. Normalization handles case/whitespace/hyphen. | Prevents typo bugs while keeping the API string-friendly for JSON plans. |
| **Flexible approval** | Supports multiple JSON formats for approved.json. Selectors combinable (locale + device). | Approval workflows evolve without breaking existing data. |
| **Watch + coalesce** | File watcher with debounce + generation coalescer. | Rapid saves don't trigger N rebuilds — queues work while generation runs. |

### Koubou Template System

Dynamic YAML generation for device framing:
- **Project config**: name, output directory, device name, output size (named or explicit)
- **Screenshot spec**: background (linear gradient or solid), content items (images, text)
- **Canvas options**: title, subtitle, hex colors
- **Named output sizes**: maps to App Store requirements (`iPhone6_9` → 1320x2868, `AppDesktop_2880` → 2880x1800)
- **Display type auto-detection**: infers `APP_IPHONE_69`, `APP_DESKTOP` etc. from dimensions

---

## Part 2: Analytics System

### Architecture

```
analytics/
├── snapshot.py              # Daily data collection (GitHub API via gh CLI)
├── generate_charts.py       # Matplotlib visualization (5 PNG outputs)
└── data/
    ├── YYYY-MM-DD.json     # Full daily snapshots (57-76 KB each)
    └── timeline.json       # Lightweight aggregated summary (1.7 KB)
```

Automated via GitHub Actions daily at 23:55 UTC.

### Data Collection (snapshot.py)

Uses `gh api` to collect from GitHub:
- **Stars**: current total stargazer count
- **Traffic (14-day window)**: views, clones, unique counts, popular referrers, popular paths
- **Release downloads**: all releases with per-asset download counts

Daily snapshot structure:
```json
{
  "date": "2026-03-12",
  "timestamp": "2026-03-12T00:01:00.613554+00:00",
  "stars": 2769,
  "today": { "views": 0, "clones": 0, ... },
  "traffic_14d": { "views": {...}, "clones": {...}, "referrers": {...}, "paths": {...} },
  "total_downloads": 7624,
  "releases": [{ "tag": "0.39.1", "assets": [...], "total_downloads": 92 }, ...]
}
```

### Chart Generation (generate_charts.py)

Produces 5 PNGs at 200 DPI:

1. **stars_cumulative.png** — area chart with milestone annotations (100, 250, 500, 1000)
2. **stars_per_day.png** — bar chart with intensity gradient + 3-day moving average
3. **downloads_cumulative.png** — line chart with release markers
4. **downloads_per_release.png** — bar chart (last 30 releases, intensity-scaled)
5. **dashboard.png** — 4-panel summary for sponsors

Styling: clean spines (top/right removed), grid with alpha=0.3, 200 DPI, tight layout.

### Data Flow

```
GitHub API (via gh CLI)
    ↓
snapshot.py → analytics/data/YYYY-MM-DD.json (full)
           → analytics/data/timeline.json (summary + deltas)
    ↓
generate_charts.py → 5 PNG charts
    ↓
GitHub Actions commit + push
```

### Key Design Patterns

| Pattern | How it works | Why it matters |
|---------|-------------|----------------|
| **Progressive data reduction** | Full snapshots (76 KB) → timeline summary (1.7 KB) → PNG charts | Each layer serves a different consumer: raw for debugging, summary for trending, charts for stakeholders. |
| **Delta computation** | Timeline entries include `stars_delta` and `downloads_delta` vs. previous snapshot | Momentum visible at a glance without post-processing. |
| **Graceful degradation** | Missing API data returns empty object, not exception. Handles zero-download releases. | Pipeline never fails completely — partial data still captured. |
| **Separation of concerns** | Collection (snapshot.py) fully separated from visualization (generate_charts.py) | Either can be replaced or run independently. |
| **Automated via CI** | GitHub Actions runs daily, commits data, pushes | Zero human intervention for ongoing tracking. |

---

## Cross-System Observations

### Shared Principles

1. **Deterministic pipelines** — Both systems produce reproducible output from defined inputs. No hidden state.
2. **Provider/adapter pattern** — Screenshots abstract capture providers; analytics abstract data sources (gh API).
3. **File-based state** — JSON files as the source of truth. No database dependency. Git-trackable.
4. **Progressive refinement** — Raw → processed → review-ready (screenshots). Raw → summary → charts (analytics).
5. **Validation at boundaries** — Both validate inputs aggressively and fail early with structured errors.
6. **Watch/automation** — Screenshots have file watching; analytics have cron-based GitHub Actions.

### What Makes These Systems Work

- **Low operational overhead**: JSON files + git commits. No servers, no databases, no dashboards to maintain.
- **Composable steps**: Each phase (plan, capture, frame, review) is independently testable and replaceable.
- **Agent-friendly**: Structured output (JSON manifests, typed errors) makes programmatic consumption easy.
- **Self-contained**: No external services beyond GitHub API. Everything runs locally or in CI.

---

## Relevance to mktg

The screenshots system's plan → capture → frame → review → watch workflow maps directly to a marketing content pipeline: plan content → generate assets → apply brand → review → watch for changes.

The analytics system's snapshot → timeline → charts pipeline maps to campaign performance tracking: collect metrics → compute deltas → visualize trends.

Both systems validate that file-based JSON state + CLI automation + CI/CD scheduling is a viable foundation for complex production workflows — exactly the approach mktg takes.

See:
- `docs/ideas/marketing-asset-pipeline.md` — concrete proposal inspired by screenshots system
- `docs/ideas/marketing-analytics.md` — concrete proposal inspired by analytics system
