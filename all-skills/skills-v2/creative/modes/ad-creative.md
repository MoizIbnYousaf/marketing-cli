# Ad Creative Mode

Generate performance-optimized paid advertising creative across Meta, Google, LinkedIn, and TikTok. Not generic images resized for ad placements — creative engineered for each platform's ad system, policy requirements, and conversion psychology.

**Loaded by:** `creative/SKILL.md` when user selects Ad Creative mode (option 5).
**Model selection:** Handled by `references/MODEL_REGISTRY.md` — never hardcode model IDs in prompts or workflows.
**Brand consistency:** Reads from `./brand/creative-kit.md` before every generation.
**File output:** Saves to `./campaigns/{campaign}/ads/{platform}/` for organized delivery.

---

## Why This Mode Exists

**The problem:** Paid ad creative is where most marketing budgets burn:
1. Each platform has different ad specs, safe zones, and policy rules
2. Creative fatigue kills performance — you need constant variants
3. A/B testing requires structured variation, not random guessing
4. Policy violations waste time and delay launches
5. Most teams produce 2-3 ad variants when they need 12+
6. Image generation prompts that work for organic fail for paid (different rules)
7. No systematic approach to hook testing across formats

**The solution:** A complete ad creative production system that:
- Knows every ad placement spec across four major platforms
- Generates structured testing matrices (4 hooks x 3 formats = 12 ads minimum)
- Produces A/B variants per concept for systematic testing
- Includes platform-specific policy compliance checklists
- Outputs image generation prompts optimized for ad requirements
- Organizes deliverables by platform, placement, and test variant
- Integrates with the brand kit for visual consistency across all ads

**The ROI multiplier:** One well-structured ad testing matrix produces more actionable performance data than 50 randomly created ads. This mode builds the matrix.

---

## Model Selection

**Do NOT hardcode model IDs.** Always refer to `references/MODEL_REGISTRY.md` for the current default image model and its verified API payload.

As of this writing, the models used in this mode are:

### Image Ads

| Role | Model | Registry Section | Estimated Cost |
|------|-------|-----------------|---------------|
| **All static ad creative** | Nano Banana Pro | Image Generation > Default Model | ~$0.02-0.04 per image |

### Video Ads

| Role | Model | Registry Section | Estimated Cost |
|------|-------|-----------------|---------------|
| **Default video ads** | Kling 2.5 Turbo Pro | Video Generation > Default Model | ~$0.40 per 5s clip |
| **Hero video ads** | Veo 3.1 / Sora 2 | Video Generation > Comparison Models | ~$0.80-1.50 per clip |

### How to Call

1. Open `references/MODEL_REGISTRY.md`
2. Find the **Image Generation** section (for static ads) or **Video Generation** section (for video ads)
3. Copy the verified payload structure
4. Insert your constructed prompt and desired aspect ratio
5. Execute the API call via Replicate

### Why Nano Banana Pro for Ad Creative

Nano Banana Pro handles all static ad generation because:
- **Typography rendering:** CTA buttons, headlines, offer text directly in the image
- **Product placement:** Clean product integration into lifestyle and studio contexts
- **Aspect ratio control:** Native support for every ad placement ratio
- **Speed:** 15-40 seconds per image enables rapid iteration across a full testing matrix
- **Consistency:** Same model across all variants ensures controlled testing (only the creative variable changes, not the model)

---

## Platform Specifications

### Meta / Instagram Ads

Meta's ad system serves across Facebook, Instagram, Messenger, and the Audience Network. Each placement has distinct specs.

#### Feed Ads (Facebook + Instagram)

| Spec | Value |
|------|-------|
| **Recommended ratio** | 1:1 (square) or 4:5 (portrait) |
| **Minimum resolution** | 1080x1080 (1:1) or 1080x1350 (4:5) |
| **Max file size** | 30MB |
| **Formats** | JPG, PNG |
| **Text-to-image ratio** | Keep below 20% text coverage for best delivery |
| **Safe zone** | Full frame usable; bottom 10% may be covered by CTA button overlay |

**Feed Ad Prompt Formula:**
```
[Product/service] in [context], commercial advertising photography,
[brand color palette] color scheme, clean professional composition,
prominent product placement, space for headline overlay in [position],
CTA-ready layout with clear visual hierarchy,
[1:1 or 4:5] composition, high-end advertising quality,
scroll-stopping visual impact, bright well-lit professional
```

#### Stories / Reels Ads (Facebook + Instagram)

| Spec | Value |
|------|-------|
| **Ratio** | 9:16 (vertical full-screen) |
| **Resolution** | 1080x1920 |
| **Safe zone — top** | Avoid top 14% (250px) — profile icon, brand name, "Sponsored" label |
| **Safe zone — bottom** | Avoid bottom 10% (200px) — CTA button, swipe-up area |
| **Safe zone — usable** | Middle 76% of the frame (250px to 1720px from top) |
| **Max file size** | 30MB (image), 4GB (video) |
| **Video duration** | 1-120 seconds (recommend 5-15s for ads) |

**Stories/Reels Ad Prompt Formula:**
```
[Product/service] vertical full-screen composition for Stories ad,
subject centered in middle 76% of frame (avoiding top and bottom),
9:16 vertical format, immersive full-bleed visual,
[brand colors], bold attention-grabbing,
native story aesthetic blended with professional quality,
space for CTA button at bottom, space for brand label at top,
scroll-stopping first impression, commercial quality
```

#### Carousel Ads

| Spec | Value |
|------|-------|
| **Ratio** | 1:1 (square) — all cards must match |
| **Resolution** | 1080x1080 per card |
| **Cards** | 2-10 cards per carousel |
| **Strategy** | Each card should work standalone AND as part of the sequence |

**Carousel Strategy:**
```
Card 1: Hook — the scroll-stopper (curiosity, bold claim, or visual intrigue)
Card 2: Problem — what the audience struggles with
Card 3: Solution — how your product/service solves it
Card 4: Proof — social proof, results, testimonials
Card 5: CTA — clear next step with urgency
```

#### Advantage+ Creative Requirements

Meta's Advantage+ system automatically optimizes ad creative. To work well with it:
- Provide multiple text variants (headline, primary text, description)
- Supply images at multiple ratios (1:1, 4:5, 9:16) — Advantage+ will select per placement
- Avoid text baked into images (Advantage+ cannot modify it)
- Keep visuals clean so auto-enhancements (brightness, contrast, cropping) improve rather than degrade
- Generate at highest quality — Advantage+ may compress further

---

### Google Ads

Google's ad ecosystem spans Search, Display, YouTube, Shopping, and Discovery.

#### Display Ad Sizes

| Size (px) | Name | Where It Appears | Aspect Ratio | Model Ratio |
|-----------|------|-----------------|--------------|-------------|
| 300x250 | Medium Rectangle | Most common display placement | ~6:5 | `5:4` |
| 728x90 | Leaderboard | Top of page, wide banner | ~8:1 | `21:9` then crop |
| 160x600 | Wide Skyscraper | Sidebar, tall vertical | ~3:11 | `2:3` then crop |
| 336x280 | Large Rectangle | In-content, article pages | ~6:5 | `5:4` |
| 320x50 | Mobile Leaderboard | Mobile banner, bottom of screen | ~6:1 | `21:9` then crop |
| 970x250 | Billboard | Premium top-of-page | ~4:1 | `21:9` then crop |
| 250x250 | Square | Various placements | 1:1 | `1:1` |
| 200x200 | Small Square | Various placements | 1:1 | `1:1` |

**Display Ad Strategy:**
```
Priority generation order (by impression volume):
1. 300x250 — generates the most impressions
2. 728x90 — second most common
3. 160x600 — sidebar standard
4. 320x50 — mobile standard
5. Remaining sizes as needed
```

**Display Ad Prompt Formula (Square/Rectangle):**
```
[Product/service] digital display advertisement, clean commercial layout,
[brand colors] color scheme, bold headline space,
product prominently featured, professional advertising design,
clear visual hierarchy: product > headline > CTA,
sharp crisp rendering suitable for small display sizes,
high contrast for banner visibility, [aspect ratio] composition,
advertising quality, clean edges, no bleed
```

**Display Ad Prompt Formula (Banner/Leaderboard):**
```
[Product/service] horizontal banner advertisement, ultra-wide composition,
product on [left/right] with text space on opposite side,
[brand colors], high contrast for banner visibility,
must read clearly at small physical size,
clean professional commercial design, sharp rendering,
21:9 ultrawide composition, advertising quality
```

#### Responsive Display Ads

Google's responsive display ads auto-assemble from provided assets. Supply:

| Asset | Spec | Count |
|-------|------|-------|
| **Landscape image** | 1200x628 (1.91:1) | 1-5 images |
| **Square image** | 1200x1200 (1:1) | 1-5 images |
| **Logo (landscape)** | 1200x300 (4:1) | 1 |
| **Logo (square)** | 1200x1200 (1:1) | 1 |
| **Short headline** | 30 characters max | 1-5 |
| **Long headline** | 90 characters max | 1 |
| **Description** | 90 characters max | 1-5 |
| **Business name** | 25 characters max | 1 |

**Responsive Display Prompt Formula:**
```
[Product/service] in [context], clean professional advertising photography,
no text overlays (Google adds text automatically),
product as clear focal point, clean uncluttered background,
[brand colors] accents, professional studio-quality lighting,
commercial product photography, [1:1 or 16:9] composition,
sharp focus, high contrast, advertising-grade quality
```

**Critical rule for responsive display:** Do NOT include text in the image. Google overlays headlines, descriptions, and CTAs dynamically. Text in the image creates visual collision.

#### YouTube Ads

| Placement | Spec | Notes |
|-----------|------|-------|
| **Thumbnail (custom)** | 1280x720 (16:9) | Must be compelling — users decide to watch or skip |
| **End screen** | 1280x720 (16:9) | Last 5-20 seconds; avoid bottom-right 30% (subscribe button area) |
| **Companion banner** | 300x60 | Displays beside video on desktop |
| **Video ad** | 1920x1080 or 1080x1920 | Pre-roll, mid-roll, or bumper (6s) |

**YouTube Thumbnail Prompt (for video ads):**
```
YouTube ad thumbnail, [subject/product] with compelling visual hook,
dramatic lighting, bold vibrant colors, high contrast,
face with [emotion] expression if person present,
clean space on [left/right] for text overlay,
click-worthy composition, extreme visual clarity,
16:9 landscape, must read at small sidebar size
```

---

### LinkedIn Ads

LinkedIn's professional audience demands different creative standards than consumer platforms.

#### Sponsored Content (Single Image)

| Spec | Value |
|------|-------|
| **Recommended ratio** | 1.91:1 (landscape) or 1:1 (square) |
| **Resolution** | 1200x627 (landscape) or 1080x1080 (square) |
| **Max file size** | 5MB |
| **Format** | JPG, PNG |
| **Visual language** | Professional, clean, authoritative — not salesy |

**LinkedIn Sponsored Content Prompt Formula:**
```
[Product/service/concept] professional advertising visual,
sophisticated clean aesthetic, corporate-grade quality,
[brand colors] with professional restraint,
thought-leadership positioning, business context,
not salesy — authoritative and credible,
clean composition with space for headline,
[1:1 or 16:9] composition, LinkedIn-appropriate professional tone,
high-end commercial photography or clean illustration
```

#### InMail Banner Ads

| Spec | Value |
|------|-------|
| **Size** | 300x250 |
| **Max file size** | 2MB |
| **Format** | JPG, PNG |
| **Context** | Appears within sponsored InMail messages |

**InMail Banner Prompt:**
```
Professional display banner for B2B advertising,
[product/offer] clean commercial layout,
[brand colors], high contrast for small display,
clear single message, professional business aesthetic,
sharp rendering at 300x250 display size,
5:4 composition, advertising quality
```

#### Carousel Ads

| Spec | Value |
|------|-------|
| **Card ratio** | 1:1 (square) |
| **Card resolution** | 1080x1080 |
| **Cards** | 2-10 per carousel |
| **Card headline** | 45 characters max |
| **Strategy** | Progressive narrative — each card builds on the last |

**LinkedIn Carousel Strategy:**
```
Card 1: Industry insight or provocative stat (hook)
Card 2: The hidden problem (pain amplification)
Card 3: Your approach / methodology (differentiation)
Card 4: Results / proof points (credibility)
Card 5: CTA with clear value proposition
```

#### Document Ads

| Spec | Value |
|------|-------|
| **Format** | PDF |
| **Strategy** | Lead magnet preview — show enough value to generate leads |
| **Cover image** | First page acts as the ad creative — must be compelling |

---

### TikTok Ads

TikTok ads must feel native. Over-produced creative underperforms because it breaks the feed experience.

#### In-Feed Ads

| Spec | Value |
|------|-------|
| **Ratio** | 9:16 (vertical), 1:1 (square), 16:9 (landscape) |
| **Recommended** | 9:16 for best performance |
| **Resolution** | 1080x1920 (9:16) |
| **Video duration** | 5-60 seconds (recommend 9-15s for conversion) |
| **Safe zone — top** | Avoid top 130px (brand name, music label) |
| **Safe zone — bottom** | Avoid bottom 170px (CTA, captions, engagement buttons) |
| **Safe zone — right** | Avoid right 80px (like/comment/share icons) |
| **Usable area** | Left-center portion of middle 70% |

**TikTok In-Feed Image Prompt:**
```
[Product/service] in authentic native social media style,
NOT over-produced or corporate, real and relatable aesthetic,
vertical 9:16 full-screen composition,
subject in center-left of frame (avoiding right-side UI zone),
content in middle 70% (avoiding top and bottom UI),
bold engaging, trend-aware styling, phone-captured feeling,
high contrast, immediate visual impact,
native TikTok aesthetic, scroll-stopping
```

#### Spark Ads

Spark ads use existing organic posts as ad creative. Requirements:
- Must be a published TikTok video (organic post)
- Creator must authorize via Spark ad authorization code
- Ad inherits the organic post's engagement metrics
- Best practice: test organic first, then boost winners as Spark ads

**Spark Ad Strategy:**
```
1. Generate organic-style TikTok content
2. Publish as organic post
3. Monitor for 24-48 hours
4. Boost top performers as Spark ads
5. Creative that earns organic engagement converts better as paid
```

#### TopView Ads

| Spec | Value |
|------|-------|
| **Ratio** | 9:16 |
| **Duration** | 5-60 seconds |
| **Position** | First thing users see when opening TikTok |
| **Premium** | Highest-impact TikTok placement |
| **Creative standard** | Must be highest quality — this is a premium placement |

**TopView Prompt Addition:**
```
Add to base TikTok prompt:
"premium production value while maintaining native TikTok aesthetic,
cinematic quality blended with authentic feel,
highest-impact first impression, brand-defining visual moment"
```

---

## The 12-Ad Testing Matrix

This is the core methodology for systematic ad creative testing. Instead of guessing what works, structure your creative around a matrix that isolates variables.

### The Concept: 4 Hooks x 3 Formats = 12 Ads

Every ad needs a **hook** (what stops the scroll and compels attention) and a **format** (how the message is visually delivered). By crossing 4 hook angles with 3 visual formats, you produce 12 unique ad combinations that let you test systematically.

### Step 1: Define Your 4 Hooks

Hooks are the psychological angle that stops the scroll. Each must be genuinely different.

| Hook Type | Psychology | Example |
|-----------|-----------|---------|
| **Pain Point** | Loss aversion — people act to avoid pain | "Tired of [problem]?" / "Stop wasting [resource]" |
| **Transformation** | Before/after — show the change | "[Before state] to [after state] in [timeframe]" |
| **Social Proof** | Conformity — others validate the choice | "[Number] [people] already [benefit]" / "[Authority] recommends" |
| **Curiosity Gap** | Information gap — must know the answer | "The [category] secret [audience] won't tell you" / "Why [unexpected thing] works" |

**Advanced Hook Types (for subsequent rounds of testing):**

| Hook Type | Psychology | Example |
|-----------|-----------|---------|
| **Urgency/Scarcity** | Fear of missing out | "Only [number] left" / "Ends [date]" |
| **Contrarian** | Pattern interrupt — challenges beliefs | "Everything you know about [topic] is wrong" |
| **Specificity** | Precision signals credibility | "Exactly [specific number]% [improvement] in [timeframe]" |
| **Identity** | Self-concept — who you are/want to be | "For [identity] who [aspiration]" |

### Step 2: Define Your 3 Formats

Formats are visual structures for delivering the hook. Each must look different in the feed.

| Format | Description | Best For |
|--------|-------------|----------|
| **Product Hero** | Product prominently featured, clean background, lifestyle or studio context | Showcasing the product itself, e-commerce, physical goods |
| **UGC/Testimonial Style** | Person-centric, authentic feel, "real person" aesthetic | Building trust, service businesses, app demos |
| **Bold Typography** | Text-dominant with supporting visual, high contrast, statement-style | Offers, announcements, stat-based claims |

### Step 3: Generate the Matrix

For each cell in the matrix, define:

```
┌─────────────────┬──────────────────┬──────────────────┬──────────────────┐
│                 │ Product Hero     │ UGC/Testimonial  │ Bold Typography  │
├─────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Pain Point      │ Ad 1             │ Ad 2             │ Ad 3             │
│ Transformation  │ Ad 4             │ Ad 5             │ Ad 6             │
│ Social Proof    │ Ad 7             │ Ad 8             │ Ad 9             │
│ Curiosity Gap   │ Ad 10            │ Ad 11            │ Ad 12            │
└─────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

### Step 4: Per-Ad Specification

For each of the 12 ads, define:

```markdown
### Ad [N]: [Hook Type] x [Format]

**Hook angle:** [specific hook text/concept]
**Visual spec:** [detailed visual description for this combination]
**On-image text:** [exact text rendered in the image, 6 words or fewer]
**Headline:** [ad platform headline field, character limit per platform]
**Primary text:** [ad platform body copy field]
**CTA:** [call-to-action button text]
**Tracking name:** [systematic name for analytics: {campaign}-{hook}-{format}-v1]

**Image generation prompt:**
[Complete prompt optimized for this specific ad, referencing MODEL_REGISTRY.md payload format]

**Platform ratios to generate:**
- Meta Feed: 1:1 and 4:5
- Meta Stories: 9:16
- Google Display: 1:1 and 16:9
- LinkedIn: 1:1
- TikTok: 9:16
```

### Matrix Output Template

Generate the full matrix as a deliverable document:

```markdown
## Ad Testing Matrix: {campaign}

**Brand:** {brand name}
**Product/Service:** {what is being advertised}
**Target Audience:** {who we are reaching}
**Campaign Objective:** {awareness / consideration / conversion}
**Date Generated:** {date}

### Hook Definitions

1. **Pain Point:** "{specific pain hook for this product}"
2. **Transformation:** "{specific transformation hook}"
3. **Social Proof:** "{specific proof hook}"
4. **Curiosity Gap:** "{specific curiosity hook}"

### Format Definitions

A. **Product Hero:** {specific visual approach for this product}
B. **UGC/Testimonial:** {specific person/style for this brand}
C. **Bold Typography:** {specific typography approach matching brand kit}

---

### Ad 1: Pain Point x Product Hero
[full spec per template above]

### Ad 2: Pain Point x UGC/Testimonial
[full spec per template above]

[... continue for all 12 ...]

---

### Testing Plan

**Phase 1 (Week 1-2):** Run all 12 ads with equal budget split
**Phase 2 (Week 3-4):** Kill bottom 6, redistribute budget to top 6
**Phase 3 (Week 5+):** Generate A/B variants of top 3 performers
**Tracking:** UTM parameter = tracking_name field from each ad
```

---

## A/B Variant Generation

Once you have a winning ad concept (from the matrix or from existing performance data), generate structured variants to optimize further.

### What to Vary

Each variant should change ONE variable at a time. If you change multiple things, you cannot attribute the performance difference.

| Variable | How to Vary | Example |
|----------|-------------|---------|
| **Background color** | Same composition, different background | White bg vs. brand color bg vs. lifestyle bg |
| **Product angle** | Same scene, different product view | Front-facing vs. 45-degree vs. in-use |
| **Emotion/expression** | Same person, different mood | Smiling vs. serious vs. surprised (for UGC-style) |
| **Text treatment** | Same message, different typography | Large bold vs. subtle vs. no text |
| **Color temperature** | Same scene, different grading | Warm/golden vs. cool/blue vs. neutral |
| **Composition** | Same elements, different arrangement | Centered vs. rule-of-thirds vs. close-up |
| **CTA text** | Same visual, different call to action | "Shop Now" vs. "Learn More" vs. "Get Started" |
| **Headline** | Same visual, different headline copy | Benefit-focused vs. feature-focused vs. question |

### Variant Generation Workflow

```
Step 1: Identify the winning ad from the matrix (or provide the base concept)
Step 2: Select the variable to test
Step 3: Generate 3-5 variants of that variable
Step 4: Keep all other elements identical
Step 5: Name variants systematically: {base-name}-var-{variable}-{option}
```

### Variant Prompt Construction

When generating variants, use the SAME base prompt and modify only the variable:

**Base prompt (the winner):**
```
Product bottle on clean white marble surface, soft natural window lighting,
premium skincare advertising photography, brand blue accent colors,
text "Transform Your Skin" in bold modern sans-serif,
centered composition, 4:5 portrait, commercial quality
```

**Variant A — warm background:**
```
Product bottle on warm terracotta surface, soft golden hour lighting,
premium skincare advertising photography, brand blue accent colors,
text "Transform Your Skin" in bold modern sans-serif,
centered composition, 4:5 portrait, commercial quality
```

**Variant B — dark background:**
```
Product bottle on dark slate surface, dramatic studio lighting,
premium skincare advertising photography, brand blue accent colors,
text "Transform Your Skin" in bold modern sans-serif,
centered composition, 4:5 portrait, commercial quality
```

**Variant C — lifestyle background:**
```
Product bottle on bathroom vanity with morning light, real environment,
premium skincare advertising photography, brand blue accent colors,
text "Transform Your Skin" in bold modern sans-serif,
centered composition, 4:5 portrait, commercial quality
```

### Variant Output Template

```markdown
## A/B Variant Set: {base ad name}

**Base Ad:** {reference to the winning ad}
**Variable Being Tested:** {what is different}
**Variants Generated:** {count}

### Control (Original)
- **Image URL:** [URL]
- **Saved To:** ./campaigns/{campaign}/ads/{platform}/control.png
- **Tracking:** {campaign}-{hook}-{format}-control

### Variant A: {description of change}
- **Image URL:** [URL]
- **Saved To:** ./campaigns/{campaign}/ads/{platform}/var-a-{change}.png
- **Tracking:** {campaign}-{hook}-{format}-var-a
- **What changed:** {specific change from control}

### Variant B: {description of change}
[... same structure ...]

### Variant C: {description of change}
[... same structure ...]

---

**Test recommendation:**
- Run control + all variants with equal budget split
- Statistical significance threshold: 95% confidence
- Minimum sample: 1000 impressions per variant before judging
- Primary metric: [CTR / conversion rate / ROAS]
```

---

## Policy Compliance

Every ad platform has content policies. Violations waste time, delay campaigns, and can get accounts restricted. Run through the applicable checklist BEFORE generating creative.

### Meta Ad Policy Checklist

Before submitting any ad to Meta (Facebook/Instagram):

```
CONTENT RESTRICTIONS
- [ ] No "before and after" images that depict unlikely results
- [ ] No personal attributes assertion ("You are overweight" — instead: "Looking to get fit?")
- [ ] No misleading claims about product capabilities
- [ ] No implied endorsement by Meta/Facebook/Instagram
- [ ] No discriminatory content (race, ethnicity, gender, age, disability, etc.)
- [ ] No sensational or shocking content designed to provoke

HEALTH & WELLNESS
- [ ] No unrealistic health claims ("Lose 30lbs in 7 days")
- [ ] No before/after body images for weight loss
- [ ] No claims about curing diseases
- [ ] Supplement ads include proper disclaimers

FINANCIAL
- [ ] No guaranteed financial returns ("Make $10,000/month guaranteed")
- [ ] No misleading income claims
- [ ] Crypto/financial ads follow regional regulations

IMAGE QUALITY
- [ ] Text overlay below 20% of image area (not policy but affects delivery)
- [ ] No excessive skin exposure beyond platform norms
- [ ] No violent, graphic, or disturbing imagery
- [ ] Image is not misleading about the product/service

VIDEO
- [ ] No disruptive audio (sudden volume, jarring sounds) for auto-play
- [ ] Closed captions recommended (many users watch with sound off)

LANDING PAGE
- [ ] Ad creative matches landing page content (no bait-and-switch)
- [ ] Landing page is functional and matches ad claims
```

### Google Ads Policy Checklist

```
CONTENT RESTRICTIONS
- [ ] No misleading content or false claims
- [ ] No counterfeit goods promotion
- [ ] No dangerous products or services (without proper certification)
- [ ] No inappropriate content (shocking, hateful, exploitative)
- [ ] No unrealistic promises

EDITORIAL STANDARDS
- [ ] Correct spelling and grammar in all text
- [ ] No excessive capitalization ("FREE AMAZING DEAL TODAY")
- [ ] No gimmicky use of symbols or punctuation ("$$$ Save Big $$$")
- [ ] No vague CTAs ("Click here" — instead: specific value proposition)
- [ ] Display URL matches landing page domain

IMAGE QUALITY (Display Ads)
- [ ] Images are clear and sharp at display size
- [ ] No blurry, distorted, or pixelated images
- [ ] No strobing, flashing, or distracting animation
- [ ] Image fills the ad space (no excessive white space with tiny centered image)
- [ ] Text in image is legible at actual display size

RESPONSIVE DISPLAY
- [ ] Images do not contain text (Google overlays text dynamically)
- [ ] Product is the clear focal point
- [ ] Background is clean enough for dynamic text overlay
- [ ] Works at multiple sizes without critical content being cropped
```

### LinkedIn Ads Policy Checklist

```
PROFESSIONAL STANDARDS
- [ ] Content appropriate for professional context
- [ ] No sensational or clickbait-style creative
- [ ] Tone is authoritative, not aggressive or pushy
- [ ] Avoids hyperbole ("The BEST product EVER created")

ACCURACY
- [ ] Claims are verifiable and accurate
- [ ] Statistics include source attribution
- [ ] Testimonials are from real, identifiable people (or clearly marked as illustrative)
- [ ] Job ads comply with employment advertising laws

IMAGE STANDARDS
- [ ] Professional quality imagery
- [ ] No stock photos with watermarks
- [ ] No overly edited or unrealistic imagery
- [ ] No provocative or inappropriate imagery for professional context

B2B SPECIFIC
- [ ] Company claims are verifiable
- [ ] No implied LinkedIn endorsement
- [ ] ROI/performance claims include methodology or footnote
```

### TikTok Ads Policy Checklist

```
AUTHENTICITY
- [ ] Creative feels native to TikTok (not repurposed TV/Facebook ads)
- [ ] No misleading content or fake interactivity (fake "close" buttons, fake UI elements)
- [ ] No unauthorized use of TikTok branding or interface elements

CONTENT RESTRICTIONS
- [ ] No unrealistic beauty/body standards being promoted
- [ ] No dangerous stunts or challenges
- [ ] No misleading pricing (hidden fees, unclear terms)
- [ ] No weight loss claims with unrealistic promises
- [ ] Meets age-gating requirements for restricted categories

DISCLOSURE
- [ ] AI-generated content clearly labeled where required by law
- [ ] Sponsored/partnership content properly disclosed
- [ ] Influencer/creator relationships transparently identified
- [ ] Testimonials clearly marked as paid if applicable

CREATIVE QUALITY
- [ ] Audio quality acceptable (no distortion, no copyrighted music without license)
- [ ] No watermarks from other platforms (Instagram logo, YouTube logo)
- [ ] No low-resolution or heavily compressed visuals
```

### Universal AI-Generated Content Disclosure

When using AI-generated imagery in ads, follow these disclosure guidelines:

```
REQUIRED BY PLATFORM (evolving — check current rules):
- Meta: AI-generated content may require "Made with AI" label
- TikTok: Synthetic media policies require disclosure
- Google: Follow Google Ads AI content policies
- LinkedIn: Transparency expected for AI-generated visuals

BEST PRACTICE (regardless of platform requirements):
- Include "Image generated with AI" in ad description when using AI-generated visuals
- For AI-generated people/testimonials: clearly indicate they are AI-generated
- Never use AI-generated imagery to fabricate endorsements from real people
- Keep records of all AI-generated assets and the prompts used to create them
```

---

## Platform-Specific Prompt Templates

### Meta Feed Ad — Product Hero

```
[Product] commercial advertising photography for Instagram/Facebook feed ad,
product prominently displayed in [lifestyle/studio] setting,
[brand colors] color scheme, clean professional composition,
soft professional lighting, commercial product photography,
space in [top/bottom] for headline overlay text,
scroll-stopping visual impact, high-end advertising quality,
4:5 portrait composition, sharp focus on product,
background [clean/lifestyle context], premium brand positioning
```

### Meta Feed Ad — UGC/Testimonial Style

```
Authentic-feeling social media content for Facebook/Instagram feed ad,
person [demographic] genuinely using/holding [product],
natural casual lighting, real-life setting,
relatable and trustworthy aesthetic, not over-produced,
candid moment captured naturally, warm authentic feel,
4:5 portrait composition, user-generated content style,
person looking at camera or product, genuine expression,
lifestyle context that matches target audience
```

### Meta Feed Ad — Bold Typography

```
Bold text-driven advertising graphic for Facebook/Instagram feed,
text "[HOOK TEXT — 6 words max]" in [bold/condensed/impact] font,
[brand colors] background, high contrast typography,
supporting visual element [product silhouette/abstract/pattern],
text dominates the frame, clean readable design,
commercial advertising quality, strong visual hierarchy,
1:1 square composition, professional graphic design aesthetic
```

### Meta Stories Ad

```
[Product/subject] for Instagram/Facebook Stories ad placement,
vertical 9:16 full-screen immersive composition,
content centered in middle 76% of frame,
avoiding top 14% (UI overlay) and bottom 10% (CTA button),
[brand colors], bold engaging visual, native stories aesthetic,
swipe-up ready with clear visual flow downward,
commercial quality blended with platform-native feel,
immediate impact in first moment of viewing
```

### Google Responsive Display Ad

```
[Product/service] clean commercial photography for Google display network,
NO text overlays (Google adds text dynamically),
product as clear focal point with clean background,
[brand colors] in product and setting only,
professional studio-quality lighting, advertising grade,
works when cropped to various aspect ratios,
sharp focus, high contrast, clean edges,
[1:1 or 16:9] composition, white or neutral background
```

### Google Display Banner (Leaderboard)

```
[Product/service] horizontal banner advertisement layout,
ultra-wide panoramic composition, product on [left/right],
open space on opposite side for text overlay,
[brand colors], high contrast for small display rendering,
must read clearly at 728x90 pixel display size,
clean sharp professional commercial design,
21:9 ultrawide composition, advertising banner quality
```

### LinkedIn Sponsored Content

```
[Product/service/concept] professional B2B advertising visual,
sophisticated clean aesthetic appropriate for LinkedIn,
[brand colors] with professional restraint,
thought-leadership positioning, business credibility,
not pushy or salesy — authoritative and valuable,
clean composition with space for headline copy,
1:1 square composition, corporate-appropriate professional tone,
high-end commercial photography or clean modern illustration
```

### TikTok In-Feed Ad

```
[Product/service] in authentic TikTok-native style,
NOT corporate or over-produced, real and relatable,
vertical 9:16 full-screen composition,
subject center-left of frame (right side has UI icons),
content in middle 70% (top and bottom have UI overlays),
bold engaging, trend-aware contemporary styling,
phone-camera aesthetic with good lighting,
high contrast, immediate scroll-stopping impact,
feels like organic content, not a traditional advertisement
```

---

## Video Ad Specifications

### Meta Video Ads

| Placement | Ratio | Duration | Notes |
|-----------|-------|----------|-------|
| Feed | 1:1, 4:5, 16:9 | 1-240s (recommend 15-30s) | Auto-plays muted; lead with visual hook |
| Stories/Reels | 9:16 | 1-120s (recommend 5-15s) | Full-screen vertical; capture attention in first 3s |
| In-stream | 16:9 | 5-15s (non-skippable) or 15-600s (skippable) | Hook in first 5 seconds is critical |

### Google/YouTube Video Ads

| Format | Duration | Skippable | Notes |
|--------|----------|-----------|-------|
| Bumper | 6 seconds | No | One message, one visual — tight and focused |
| Pre-roll | 15-30s | After 5s | Must hook before skip button appears |
| Mid-roll | 15-60s | After 5s | Users more engaged (already watching content) |
| Discovery | N/A | N/A | Thumbnail + headline drives click-through |

### TikTok Video Ads

| Format | Duration | Notes |
|--------|----------|-------|
| In-Feed | 5-60s | Recommend 9-15s; hook in first 2 seconds |
| TopView | 5-60s | Premium placement; higher production value |
| Branded Effect | Variable | Interactive AR filters/effects |

### Video Ad Prompt Construction (Image-to-Video)

When generating video ads from still images, reference MODEL_REGISTRY.md for the correct I2V payload:

```
Step 1: Generate the key frame using image prompt templates above
Step 2: Write a MOTION prompt (describe what moves, not the static scene):

Good motion prompt:
"Product slowly rotates to reveal label, camera gently pulls back,
soft particles float in background, lighting subtly shifts warmer"

Bad motion prompt:
"A bottle of skincare product on a marble surface with nice lighting"
(This describes the scene, not the motion — the model can already see the image)

Step 3: Choose video model from MODEL_REGISTRY.md based on content type:
- Standard ads: Kling 2.5 (default, fastest, most cost-effective)
- Hero/flagship: Run Kling 2.5 + Veo 3.1 + Sora 2 in parallel

Step 4: Set duration:
- Bumper ads: 5s (Kling) or 6s (Veo)
- Standard ads: 5-10s (Kling) or 8s (Veo/Sora)

Step 5: Set aspect ratio:
- Feed: "16:9" or "1:1" (Kling/Veo) / "landscape" (Sora)
- Stories/Reels/TikTok: "9:16" (Kling/Veo) / "portrait" (Sora)
```

---

## Ad Creative for Advantage+ and Performance Max

Meta's Advantage+ and Google's Performance Max use machine learning to assemble and optimize creative from supplied assets. Generating assets for these systems requires a different approach than standard ad creative.

### Asset Supply Strategy

Instead of generating one "perfect" ad, generate a library of components:

```
IMAGE ASSETS (generate all of these):
├── Product shots (3-5 variants)
│   ├── Clean white background — 1:1
│   ├── Lifestyle context — 4:5
│   ├── Close-up detail — 1:1
│   ├── In-use / action — 4:5
│   └── Flat lay / group — 1:1
│
├── Lifestyle / contextual (3-5 variants)
│   ├── Target audience using product — 4:5
│   ├── Environmental / setting shot — 16:9
│   └── Aspirational outcome — 4:5
│
├── Bold graphic variants (2-3 variants)
│   ├── Stat/number highlighted — 1:1
│   ├── Testimonial quote — 1:1
│   └── Offer/promotion — 1:1
│
└── All images at MULTIPLE ratios:
    ├── 1:1 (Meta feed, Google display, LinkedIn)
    ├── 4:5 (Meta feed optimal, maximum real estate)
    ├── 9:16 (Stories, Reels, TikTok)
    └── 16:9 (Google display, YouTube)

TEXT ASSETS (write all of these):
├── Short headlines (5): 30 chars max each, varied hooks
├── Long headlines (5): 90 chars max each, expanded value props
├── Descriptions (5): 90 chars max each, different benefits
├── Primary text (5): 125 chars max each, varied angles
└── CTA options: ["Shop Now", "Learn More", "Get Started", "Sign Up", "Book Now"]
```

### Key Rules for Algorithm-Optimized Creative

1. **No text in images** for responsive/automated placements — the algorithm adds text
2. **Multiple ratios** per concept — let the algorithm choose the best placement
3. **Visual diversity** — give the algorithm options to test, not 5 near-identical images
4. **Clean backgrounds** — automated text overlay needs space and contrast to be legible
5. **Product as focal point** — cropping at various ratios should not lose the product

---

## Style Exploration for Ad Creative

Before generating a full 12-ad matrix, explore visual directions. Ad creative has different style requirements than organic content.

### Ad-Specific Style Exploration

```
Direction 1: Clean Commercial — Studio lighting, white/neutral backgrounds,
product-focused, premium but approachable, classic advertising look

Direction 2: Lifestyle Native — Real-world context, natural lighting,
in-use scenarios, feels like editorial content rather than ad

Direction 3: Bold Graphic — Strong typography, graphic design-forward,
high contrast color blocks, statement-making, text-dominant

Direction 4: Social Proof Led — Person-centric, testimonial-style,
authentic UGC aesthetic, trustworthy, relatable

Direction 5: Category Disruptor — Breaks conventions of your category's
typical ad style, unexpected visual language, pattern interrupt
```

### Style Decision for Ads

| If your goal is... | Start with... | Why |
|---------------------|---------------|-----|
| E-commerce conversions | Clean Commercial | Product clarity drives purchase |
| Brand awareness | Category Disruptor | Standing out drives memory |
| Lead generation | Social Proof Led | Trust drives form fills |
| App installs | Lifestyle Native | Context shows value |
| Retargeting | Bold Graphic | Direct offer, no subtlety needed |

---

## Execution Workflow

### Full Campaign Workflow

```
Step 1: BRAND CONTEXT
├── Read ./brand/creative-kit.md
├── Load brand colors, typography, style direction
├── Identify product/service being advertised
└── Confirm campaign objective (awareness/consideration/conversion)

Step 2: DEFINE TARGET PLATFORMS
├── Which platforms? (Meta, Google, LinkedIn, TikTok)
├── Which placements per platform?
├── Budget allocation across platforms
└── Confirm aspect ratios needed per placement

Step 3: STYLE EXPLORATION (if new campaign)
├── Generate 5 visual directions
├── User selects direction or combines elements
├── Lock style principles for the campaign
└── Document in campaign brief

Step 4: DEFINE HOOKS
├── Write 4 hook angles specific to the product/audience
├── Pain Point: [specific]
├── Transformation: [specific]
├── Social Proof: [specific]
└── Curiosity Gap: [specific]

Step 5: GENERATE 12-AD MATRIX
├── 4 hooks x 3 formats = 12 unique ads
├── Each ad: prompt, on-image text, headline, primary text, CTA, tracking name
├── Generate at primary ratio first (usually 4:5 for Meta)
├── Generate platform-specific ratio variants for each winning ad
└── Batch generate using parallel task agents

Step 6: POLICY COMPLIANCE CHECK
├── Run applicable platform policy checklist
├── Flag any potential violations
├── Adjust creative before submission
└── Document compliance review

Step 7: ORGANIZE DELIVERABLES
├── Save to ./campaigns/{campaign}/ads/{platform}/
├── Generate ad matrix document
├── Include tracking names for analytics setup
└── Package for upload to each platform

Step 8: A/B VARIANT GENERATION (after initial results)
├── Identify top 3 performers from matrix
├── Select variable to test for each
├── Generate 3-5 variants per winner
└── Name systematically for tracking
```

### Quick Workflow: Single Platform Ad

```
1. Load brand kit
2. Identify platform + placement
3. Select hook and format
4. Generate using platform-specific prompt template
5. Run policy checklist
6. Save to campaign directory
7. Provide ad copy (headline, primary text, CTA)
```

### Quick Workflow: Multi-Platform Adaptation

```
1. Generate primary ad for primary platform (usually Meta Feed)
2. Approve the creative concept
3. Adapt for each additional platform:
   - Adjust aspect ratio
   - Modify safe zones in prompt
   - Adjust visual language for platform culture
   - Adjust policy compliance per platform
4. Save all variants to platform-specific directories
```

---

## File Output Structure

### Directory Convention

```
./campaigns/{campaign-name}/ads/
├── matrix/
│   └── ad-testing-matrix.md          # The 12-ad matrix document
│
├── meta/
│   ├── feed/
│   │   ├── {hook}-{format}-1x1-v1.png
│   │   ├── {hook}-{format}-4x5-v1.png
│   │   └── ...
│   ├── stories/
│   │   ├── {hook}-{format}-9x16-v1.png
│   │   └── ...
│   ├── carousel/
│   │   ├── card-1-hook-1x1.png
│   │   ├── card-2-problem-1x1.png
│   │   └── ...
│   └── video/
│       ├── {hook}-{format}-4x5-v1.mp4
│       └── ...
│
├── google/
│   ├── display/
│   │   ├── {concept}-300x250.png
│   │   ├── {concept}-728x90.png
│   │   ├── {concept}-160x600.png
│   │   └── ...
│   ├── responsive/
│   │   ├── {concept}-landscape-16x9.png
│   │   ├── {concept}-square-1x1.png
│   │   └── ...
│   └── youtube/
│       ├── thumbnail-{concept}-16x9.png
│       └── ...
│
├── linkedin/
│   ├── sponsored/
│   │   ├── {concept}-landscape-16x9.png
│   │   ├── {concept}-square-1x1.png
│   │   └── ...
│   ├── inmail/
│   │   └── banner-{concept}-300x250.png
│   └── carousel/
│       ├── card-1-{concept}-1x1.png
│       └── ...
│
├── tiktok/
│   ├── in-feed/
│   │   ├── {hook}-{format}-9x16-v1.png
│   │   └── ...
│   └── video/
│       ├── {hook}-{format}-9x16-v1.mp4
│       └── ...
│
├── variants/
│   ├── {base-ad}-var-a-{change}.png
│   ├── {base-ad}-var-b-{change}.png
│   └── ...
│
└── exports/
    └── {platform}-upload-ready/      # Final packaged per platform
```

### File Naming Convention

```
{hook-type}-{format-type}-{ratio}-v{version}.{ext}

Examples:
  pain-product-hero-4x5-v1.png
  transform-ugc-style-9x16-v1.png
  social-proof-bold-type-1x1-v1.png
  curiosity-product-hero-16x9-v1.png
  pain-product-hero-4x5-var-a-warm-bg.png
  transform-ugc-style-9x16-var-b-diff-person.png
```

### Tracking Name Convention

Every ad gets a systematic tracking name for analytics:

```
{campaign}-{hook}-{format}-{platform}-v{version}

Examples:
  skincare-q1-pain-hero-meta-v1
  skincare-q1-transform-ugc-meta-v1
  skincare-q1-proof-bold-google-v1
  skincare-q1-curiosity-hero-tiktok-v1
  skincare-q1-pain-hero-meta-var-a
```

Use these as UTM campaign parameters, ad names in platform dashboards, and file identifiers.

---

## Cross-Platform Adaptation Rules

When the same ad concept needs to work across platforms, adapt rather than simply resize.

### Meta to Google

| Change | Why |
|--------|-----|
| Remove baked-in text for responsive display ads | Google overlays text dynamically |
| Increase contrast and sharpness | Display ads render at small sizes |
| Simplify composition | Must read at 300x250 or smaller |
| Generate at multiple fixed sizes | Google display needs specific pixel dimensions |

### Meta to LinkedIn

| Change | Why |
|--------|-----|
| Tone down aggressive urgency | Professional audience rejects pushy |
| Replace emotional hooks with data/insight hooks | LinkedIn values substance |
| Shift from lifestyle to business context | Professional environment |
| Increase sophistication of visual treatment | LinkedIn expects polished |

### Meta to TikTok

| Change | Why |
|--------|-----|
| Reduce production polish | Over-produced = ad blindness on TikTok |
| Shift to phone-camera aesthetic | Native content outperforms |
| Move subject center-left | Right side has UI icons |
| Adjust safe zones | Different UI overlay zones than Meta Stories |
| Lead with movement/personality | Static polished images underperform |

### Google to Meta

| Change | Why |
|--------|-----|
| Add text overlays (keep under 20%) | Meta allows and benefits from headline text |
| Increase emotional appeal | Social feed rewards emotional response |
| Shift from product-only to lifestyle | Social context drives engagement |
| Expand from standard sizes to social ratios | 4:5, 9:16 instead of 300x250 |

### LinkedIn to TikTok (extreme adaptation)

| Change | Why |
|--------|-----|
| Complete visual language shift | Opposite ends of the formality spectrum |
| Replace authority positioning with authenticity | TikTok values realness over credibility |
| Shift from business value to personal benefit | Different motivation framework |
| Move from polished to raw aesthetic | TikTok native style |

---

## Ad Copy Integration

Each ad creative needs accompanying copy. Generate these text assets alongside the visual.

### Meta Ad Copy Fields

```markdown
**Primary Text (125 chars for first line before "See More"):**
[Hook that stops the scroll — same angle as the visual hook]

**Headline (40 chars recommended):**
[Benefit-driven, specific, no clickbait]

**Description (30 chars):**
[Supporting detail or urgency element]

**CTA Button:**
[Shop Now / Learn More / Sign Up / Book Now / Download / Get Offer]
```

### Google Ad Copy Fields

```markdown
**Short Headlines (30 chars max each, provide 5):**
1. [Benefit-focused]
2. [Feature-focused]
3. [Social proof]
4. [Question/curiosity]
5. [Direct CTA]

**Long Headlines (90 chars max each, provide 2):**
1. [Expanded value proposition]
2. [Problem-solution format]

**Descriptions (90 chars max each, provide 5):**
1. [Primary benefit]
2. [Feature detail]
3. [Social proof / authority]
4. [Urgency / offer]
5. [Different audience angle]
```

### LinkedIn Ad Copy Fields

```markdown
**Introductory Text (600 chars max, recommend 150):**
[Insight-led opening, professional tone, value proposition]

**Headline (70 chars recommended):**
[Outcome-focused, professional, no hype]

**Description (100 chars):**
[Supporting proof or detail]

**CTA Button:**
[Learn More / Download / Sign Up / Register / Apply Now]
```

### TikTok Ad Copy Fields

```markdown
**Ad Text (100 chars for best engagement):**
[Short, punchy, native voice, emoji OK, trend-aware]

**Display Name:**
[Brand name or campaign-specific handle]

**CTA Button:**
[Shop Now / Learn More / Sign Up / Download / Book Now]
```

---

## Batch Generation Pattern

For producing a full 12-ad matrix efficiently, use parallel generation.

### Parallel Generation Strategy

```
Wave 1 (Ads 1-4): Pain Point hook x all 3 formats + 1 extra
├── Task 1: Pain Point x Product Hero — generate at 4:5
├── Task 2: Pain Point x UGC/Testimonial — generate at 4:5
├── Task 3: Pain Point x Bold Typography — generate at 1:1
├── Task 4: Transformation x Product Hero — generate at 4:5
[Wait for wave 1 to complete — review quality]

Wave 2 (Ads 5-8): Remaining Transformation + Social Proof
├── Task 5: Transformation x UGC/Testimonial — generate at 4:5
├── Task 6: Transformation x Bold Typography — generate at 1:1
├── Task 7: Social Proof x Product Hero — generate at 4:5
├── Task 8: Social Proof x UGC/Testimonial — generate at 4:5
[Wait for wave 2 to complete — review quality]

Wave 3 (Ads 9-12): Remaining Social Proof + Curiosity Gap
├── Task 9: Social Proof x Bold Typography — generate at 1:1
├── Task 10: Curiosity Gap x Product Hero — generate at 4:5
├── Task 11: Curiosity Gap x UGC/Testimonial — generate at 4:5
├── Task 12: Curiosity Gap x Bold Typography — generate at 1:1
[Wait for wave 3 to complete — review quality]

Wave 4 (Ratio Variants): Top performers at additional ratios
├── Generate top 6 ads at 1:1 (if primary was 4:5)
├── Generate top 6 ads at 9:16 (Stories/TikTok)
├── Generate top 6 ads at 16:9 (YouTube/Google)
└── Generate Google Display sizes for top 3
```

### Batch Cost Estimate

| Scope | Asset Count | Estimated Cost | Estimated Time |
|-------|-------------|---------------|----------------|
| 12-ad matrix (primary ratio only) | 12 images | ~$0.36-0.48 | ~3-5 min |
| 12-ad matrix + 3 additional ratios | 48 images | ~$1.44-1.92 | ~10-15 min |
| Matrix + ratio variants + A/B variants (3 per top 3) | ~60 images | ~$1.80-2.40 | ~12-18 min |
| Full production (matrix + variants + video ads) | ~70 images + 6 videos | ~$5-10 | ~20-30 min |

---

## Integration with Creative Engine

```
AD CREATIVE PIPELINE

┌─────────────────────────────────────────┐
│  Request: "ad creative" / "paid ads"    │
│  -> Route from creative/SKILL.md       │
└─────────────────────────────────────────┘
                    │
                    v
┌─────────────────────────────────────────┐
│  LOAD BRAND CONTEXT                     │
│  -> Read ./brand/creative-kit.md       │
│  -> Extract brand colors, style, tone  │
│  -> Identify product/service           │
│  -> Confirm campaign objective         │
└─────────────────────────────────────────┘
                    │
                    v
┌─────────────────────────────────────────┐
│  ad-creative mode (THIS FILE)           │
│  -> Define target platforms            │
│  -> Run style exploration (if new)     │
│  -> Build 4 hooks for this product     │
│  -> Generate 12-ad testing matrix      │
│  -> Generate platform ratio variants   │
│  -> Run policy compliance checks       │
│  -> Save all to campaign directory     │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        v           v           v
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ Static Ads   │ │ Video Ads│ │ Copy Package │
│ -> Nano      │ │ -> Kling │ │ -> Headlines │
│    Banana    │ │    2.5   │ │ -> Primary   │
│    Pro for   │ │    for   │ │    text      │
│    all       │ │  default │ │ -> CTAs      │
│    stills    │ │ -> Hero: │ │ -> Per       │
│              │ │  parallel│ │   platform   │
│              │ │  3-model │ │              │
└──────────────┘ └──────────┘ └──────────────┘
        │           │           │
        v           v           v
┌─────────────────────────────────────────┐
│  DELIVERABLES                           │
│  -> ./campaigns/{campaign}/ads/        │
│  -> Ad testing matrix document         │
│  -> Platform-organized assets          │
│  -> Tracking names for analytics       │
│  -> A/B variant sets (post-results)    │
└─────────────────────────────────────────┘
```

---

## Handoff Protocols

### Receiving from creative/SKILL.md

```yaml
Receive:
  campaign_name: "{campaign identifier}"
  product_or_service: "{what is being advertised}"
  target_audience: "{who the ads are reaching}"
  campaign_objective: "awareness / consideration / conversion"
  platforms: ["Meta", "Google", "LinkedIn", "TikTok"]
  budget_level: "low / medium / high"
  existing_creative: "{path to any existing creative to reference}"
  brand_kit: "./brand/creative-kit.md"
  specific_offer: "{if promoting a specific offer/discount}"
  competitor_ads: "{any competitor ad references}"
```

### Returning

```yaml
Return:
  status: "complete"
  matrix_document: "./campaigns/{campaign}/ads/matrix/ad-testing-matrix.md"
  deliverables:
    meta:
      feed: ["./campaigns/{campaign}/ads/meta/feed/{files}"]
      stories: ["./campaigns/{campaign}/ads/meta/stories/{files}"]
    google:
      display: ["./campaigns/{campaign}/ads/google/display/{files}"]
      responsive: ["./campaigns/{campaign}/ads/google/responsive/{files}"]
    linkedin:
      sponsored: ["./campaigns/{campaign}/ads/linkedin/sponsored/{files}"]
    tiktok:
      in_feed: ["./campaigns/{campaign}/ads/tiktok/in-feed/{files}"]
  ad_copy_package:
    meta: "{headlines, primary text, descriptions, CTAs}"
    google: "{short headlines, long headlines, descriptions}"
    linkedin: "{intro text, headline, description}"
    tiktok: "{ad text, CTA}"
  tracking_names: ["{list of all tracking names for analytics setup}"]
  variant_sets_available: true
  policy_review: "passed / flagged items: [list]"
  total_assets_generated: "{count}"
  estimated_cost: "{total generation cost}"
```

### Receiving from Other Skills

The ad creative mode can receive briefs from:

```yaml
# From brand-voice skill
voice_direction:
  tone: "{brand tone for ad copy}"
  vocabulary: "{preferred/avoided words}"
  messaging_pillars: ["{key messages}"]

# From direct-response-copy skill
copy_brief:
  hooks: ["{pre-written hooks to use}"]
  value_propositions: ["{key selling points}"]
  social_proof_points: ["{testimonials, stats, awards}"]
  offers: ["{specific offers with terms}"]

# From positioning-angles skill
positioning:
  primary_angle: "{main positioning}"
  differentiators: ["{what makes this unique}"]
  competitor_weaknesses: ["{gaps to exploit}"]
  audience_pain_points: ["{validated pain points}"]
```

---

## Output Format

### Single Ad Output

```markdown
## Ad Generated

**Platform:** [platform]
**Placement:** [feed/stories/display/etc.]
**Aspect Ratio:** [ratio]
**Hook:** [hook type]
**Format:** [format type]

**Image URL:** [URL]
**Saved To:** ./campaigns/{campaign}/ads/{platform}/{placement}/{filename}.png

**On-Image Text:** [text rendered in the image]
**Headline:** [platform headline field]
**Primary Text:** [body copy]
**CTA:** [button text]
**Tracking Name:** [systematic tracking name]

**Policy Check:**
- [x] Content compliant
- [x] No misleading claims
- [x] Proper disclosure
- [x] Image quality meets platform standards

**Feedback?**
- Does the hook stop your scroll?
- Does the visual match the hook angle?
- Generate variants of this concept?
- Adapt to additional platforms?
```

### Full Matrix Output

```markdown
## Ad Testing Matrix Generated

**Campaign:** {campaign-name}
**Product:** {product/service}
**Platforms:** {list}
**Total Ads:** 12 (4 hooks x 3 formats)
**Total Assets:** {count including ratio variants}
**Estimated Generation Cost:** {cost}

### Matrix Overview

| # | Hook | Format | Primary Ratio | Tracking Name |
|---|------|--------|--------------|---------------|
| 1 | Pain Point | Product Hero | 4:5 | {tracking} |
| 2 | Pain Point | UGC/Testimonial | 4:5 | {tracking} |
| 3 | Pain Point | Bold Typography | 1:1 | {tracking} |
| 4 | Transformation | Product Hero | 4:5 | {tracking} |
| 5 | Transformation | UGC/Testimonial | 4:5 | {tracking} |
| 6 | Transformation | Bold Typography | 1:1 | {tracking} |
| 7 | Social Proof | Product Hero | 4:5 | {tracking} |
| 8 | Social Proof | UGC/Testimonial | 4:5 | {tracking} |
| 9 | Social Proof | Bold Typography | 1:1 | {tracking} |
| 10 | Curiosity Gap | Product Hero | 4:5 | {tracking} |
| 11 | Curiosity Gap | UGC/Testimonial | 4:5 | {tracking} |
| 12 | Curiosity Gap | Bold Typography | 1:1 | {tracking} |

### All Assets

**Matrix Document:** ./campaigns/{campaign}/ads/matrix/ad-testing-matrix.md
**Meta Assets:** ./campaigns/{campaign}/ads/meta/
**Google Assets:** ./campaigns/{campaign}/ads/google/
**LinkedIn Assets:** ./campaigns/{campaign}/ads/linkedin/
**TikTok Assets:** ./campaigns/{campaign}/ads/tiktok/

### Testing Recommendation

Phase 1: Run all 12 with equal budget (1-2 weeks)
Phase 2: Kill bottom 6, redistribute to top 6 (1-2 weeks)
Phase 3: A/B variants of top 3 performers (ongoing)

### Next Steps
- [ ] Upload assets to platform ad managers
- [ ] Set up tracking with provided tracking names
- [ ] Configure A/B tests
- [ ] Request A/B variants after Phase 1 results
```

---

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Text too large / covers too much image | Prompt does not constrain text size | Add "small subtle text" or "text in lower third only" |
| Ad looks like organic content, not an ad | Missing commercial quality markers | Add "commercial advertising photography, professional" |
| Ad looks too much like a traditional ad | Over-produced for platform | Add "native, authentic, blended with organic content" |
| Policy rejection for text-to-image ratio | Too much text baked into image | Reduce on-image text to 6 words max, use ad platform text fields instead |
| Google responsive ad has text collision | Text baked into image + Google overlay | Generate clean images WITHOUT text for responsive placements |
| Safe zone violation | Content in UI overlay area | Specify safe zone avoidance explicitly in the prompt |
| All 12 matrix ads look similar | Not enough variation between formats | Make Product Hero, UGC, and Bold Typography genuinely different visual approaches |
| A/B variants change too many things | Multiple variables changed at once | Strictly change ONE element per variant |
| TikTok ad feels like a Facebook ad | Same visual language across platforms | Rewrite prompt with TikTok-native aesthetic descriptors |
| LinkedIn ad too aggressive | Consumer marketing tone in B2B context | Shift to insight-led, authoritative, non-pushy language |
| Display ads unreadable at small sizes | Composition too complex | Simplify to ONE focal point and high contrast |
| Tracking names inconsistent | No naming convention followed | Use: {campaign}-{hook}-{format}-{platform}-v{version} |

---

## Tips from Experience

### What Works
1. **Matrix over random** — structured testing reveals patterns that random creation cannot
2. **Hook variation matters most** — the psychological angle of the hook drives more performance difference than visual format
3. **Native over polished on social** — especially TikTok and Instagram Stories
4. **Text outside the image** — use platform text fields rather than baking text into images, especially for Advantage+ and Performance Max
5. **Multiple ratios from the start** — generating at one ratio then cropping produces worse results than generating natively at each ratio
6. **Policy check before generation** — cheaper to adjust a prompt than regenerate a rejected ad
7. **Tracking names from day one** — you cannot optimize what you cannot measure
8. **Parallel generation** — batch producing the full matrix is faster and cheaper than one-at-a-time

### What Does Not Work
1. **One ad, one platform** — the minimum viable test is 4 ads (4 hooks x 1 format)
2. **Resizing instead of adapting** — a great Meta ad is a bad TikTok ad if you just resize it
3. **Ignoring safe zones** — your headline covered by the CTA button is a wasted impression
4. **Testing everything at once** — change one variable per A/B test or learn nothing
5. **Skipping the brand kit** — inconsistent visual identity across ads looks unprofessional
6. **Generic hooks** — "Check this out!" is not a hook. Be specific to the audience pain/desire
7. **Copy/paste across platforms** — what is professional on LinkedIn is boring on TikTok
8. **Perfect is the enemy of tested** — a shipped 12-ad matrix beats a single "perfect" ad that took three weeks

### The 80/20

80% of ad creative performance comes from:
1. **The right hook** for the right audience
2. **Platform-native visual language** (not resized generic creative)
3. **Clean product/value clarity** (viewers know what they are looking at instantly)
4. **Systematic testing** (structured matrix, not random guessing)

Get these four right and your paid creative will outperform most competitors regardless of budget.

---

## Quick Reference: Common Workflows

### "Generate ads for my product across all platforms"

```
1. Load brand kit
2. Define 4 hooks specific to the product
3. Generate 12-ad matrix (4 hooks x 3 formats)
4. Primary generation at Meta Feed ratio (4:5)
5. Generate ratio variants for each platform
6. Run policy checklists per platform
7. Write ad copy per platform
8. Save to ./campaigns/{campaign}/ads/{platform}/
9. Deliver matrix document with tracking names
```

### "I need Meta ads specifically"

```
1. Load brand kit
2. Define 4 hooks
3. Generate 12-ad matrix at 4:5 (feed) and 9:16 (stories)
4. Run Meta policy checklist
5. Write primary text, headlines, descriptions, CTAs
6. Save to ./campaigns/{campaign}/ads/meta/
7. Include Advantage+ asset variants if requested
```

### "Generate Google Display ads"

```
1. Load brand kit
2. Generate at priority sizes: 300x250, 728x90, 160x600
3. Use clean product images WITHOUT text for responsive
4. Generate at 1:1 and 16:9 for responsive display
5. Run Google policy checklist
6. Write short/long headlines and descriptions
7. Save to ./campaigns/{campaign}/ads/google/display/
```

### "Create TikTok ad creative"

```
1. Load brand kit
2. Define hooks (emphasize authenticity/relatability over authority)
3. Generate at 9:16 with TikTok-native aesthetic
4. Ensure safe zones are respected (top, bottom, right)
5. Run TikTok policy checklist
6. Write punchy, native-voice ad text
7. Save to ./campaigns/{campaign}/ads/tiktok/in-feed/
8. Consider video ads for best TikTok performance
```

### "Generate A/B variants of my winning ad"

```
1. Identify the winning ad and its exact prompt
2. Decide which variable to test (background, angle, text, color, etc.)
3. Generate 3-5 variants changing ONLY that variable
4. Keep all other prompt elements identical
5. Name with variant convention: {base}-var-{letter}-{change}
6. Save to ./campaigns/{campaign}/ads/variants/
7. Set up tracking for each variant
```

### "I need an ad for a specific platform and placement"

```
1. Load brand kit
2. Look up platform specs in this file (ratios, safe zones, policies)
3. Select hook and format
4. Use the platform-specific prompt template
5. Generate at the correct ratio
6. Run platform policy checklist
7. Write platform-appropriate ad copy
8. Save to ./campaigns/{campaign}/ads/{platform}/{placement}/
```

---

*This mode is the paid advertising creative system for Vibe Marketing Skills v2. Every ad image, every video ad, every testing matrix, and every A/B variant flows through this engine. Feed it a product and an audience — it produces a structured, policy-compliant, platform-optimized ad testing program.*
