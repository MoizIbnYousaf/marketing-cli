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
category: seo
tier: strategy
reads:
  - brand/voice-profile.md
  - brand/audience.md
  - brand/positioning.md
writes:
  - marketing/seo/keyword-map.md
  - marketing/seo/content-plan.md
triggers:
  - keyword research
  - content strategy
  - what should I write about
  - SEO strategy
  - topic clusters
---


## On Activation

1. Check if `brand/` directory exists in the project root.
2. If it does, read available files: `voice-profile.md`, `positioning.md`, `audience.md`, `creative-kit.md`, `stack.md`, `learnings.md`.
3. Apply any loaded brand context to enhance output quality.
4. If `brand/` does not exist, proceed without it — this skill works standalone.

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


## Brand Memory

Brand memory: Follow brand memory protocol in /cmo skill.

Reads: `positioning.md`, `audience.md`, `competitors.md`, `learnings.md`
Writes: `marketing/seo/keyword-map.md`, `marketing/seo/content-plan.md`

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

> See references/keyword-examples.md for detailed expansion techniques.

1. **What You Sell** -- Direct product/service terms
2. **Problems You Solve** -- Pain points and challenges
3. **Outcomes You Deliver** -- Results and benefits
4. **Your Unique Positioning** -- Differentiators
5. **Adjacent Topics** -- Related audience interests
6. **Entities to Associate With** -- People, brands, tools

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


> See references/keyword-examples.md for example cluster with search data.

---

## Phase 5: Pillar Validation

> See references/keyword-examples.md for validation criteria.

Validate: search volume, competition, content-market fit, business alignment.

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

## Phase 8: Content Brief Generation

> See references/keyword-examples.md for brief template and keyword plan format.

Generate briefs for top-priority keywords: target keyword, search intent, content type, SERP snapshot, PAA questions, outline, angle.

---

## Output Format

Output format: Follow output format protocol in /cmo skill.

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


> See references/keyword-examples.md for a complete worked example.

---

## What This Skill Does NOT Do

This skill provides **strategic direction backed by search data**, not:
- Exact search volume numbers (use paid tools like exa MCP or web search for precision)
- Automated rank tracking (different tool category)
- Content writing (use /seo-content skill after brief generation)
- Technical SEO audits (different skill set)
- Link building strategy (separate from content strategy)

The output is a validated, prioritized plan with content briefs. Execution
is handled by /seo-content and other downstream skills.

---


> See references/keyword-examples.md for free tools.

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


## Feedback

Feedback: Append learnings to brand/learnings.md.

> See references/keyword-examples.md for error states and implementation notes.
