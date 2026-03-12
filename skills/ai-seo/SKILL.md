---
name: ai-seo
description: |
  Optimize content for AI search engines — ChatGPT, Perplexity, Claude, Gemini, and AI Overviews. Covers entity optimization, conversational query targeting, structured data for AI citation, and answer-engine optimization (AEO). Triggers on: AI SEO, AI search, Perplexity optimization, ChatGPT ranking, AI Overview, answer engine, LLMO, GEO, AEO, cited by AI, AI visibility.
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

1. Read `brand/voice-profile.md` — authoritative voice matters more for AI citation
2. Read `brand/keyword-plan.md` — identify which queries are already AI-dominated
3. Audit current content for AI visibility (see Audit workflow below)
4. If no brand files exist, ask: What topics do you want to be cited for? Who are your competitors in AI results?

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

## Step 1: AI Visibility Audit

### Check Current AI Presence

For each of your key topics, test across AI engines:

1. **ChatGPT**: Ask "[your core question]" — are you mentioned? Cited? Recommended?
2. **Perplexity**: Search "[your topic]" — do your pages appear in sources?
3. **Google AI Overviews**: Search on Google — are you in the AI Overview? As a source?
4. **Claude**: Ask "[your question]" — are you referenced?
5. **Gemini**: Same test

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

## Output Structure

```
marketing/seo/
├── ai-seo-audit.md         # Current AI visibility audit results
├── ai-seo-content-plan.md  # Priority queries + content to create/optimize
└── ai-seo-tracking.md      # Monthly tracking sheet
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

## Related Skills

- **seo-audit**: Traditional SEO foundation that supports AI SEO
- **seo-content**: Content creation with AI-friendly formatting
- **keyword-research**: Identify which queries are AI-dominated
- **brand-voice**: Authoritative voice increases citation likelihood
