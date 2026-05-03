# On-Page SEO Reference

Technical on-page optimization guidelines for content that ranks. Apply these to every piece of SEO content before publishing.

---

## Title Tags

The single most important on-page ranking factor. Get this right first.

### Format
```
Primary Keyword — Modifier | Brand Name
```

### Rules
- **Length:** 50-60 characters (Google truncates at ~60)
- **Keyword placement:** Primary keyword within the first 3-5 words
- **Uniqueness:** Every page must have a distinct title tag
- **No keyword stuffing:** Use the keyword once, naturally
- **Power modifiers** that boost CTR: "Best," "Guide," "2026," "How to," "Free," "Review"
- **Separator:** Use em dash (—), pipe (|), or colon (:) between segments

### Examples
| Good | Why |
|---|---|
| `How to Launch a SaaS Product — Complete 2026 Guide` | Keyword first, modifier, current year |
| `Best Email Marketing Tools for Startups | YourBrand` | Keyword early, audience qualifier, brand |
| `Product Hunt Launch Strategy: Step-by-Step Playbook` | Keyword first, format signal |

| Bad | Why |
|---|---|
| `YourBrand — The Best Platform for Everything` | Brand first wastes prime keyword space |
| `How to Launch a Product, SaaS Launch, Launch Guide` | Keyword stuffing |
| `Guide` | Too vague, no keyword, no brand |

---

## Meta Descriptions

Not a ranking factor directly, but controls click-through rate from search results.

### Format
```
{What the page delivers} + {proof/qualifier} + {CTA}
```

### Rules
- **Length:** 150-160 characters (Google truncates at ~160)
- **Include primary keyword:** Google bolds matching terms in SERPs
- **Include a CTA:** "Learn how," "Get the checklist," "See examples"
- **Unique per page:** Never duplicate across pages
- **Match search intent:** If query is informational, promise information. If transactional, promise a solution.
- **Use active voice:** "Learn how to..." not "This article discusses..."
- **Include numbers when possible:** "7 steps," "in 30 days," "47% increase"

### Template
```
Learn {what they'll learn} with {proof element}. {Specific benefit}. {CTA with action verb}.
```

### Example
```
Learn how to plan a SaaS launch with our 5-phase framework used by 200+ founders.
Get the checklist, timeline, and channel strategy. Start planning today.
```

---

## Heading Hierarchy (H1-H6)

Headings signal content structure to both users and search engines.

### Rules

**H1 — Page Title (exactly one per page)**
- Include primary keyword naturally
- Should closely match or expand on the title tag
- Never duplicate the title tag word-for-word (add context)

**H2 — Major Sections (3-8 per article)**
- Each H2 should target a secondary keyword or answer a PAA question
- Use question format when matching PAA: "How do I plan a product launch?"
- Think of H2s as standalone mini-topics — each should make sense in a table of contents

**H3 — Subsections within H2s (2-5 per H2)**
- Support the parent H2 topic
- Use for step breakdowns, subcategories, or related points
- Can include long-tail keyword variations

**H4-H6 — Deep nesting (use sparingly)**
- Only when content genuinely requires multi-level hierarchy
- Most SEO content should not go deeper than H3

### Keyword Distribution Across Headings
| Level | Keyword Strategy |
|---|---|
| H1 | Primary keyword, exact or close match |
| H2 | Secondary keywords, PAA questions, topic variations |
| H3 | Long-tail variations, related terms, specific subtopics |
| H4+ | No keyword targeting needed — use for readability only |

### Anti-Patterns
- Multiple H1 tags on a single page
- Skipping levels (H1 → H3 without H2)
- Using headings for visual styling instead of structure
- Keyword-stuffing every heading with the same term
- Generic headings: "Introduction," "Conclusion," "Overview"

---

## URL Structure

Clean URLs improve crawlability, shareability, and click-through rates.

### Rules
- **Keep it short:** 3-5 words in the slug, max 60 characters total path
- **Include primary keyword:** `/launch-strategy-saas/` not `/post-12847/`
- **Use hyphens:** `/launch-strategy/` not `/launch_strategy/` or `/launchstrategy/`
- **Lowercase only:** `/seo-guide/` not `/SEO-Guide/`
- **No stop words:** `/saas-launch-strategy/` not `/how-to-create-a-saas-launch-strategy/`
- **No dates in slugs** (unless time-sensitive content like news)
- **No parameters in indexed pages:** `/pricing/` not `/page?id=pricing`
- **Flat structure preferred:** `/blog/launch-strategy/` not `/blog/2026/03/13/marketing/launch-strategy/`

### URL Hierarchy for Content Hubs
```
/blog/                          ← Blog index
/blog/launch-strategy/          ← Pillar page
/blog/product-hunt-launch/      ← Supporting article
/blog/beta-launch-checklist/    ← Supporting article
```

---

## Internal Linking

Internal links distribute page authority, help crawlers discover content, and keep users engaged.

### Rules
- **Minimum 3-5 internal links per article** (to other relevant pages)
- **Link from high-authority pages** to pages you want to rank
- **Use descriptive anchor text:** "product launch checklist" not "click here" or "read more"
- **Link contextually:** Place links within the flow of content, not in disconnected lists
- **Link deep:** Point to specific articles, not just your homepage or blog index
- **Reciprocal linking:** If Page A links to Page B, Page B should link back (when relevant)

### Hub & Spoke Model
```
         ┌─── Supporting Article A
         │
Pillar ──┼─── Supporting Article B
Page     │
         ├─── Supporting Article C
         │
         └─── Supporting Article D

Each spoke links back to the pillar.
The pillar links out to each spoke.
Spokes link to each other where relevant.
```

### Anchor Text Rules
| Type | Example | When to Use |
|---|---|---|
| Exact match | "launch checklist" | Sparingly — 1-2 per article max |
| Partial match | "our complete launch checklist" | Primary approach — natural and keyword-rich |
| Branded | "see the mktg launch guide" | When referencing your own product/tool |
| Generic | "click here," "read more" | Never for SEO — avoid entirely |
| Natural phrase | "we covered this in our guide to launching" | Best for readability and SEO balance |

---

## Image Optimization

Images impact page speed, accessibility, and can rank in Google Image Search.

### Alt Text
- **Describe the image content** in 5-15 words
- **Include keyword** when the image genuinely relates to it
- **Don't keyword-stuff:** "screenshot of launch checklist template" not "launch checklist launch plan launch strategy"
- **Empty alt for decorative images:** `alt=""` for dividers, backgrounds, icons
- **Be specific:** "bar chart showing 47% increase in signups after launch" not "chart"

### File Naming
- Descriptive, hyphenated: `saas-launch-timeline.png` not `IMG_3847.png`
- Include keyword when natural: `product-hunt-listing-example.webp`
- No spaces, no underscores, no uppercase

### Compression & Format
| Format | Use For | Target Size |
|---|---|---|
| WebP | Photos and complex images (primary format) | Under 100KB |
| AVIF | Next-gen alternative to WebP (growing support) | Under 80KB |
| PNG | Screenshots, images needing transparency | Under 200KB |
| SVG | Icons, logos, simple illustrations | Under 20KB |
| JPEG | Legacy fallback for photos | Under 150KB |

### Responsive Images
- Serve multiple sizes with `srcset` for different screen widths
- Use `loading="lazy"` for images below the fold
- Set explicit `width` and `height` attributes to prevent layout shift

---

## Schema Markup (JSON-LD)

Structured data helps Google understand content type and can trigger rich results.

### When to Use Each Type

| Schema Type | Content Type | Rich Result |
|---|---|---|
| `Article` | Blog posts, guides, news | Headline + date in search |
| `FAQPage` | Pages with FAQ sections | Expandable Q&A in SERPs |
| `HowTo` | Step-by-step tutorials | Step listing with images |
| `Product` | Product pages, reviews | Price, availability, rating |
| `BreadcrumbList` | All pages with navigation | Breadcrumb trail in SERPs |
| `LocalBusiness` | Location-based businesses | Knowledge panel, map |
| `VideoObject` | Pages with embedded video | Video thumbnail in search |

### Implementation Rules
- Use JSON-LD format (Google's preferred method)
- Place in `<head>` or at end of `<body>`
- Validate with Google's Rich Results Test before publishing
- One `Article` schema per page minimum
- Add `FAQPage` whenever you have 3+ questions answered on the page
- Keep schema data consistent with visible page content (no hidden content)

### Reference
See `schema-templates.md` in this directory for copy-paste JSON-LD templates.

---

## Core Web Vitals for Content

Page experience signals affect rankings. Content creators can influence these.

### LCP (Largest Contentful Paint) — Target: Under 2.5s
- **Hero images:** Preload with `<link rel="preload">`, serve in WebP, compress aggressively
- **Web fonts:** Use `font-display: swap`, preload critical fonts, limit to 2 families
- **Above-the-fold content:** Minimize render-blocking CSS and JS
- **Server response:** Use CDN, enable compression (gzip/brotli)

### CLS (Cumulative Layout Shift) — Target: Under 0.1
- **Always set image dimensions:** `width` and `height` attributes on every `<img>`
- **Reserve space for ads/embeds:** Use fixed-height containers
- **No injected content above the fold** after page load (banners, consent modals)
- **Web fonts:** Use `font-display: optional` or size-matched fallbacks

### INP (Interaction to Next Paint) — Target: Under 200ms
- **Minimize JavaScript** on content pages — most blog posts don't need heavy JS
- **Defer non-critical scripts:** analytics, chat widgets, social embeds
- **Lazy load below-fold elements:** images, videos, embedded content

### Content-Specific Performance Tips
- Inline critical CSS for above-the-fold content
- Use system fonts or variable fonts to reduce font file weight
- Compress all images before upload — don't rely on CMS auto-compression
- Limit embedded third-party scripts (each one adds latency and CLS risk)
- Test with Lighthouse on a throttled connection, not your fast office WiFi
