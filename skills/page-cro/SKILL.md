---
name: page-cro
description: |
  Audits existing landing pages for conversion rate optimization. Scores hero section, CTA placement, social proof, objection handling, and form friction on a 1-10 scale. Use when someone says 'audit my landing page', 'improve conversions', 'why isn't my page converting', 'CRO audit', 'landing page feedback', 'optimize my signup page', or anything about improving an existing page's performance. If they have a live URL and want it to convert better, this is the skill.
allowed-tools: []
---

# Page CRO (Conversion Rate Optimization)

## Purpose

Take any landing page and audit it for conversion leaks. Score each element, prioritize fixes by impact, and provide ready-to-implement copy and layout changes. No vague advice — specific rewrites and structural fixes.

## Reads

- `brand/audience.md` — Target personas, pain points, buying triggers
- `brand/positioning.md` — Value props, differentiators, proof points

## Workflow

### Step 1: Capture the Page

Get the page content via one of:
- Firecrawl scrape (preferred — gets full rendered content)
- Screenshot analysis (if available via browser tool)
- Raw HTML/markdown provided by user

Extract and map:
- Hero section (headline, subheadline, CTA)
- Navigation and header
- Each content section in scroll order
- All CTAs (primary, secondary, inline)
- Social proof elements (testimonials, logos, stats)
- Forms and their fields
- Footer and secondary navigation
- Page load performance indicators

### Step 2: Run the Audit

Score each element 1-10 with specific reasoning.

#### Hero Section Audit

| Check | What to look for |
|-------|-----------------|
| Headline clarity | Does it pass the 5-second test? Can a stranger understand what you do? |
| Specificity | Numbers, outcomes, timeframes > vague claims |
| Subheadline | Expands on HOW, not just restates the headline |
| Hero CTA | Single, clear, action-oriented. Not "Submit" or "Learn More" |
| Visual | Supports the message, not decorative stock photos |
| Above-fold completeness | Headline + value prop + CTA + credibility signal all visible without scrolling |

**5-Second Test:** If someone sees only the above-fold content for 5 seconds, can they answer:
1. What does this product do?
2. Who is it for?
3. Why should I care?
4. What do I do next?

### Why This Works

Each recommendation is grounded in conversion psychology: social proof leverages conformity bias, anxiety reducers counter loss aversion, and benefit-focused CTAs activate approach motivation. The 5-second test works because users form lasting first impressions in 50ms — if the value prop isn't instant, bounce rates spike.

#### CTA Audit

| Check | What to look for |
|-------|-----------------|
| Primary CTA count | One primary action per page. Multiple = decision paralysis |
| CTA copy | Action verb + outcome. "Start free trial" > "Sign up" > "Submit" |
| CTA contrast | Visually dominant, not competing with other elements |
| CTA frequency | Appears after every major content section |
| CTA anxiety reducers | "No credit card required", "Cancel anytime", "2-minute setup" |
| Secondary CTA | Lower-commitment alternative for not-ready visitors |

#### Social Proof Audit

| Check | What to look for |
|-------|-----------------|
| Testimonial specificity | Named person + role + company + specific result > anonymous quote |
| Logo bar | Recognizable brands, 5-8 logos, "Trusted by" framing |
| Stats | Specific numbers ("12,847 teams" not "thousands of teams") |
| Case studies | At least one detailed success story linked |
| Review scores | G2, Capterra, Product Hunt badges if applicable |
| Placement | Social proof appears before the main CTA, not buried at bottom |

#### Objection Handling Audit

| Check | What to look for |
|-------|-----------------|
| Price objection | ROI framing, comparison anchoring, money-back guarantee |
| Trust objection | Security badges, compliance logos, data handling statement |
| Effort objection | "Setup in 5 minutes", migration assistance, onboarding help |
| Switching objection | Import tools, comparison with current solution |
| FAQ section | Addresses top 5-7 real objections, not softballs |

#### Form Friction Audit

| Check | What to look for |
|-------|-----------------|
| Field count | Every field above 3 reduces conversion. Justify each field |
| Required vs optional | Mark optional fields or remove them |
| Field labels | Above the field, not placeholder text that disappears |
| Error handling | Inline validation, specific error messages |
| Multi-step | If >4 fields, break into steps with progress indicator |
| Social login | Google/GitHub/SSO options reduce friction |

### Step 3: Score and Prioritize

Generate an overall score and priority matrix:

```
## CRO Audit Score: [X]/100

| Element | Score | Impact | Effort | Priority |
|---------|-------|--------|--------|----------|
| Hero headline | 4/10 | High | Low | P0 |
| CTA copy | 3/10 | High | Low | P0 |
| Social proof | 5/10 | High | Medium | P1 |
| Form friction | 6/10 | Medium | Medium | P2 |
| Objection handling | 2/10 | High | Medium | P1 |

Impact x Inverse-Effort = Priority
```

### Step 4: Generate Recommendations

For each P0 and P1 issue, provide:

```markdown
### Issue: [Element] — Score [X/10]

**Problem:** [Specific description of what's wrong]

**Before:**
> [Exact current copy/structure]

**After:**
> [Rewritten copy/structure]

**Why this works:** [Psychology principle or data point backing the change]

**Expected impact:** [Estimated conversion lift range]
```

### Step 5: Provide Implementation Checklist

```markdown
## Implementation Priority

### This Week (P0 — High Impact, Low Effort)
- [ ] Rewrite hero headline to [specific suggestion]
- [ ] Change CTA from "[current]" to "[suggested]"
- [ ] Add anxiety reducer below primary CTA

### Next Sprint (P1 — High Impact, Medium Effort)
- [ ] Add 3 specific testimonials with results
- [ ] Create FAQ section addressing [top objections]
- [ ] Add logo bar above the fold

### Backlog (P2 — Medium Impact)
- [ ] Reduce form fields from [X] to [Y]
- [ ] Add secondary CTA for lower-commitment action
- [ ] Implement exit-intent offer
```

## Key Frameworks

### AIDA (Attention-Interest-Desire-Action)
- **Attention:** Headline that stops the scroll
- **Interest:** Subheadline that creates curiosity
- **Desire:** Benefits, social proof, and outcomes that build want
- **Action:** Clear, low-friction CTA

### PAS (Problem-Agitate-Solve)
- **Problem:** Name the specific pain point
- **Agitate:** Amplify the consequences of not solving it
- **Solve:** Present your product as the resolution

### Above-the-Fold Checklist
Everything visible without scrolling must include:
1. Clear headline (what you do)
2. Subheadline (how/why it matters)
3. Primary CTA (what to do next)
4. One credibility signal (logo bar, stat, or testimonial)
5. Relevant visual (product screenshot > stock photo)

## CTA Copy Formulas

| Pattern | Example |
|---------|---------|
| Action + Outcome | "Start saving 10 hours/week" |
| Action + Timeframe | "Get started in 2 minutes" |
| Action + Risk Reversal | "Try free for 14 days" |
| Action + Specificity | "Build your first workflow" |

## Worked Example

- **Hero: 7/10** — Headline is benefit-focused but subhead is too long. Recommend: cut to 8 words.
- **CTA: 5/10** — Generic 'Sign Up' button. Recommend: 'Start your free trial' with benefit reinforcement.
- **Social Proof: 3/10** — No testimonials above fold. Recommend: add 1-2 customer quotes near CTA.

## Output

The audit produces:
- Scored element breakdown with specific reasoning
- Prioritized recommendation list (P0/P1/P2)
- Before/after copy rewrites for every P0 and P1 item
- Implementation checklist ordered by impact/effort
- Framework references for each recommendation
