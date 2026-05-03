# CRO Benchmarks & Industry Data

Conversion rate benchmarks and element-specific data to ground audit recommendations in real numbers.

---

## Landing Page Conversion Rates by Industry

| Industry | Median CR | Top 25% CR | Top 10% CR |
|----------|-----------|------------|------------|
| SaaS / Software | 3.0% | 6.5% | 11.7% |
| E-commerce | 2.6% | 5.2% | 9.8% |
| Finance / Insurance | 4.3% | 8.1% | 14.2% |
| Education | 3.4% | 7.0% | 13.0% |
| Healthcare | 3.6% | 6.9% | 12.5% |
| Agency / Consulting | 2.5% | 5.0% | 10.0% |
| Real Estate | 2.8% | 5.5% | 10.5% |
| Travel | 3.1% | 5.7% | 11.0% |

**Source context:** These ranges reflect typical landing page CRs across multiple studies (Unbounce, WordStream, HubSpot). Use as directional benchmarks, not absolute targets — CR depends heavily on traffic quality, offer strength, and page intent.

---

## Element-Specific Impact Data

### Headlines

- Pages with specific, benefit-driven headlines convert 2-3x higher than vague ones
- Including a number in the headline increases engagement by ~36%
- Question-format headlines can increase CR by 10-25% (context-dependent)
- Optimal headline length: 6-12 words for landing pages

### CTAs

| CTA Pattern | Typical Lift vs. Generic |
|-------------|------------------------|
| Action + outcome ("Start saving time") | +30-40% vs. "Submit" |
| First-person ("Start my free trial") | +25-90% vs. third-person |
| Urgency + reason ("Get instant access") | +10-20% |
| Risk reversal ("Try free — no card needed") | +15-30% |

**Button color:** No single "best" color — contrast with the page matters more than the specific hue. The CTA should be the most visually dominant element above the fold.

**CTA count:** Pages with a single primary CTA convert higher than pages with multiple competing CTAs. Decision paralysis is real — Hick's Law shows that more choices increase decision time and reduce action.

### Social Proof

| Proof Type | Typical Impact |
|------------|---------------|
| Customer testimonials (with photo + name) | +20-35% CR lift |
| Logo bar (5-8 recognizable brands) | +10-20% trust signal |
| Specific user count ("12,847 teams") | +15-25% vs. vague claims |
| Star ratings / review badges | +10-15% |
| Case study link | +5-10% (indirect, builds confidence) |

**Placement matters:** Social proof placed before or alongside the primary CTA outperforms proof buried at the bottom of the page. The proof should be visible at the decision point, not after the user has already decided.

### Form Friction

| Fields | Typical Completion Rate |
|--------|----------------------|
| 1 field (email only) | 25-40% |
| 2-3 fields | 20-30% |
| 4-5 fields | 15-20% |
| 6+ fields | <10% |

**Rule of thumb:** Each additional form field above 3 reduces conversion by ~5-10%. Every field must justify its existence by either being legally required or providing enough value to outweigh the friction.

**Multi-step forms:** Breaking a long form into 2-3 steps with a progress bar can recover 20-40% of the drop-off from a single long form — the commitment bias from completing step 1 drives completion of steps 2+.

---

## Above-the-Fold Benchmarks

- Users spend 57% of their viewing time above the fold (Nielsen Norman Group)
- First impression forms in ~50ms — the above-fold content IS the first impression
- Pages with a clear headline + CTA + credibility signal above the fold convert 2-3x vs. those requiring a scroll to understand the offer
- Optimal hero section height: 600-800px (ensures CTA visibility on most screens without scrolling)

---

## Page Speed & Conversion

| Load Time | Impact |
|-----------|--------|
| 1s → 3s | Bounce probability increases 32% |
| 1s → 5s | Bounce probability increases 90% |
| 1s → 6s | Bounce probability increases 106% |
| 1s → 10s | Bounce probability increases 123% |

**Source:** Google/SOASTA research. Page speed is a conversion factor but typically a P2 recommendation since it requires engineering effort. Flag it in the audit but focus copy/structural fixes first.

---

## Mobile vs. Desktop

| Metric | Desktop | Mobile |
|--------|---------|--------|
| Avg. session duration | 4-6 min | 2-3 min |
| Avg. conversion rate | 3-5% | 1.5-3% |
| Form completion rate | Higher | 30-50% lower |
| Scroll depth | 60-70% | 50-60% |

**Implication:** Mobile users are more impatient, scroll less, and abandon forms faster. Mobile CRO means: shorter copy above fold, larger tap targets (min 44x44px), fewer form fields, and sticky CTAs that stay visible during scroll.

---

## A/B Test Planning

### Sample Size Estimation

To detect a 10% relative improvement (e.g., 3% → 3.3% CR):
- At 95% confidence, 80% power: ~30,000 visitors per variant
- At 90% confidence, 80% power: ~22,000 visitors per variant

To detect a 25% relative improvement (e.g., 3% → 3.75% CR):
- At 95% confidence: ~5,000 visitors per variant
- At 90% confidence: ~3,800 visitors per variant

**Rule of thumb:** Run tests for minimum 2 weeks regardless of traffic (to capture day-of-week effects). Stop tests only after reaching statistical significance AND minimum duration.

### What to Test First

Priority order by typical impact:
1. Headline copy (highest impact, lowest effort)
2. CTA copy and placement
3. Social proof presence and positioning
4. Form field count
5. Page layout / section ordering
6. Visual elements (images, video)

---

## Using These Benchmarks

These numbers provide context for audit scores and expected impact estimates. When recommending changes:
- Reference the benchmark to justify priority ("Your CR of 1.2% is below the 3.0% industry median")
- Use impact ranges from this file for "Expected impact" in recommendations
- Cite the reasoning behind the data, not just the number — this helps the user understand why the change matters
- Acknowledge that benchmarks are directional — specific results depend on traffic source, offer, and audience
