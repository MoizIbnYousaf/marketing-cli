# Idea: Marketing Analytics for mktg

> Inspired by the ASC CLI analytics system's snapshot → timeline → charts pipeline.

## Problem

mktg can generate marketing content and publish it, but has no way to track what's working. There's no feedback loop. The agent can't learn which content performs well, which channels drive traffic, or whether a launch campaign actually moved numbers. Without analytics, marketing decisions stay gut-feel instead of data-driven.

## Concept

A `mktg analytics` command that adapts the ASC CLI's download tracking pattern to marketing metrics:

```
mktg analytics snapshot   — Collect today's metrics from all connected sources
mktg analytics timeline   — Show trend summary with deltas
mktg analytics charts     — Generate visualization PNGs
mktg analytics report     — Full analysis with insights (agent-generated)
mktg analytics dashboard  — Open interactive HTML dashboard
```

## Architecture

### Directory Structure

```
marketing/
└── analytics/
    ├── config.json                # Data source configuration
    ├── data/
    │   ├── YYYY-MM-DD.json       # Full daily snapshots
    │   └── timeline.json         # Aggregated summary with deltas
    ├── charts/                    # Generated visualizations
    │   ├── traffic.png
    │   ├── engagement.png
    │   ├── conversion.png
    │   └── dashboard.png
    └── reports/
        └── YYYY-MM-DD.md         # Agent-generated analysis
```

### Data Sources (Provider Pattern)

Following the ASC CLI's `gh api` approach but for marketing data:

```typescript
interface AnalyticsProvider {
  name: string
  collect(config: ProviderConfig): Promise<MetricSnapshot>
}
```

**Providers:**

| Provider | What it collects | How |
|----------|-----------------|-----|
| `github` | Stars, traffic, clones, referrers | `gh api` (same as ASC CLI) |
| `posthog` | Page views, events, funnels, feature flags | PostHog API / MCP |
| `plausible` | Visitors, page views, sources, countries | Plausible API |
| `gsc` | Search impressions, clicks, CTR, position | Google Search Console API |
| `social` | Follower counts, post engagement | Platform APIs / scraping |
| `email` | Open rates, click rates, subscriber count | Email provider API (gws) |
| `stripe` | Revenue, conversion rate, MRR | Stripe API |

Each provider independently collects its metrics. Missing providers degrade gracefully (return empty object, log warning) — same pattern as ASC CLI's defensive error handling.

### Snapshot Format

```json
{
  "date": "2026-03-12",
  "timestamp": "2026-03-12T23:55:00.000Z",
  "project": "ceo-app",
  "sources": {
    "github": {
      "stars": 150,
      "traffic": { "views": 89, "uniques": 34 },
      "clones": { "count": 12, "uniques": 8 }
    },
    "posthog": {
      "page_views": 1240,
      "unique_visitors": 430,
      "signups": 12,
      "key_events": {
        "started_trial": 8,
        "completed_onboarding": 5
      }
    },
    "gsc": {
      "impressions": 3400,
      "clicks": 210,
      "ctr": 0.062,
      "avg_position": 14.3
    },
    "email": {
      "subscribers": 890,
      "open_rate": 0.42,
      "click_rate": 0.08
    }
  },
  "totals": {
    "total_visitors": 1670,
    "total_signups": 12,
    "total_revenue": 0
  }
}
```

### Timeline Format (Progressive Data Reduction)

Adapted directly from ASC CLI's `timeline.json` pattern:

```json
[
  {
    "date": "2026-03-12",
    "visitors": 1670,
    "visitors_delta": 230,
    "signups": 12,
    "signups_delta": 4,
    "revenue": 0,
    "revenue_delta": 0,
    "impressions": 3400,
    "impressions_delta": 500,
    "subscribers": 890,
    "subscribers_delta": 15
  }
]
```

Key insight from ASC CLI: the timeline is a **lightweight aggregation layer** (1-2 KB) that enables fast trending without parsing full snapshots (50+ KB each). Deltas computed against previous entry.

### Chart Generation

Adapted from ASC CLI's matplotlib approach but using a TypeScript-native solution:

**Charts generated:**

1. **traffic.png** — Visitors over time (area chart + moving average)
2. **engagement.png** — Signups, trial starts, onboarding completions (stacked bar)
3. **conversion.png** — Funnel visualization (visitors → signups → trial → paid)
4. **seo.png** — Search impressions, clicks, CTR, average position
5. **dashboard.png** — 4-panel summary combining the above

**Implementation options:**
- **quickchart.io** — URL-based chart API, no dependencies, works anywhere
- **Vega-Lite** — JSON-specified charts rendered to PNG via `vl2png`
- **Playwright** — Render chart HTML pages, screenshot them (dogfooding the asset pipeline)

Recommendation: Vega-Lite for static charts (declarative JSON specs, high quality), with Playwright screenshot as fallback for custom HTML dashboards.

### Report Generation (Agent-Native)

The agent reads `timeline.json` and generates a markdown report:

```markdown
# Marketing Report: 2026-03-12

## Key Metrics
- Visitors: 1,670 (+230, +16% vs yesterday)
- Signups: 12 (+4, +50% vs yesterday)
- Search impressions: 3,400 (+500, +17%)
- Email subscribers: 890 (+15)

## What's Working
- Blog post "X" driving 40% of search traffic
- Email sequence converting at 8% click rate (above 5% benchmark)

## What Needs Attention
- Landing page bounce rate elevated at 72%
- Social referral traffic declining 3rd day in a row

## Recommended Actions
1. Run /page-cro on landing page to address bounce rate
2. Run /content-atomizer on top blog post for social distribution
3. A/B test email subject lines — current open rate plateauing
```

This is where mktg's agent-native design creates a feedback loop: analytics → insights → action via other mktg skills.

## Implementation Sketch

### Phase 1: Core Pipeline (MVP)

1. **Config system** — `marketing/analytics/config.json` defining active providers + credentials
2. **GitHub provider** — Adapt ASC CLI's `gh api` calls directly
3. **PostHog provider** — Use PostHog MCP for event/pageview data
4. **Snapshot command** — Collect from all active providers, write daily JSON
5. **Timeline computation** — Aggregate snapshots, compute deltas
6. **`mktg analytics snapshot`** + **`mktg analytics timeline`**

### Phase 2: Visualization

7. **Vega-Lite chart specs** — Define chart templates for each metric category
8. **Chart generator** — Render specs to PNG using `vl2png` or quickchart.io
9. **HTML dashboard** — Interactive page with embedded charts + tables
10. **`mktg analytics charts`** + **`mktg analytics dashboard`**

### Phase 3: Intelligence

11. **Report generator** — Agent reads timeline, produces markdown analysis
12. **Anomaly detection** — Flag metrics outside 2-sigma of rolling average
13. **Skill recommendations** — Map metric problems to mktg skills (high bounce → /page-cro)
14. **`mktg analytics report`**

### Phase 4: Automation

15. **CI scheduling** — GitHub Actions / cron for daily snapshots (same as ASC CLI)
16. **Alerting** — Notify on significant changes (email via gws, Slack)
17. **Campaign attribution** — Tag content with campaign IDs, track through funnel
18. **A/B test tracking** — Compare variant performance over time

## CLI Interface

```bash
# Collect today's data
mktg analytics snapshot

# View trends
mktg analytics timeline
mktg analytics timeline --metric visitors --days 30

# Generate charts
mktg analytics charts
mktg analytics charts --metric traffic --output marketing/analytics/charts/

# Full report
mktg analytics report
mktg analytics report --period weekly

# Interactive dashboard
mktg analytics dashboard

# Configuration
mktg analytics config                     # Show current config
mktg analytics config --add posthog       # Add a provider
mktg analytics schema                     # Show snapshot JSON schema
```

All commands output JSON with `--json` flag.

## How This Connects to Existing mktg Skills

| Skill | Analytics integration |
|-------|---------------------|
| `/seo-audit` | Feed GSC data into audit for data-backed recommendations |
| `/page-cro` | Track conversion changes after CRO implementations |
| `/keyword-research` | Correlate keyword targets with actual search performance |
| `/content-atomizer` | Track which atomized variants perform best per platform |
| `/email-sequences` | Track open/click rates to optimize sequence timing |
| `/launch-strategy` | Post-launch analytics to measure launch effectiveness |
| `/competitive-intel` | Benchmark your metrics against competitor estimates |
| `/cmo` | Analytics feed into CMO's strategic decision-making |

## Key Insight: The Feedback Loop

The ASC CLI tracks downloads but doesn't act on the data — it's purely observational. For mktg, analytics should **close the loop**:

```
Generate content (mktg skills)
    → Publish (mktg post / mktg email)
    → Track performance (mktg analytics)
    → Identify what works (mktg analytics report)
    → Generate more of what works (mktg skills, informed by data)
    → Repeat
```

This is the difference between a dashboard and a marketing engine. The analytics system isn't just tracking — it's feeding the agent's next decision.

## Next Steps

1. Define `AnalyticsConfig` and `MetricSnapshot` TypeScript types
2. Implement GitHub provider (port ASC CLI's `gh api` calls to TypeScript)
3. Implement PostHog provider using PostHog MCP
4. Build snapshot + timeline commands
5. Choose chart rendering approach (Vega-Lite vs quickchart.io)
6. Test with CEO app project metrics
