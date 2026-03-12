---
name: keyword-research
description: >
  Strategic keyword research powered by web search and brand context. Use when
  someone needs content strategy, topic ideas, SEO planning, or asks what should
  I write about. Uses the 6 Circles Method to expand from seed keywords, validates
  with live SERP data, clusters into content pillars, and maps to a prioritized
  content plan. Triggers on: keyword research for X, content strategy for X, what
  topics should I cover, SEO strategy, content calendar, topic clusters, what
  should I write about, content gaps, competitor keywords. Outputs prioritized
  keyword clusters with content recommendations saved to ./brand/keyword-plan.md
  and individual content briefs to ./campaigns/content-plan/. Dependencies: none
  (but enhanced by brand context). Reads: positioning.md, audience.md,
  competitors.md. Writes: keyword-plan.md.
---

# /keyword-research -- Data-Backed Keyword Strategy

Most keyword research is backwards. People start with tools, get overwhelmed by
data, and end up with a spreadsheet they never use.

This skill starts with strategy. What does your business need? Who are you trying
to reach? What would make them find you? Then it validates with live search data
and builds a content plan that actually makes sense.

No expensive tools required. Systematic thinking plus web search.

Read ./brand/ per _system/brand-memory.md

Follow all output formatting rules from _system/output-format.md

---

## Brand Memory Integration

On every invocation, check for existing brand context.

### Reads (if they exist)

| File | What it provides | How it shapes output |
|------|-----------------|---------------------|
| ./brand/positioning.md | Market angles, differentiators | Aligns keyword selection with brand positioning -- a rebel brand targets different keywords than a trusted advisor |
| ./brand/audience.md | Buyer profiles, sophistication level | Informs search intent mapping -- beginner audience means more "what is" and "how to" keywords |
| ./brand/competitors.md | Named competitors, their positioning | Seeds competitive content gap analysis -- search what they rank for, find what they miss |

### Writes

| File | What it contains |
|------|-----------------|
| ./brand/keyword-plan.md | The complete prioritized keyword plan (profile file, create-or-overwrite) |
| ./campaigns/content-plan/*.md | Individual content briefs for top-priority keywords |
| ./brand/assets.md | Appends entries for each content brief created |

### Context Loading Behavior

1. Check whether `./brand/` exists.
2. If it exists, read `positioning.md`, `audience.md`, and `competitors.md` if present.
3. If loaded, show the user what you found:
   ```
   Brand context loaded:
   ├── Positioning     ✓ "{primary angle summary}"
   ├── Audience        ✓ "{audience summary}"
   └── Competitors     ✓ {N} competitors profiled

   Using this to shape keyword strategy.
   ```
4. If files are missing, proceed without them. Note at the end:
   ```
   → /positioning-angles would sharpen keyword alignment
   → /audience-research would tune intent mapping
   → /competitive-intel would unlock gap analysis
   ```
5. If no brand directory exists at all:
   ```
   No brand profile found — this skill works standalone.
   I'll ask what I need as we go. Run /start-here or
   /brand-voice later to unlock personalization.
   ```

---

## Iteration Detection

Before starting, check whether `./brand/keyword-plan.md` already exists.

### If keyword-plan.md EXISTS --> Refresh Mode

Do not start from scratch. Instead:

1. Read the existing plan.
2. Present a summary of the current keyword strategy:
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     EXISTING KEYWORD PLAN
     Last updated {date} by /keyword-research

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

     Pillars:
     ├── {Pillar 1}    {N} clusters    Priority: {level}
     ├── {Pillar 2}    {N} clusters    Priority: {level}
     └── {Pillar 3}    {N} clusters    Priority: {level}

     Top keywords:
     ├── {keyword 1}   {priority}
     ├── {keyword 2}   {priority}
     └── {keyword 3}   {priority}

     Content briefs: {N} created, {N} published

     ──────────────────────────────────────────────

     What would you like to do?

     ① Refresh with new SERP data
     ② Add a new topic area
     ③ Re-prioritize existing clusters
     ④ Full rebuild from scratch
     ⑤ Generate briefs for top keywords
   ```

3. Process the user's choice:
   - Option ① --> Re-run web search for existing keywords, update priorities based on fresh data
   - Option ② --> Gather new seed keywords, run full expansion, merge into existing plan
   - Option ③ --> Re-score all clusters with updated business context
   - Option ④ --> Full process from scratch
   - Option ⑤ --> Skip to content brief generation for highest-priority unfilled clusters

4. Before overwriting, show a diff of what changed:
   ```
   Changes to keyword plan:

   New clusters added:
   ├── "AI email marketing" (Pillar: AI Marketing)
   └── "automated content creation" (Pillar: AI Marketing)

   Priority changes:
   ├── "marketing automation" High → Critical
   └── "fractional CMO" Medium → Low

   Removed:
   └── "our methodology" (failed validation)

   Save these changes? (y/n)
   ```

5. Only overwrite after explicit confirmation.

### If keyword-plan.md DOES NOT EXIST --> Full Research Mode

Proceed to the full process below.

---

## The Core Job

Transform a business context into a **prioritized content plan** with:
- Keyword clusters organized by topic
- Priority ranking based on opportunity and live SERP data
- Content type recommendations
- Individual content briefs for top keywords
- A clear "start here" action

**Output format:** Clustered keywords mapped to content pieces, prioritized by
business value, competitive opportunity, and search demand. Saved to disk as
a keyword plan and individual content briefs.

---

## The Process

```
SEED --> EXPAND --> SEARCH --> CLUSTER --> VALIDATE --> PRIORITIZE --> MAP --> BRIEF
```

1. **Seed** -- Generate initial keywords from business context and brand memory
2. **Expand** -- Use the 6 Circles Method to build comprehensive list
3. **Search** -- Pull live SERP data: autocomplete, People Also Ask, competitor rankings
4. **Cluster** -- Group related keywords into content pillars
5. **Validate** -- Run 4-check pillar validation with live competitive data
6. **Prioritize** -- Score by opportunity, business value, and search evidence
7. **Map** -- Assign clusters to specific content pieces
8. **Brief** -- Generate individual content briefs for top priorities

---

## Before Starting: Gather Context

Get these inputs before generating anything. If brand memory files exist, pre-fill
what you can and confirm with the user.

1. **What do you sell/offer?** (1-2 sentences)
   - Pre-fill from: ./brand/positioning.md
2. **Who are you trying to reach?** (Be specific)
   - Pre-fill from: ./brand/audience.md
3. **What is your website?** (To understand current content)
4. **Who are 2-3 competitors?** (Or help identify them)
   - Pre-fill from: ./brand/competitors.md
5. **What is the goal?** (Traffic? Leads? Sales? Authority?)
6. **Timeline?** (Quick wins or long-term plays?)

If brand memory supplies 3+ of these, present what you found and ask for
confirmation rather than re-asking:

```
  From your brand profile:

  ├── Offer       "{from positioning.md}"
  ├── Audience    "{from audience.md}"
  ├── Competitors {list from competitors.md}
  └── Positioning "{angle from positioning.md}"

  Does this still look right? And two more
  questions:

  1. What is the goal -- traffic, leads, sales,
     or authority?
  2. Timeline -- quick wins or long-term plays?
```

---

## Phase 1: Seed Generation

From the business context (and brand memory if loaded), generate 20-30 seed
keywords covering:

**Direct terms** -- What you actually sell
> "AI marketing automation", "fractional CMO", "marketing workflows"

**Problem terms** -- What pain you solve
> "can't keep up with content", "marketing team too small", "don't understand AI"

**Outcome terms** -- What results you deliver
> "faster campaign execution", "10x content production", "marketing ROI"

**Category terms** -- Broader industry terms
> "marketing automation", "AI marketing", "growth marketing"

**Brand-aligned terms** -- From positioning if loaded
> If positioning is "The Anti-Agency" → seed "agency alternatives", "in-house marketing",
> "DIY marketing strategy"
> If positioning is "AI-First Marketing" → seed "AI marketing tools", "automated campaigns",
> "machine learning marketing"

---

## Phase 2: Expand (The 6 Circles Method)

For each seed keyword, expand using 6 different lenses:

### Circle 1: What You Sell
Products, services, and solutions you offer directly.
> Example: "AI marketing automation", "marketing workflow templates", "fractional CMO services"

### Circle 2: Problems You Solve
Pain points and challenges your audience faces.
> Example: "marketing team overwhelmed", "can't measure marketing ROI", "content takes too long"

### Circle 3: Outcomes You Deliver
Results and transformations customers achieve.
> Example: "automated lead generation", "consistent content publishing", "marketing that runs itself"

### Circle 4: Your Unique Positioning
What makes you different from alternatives.
> Example: "no-code marketing", "AI-first approach", "community-driven marketing"

If ./brand/positioning.md is loaded, use the actual positioning angles here
instead of generic examples. The user's real differentiators should drive Circle 4.

### Circle 5: Adjacent Topics
Related areas where your audience spends time.
> Example: "startup growth", "indie hackers", "solopreneur tools", "productivity systems"

If ./brand/audience.md is loaded, use the audience's actual communities,
interests, and adjacent problems to populate Circle 5.

### Circle 6: Entities to Associate With
People, tools, frameworks, concepts you want to be connected to.
> Example: "Claude AI", "n8n automation", specific thought leaders, industry frameworks

### Expansion Techniques

For each seed, find variations using:

**Question patterns:**
- What is [keyword]?
- How to [keyword]?
- Why [keyword]?
- Best [keyword]?
- [keyword] vs [alternative]?
- [keyword] examples
- [keyword] for [audience]

**Modifier patterns:**
- [keyword] tools
- [keyword] templates
- [keyword] guide
- [keyword] strategy
- [keyword] 2026
- [keyword] for beginners
- [keyword] for [industry]

**Comparison patterns:**
- [keyword A] vs [keyword B]
- best [category]
- [tool] alternatives
- [tool] review

**Output:** Expanded list of 100-200 keywords from seed terms

---

## Phase 3: Web Search Validation (NEW in v2)

This is the data-backed research layer. For each pillar-level keyword and the
top 30-50 expanded keywords, pull live search data.

### Step 1: Google Autocomplete Mining

For each seed and pillar keyword, search for autocomplete suggestions:

```
Search: "[keyword] a", "[keyword] b", ... "[keyword] z"
Search: "how to [keyword]"
Search: "best [keyword]"
Search: "why [keyword]"
Search: "[keyword] vs"
Search: "[keyword] for"
```

Capture every unique suggestion. These are real queries people type.

**What to look for:**
- Suggestions you did not think of (add to expanded list)
- Recurring modifiers (signals what people care about)
- Question patterns (signals informational intent)
- Brand/product mentions (signals commercial intent)
- Year modifiers ("2026") signal freshness demand

### Step 2: People Also Ask (PAA) Mining

For each pillar keyword, search Google and capture the People Also Ask boxes:

```
Search: "[pillar keyword]"
→ Capture PAA questions
→ Click/expand each PAA to get follow-up PAAs
→ Capture the second-level questions too
```

**What PAA data reveals:**
- The exact questions your audience asks (use as H2s in content)
- Related subtopics Google associates with this keyword
- Content gaps -- if PAA answers are thin, opportunity exists
- Semantic relationships between topics

**How to use PAA data:**
- Add new questions to your expanded keyword list
- Map PAA questions to content sections within pillar articles
- Identify PAA questions that deserve standalone articles
- Use PAA phrasing in headers (matches how people search)

### Step 3: SERP Analysis

For each priority keyword, examine the top search results:

```
Search: "[keyword]"
→ Analyze the top 5-10 results
→ Note: content type, word count, freshness, domain authority
```

**Capture for each result:**
- Title and URL
- Content type (guide, listicle, comparison, tool page, etc.)
- Freshness (when was it published/updated?)
- Quality assessment (comprehensive or thin?)
- Domain type (major publication, niche site, personal blog?)

**SERP signals that matter:**

| Signal | What it means |
|--------|--------------|
| Top results are 2+ years old | Freshness opportunity |
| Top results are thin (<1000 words) | Depth opportunity |
| Top results are all big brands (DR 80+) | Hard to win -- consider long-tail |
| Mixed results (big + small sites) | Winnable with great content |
| Forums/Reddit in top 5 | Huge content gap -- no good article exists |
| Featured snippet present | Optimize for snippet format |
| "People Also Ask" is extensive | Topic has depth worth covering |

### Step 4: Competitor Content Analysis

If ./brand/competitors.md is loaded (or competitors were provided), search
for what they rank for:

```
Search: "site:{competitor-domain.com} [topic]"
Search: "{competitor name} [pillar keyword]"
Search: "{competitor name} blog"
```

**Build a competitor content map:**

For each competitor:
- What topics do they cover?
- What content types do they use?
- What keywords do they appear to target?
- Where are the gaps -- topics they do NOT cover?
- What is their content quality like?

**Content gap analysis:**

| Topic | You | Competitor A | Competitor B | Gap? |
|-------|-----|-------------|-------------|------|
| [topic 1] | ✗ | ✓ strong | ✓ weak | Catch-up + improve |
| [topic 2] | ✗ | ✗ | ✗ | Blue ocean opportunity |
| [topic 3] | ✓ thin | ✓ strong | ✗ | Improve existing |

**Priority content gaps:**
1. Topics ALL competitors cover but you do not (catch-up)
2. Topics NO ONE covers well (blue ocean)
3. Topics where competitors are weak/outdated (improvement)

### Search Integration Output

After web search, present findings before clustering:

```
  ──────────────────────────────────────────────

  WEB RESEARCH COMPLETE

  Autocomplete suggestions:   {N} unique terms
  People Also Ask questions:  {N} captured
  SERPs analyzed:             {N} keywords
  Competitor pages reviewed:  {N} pages

  ──────────────────────────────────────────────

  TOP DISCOVERIES

  ├── {discovery 1 -- e.g., "unexpected keyword
  │   with forum results dominating SERP"}
  ├── {discovery 2 -- e.g., "competitor X has no
  │   content on {topic} -- wide open"}
  └── {discovery 3 -- e.g., "PAA reveals audience
  │   cares about {angle} more than expected"}

  NEW KEYWORDS ADDED FROM SEARCH

  ├── {keyword from autocomplete}
  ├── {keyword from PAA}
  ├── {keyword from competitor gap}
  └── +{N} more added to expanded list

  ──────────────────────────────────────────────
```

---

## Phase 4: Cluster

Group expanded keywords (including web search discoveries) into content pillars
using the hub-and-spoke model:

```
                    [PILLAR]
                 Main Topic Area
                      |
        +-------------+-------------+
        |             |             |
   [CLUSTER 1]   [CLUSTER 2]   [CLUSTER 3]
    Subtopic       Subtopic       Subtopic
        |             |             |
    Keywords      Keywords      Keywords
```

### Identifying Pillars (5-10 per business)

A pillar is a major topic area that could support:
- One comprehensive guide (3,000-8,000 words)
- 3-7 supporting articles
- Ongoing content expansion

Ask: "Could this be a complete guide that thoroughly covers the topic?"

### Clustering Process

1. **Group by semantic similarity** -- Keywords that mean similar things
2. **Group by search intent** -- Keywords with same user goal
3. **Identify the pillar keyword** -- The broadest term in each group
4. **Identify supporting keywords** -- More specific variations
5. **Attach PAA questions** -- Map People Also Ask questions to the cluster they belong to
6. **Note competitor coverage** -- Mark which competitors cover this cluster

### Example Cluster (with v2 search data)

**Pillar:** AI Marketing Automation

**Clusters:**
- What is AI marketing automation (definitional)
  - PAA: "Is AI marketing worth it?", "How does AI help marketing?"
  - SERP: Top results are thin, 2024-dated. Opportunity.
- AI marketing tools (commercial/comparison)
  - PAA: "What is the best AI marketing tool?", "Are AI marketing tools free?"
  - SERP: Dominated by listicles. Can win with practitioner angle.
- AI marketing examples (proof/validation)
  - Competitor gap: None of the 3 competitors have case study content.
- Building AI marketing workflows (how-to)
  - PAA: "How to automate marketing with AI?", "Can I automate my marketing?"
  - SERP: Reddit in top 5. Major content gap.
- AI vs traditional automation (comparison)

---

## Phase 5: Pillar Validation (Critical Step)

**Before finalizing pillars, run these 4 checks.**

Most keyword research fails because pillars are chosen based on what the business
WANTS to talk about, not what the market ACTUALLY searches for. In v2, we use
live search data to validate.

**1. Search Volume Test**
Does this pillar have >1,000 monthly searches across its keyword cluster?

- If YES: Valid pillar
- If NO: Not a pillar. It may be a single article or should not be created at all.

v2 enhancement: Use web search to estimate volume. Check Google autocomplete
richness (more suggestions = more search interest), check whether Google shows
"About X results" for the query, and check SERP competitiveness as a proxy for
search demand.

Example failure: "Claude marketing" (zero search volume) chosen as pillar because
the product uses Claude. Market searches "AI marketing" instead.

**2. Product vs. Market Test**
Is this pillar something the MARKET searches for, or something YOU want to talk about?

| Product-Centric (Wrong) | Market-Centric (Right) |
|-------------------------|------------------------|
| "Our methodology" | "Marketing automation" |
| "[Your tool name] tutorials" | "[Category] tutorials" |
| "Why we're different" | "[Problem] solutions" |
| Features of your product | Outcomes people search for |

The market does not search for your product name (unless you are famous). They
search for solutions to their problems.

v2 enhancement: If positioning.md is loaded, cross-reference. The positioning
angle should INFORM keyword selection, not dictate it. Your angle is how you
write about market topics, not the topics themselves.

**3. Competitive Reality Test**
Can you actually win here?

Check the top 3 results for the pillar keyword (from Phase 3 SERP data):
- All DR 80+ sites (Forbes, HubSpot, etc.)? Find adjacent pillar.
- Mix of authority and smaller sites? Winnable with great content.
- Thin content from unknown sites? High opportunity.
- Reddit/forums in results? Huge opportunity -- no good article exists.

Do not choose pillars where you have no realistic path to page 1.

**4. Proprietary Advantage Test**
Do you have unique content, data, or expertise for this pillar?

| Advantage | Priority |
|-----------|----------|
| Proprietary data others do not have | Prioritize highly |
| Unique methodology or framework | Prioritize highly |
| Practitioner experience (done it, not read about it) | Prioritize |
| Same info everyone else has | Deprioritize |

If you have 2,589 marketing workflows and nobody else does, "marketing workflows"
should be a pillar. If you are writing about "AI marketing" with no unique angle,
you are competing on equal footing with everyone.

v2 enhancement: If positioning.md is loaded, the proprietary advantage test
automatically checks your stated differentiators against each pillar.

**Validation Output:**

For each proposed pillar, document:

```
Pillar: [Name]
Search volume test: PASS/FAIL -- [evidence from web search]
Market-centric test: PASS/FAIL -- [evidence]
Competitive test: PASS/FAIL -- [SERP evidence]
Proprietary advantage: YES/NO -- [what advantage]
VERDICT: VALID PILLAR / DEMOTE TO CLUSTER / REMOVE
```

**If a pillar fails 2+ tests, it is not a pillar.** Either demote it to a single
article within another pillar, or remove it entirely.

---

## Phase 6: Prioritize

Not all keywords are equal. Score each cluster using both strategic assessment
AND live search evidence from Phase 3.

### Business Value (High / Medium / Low)

**High:** Direct path to revenue
- Commercial intent keywords
- Close to purchase decision
- Your core offering

**Medium:** Indirect path
- Builds trust and authority
- Captures leads
- Educational content

**Low:** Brand awareness only
- Top of funnel
- Tangentially related
- Nice to have

### Opportunity (High / Medium / Low)

**High opportunity signals (from web search data):**
- No good content exists (you would define the category)
- Existing content is outdated (2+ years old in SERP)
- Existing content is thin (surface-level, generic)
- You have unique angle competitors miss
- Reddit/forums in top results (content gap confirmed)
- Growing trend (autocomplete suggestions expanding)
- Competitors have not covered this topic

**Low opportunity signals:**
- Dominated by major authority sites (DR 80+)
- Excellent comprehensive content already exists
- Highly competitive commercial terms
- Declining interest
- All competitors have strong content here

### Speed to Win (Fast / Medium / Long)

**Fast (3 months):**
- Low competition (confirmed by SERP analysis)
- You have unique expertise/data
- Content gap is clear (forums ranking)

**Medium (6 months):**
- Moderate competition
- Requires comprehensive content
- Differentiation path exists

**Long (9-12 months):**
- High competition
- Requires authority building
- May need link building

### Priority Matrix

| Business Value | Opportunity | Speed | Priority |
|---------------|-------------|-------|----------|
| High | High | Fast | DO FIRST |
| High | High | Medium | DO SECOND |
| High | Medium | Fast | DO THIRD |
| Medium | High | Fast | QUICK WIN |
| High | Low | Any | LONG PLAY |
| Low | Any | Any | BACKLOG |

---

## Phase 7: Map to Content

For each priority cluster, assign:

### Content Type

| Type | When to Use | Word Count |
|------|-------------|------------|
| Pillar Guide | Comprehensive topic coverage | 5,000-8,000 |
| How-To Tutorial | Step-by-step instructions | 2,000-3,000 |
| Comparison | X vs Y, Best [category] | 2,500-4,000 |
| Listicle | Tools, examples, tips | 2,000-3,000 |
| Use Case | Industry or scenario specific | 1,500-2,500 |
| Definition | What is [term] | 1,500-2,500 |

### Intent Matching

| Intent | Keyword Signals | Content Approach | CTA Type |
|--------|-----------------|------------------|----------|
| Informational | what, how, why, guide | Educate thoroughly | Newsletter, resource |
| Commercial | best, vs, review, compare | Help them decide | Free trial, demo |
| Transactional | buy, pricing, get, hire | Make it easy | Purchase, contact |

### Content Calendar Placement

**Tier 1 (Publish in weeks 1-4):** Highest priority, category-defining
**Tier 2 (Publish in weeks 5-8):** High priority, supporting pillars
**Tier 3 (Publish in weeks 9-12):** Medium priority, depth content
**Tier 4 (Backlog):** Lower priority, future opportunities

### PAA-Driven Content Structure

For each content piece, use PAA questions to build the outline:

```
Article: "What is AI Marketing Automation?"

  Sections derived from PAA:
  ├── H2: How does AI help marketing?
  │   └── {from PAA question}
  ├── H2: Is AI marketing automation worth it?
  │   └── {from PAA question}
  ├── H2: What are the best AI marketing tools?
  │   └── {from PAA question}
  └── H2: How to get started with AI marketing
      └── {from PAA question + autocomplete}
```

Each PAA question becomes an H2. This aligns your content structure with what
Google knows people are asking.

---

## Phase 8: Content Brief Generation (NEW in v2)

For each top-priority keyword cluster, generate an individual content brief
and save it to `./campaigns/content-plan/`.

### Content Brief Template

```markdown
# Content Brief: {Article Title}

## Last Updated
{YYYY-MM-DD} by /keyword-research

## Target Keyword
Primary: {main keyword}
Secondary: {2-5 supporting keywords}
Long-tail: {3-5 long-tail variations}

## Search Intent
{Informational / Commercial / Transactional}

## Content Type
{Pillar Guide / How-To / Comparison / Listicle / Use Case / Definition}

## Target Word Count
{range}

## SERP Snapshot
Top 3 current results:
1. {Title} -- {Domain} -- {Content type} -- {Assessment}
2. {Title} -- {Domain} -- {Content type} -- {Assessment}
3. {Title} -- {Domain} -- {Content type} -- {Assessment}

Content gap to exploit: {what is missing from current results}

## People Also Ask
- {PAA question 1}
- {PAA question 2}
- {PAA question 3}
- {PAA question 4}

## Recommended Outline
H1: {Title}
  H2: {Section from PAA or logical flow}
  H2: {Section}
  H2: {Section}
  H2: {Section}
  H2: {Section}

## Angle
{How to approach this topic given the brand's positioning}
{Reference ./brand/positioning.md if loaded}

## Differentiation
{What makes this piece different from what already ranks}
{Proprietary data, unique methodology, practitioner experience}

## Internal Links
- Links TO: {other pieces in the content plan this should link to}
- Links FROM: {other pieces that should link to this one}

## CTA
{What action the reader should take after reading}

## Priority
{DO FIRST / DO SECOND / DO THIRD / QUICK WIN / LONG PLAY}

## Status
planning
```

### Brief Naming Convention

Use lowercase-kebab-case: `{keyword-slug}.md`
- "What is AI marketing" --> `what-is-ai-marketing.md`
- "Best marketing automation tools" --> `best-marketing-automation-tools.md`

### How Many Briefs to Generate

- Generate briefs for all Tier 1 keywords (DO FIRST items)
- Generate briefs for Quick Wins
- Offer to generate Tier 2 briefs if user wants them
- Do not auto-generate Tier 3 or Tier 4 briefs (save for later)

---

## Keyword Plan File Format

The keyword plan saved to `./brand/keyword-plan.md` uses this format:

```markdown
# Keyword Plan

## Last Updated
{YYYY-MM-DD} by /keyword-research

## Business Context
- Offer: {what they sell}
- Audience: {who they serve}
- Goal: {traffic / leads / sales / authority}
- Positioning: {angle from brand memory or user input}

## Pillar Overview

### Pillar 1: {Name} -- Priority: {Critical/High/Medium/Low}
Validation: {PASS/FAIL summary}
Clusters: {N}
Content pieces planned: {N}

| Cluster | Priority | Intent | Content Type | Status |
|---------|----------|--------|--------------|--------|
| {name}  | {H/M/L}  | {type} | {format}     | {status} |
| {name}  | {H/M/L}  | {type} | {format}     | {status} |

### Pillar 2: {Name} -- Priority: {level}
...

## Competitive Landscape
{Summary of competitor content analysis}
{Key gaps identified}

## 90-Day Content Calendar

### Month 1
- Week 1-2: {Flagship piece} -- {Target keyword cluster}
- Week 3: {Supporting piece} -- {Target keyword cluster}
- Week 4: {Supporting piece} -- {Target keyword cluster}

### Month 2
- Week 5-6: {Second pillar piece} -- {Target keyword cluster}
- Week 7: {Supporting piece} -- {Target keyword cluster}
- Week 8: {Supporting piece} -- {Target keyword cluster}

### Month 3
- Week 9-10: {Third pillar piece} -- {Target keyword cluster}
- Week 11: {Supporting piece} -- {Target keyword cluster}
- Week 12: {Supporting piece} -- {Target keyword cluster}

## Content Briefs Generated
| Brief | Path | Priority | Status |
|-------|------|----------|--------|
| {title} | ./campaigns/content-plan/{slug}.md | {priority} | planning |

## Search Data Summary
- Autocomplete terms captured: {N}
- PAA questions captured: {N}
- SERPs analyzed: {N}
- Competitor pages reviewed: {N}
- Date of search: {YYYY-MM-DD}
```

---

## Formatted Output Structure

When presenting the completed keyword plan to the user, follow the output
format specification from `_system/output-format.md`. The terminal output
uses the premium formatting system. The markdown file saved to disk uses
standard markdown.

### Terminal Output Template

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  KEYWORD RESEARCH PLAN
  Generated {Mon DD, YYYY}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Brand: {name}
  Goal: {traffic / leads / sales / authority}

  {If brand context was loaded:}
  Brand context:
  ├── Positioning    ✓ loaded
  ├── Audience       ✓ loaded
  └── Competitors    ✓ {N} profiled

  ──────────────────────────────────────────────

  RESEARCH MODE
  ├── Web search      {✓ connected | ✗ not available}
  ├── Data quality:   {LIVE | ESTIMATED}
  └── {If ESTIMATED: "Using estimated data based on
      brand context and training data. Volumes and
      rankings are directional, not verified."}

  Per _system/brand-memory.md: always show the research
  signal. If web search is unavailable, tell the user
  data is estimated and prefix research-dependent
  numbers with ~ (e.g., ~2,400 monthly searches).

  ──────────────────────────────────────────────

  RESEARCH SUMMARY

  Seeds generated:          {N}
  Keywords expanded:        {N}
  Autocomplete terms:       {N}
  PAA questions captured:   {N}
  SERPs analyzed:           {N}
  Competitor pages reviewed: {N}

  ──────────────────────────────────────────────

  CONTENT PILLARS

  ① {PILLAR NAME}                    ★ critical
     {N} clusters, {N} content pieces
     Validation: search ✓ market ✓ competitive ✓
     Top keyword: "{keyword}"
     SERP status: {opportunity assessment}

  ──────────────────────────────────────────────

  ② {PILLAR NAME}                      high
     {N} clusters, {N} content pieces
     Validation: search ✓ market ✓ competitive ✓
     Top keyword: "{keyword}"
     SERP status: {opportunity assessment}

  ──────────────────────────────────────────────

  ③ {PILLAR NAME}                      medium
     ...

  ──────────────────────────────────────────────

  TOP OPPORTUNITIES

  Keyword                    Opp    Speed
  ──────────────────────────────────────────────
  {keyword 1}                ★★★★★  Fast
  {keyword 2}                ★★★★   Fast
  {keyword 3}                ★★★★   Medium
  {keyword 4}                ★★★    Fast
  {keyword 5}                ★★★    Medium

  ──────────────────────────────────────────────
  Opp = opportunity score based on SERP analysis
  Speed = estimated time to page 1

  ──────────────────────────────────────────────

  COMPETITIVE GAPS

  ├── {gap 1 -- topic no competitor covers}
  ├── {gap 2 -- topic with weak coverage}
  └── {gap 3 -- topic where you have advantage}

  ──────────────────────────────────────────────

  90-DAY CONTENT CALENDAR

  Month 1
  ├── Wk 1-2  {Flagship piece}
  │           → {target keyword}
  ├── Wk 3    {Supporting piece}
  │           → {target keyword}
  └── Wk 4    {Supporting piece}
              → {target keyword}

  Month 2
  ├── Wk 5-6  {Second pillar piece}
  │           → {target keyword}
  ├── Wk 7    {Supporting piece}
  │           → {target keyword}
  └── Wk 8    {Supporting piece}
              → {target keyword}

  Month 3
  ├── Wk 9-10 {Third pillar piece}
  │           → {target keyword}
  ├── Wk 11   {Supporting piece}
  │           → {target keyword}
  └── Wk 12   {Supporting piece}
              → {target keyword}

  ──────────────────────────────────────────────

  START HERE

  {Specific first piece of content to create
  and why -- based on highest opportunity score,
  fastest speed to win, and strongest alignment
  with business goals}

  ──────────────────────────────────────────────

  CONTENT BRIEFS GENERATED

  ├── {brief 1}    ✓ ./campaigns/content-plan/{slug}.md
  ├── {brief 2}    ✓ ./campaigns/content-plan/{slug}.md
  └── {brief 3}    ✓ ./campaigns/content-plan/{slug}.md

  ──────────────────────────────────────────────

  FILES SAVED

  ./brand/keyword-plan.md                ✓
  ./campaigns/content-plan/{slug-1}.md   ✓ (new)
  ./campaigns/content-plan/{slug-2}.md   ✓ (new)
  ./campaigns/content-plan/{slug-3}.md   ✓ (new)
  ./brand/assets.md                      ✓ ({N} entries added)

  WHAT'S NEXT

  Your keyword plan is set with {N} prioritized
  clusters and {N} content briefs ready to write.

  → /seo-content        Write your first article
                         with your top cluster (~20 min)
  → /content-atomizer   Repurpose across social
                         channels (~10 min)
  → /newsletter         Build an edition around
                         your top topics (~15 min)

  Or tell me what you are working on and
  I will route you.
```

---

## Chain to /seo-content

After presenting the keyword plan, actively offer to chain into content
creation for the top-priority keyword:

```
  ──────────────────────────────────────────────

  READY TO WRITE?

  Your top-priority keyword is "{keyword}" with
  a content brief ready at
  ./campaigns/content-plan/{slug}.md

  I can write this article now using /seo-content.
  It will use your brand voice, the content brief,
  and the SERP data I just gathered.

  → "Write it" to start /seo-content now
  → "Not yet" to save the plan and stop here

  ──────────────────────────────────────────────
```

If the user says "write it" or similar, hand off to /seo-content with:
- The content brief file path
- The keyword plan context
- The SERP analysis from Phase 3
- Brand memory context already loaded

---

## Example: Keyword Research for "AI Marketing Consultant"

### Context Gathered

- **Business:** AI marketing consulting for startups
- **Audience:** Funded startups, 10-50 employees, no marketing hire yet
- **Goal:** Leads for consulting engagements
- **Timeline:** Mix of quick wins and authority building
- **Brand memory:** positioning.md loaded (angle: "Practitioner, not theorist"),
  audience.md loaded, competitors.md loaded (3 competitors profiled)

### Seed Keywords Generated (brand-informed)

- AI marketing consultant
- AI marketing strategy
- Marketing automation
- Startup marketing
- Fractional CMO
- AI marketing tools
- Marketing for funded startups (from audience.md)
- Practitioner marketing (from positioning.md)

### Expanded via 6 Circles (sample)

**Circle 1 (What you sell):** AI marketing consultant, AI marketing strategy,
AI marketing audit, marketing automation setup

**Circle 2 (Problems):** startup marketing overwhelm, no time for marketing,
marketing not working, can not hire marketing team

**Circle 3 (Outcomes):** automated lead generation, consistent content,
marketing ROI, scalable marketing

**Circle 4 (Positioning -- from positioning.md):** practitioner marketing,
marketing without theory, real-world marketing strategy, marketing from
someone who does it

**Circle 5 (Adjacent -- from audience.md):** startup growth strategies,
product-led growth, indie hacker marketing, Series A marketing playbook

**Circle 6 (Entities):** Claude AI marketing, n8n marketing automation,
HubSpot alternatives

### Web Search Findings (sample)

**Autocomplete discoveries:**
- "AI marketing consultant" → "AI marketing consultant for startups",
  "AI marketing consultant near me", "AI marketing consultant cost"
- "startup marketing" → "startup marketing strategy 2026",
  "startup marketing budget", "startup marketing without a team"

**People Also Ask:**
- "How much does an AI marketing consultant cost?"
- "Do I need a marketing team for my startup?"
- "What is fractional marketing?"
- "Can AI replace a marketing team?"

**SERP analysis:**
- "AI marketing consultant": Thin results, no definitive guide. Opportunity.
- "startup marketing strategy": Competitive but top results are 2023-dated.
- "fractional CMO": Moderate competition, mix of agencies and solo consultants.
- "marketing automation for startups": Reddit in top 5. Major content gap.

**Competitor content gaps:**
- Competitor A has no content on "AI marketing for startups"
- Competitor B covers "fractional CMO" but nothing on automation
- None of the 3 competitors have comparison content (vs pages)

### Clustered into Pillars

**Pillar 1: AI Marketing Strategy** (Priority: Critical)
- Validation: search ✓ market ✓ competitive ✓ advantage ✓
- What is AI marketing
- AI marketing examples
- AI marketing tools
- AI marketing for startups
- PAA: "Can AI replace a marketing team?" (standalone article)

**Pillar 2: Marketing Automation** (Priority: High)
- Validation: search ✓ market ✓ competitive ✓ advantage ✓
- Marketing automation for startups
- No-code marketing automation
- n8n vs Zapier for marketing
- Marketing workflow templates
- SERP: Reddit ranking = confirmed content gap

**Pillar 3: Fractional Marketing** (Priority: Medium)
- Validation: search ✓ market ✓ competitive partial advantage partial
- What is a fractional CMO
- Fractional CMO vs agency
- When to hire fractional marketing
- How much does a fractional CMO cost (from PAA)

### Top 3 Recommendations

**1. "Marketing Automation for Startups" (Do First -- Quick Win)**
- Reddit in top 5 = confirmed content gap
- Specific audience match (from audience.md)
- Competitor B has nothing here
- How-to guide, 2,500+ words
- Content brief generated: ./campaigns/content-plan/marketing-automation-startups.md

**2. "What is AI Marketing?" (Do Second -- Category Play)**
- Category definition opportunity
- Top results are thin and dated
- Practitioner angle (from positioning.md) differentiates
- Pillar guide, 5,000+ words
- Content brief generated: ./campaigns/content-plan/what-is-ai-marketing.md

**3. "AI Marketing Tools 2026" (Do Third -- Commercial Intent)**
- Commercial intent, close to purchase
- Existing content is generic/outdated
- Unique angle: practitioner reviews, not affiliate lists
- Comparison listicle, 3,000+ words
- Content brief generated: ./campaigns/content-plan/ai-marketing-tools-2026.md

---

## What This Skill Does NOT Do

This skill provides **strategic direction backed by search data**, not:
- Exact search volume numbers (use paid tools like Ahrefs for precision)
- Automated rank tracking (different tool category)
- Content writing (use /seo-content skill after brief generation)
- Technical SEO audits (different skill set)
- Link building strategy (separate from content strategy)

The output is a validated, prioritized plan with content briefs. Execution
is handled by /seo-content and other downstream skills.

---

## Free Tools to Supplement

If the user needs additional data validation beyond web search:

- **Google Trends** (trends.google.com) -- Trend direction, seasonality
- **Google Search Console** -- Your actual ranking data
- **Google Search** -- SERP analysis, autocomplete, People Also Ask
- **AnswerThePublic** (free tier) -- Question-based keywords
- **AlsoAsked** (free tier) -- PAA relationship mapping
- **Reddit/Quora search** -- Real user questions and language
- **Ahrefs free tools** -- Limited keyword data
- **Ubersuggest free tier** -- Basic keyword metrics

---

## How This Skill Connects to Others

**keyword-research** identifies WHAT to write about and creates the content plan.

Then:
- **/seo-content** --> Writes individual articles using the content briefs
- **/positioning-angles** --> Finds the angle for each piece (or informs keyword selection)
- **/brand-voice** --> Ensures consistent voice across all content
- **/direct-response-copy** --> Writes landing pages for commercial-intent keywords
- **/competitive-intel** --> Deep-dives into competitor strategy (feeds back into gap analysis)
- **/content-atomizer** --> Repurposes pillar content into social, email, etc.
- **/lead-magnet** --> Creates lead magnets aligned with top-of-funnel keywords

The keyword research creates the content strategy. Other skills execute it.

---

## Complete Invocation Flow

This is the full decision tree for every /keyword-research invocation:

```
  /keyword-research invoked
  │
  ├── Check ./brand/ directory
  │   ├── Load positioning.md (if exists)
  │   ├── Load audience.md (if exists)
  │   └── Load competitors.md (if exists)
  │
  ├── Check ./brand/keyword-plan.md
  │   ├── EXISTS --> Refresh Mode
  │   │   ├── Show current plan summary
  │   │   ├── Ask what to change
  │   │   ├── Process choice (refresh / add / re-prioritize / rebuild / brief)
  │   │   ├── Run web search for changes
  │   │   ├── Show diff, confirm overwrite
  │   │   └── Save updated plan + new briefs
  │   │
  │   └── DOES NOT EXIST --> Full Research Mode
  │       ├── Gather context (pre-fill from brand memory)
  │       │
  │       ├── Phase 1: Seed Generation
  │       │   └── 20-30 seeds from business context + brand memory
  │       │
  │       ├── Phase 2: Expand (6 Circles Method)
  │       │   └── 100-200 keywords from expansion techniques
  │       │
  │       ├── Phase 3: Web Search Validation
  │       │   ├── Autocomplete mining
  │       │   ├── PAA question capture
  │       │   ├── SERP analysis (top 30-50 keywords)
  │       │   └── Competitor content analysis
  │       │
  │       ├── Phase 4: Cluster
  │       │   └── Group into 5-10 pillars with hub-and-spoke
  │       │
  │       ├── Phase 5: Pillar Validation (4 checks)
  │       │   └── Remove/demote pillars failing 2+ tests
  │       │
  │       ├── Phase 6: Prioritize
  │       │   └── Score by business value, opportunity, speed
  │       │
  │       ├── Phase 7: Map to Content
  │       │   └── Assign content type, intent, calendar tier
  │       │
  │       └── Phase 8: Content Brief Generation
  │           └── Individual briefs for Tier 1 + Quick Wins
  │
  ├── Save outputs
  │   ├── ./brand/keyword-plan.md
  │   ├── ./campaigns/content-plan/*.md (briefs)
  │   └── ./brand/assets.md (append brief entries)
  │
  ├── Present formatted output (output-format.md)
  │   ├── Header
  │   ├── Research summary + pillars + opportunities
  │   ├── FILES SAVED
  │   └── WHAT'S NEXT (with /seo-content chain offer)
  │
  ├── Chain offer: Write top article with /seo-content?
  │
  └── Feedback Collection
      ├── Present feedback prompt
      └── Log to learnings.md if applicable
```

---

## The Test

A good keyword research output:

1. **Data-backed** -- Claims are supported by SERP evidence, not just intuition
2. **Actionable** -- Clear "start here" recommendation with a content brief ready
3. **Prioritized** -- Not just a list, but ranked by opportunity and evidence
4. **Realistic** -- Acknowledges competition based on actual SERP analysis
5. **Strategic** -- Connects to business goals and brand positioning
6. **Specific** -- Content types, angles, and outlines, not just keywords
7. **Executable** -- Content briefs ready to hand to /seo-content

If the output is "here's 500 keywords, good luck" -- it failed.

---

## Feedback Collection

After the keyword plan is saved and content briefs are generated, present the
standard feedback prompt per brand-memory.md protocol:

```
  How did this land?

  a) Great -- plan is clear and actionable
  b) Good -- made some priority adjustments
  c) Needs significant rework
  d) Have not started executing yet

  (You can answer later -- just run
  /keyword-research again and tell me.)
```

### Processing Feedback

**If (a) "Great":**
- Log to ./brand/learnings.md under "What Works":
  `- [{date}] [/keyword-research] Keyword plan shipped as-is. {N} pillars, {N} briefs. Key finding: {top discovery from web search}.`

**If (b) "Good -- made adjustments":**
- Ask: "What did you change? Even small priority shifts help me calibrate."
- Log the change to learnings.md.
- Offer to update the plan: "Want me to adjust the keyword plan to match your changes?"

**If (c) "Needs significant rework":**
- Ask: "What felt off? Was it the topics, the priorities, the competitive analysis, or something else?"
- If topics were wrong, suggest re-running with different seed keywords.
- If priorities were off, suggest re-running Phase 6 with updated business context.
- Log findings to learnings.md under "What Doesn't Work."

**If (d) "Have not started executing":**
- Note it. Do not log to learnings.md yet.
- Next time /keyword-research runs, remind: "Last time I built a keyword plan with {N} briefs. Have you started writing? I can help with /seo-content."

---

## Error States

### Web search not available

```
  ┌──────────────────────────────────────────────┐
  │                                              │
  │  ✗ WEB SEARCH UNAVAILABLE                   │
  │                                              │
  │  Web search tools are not available in this  │
  │  environment. I can still build a keyword    │
  │  plan using the 6 Circles Method and         │
  │  strategic analysis -- but without live      │
  │  SERP validation.                            │
  │                                              │
  │  → Continue without search data              │
  │  → Provide competitor URLs and I will work   │
  │    with what you give me                     │
  │                                              │
  └──────────────────────────────────────────────┘
```

When web search is unavailable, skip Phase 3 and run the v1 process (Phases 1,
2, 4-7). Show the RESEARCH MODE signal with "Data quality: ESTIMATED" per
_system/brand-memory.md. Tell the user you are using estimated data based on
training knowledge rather than live search results. Prefix all volume and
ranking estimates with ~ to indicate they are directional. Recommend the user
manually check top results for priority keywords.

### No business context available

```
  ┌──────────────────────────────────────────────┐
  │                                              │
  │  ✗ NEED BUSINESS CONTEXT                    │
  │                                              │
  │  I need to understand your business before   │
  │  researching keywords. No brand profile      │
  │  found and no context provided.              │
  │                                              │
  │  → Tell me what you sell and who you serve   │
  │  → /start-here to build your full profile    │
  │  → /brand-voice to start with voice          │
  │                                              │
  └──────────────────────────────────────────────┘
```

### Competitor URLs not accessible

```
  ┌──────────────────────────────────────────────┐
  │                                              │
  │  ✗ COMPETITOR ANALYSIS LIMITED               │
  │                                              │
  │  Could not access content from {N} of {M}   │
  │  competitor URLs. Proceeding with available  │
  │  data.                                       │
  │                                              │
  │  Accessible:                                 │
  │  ├── {competitor 1}    ✓                     │
  │  └── {competitor 2}    ✗ blocked             │
  │                                              │
  │  → Continue with partial data                │
  │  → Provide alternative competitor URLs       │
  │                                              │
  └──────────────────────────────────────────────┘
```

---

## Implementation Notes for the LLM

When executing this skill, follow these rules precisely:

1. **Never skip the iteration check.** Always look for an existing
   keyword-plan.md before starting a new plan.

2. **Never skip web search when available.** The v2 differentiator is
   data-backed research. If web search tools are available, use them.
   Phase 3 is not optional -- it is what makes this skill worth paying for.

3. **Show your work.** When loading brand context, say what you loaded.
   When searching, show what you found. When analyzing SERPs, name the
   patterns. The user should feel like they are working with a senior
   content strategist, not a keyword generator.

4. **Preserve the 6 Circles Method.** This is the strategic core. Web
   search enhances it, does not replace it. Always run 6 Circles expansion
   before web search validation.

5. **Pillar validation is mandatory.** Do not skip the 4-check validation.
   With live SERP data, the validation is even more powerful -- use it.
   If a pillar fails 2+ tests, demote or remove it regardless of how
   "on-brand" it feels.

6. **Generate content briefs for top priorities.** Do not just list
   keywords. The briefs in ./campaigns/content-plan/ are what make this
   skill actionable. Every Tier 1 keyword should have a brief.

7. **Respect the brand memory protocol.** Read before write. Diff before
   overwrite. Confirm before save. Append to assets.md, never overwrite.

8. **PAA questions are gold.** People Also Ask questions are real queries
   from real people. Always capture them and map them to content outlines.
   They become H2s in your content briefs.

9. **The chain to /seo-content is the handoff.** Always offer it. The
   keyword plan is strategy. /seo-content is execution. The faster the
   user moves from plan to content, the more value they get.

10. **Write file paths correctly.** The plan saves to
    `./brand/keyword-plan.md`. Briefs save to
    `./campaigns/content-plan/{slug}.md`. The exact paths matter for
    cross-skill references.

11. **When web search is unavailable, gracefully degrade.** Fall back to
    the v1 process (6 Circles + strategic analysis). Note the limitation.
    The skill should still produce valuable output without search data --
    it just will not have SERP validation.

12. **Use brand positioning to differentiate, not to dictate topics.**
    The positioning angle tells you HOW to write about a topic, not WHAT
    topics to target. "The Anti-Agency" writes about "marketing strategy"
    (market term) with an anti-agency angle -- it does not target
    "anti-agency" as a keyword.
