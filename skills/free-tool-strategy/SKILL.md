---
name: free-tool-strategy
description: |
  Plans free tools, calculators, generators, and interactive widgets that attract target audience through search and social, demonstrate product value, and funnel users to the paid product. Engineering as marketing — build once, acquire forever.
allowed-tools: []
---

# Free Tool Strategy (Engineering as Marketing)

## Purpose

Free tools are permanent acquisition assets. Build a calculator, checker, generator, or grader that your target audience actively searches for. It ranks in Google, gets shared, and funnels users to your paid product. One tool can drive more signups than months of content.

## Reads

- `brand/audience.md` — Personas, daily workflow, pain points
- `brand/keyword-plan.md` — Search volume data for tool-related queries

## Workflow

### Step 1: Identify Audience Workflow Pain Points

Map your target audience's daily workflow and find friction:

```
Persona: [Role/Title]
Daily workflow:
1. [Task] -> Pain: [what's annoying about this]
2. [Task] -> Pain: [what's tedious/manual]
3. [Task] -> Pain: [what requires expensive tools]
4. [Task] -> Pain: [what they currently use spreadsheets for]
5. [Task] -> Pain: [what they google repeatedly]
```

Best free tool candidates solve pains that are:
- Recurring (done weekly or more)
- Currently solved with manual effort or spreadsheets
- Searchable ("X calculator", "X generator", "X checker")
- Completable in one session (not ongoing SaaS)
- Adjacent to your paid product's value prop

### Step 2: Match to Buildable Tools

#### Tool Type Matrix

| Tool Type | Best For | Search Pattern | Build Effort |
|-----------|----------|---------------|-------------|
| Calculator | Quantifiable decisions | "[X] calculator" | Low |
| Generator | Content/creative tasks | "[X] generator" | Low-Medium |
| Checker/Auditor | Quality assessment | "[X] checker", "[X] audit" | Medium |
| Grader/Scorer | Benchmarking | "[X] grader", "[X] score" | Medium |
| Converter | Format transformations | "[X] to [Y] converter" | Low |
| Template library | Workflow shortcuts | "[X] templates" | Low |
| Comparison tool | Purchase decisions | "compare [X]" | Medium |
| Playground/Sandbox | Try-before-buy | "try [X] online" | High |

#### Idea Generation Framework

For each persona pain point, ask:
1. Can we calculate something for them? -> Calculator
2. Can we create something for them? -> Generator
3. Can we evaluate something for them? -> Checker/Grader
4. Can we simplify a conversion? -> Converter
5. Can we give them a head start? -> Template
6. Can we let them try before buying? -> Playground

Score each idea:

| Criteria | Weight | Score 1-5 |
|----------|--------|-----------|
| Search volume for "[tool] [type]" | 30% | |
| Relevance to paid product | 25% | |
| Build effort (inverse) | 20% | |
| Shareability | 15% | |
| Data capture opportunity | 10% | |

### Step 3: Validate Search Volume

For each tool candidate, check:

```
Primary keyword: "[tool name]" — Volume: [X], Difficulty: [Y]
Variations:
- "free [tool name]" — Volume: [X]
- "[tool name] online" — Volume: [X]
- "best [tool name]" — Volume: [X]
- "[specific use case] [tool type]" — Volume: [X]

Total addressable search volume: [sum]
Current top results: [list competitors and their quality]
Opportunity: [Can we build something meaningfully better?]
```

Kill the idea if:
- Total search volume < 1,000/month
- Top 3 results are high-authority sites with excellent tools
- Tool requires ongoing data maintenance you can't sustain

### Step 4: Design Tool UX Flow

```
Page 1: Landing + Input
|- Headline: "[Verb] your [thing] in [time]"
|- Subheadline: "Free [tool type] — no signup required"
|- Input area: [minimal fields/inputs needed]
|- CTA: "[Action verb] — it's free"
|- Social proof: "[X] people used this tool this month"

Page 2: Results
|- Results display: [clear, visual, actionable output]
|- Shareable result: [unique URL or image for sharing]
|- Email gate (optional): "Get detailed results + recommendations"
|- Product tie-in: "Want to [do this automatically]? Try [Product]"
|- CTA: "[Start free trial]" (secondary, not aggressive)

Optional: Comparison/benchmark
|- "Your score: [X]. Average in your industry: [Y]"
|- "Top performers score [Z]. Here's how to get there."
|- Link to relevant content/product features
```

#### UX Principles for Free Tools

- **No signup wall before results.** Let them use the tool first. Gate the detailed report or saved results, not the core function.
- **Instant results.** No "we'll email you." Show results immediately.
- **One input screen.** If you need 10 fields, progressive disclosure or smart defaults.
- **Shareable output.** Unique URL, downloadable image, or embeddable widget.
- **Mobile-first.** Most discovery happens on phones.

### Step 5: Plan SEO Strategy

On-page optimization for the tool landing page:

```
Title tag: "Free [Tool Name] — [Benefit] | [Brand]"
Meta description: "[Verb] your [thing] with our free [tool type]. No signup required. Used by [X]+ [personas]."
H1: "[Verb] Your [Thing] in [Time]"
URL: /tools/[tool-name]

Content sections (below the tool):
1. "How to use this [tool type]" — captures "how to" queries
2. "What is [concept]?" — captures informational queries
3. "Why [concept] matters" — builds authority
4. "[Tool type] methodology" — transparency + E-E-A-T
5. FAQ — captures long-tail questions

Internal links:
- From tool -> relevant blog posts
- From tool -> product features that automate this
- From blog posts -> tool (embed or link)
```

Link building angles:
- Pitch to roundup posts: "best [X] tools" articles
- Resource pages in your niche
- Social sharing of interesting results/benchmarks

### Step 6: Define Conversion Hooks

The tool-to-product bridge. Never bait-and-switch — the connection must be genuine:

| Hook Type | When to Use | Example |
|-----------|-------------|---------|
| Automation hook | Tool does manually what product automates | "Tired of running this manually? [Product] does it continuously." |
| Depth hook | Tool gives surface results, product goes deeper | "Want the full analysis? [Product] checks [X] more factors." |
| Save/history hook | Tool has no memory, product persists | "Save your results and track changes over time with [Product]." |
| Team hook | Tool is single-player, product is multiplayer | "Share results with your team. [Start free trial]" |
| Integration hook | Tool is standalone, product connects | "[Product] connects this to your [workflow/tools]." |

### Step 7: Write Tool Landing Page Copy

```markdown
# [Verb] Your [Thing] in [Time]

Free [tool type] for [audience]. No signup required.

[Tool input area]

[Primary CTA: "Analyze" / "Generate" / "Calculate"]

---

## How It Works
1. [Input step — what user provides]
2. [Process step — what the tool does]
3. [Output step — what user gets]

## Why [X,000]+ [Personas] Use This Tool

[2-3 specific testimonials or usage stats]

## [Concept] Explained
[Educational content that captures informational search traffic
and establishes authority. 300-500 words.]

## FAQ
**Is this really free?**
Yes. No credit card, no signup, no catch.

**How accurate is this?**
[Methodology explanation. Transparency builds trust.]

**Can I save my results?**
[If gated: "Create a free account to save and share results."]
[If not: "Download your results as [format]."]

**Who built this?**
[Product] is [brief description]. This tool is part of how we help
[audience] [achieve outcome].

---

## Want to [automate/go deeper]?

[Product] does everything this tool does — automatically,
continuously, and with [additional benefits].

[Start Free Trial] — No credit card required.
```

## Tool Category Examples

**For Marketers:**
- Headline analyzer, email subject line grader, readability checker
- Ad copy generator, CTA optimizer, meta description writer
- SEO audit tool, keyword density checker, backlink checker

**For Developers:**
- JSON formatter, regex tester, cron expression builder
- API response validator, color palette generator, favicon generator
- Performance budget calculator, bundle size analyzer

**For Business:**
- ROI calculator, pricing calculator, break-even analyzer
- Invoice generator, proposal template builder
- Competitor comparison matrix generator

**For Designers:**
- Color contrast checker, font pairing tool, spacing calculator
- Responsive breakpoint visualizer, icon search

## Metrics to Track

| Metric | What It Tells You |
|--------|------------------|
| Tool pageviews | SEO and sharing effectiveness |
| Tool completions | UX quality (started vs finished) |
| Result shares | Viral potential |
| Email captures | Lead gen effectiveness |
| Tool -> Signup rate | Conversion hook quality |
| Tool -> Paid rate | Product-tool alignment |
| Organic ranking | SEO investment payoff |

## Output

Each free tool strategy produces:
- Ranked list of tool ideas with scores
- Search volume validation for top 3 candidates
- UX flow wireframe for recommended tool
- SEO strategy (on-page + link building)
- Landing page copy (full page, ready to build)
- Conversion hook strategy
- Build effort estimate and recommended tech stack
