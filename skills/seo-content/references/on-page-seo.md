<overview>
Complete on-page SEO reference for creating content that ranks. Covers every optimization factor from title tags to internal linking, with specific implementation guidance. This is the technical counterpart to the creative content workflow — apply these after the content is written, not during.
</overview>

<title_tag_optimization>
## Title Tag Optimization

The title tag is the single highest-impact on-page factor. Get this wrong and nothing else matters.

**Formula:** `[Primary Keyword] — [Benefit or Modifier] | [Brand]`

**Rules:**
- 50-60 characters max (Google truncates at ~60)
- Primary keyword in the first 3 words
- Include a power word: ultimate, complete, proven, essential, definitive
- Year modifier for time-sensitive content: "Best X in 2026"
- Never keyword-stuff: one primary keyword, one secondary max

**Examples (good):**
- "Product Launch Checklist: 47 Steps to a Successful Launch | Mktg"
- "How to Write Landing Page Copy That Converts (2026 Guide)"
- "SEO Content Strategy: The Complete Playbook for Startups"

**Examples (bad):**
- "Launch Checklist — Launch Strategy — Product Launch Tips — Best Launches" (keyword stuffing)
- "Our Amazing Guide to Everything You Need to Know About Launching" (no keyword, too vague)
- "Chapter 1: Introduction to Launching Products Successfully in Today's Market" (too long, keyword buried)

**Title tag ≠ H1.** The H1 can be longer and more descriptive. The title tag is for search results.
</title_tag_optimization>

<meta_description>
## Meta Description

Doesn't directly affect rankings but controls click-through rate from SERPs.

**Formula:** `[Problem/Question] + [Promise of answer] + [Proof element] + [CTA]`

**Rules:**
- 150-160 characters max
- Include primary keyword naturally (Google bolds matching terms)
- Include a number or specific detail (specificity builds trust)
- End with implied CTA or curiosity gap
- Never duplicate across pages

**Template:**
```
[Struggling with X?] Learn [specific technique] that [proof/result]. [Curiosity hook].
```

**Examples:**
- "Struggling to get your first 1,000 users? This 5-phase launch framework helped 200+ startups hit their signup goals. See the full timeline inside."
- "On-page SEO isn't about keywords anymore. These 12 ranking factors matter most in 2026 — and #7 is what most guides miss."
</meta_description>

<heading_structure>
## Heading Structure (H1-H6)

Headings are both a ranking signal and a UX signal. They tell Google what the page is about and tell readers where to find what they need.

**H1 Rules:**
- Exactly one H1 per page
- Contains primary keyword
- Matches search intent (if searcher asks "how to X," H1 should promise to show how to X)
- Can be longer than title tag

**H2 Rules:**
- One H2 per major section (3-7 per article)
- Include keyword variations and related terms
- Use question format for sections targeting PAA (People Also Ask)
- Each H2 should be understandable without reading the full article

**H3-H4 Rules:**
- Use for subsections within an H2
- Include long-tail keyword variations
- Keep hierarchical (never H4 without a parent H3)

**Example structure:**
```
H1: How to Launch a Product: The Complete 5-Phase Framework
  H2: What Makes a Product Launch Successful?
    H3: The ORB Framework (Owned, Rented, Borrowed)
    H3: Why Most Launches Fail
  H2: Phase 1: Internal Launch (Days -90 to -75)
    H3: How to Recruit Your First Testers
    H3: Running Structured Feedback Sessions
  H2: How Long Does a Product Launch Take?    ← PAA question
  H2: Product Launch Checklist (47 Items)
  H2: Frequently Asked Questions
```

**Anti-pattern:** Using headings for visual styling. If you want bigger text, use CSS — headings are semantic, not decorative.
</heading_structure>

<keyword_placement>
## Strategic Keyword Placement

Keyword placement matters, but density does not. Google uses semantic understanding — mentioning "product launch" 50 times won't help. Mentioning it in the right places will.

**High-impact placement locations (in priority order):**
1. **Title tag** — First 3 words ideally
2. **H1** — Natural inclusion
3. **First 100 words** — Confirms topic to Google immediately
4. **H2 headings** — Keyword variations, not exact match repeated
5. **Image alt text** — Describe what's in the image, include keyword if natural
6. **URL slug** — Short, keyword-rich: `/product-launch-checklist` not `/the-complete-guide-to-everything-about-launching`
7. **Last 100 words** — Reinforces topic

**Keyword variations to include (semantic field):**
- Synonyms: "launch" / "release" / "ship" / "go live"
- Related entities: "Product Hunt" / "landing page" / "waitlist"
- Long-tail variations: "how to launch a product with no audience"
- Question forms: "how long does a product launch take?"

**Density guidance:** If you're counting keyword density, you're doing it wrong. Write naturally. If the keyword appears 3-8 times in a 2,000 word article, that's normal. If you have to force it in, the content probably doesn't match the keyword's intent.
</keyword_placement>

<internal_linking>
## Internal Linking Strategy

Internal links are the most underused SEO lever. They pass authority between pages, help Google discover content, and keep users on your site longer.

**Rules:**
- Every new page should link to 3-5 existing related pages
- Every new page should receive links from 2-3 existing pages (go back and add them)
- Anchor text should be descriptive, not "click here" or "read more"
- Link to your most important pages from your most authoritative pages
- Don't link to the same page twice from the same article

**Internal linking patterns:**

| Pattern | When to Use | Example |
|---------|------------|---------|
| Hub and spoke | Pillar content with subtopic articles | "Product Launch Guide" links to "Launch Checklist," "Product Hunt Strategy," etc. |
| Sequential | Step-by-step series | "Step 1: Brand Voice" → "Step 2: Positioning" → "Step 3: Launch" |
| Contextual | Natural mention within content | "...using the [ORB framework](/blog/orb-framework) for channel strategy..." |
| Related posts | End-of-article suggestions | "You might also like: [3 related articles]" |

**Anchor text distribution:**
- 50% descriptive keyword anchors: "product launch checklist"
- 30% partial match: "this launch framework" or "checklist we use"
- 20% branded or generic: "our guide" or "learn more about this"

**Never:** All exact-match anchors (looks manipulative), broken internal links (check quarterly), orphan pages (no internal links pointing to them).
</internal_linking>

<url_structure>
## URL Structure

**Rules:**
- Short and keyword-rich: `/launch-checklist` not `/blog/2026/03/the-complete-product-launch-checklist-for-startups`
- Hyphens between words (not underscores)
- Lowercase only
- No stop words unless needed for readability
- No dates in URL (makes content feel outdated)
- No file extensions (.html, .php)
- Flat hierarchy preferred: `/launch-checklist` over `/blog/marketing/launches/checklist`

**URL must never change after publishing.** If you must change it, set up a 301 redirect from old → new. Broken URLs lose all accumulated authority.
</url_structure>

<image_optimization>
## Image Optimization

Images affect page speed, accessibility, and can rank in Google Images (a non-trivial traffic source).

**File optimization:**
- WebP format (30-50% smaller than JPEG at same quality)
- Compress to under 200KB per image (use TinyPNG, ImageOptim, or Squoosh)
- Serve responsive sizes: `srcset` for different viewports
- Lazy-load images below the fold

**SEO optimization:**
- **Alt text:** Describe the image as if explaining it to someone who can't see it. Include keyword only if the image is actually about that keyword.
- **File name:** `product-launch-timeline.webp` not `IMG_4832.webp`
- **Caption:** Optional but helps with context. Users read captions more than body text.
- **Surrounding text:** The paragraph before/after the image should relate to what the image shows.

**Alt text examples:**
- Good: "Five-phase product launch timeline showing activities from day -90 to day +30"
- Bad: "product launch product launch strategy launch plan" (keyword stuffing)
- Bad: "image" or "photo" or "" (empty — accessibility violation)
</image_optimization>

<featured_snippet_optimization>
## Featured Snippet Optimization

Featured snippets (position zero) get 30-40% of clicks for their query. Three main types:

### Paragraph Snippet
**Target queries:** "What is X" / "Why does X" / "How does X work"
**How to win:**
- Place a 40-60 word answer directly below the H2 that matches the query
- Start with the definition/answer, then elaborate
- Use the exact question as an H2

### List Snippet
**Target queries:** "How to X" / "Steps to X" / "Best X"
**How to win:**
- Use an H2 with the query
- Immediately follow with an ordered or unordered list
- 5-8 items is the sweet spot
- Each item should be one concise line

### Table Snippet
**Target queries:** "X vs Y" / "X pricing" / "comparison of X"
**How to win:**
- Use an HTML table (not a screenshot of a table)
- Include a descriptive H2 above the table
- Keep columns to 3-5
- Include clear column headers

**Pro tip:** Check "People Also Ask" for your target keyword. Each PAA question is a featured snippet opportunity — create an H2 for each and answer it directly.
</featured_snippet_optimization>

<technical_on_page>
## Technical On-Page Factors

### Page Speed
- Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1
- Minimize render-blocking JavaScript
- Use a CDN for static assets
- Preload critical fonts and hero images

### Schema Markup
- Article schema for blog posts (author, date, publisher)
- FAQ schema for FAQ sections (eligible for rich results)
- HowTo schema for step-by-step guides
- BreadcrumbList for navigation context
- See `references/schema-templates.md` for ready-to-use JSON-LD

### Mobile Optimization
- Google uses mobile-first indexing — mobile version IS the version they rank
- Tap targets minimum 48x48px
- No horizontal scrolling
- Font size minimum 16px for body text
- No interstitial popups that block content on mobile

### Content Freshness Signals
- Update date visible on page (not just publish date)
- Regular content updates (quarterly for evergreen, monthly for fast-moving topics)
- Updated year in title for time-sensitive content
- Remove outdated information rather than leaving it with a "this is outdated" note
</technical_on_page>

<on_page_audit_checklist>
## Quick On-Page SEO Audit Checklist

Run this after every piece of content is written:

- [ ] Title tag: under 60 chars, keyword in first 3 words
- [ ] Meta description: under 160 chars, includes keyword, has CTA
- [ ] URL: short, keyword-rich, no dates
- [ ] H1: one per page, contains keyword, matches intent
- [ ] H2s: 3-7 per article, include keyword variations
- [ ] First 100 words: keyword mentioned naturally
- [ ] Images: alt text set, files compressed, WebP format
- [ ] Internal links: 3-5 outgoing, anchor text descriptive
- [ ] External links: 1-3 to authoritative sources (not competitors)
- [ ] Schema markup: Article + FAQ (if applicable)
- [ ] Mobile: renders correctly, no horizontal scroll
- [ ] Page speed: under 3 seconds on mobile
- [ ] Featured snippet: at least one H2 matches a PAA question with direct answer below
</on_page_audit_checklist>
