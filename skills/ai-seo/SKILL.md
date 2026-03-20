---
name: ai-seo
description: "Optimize content for AI search engines — ChatGPT, Perplexity, Claude, Gemini, and AI Overviews. Covers entity optimization, structured data, citation-worthy formatting, and platform-specific strategies. Use when someone wants visibility in AI-generated answers, says 'AI SEO', 'AI search', 'LLM optimization', 'ChatGPT ranking', 'Perplexity citations', 'AI Overviews', or wants their content cited by AI assistants. The new SEO frontier — if you're only optimizing for Google, you're already behind."
category: seo
tier: core
reads:
  - brand/voice-profile.md
  - brand/keyword-plan.md
writes:
  - marketing/seo/ai-seo-audit.md
  - marketing/seo/ai-seo-content-plan.md
depends-on: []
triggers:
  - ai seo
  - ai search
  - perplexity
  - chatgpt ranking
  - ai overview
  - answer engine
  - llmo
  - geo
  - aeo
  - cited by ai
  - ai visibility
  - ai optimization
allowed-tools: []
---

# AI SEO Optimization

You optimize content so AI search engines — ChatGPT, Perplexity, Claude, Gemini, and Google AI Overviews — cite, reference, and recommend it. Traditional SEO gets you on page one of Google. AI SEO gets you into the AI's answer.

This is a different game. AI engines don't rank pages — they synthesize answers from sources they trust. Your job is to become a source they trust and cite.

## On Activation

1. Read `brand/` directory: load `voice-profile.md`, `keyword-plan.md`, `positioning.md`, `competitors.md` if present.
2. Show what loaded:
   ```
   Brand context loaded:
   ├── Voice Profile   ✓/✗
   ├── Keyword Plan    ✓/✗
   ├── Positioning     ✓/✗
   └── Competitors     ✓/✗
   ```
3. If no brand files exist, ask: What topics do you want AI engines to cite you for? Who are your competitors in AI results?
4. Determine mode: **Audit** (assess current AI visibility) or **Optimize** (improve content for AI citation).
5. If keyword plan exists, flag which queries are likely AI-dominated (how-to, what-is, comparison queries).

---

## How AI Search Works (The Mental Model)

Traditional search: User types query → Google ranks pages → user clicks a link
AI search: User asks question → AI reads sources → AI synthesizes answer → cites sources inline

**What this means for you:**
- You're not competing for clicks. You're competing to be a cited source.
- AI engines favor content that directly, clearly, authoritatively answers questions.
- Structure and clarity matter more than keyword density.
- Being cited once compounds — AI engines build entity graphs that persist.

---

## Brand Integration

- **voice-profile.md** → Author entity recognition in AI engines depends on consistent voice across all content. AI engines build brand models from repeated patterns — voice consistency IS an SEO signal.
- **keyword-plan.md** → Target queries where the brand has genuine authority. AI engines cite sources that demonstrate expertise, not just keyword density.

## Step 1: AI Visibility Audit

### Check Current AI Presence

Use available tools to test AI visibility. Not all engines will be testable — audit what you can, note what you can't.

**With browser tool available:**
1. **Perplexity**: Navigate to perplexity.ai, search "[your topic]" — check if pages appear in sources
2. **Google AI Overviews**: Search on google.com — check if brand appears in AI Overview
3. **ChatGPT**: Navigate to chatgpt.com, ask "[your core question]" — check citations

**With web search/Exa MCP only:**
1. Search for "[brand] + [topic]" to assess web presence that AI engines index
2. Check if key pages appear in top results (AI engines favor high-ranking pages)
3. Search for competitor content on the same topics to benchmark

**Without browser or web search:**
1. Review existing content structure against AI citation patterns (see references/content-patterns.md)
2. Check schema markup on existing pages
3. Audit content formatting for extractability
4. Note limitation: "Live AI visibility testing requires browser access. This audit covers content optimization only."

### Audit Output

| Query | ChatGPT | Perplexity | AI Overview | Claude | Status |
|-------|---------|------------|-------------|--------|--------|
| [query 1] | Not cited | Source #3 | Not included | Mentioned | Partial |
| [query 2] | Recommended | Source #1 | Featured | Named | Strong |
| [query 3] | Not mentioned | Not found | Not included | Not mentioned | Absent |

For each "Absent" or "Partial" query, create an optimization plan.

---

## Step 2: Entity Optimization

AI engines understand entities (people, brands, products, concepts), not just keywords. You need to establish your entity clearly.

### Build Your Entity Profile

Ensure these exist and are consistent across the web:

- **Wikipedia / Wikidata**: If eligible, create or update your entry
- **Crunchbase**: Company profile with accurate data
- **LinkedIn**: Complete company and founder profiles
- **Schema.org markup**: Organization, Person, Product schemas on your site
- **About page**: Clear, factual, third-person description of who you are and what you do
- **Author pages**: Every content creator has a page with credentials, links, and bio

### Entity Signals to Strengthen

| Signal | Action |
|--------|--------|
| Consistent naming | Use the exact same brand name everywhere — no variations |
| Co-occurrence | Get mentioned alongside known entities in your space |
| Structured data | Organization + Person + Product schema on every relevant page |
| Backlinks from authorities | Citations from sites AI engines already trust |
| Cross-platform presence | Same entity info on LinkedIn, Twitter, GitHub, Crunchbase |

---

## Step 3: Content Optimization for AI Citation

### The Definitive Answer Pattern

AI engines prefer content structured as clear, authoritative answers. For every target query:

```markdown
## [Question as H2]

[Direct answer in 1-2 sentences — this is what gets cited]

[Supporting detail, evidence, examples in 2-4 paragraphs]

[Data or specific numbers that add credibility]
```

**This pattern works because:**
- AI engines can extract the direct answer for synthesis
- The supporting detail gives the AI confidence in your authority
- Specific data makes your content more citable than vague competitors

### Question-Answer Formatting

Structure content to match how people ask AI engines questions:

**Identify conversational queries:**
- "What is the best [X] for [Y]?"
- "How do I [accomplish Z]?"
- "What's the difference between [A] and [B]?"
- "[X] vs [Y] — which should I choose?"
- "Why does [thing] happen?"

**For each query, create a section that:**
1. Uses the question (or close variant) as the heading
2. Answers directly in the first sentence
3. Provides supporting evidence
4. Includes specific numbers, dates, or examples
5. Links to primary sources when citing claims

### FAQ Sections

Add FAQ sections with structured data to every key page:

```markdown
## Frequently Asked Questions

### [Exact question someone would ask an AI]
[Direct, authoritative answer. 2-4 sentences. Include a specific fact or number.]

### [Next question]
[Direct answer.]
```

Add `FAQPage` schema markup to every FAQ section.

---

## Step 4: Structured Data for AI

### Required Schema Types

| Schema | Purpose | AI Engine Benefit |
|--------|---------|------------------|
| Organization | Establish entity | All engines — entity recognition |
| Person (authors) | Author authority | Perplexity, Google AI — source credibility |
| Article | Content metadata | All engines — content classification |
| FAQPage | Q&A content | Google AI Overviews — direct extraction |
| HowTo | Process content | Google AI Overviews — step extraction |
| Product | Product info | ChatGPT, Perplexity — recommendation queries |
| Review | Credibility signal | All engines — trust signal |

### Implementation

Every page should have at minimum:
- `Organization` schema (site-wide)
- `Article` + `Person` schema (all content pages)
- `FAQPage` schema (any page with Q&A content)
- `BreadcrumbList` schema (all pages)

---

## Step 5: Citation-Friendly Formatting

AI engines are more likely to cite content that is easy to parse and extract from.

### Formatting Rules

1. **Clear hierarchy**: H1 → H2 → H3, logical flow, no skipped levels
2. **Short paragraphs**: 2-3 sentences max, one idea per paragraph
3. **Definition patterns**: "X is [clear definition]." — direct, extractable
4. **Comparison tables**: AI engines love structured comparisons
5. **Numbered lists**: Steps, rankings, processes — easy to extract
6. **Data presentation**: Tables > prose for statistics and comparisons
7. **Primary source citations**: Link to studies, reports, official docs
8. **Last updated dates**: Show freshness — AI engines prefer recent content

### What AI Engines Trust

| Trust Signal | How to Implement |
|-------------|-----------------|
| Author expertise | Author page with credentials, experience, publications |
| Original research | Proprietary data, surveys, case studies |
| External citations | Cite reputable sources, link to primary research |
| Freshness | Regular updates, current year stats, "last updated" dates |
| Depth | Comprehensive coverage that other sources lack |
| Specificity | Exact numbers, dates, examples over vague claims |
| Consistency | Same facts across your site, no contradictions |

---

## Step 6: Platform-Specific Strategies

### Perplexity

- Perplexity heavily indexes web content and favors clear, structured pages
- Strong source attribution — your URL appears next to cited text
- Optimize for question-based queries with direct answers
- Technical content and comparisons perform well

### ChatGPT (with browsing)

- Browses the web for current information
- Favors authoritative, well-structured content
- Brand mentions in trusted sources increase recommendation likelihood
- Product/comparison pages get cited for "best X" queries

### Google AI Overviews

- Pulls from existing Google index — traditional SEO still matters
- Favors content that directly answers the query in 2-3 sentences
- FAQ schema content frequently appears in AI Overviews
- How-to and listicle formats are heavily extracted

### Claude

- Knowledge is training-based (less real-time web access)
- Entity recognition from web-scale training data
- Being mentioned across many trusted sources increases recognition
- Wikipedia, major publications, and authoritative sites have outsized impact

---

## Step 7: Monitoring and Iteration

### Monthly AI Visibility Check

1. Re-run the audit queries across all AI engines
2. Track changes in citation status
3. Identify new queries where AI engines are active in your space
4. Update content that lost AI visibility
5. Create new content for queries where you're absent

### Tracking Sheet

```markdown
| Month | Query | Engine | Status | Action Taken | Result |
|-------|-------|--------|--------|-------------|--------|
| Mar 2026 | "best X for Y" | Perplexity | Source #5 | Added comparison table | TBD |
| Mar 2026 | "how to Z" | ChatGPT | Not cited | Created definitive answer | TBD |
```

---

## Key Differences from Traditional SEO

| Traditional SEO | AI SEO |
|----------------|--------|
| Optimize for keywords | Optimize for questions and entities |
| Compete for page 1 ranking | Compete to be a cited source |
| Keyword density matters | Answer clarity matters |
| Backlinks drive authority | Being mentioned across trusted sources drives authority |
| Meta tags for CTR | Structured data for extraction |
| Content length signals depth | Answer directness signals usefulness |
| One-time optimization | Continuous monitoring across multiple engines |

---

## Anti-Patterns

- **Traditional SEO is the foundation AI SEO sits on.** AI engines pull from web indexes — if your pages aren't ranking or indexed, they can't be cited. Check traditional SEO basics (/seo-audit) before investing in AI-specific optimization.
- **FAQ schema only works when it matches real Q&A content.** Google penalizes schema that doesn't reflect what's visible on the page. Add FAQPage markup to pages with genuine questions and answers, not as a blanket optimization.
- **AI citation is volatile — a single test proves nothing.** A page cited this week may drop next month as AI models update their indexes and weights. The monitoring step (Step 7) exists because ongoing tracking is the only way to maintain AI visibility.
- **Write for humans, format for AI.** Over-optimizing for extractability (robotic, formulaic answers) hurts traditional SEO and user trust. The best AI-cited content is genuinely useful content that happens to be well-structured.
- **Robots.txt is the gatekeeper.** If AI bots (GPTBot, PerplexityBot, ClaudeBot) are blocked, no amount of content optimization matters. This is the very first thing to check — see references/platform-ranking-factors.md for the full bot list.

---

## Error States

- **No web search or browser available:** Skip live audit (Step 1), proceed with content optimization (Steps 2-6) using existing content analysis. Note: "AI visibility audit requires browser or web search. Content optimization complete — recommend live audit when tools are available."
- **No brand files exist:** Ask for target topics and competitors directly. Proceed with generic optimization. Suggest running /brand-voice and /keyword-research first.
- **No existing content to optimize:** Shift to content planning mode — create the ai-seo-content-plan.md with priority queries and content specs. Suggest /seo-content to create the actual content.
- **Can't access AI engines for testing:** Focus on content structure, schema markup, and formatting optimization. Flag that live testing is deferred.

---

## File Output Format

### Directory

```
marketing/seo/
├── ai-seo-audit.md          # AI visibility audit results
├── ai-seo-content-plan.md   # Priority queries + optimization plan
└── ai-seo-tracking.md       # Monthly tracking sheet
```

### Frontmatter (ai-seo-audit.md)

```yaml
---
title: "AI SEO Visibility Audit"
date_created: "{YYYY-MM-DD}"
last_updated: "{YYYY-MM-DD}"
queries_tested: {number}
engines_tested: ["Perplexity", "ChatGPT", "Google AI Overviews"]
overall_status: "strong / partial / absent"
priority_actions: {number}
---
```

### Frontmatter (ai-seo-content-plan.md)

```yaml
---
title: "AI SEO Content Optimization Plan"
date_created: "{YYYY-MM-DD}"
priority_queries: {number}
content_to_create: {number}
content_to_optimize: {number}
---
```

---

## Chain Offers

After completing, suggest:

- `/seo-audit` — ensure traditional SEO foundations support AI visibility
- `/seo-content` — create new content optimized for AI citation
- `/brand-voice` — consistent authoritative voice increases citation likelihood
- `/keyword-research` — identify which queries are AI-dominated in your space
- "Monthly recheck" — re-run the audit to track AI visibility changes

---

## Related Skills

- **seo-audit**: Traditional SEO foundation that supports AI SEO
- **seo-content**: Content creation with AI-friendly formatting
- **keyword-research**: Identify which queries are AI-dominated
- **brand-voice**: Authoritative voice increases citation likelihood
