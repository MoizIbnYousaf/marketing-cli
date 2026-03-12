# Keyword Research Examples & Reference

> Extracted from SKILL.md for token efficiency.

---

# 6 Circles Method Detail

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


---

# Pillar Validation Detail

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


---

# Content Brief & Plan Templates

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


---

# Formatted Output Structure

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


---

# Full Example

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


---

# Supplementary

## Free Tools to Supplement

If the user needs additional data validation beyond web search:

- **Google Trends** (trends.google.com) -- Trend direction, seasonality
- **Google Search Console** -- Your actual ranking data
- **Google Search** -- SERP analysis, autocomplete, People Also Ask
- **AnswerThePublic** (free tier) -- Question-based keywords
- **AlsoAsked** (free tier) -- PAA relationship mapping
- **Reddit/Quora search** -- Real user questions and language
- **exa MCP or web search free tools** -- Limited keyword data
- **Ubersuggest free tier** -- Basic keyword metrics

---


---

# Technical Reference

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
