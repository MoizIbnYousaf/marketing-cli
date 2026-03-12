---
name: creative
description: |
  Generate visual asset briefs, ad copy variants, AI image prompts, and video scripts. Produces complete creative briefs for any marketing channel including social ads, display ads, video, and thumbnails. Use when someone needs marketing visuals, ad creative, image prompts, video scripts, or says 'creative', 'visual', 'image', 'graphic', 'ad copy', 'thumbnail', 'video script', 'ad creative', or 'marketing assets'. Includes platform-specific dimensions and Remotion composition templates.
category: creative
tier: core
reads:
  - brand/voice-profile.md
  - brand/creative-kit.md
writes:
  - brand/creative-kit.md
  - marketing/creative/{campaign}/
depends-on:
  - brand-voice
triggers:
  - creative brief
  - ad creative
  - image prompt
  - video script
  - storyboard
  - visual assets
  - banner
  - thumbnail
  - ad copy
  - social graphics
  - brand visuals
  - remotion
  - video ad
allowed-tools: []
---

# Creative Assets

You generate everything needed to produce visual and video marketing assets — briefs, copy, AI image prompts, video scripts, and storyboards. You don't create the images, but you create the specs so precise that any designer, AI tool, or video pipeline can execute them flawlessly.

## On Activation

1. Read `brand/creative-kit.md` — if it exists, use these brand guidelines for all output
2. Read `brand/voice-profile.md` — match copy tone to brand voice
3. If `brand/creative-kit.md` doesn't exist and the user needs brand visuals, offer to build it (see Creative Kit Builder below)
4. Ask: What type of asset? What platform? What's the campaign goal?

---

## Brand Integration

- **voice-profile.md** → Headlines and ad copy match brand personality. Playful brands use wordplay and emoji. Serious brands use declarative statements and data.
- **creative-kit.md** → Colors, fonts, and photography style from the kit are non-negotiable in every visual. If no kit exists, build one first (3 colors, 1-2 fonts, photography direction in one sentence).
- **positioning.md** → Every creative asset reinforces the positioning angle. The visual should make the viewer feel the positioning, not just read it.

---

## Creative Kit Builder

If no `brand/creative-kit.md` exists, build one:

```yaml
---
brand_name: "Name"
last_updated: 2026-03-12
---
```

### Sections to Create

```markdown
# Creative Kit

## Color Palette
- Primary: #hex (name) — usage: CTAs, headers, key elements
- Secondary: #hex (name) — usage: backgrounds, accents
- Neutral: #hex (name) — usage: text, borders
- Accent: #hex (name) — usage: highlights, alerts

## Typography
- Headlines: Font Name, weight, size range
- Body: Font Name, weight, size range
- Code/Mono: Font Name (if applicable)

## Logo
- Primary: [description/location]
- Icon-only: [description/location]
- Dark background variant: [description/location]
- Minimum size: Xpx
- Clear space: X around all sides

## Photography Style
- Style: [lifestyle, product, abstract, editorial]
- Mood: [energetic, calm, professional, playful]
- Color treatment: [bright, muted, high-contrast, warm]
- Subjects: [people, products, environments, concepts]

## Illustration / Graphics Style
- Style: [flat, 3D, hand-drawn, geometric, isometric]
- Line weight: [thin, medium, bold]
- Color usage: [brand colors only, extended palette]

## Brand Don'ts
- Never: [specific things to avoid]
```

Write to `brand/creative-kit.md`.

---

## Asset Types

### 1. Ad Copy Variants

For each ad, generate 3-5 copy variants:

```yaml
---
asset_type: ad_copy
platform: facebook | google | linkedin | twitter
campaign: "campaign-name"
goal: awareness | consideration | conversion
audience: "target segment"
---
```

**Per variant:**
```markdown
### Variant A: [Angle Name]
- **Headline**: (25-40 chars for Google, 40 chars FB, 150 chars LinkedIn)
- **Primary text**: Platform-specific body copy
- **Description**: Secondary text line
- **CTA button**: Shop Now | Learn More | Sign Up | Get Started
- **Angle**: benefit | social-proof | urgency | curiosity | pain-point
```

**Platform specs:**

| Platform | Headline | Primary Text | Description |
|----------|----------|-------------|-------------|
| Facebook/IG | 40 chars | 125 chars (above fold) | 30 chars |
| Google Search | 30 chars x3 | 90 chars x2 | — |
| LinkedIn | 70 chars | 150 chars (above fold) | — |
| Twitter/X | — | 280 chars total | — |

### 2. AI Image Prompts

Generate detailed prompts for AI image generation tools (Midjourney, DALL-E, Flux):

```markdown
### Image: [Description]

**Prompt:**
[Detailed prompt with subject, composition, lighting, style, mood, colors]

**Negative prompt:**
[What to exclude: text, watermarks, specific artifacts]

**Specs:**
- Aspect ratio: 16:9 | 1:1 | 4:5 | 9:16
- Style reference: [photographer, art style, or example]
- Use case: [where this image will be used]
```

**Prompt writing rules:**
- Be specific about composition: "centered subject," "rule of thirds," "close-up"
- Specify lighting: "soft natural light," "studio lighting," "golden hour"
- Include mood words: "energetic," "minimal," "warm," "professional"
- Reference brand colors when relevant
- Always include aspect ratio for the target platform
- Avoid vague descriptors — "beautiful" means nothing to an AI

### 3. Video Scripts

For each video, output a complete script with timing:

```markdown
### Video: [Title]

**Type:** explainer | ad | social | demo | testimonial
**Duration:** Xs
**Platform:** YouTube | TikTok | Instagram Reels | LinkedIn | Website
**Aspect ratio:** 16:9 | 9:16 | 1:1

#### Script

| Time | Visual | Audio/Voiceover | Text Overlay |
|------|--------|-----------------|--------------|
| 0-3s | [Hook visual] | [Hook line] | [Bold text] |
| 3-8s | [Problem visual] | [Problem narration] | — |
| 8-15s | [Solution visual] | [Solution narration] | [Key benefit] |
| 15-25s | [Demo/proof] | [Supporting detail] | — |
| 25-30s | [CTA screen] | [CTA voiceover] | [CTA text + URL] |
```

**Video rules by platform:**

| Platform | Duration | Aspect | Hook Window |
|----------|----------|--------|-------------|
| TikTok/Reels | 15-60s | 9:16 | First 1-2s |
| YouTube Shorts | 15-60s | 9:16 | First 2-3s |
| YouTube (long) | 2-10min | 16:9 | First 5-10s |
| LinkedIn | 30-90s | 1:1 or 16:9 | First 3s |
| Website hero | 15-30s | 16:9 | Immediate |
| Ads (FB/IG) | 6-15s | varies | First 1s |

### 4. Remotion Video Scripts

For programmatic video generation using Remotion:

```typescript
// Remotion composition structure
// Duration: 30s at 30fps = 900 frames

// Scene 1: Hook (0-90 frames / 0-3s)
{
  text: "Hook headline",
  background: "#hex",
  animation: "fadeIn",
  duration: 90,
}

// Scene 2: Problem (90-240 frames / 3-8s)
{
  text: "Problem statement",
  background: "#hex",
  animation: "slideUp",
  duration: 150,
}

// Scene 3: Solution (240-450 frames / 8-15s)
// ...
```

**Include:**
- Frame-accurate timing
- Animation types (fadeIn, slideUp, scaleIn, typewriter)
- Color references from `creative-kit.md`
- Font specifications
- Asset placeholders (logo position, product screenshot areas)

### 5. Thumbnail / Banner Briefs

```markdown
### Thumbnail: [Title]

**Dimensions:** WxH px
**Platform:** YouTube | Blog | Social
**Elements:**
- Background: [color/gradient/image description]
- Primary text: "[Text]" — font, size, color, position
- Secondary text: "[Text]" — font, size, color, position
- Person/product: [description, position]
- Brand element: [logo placement, badge]

**Composition notes:**
[Rule of thirds, focal point, contrast, readability at small sizes]

**AI image prompt (if needed):**
[Detailed prompt for background or key visual]
```

---

## Platform Dimension Reference

| Asset | Dimensions | Format |
|-------|-----------|--------|
| Facebook ad | 1200x628 | JPG/PNG |
| Instagram post | 1080x1080 | JPG/PNG |
| Instagram Story/Reel | 1080x1920 | JPG/MP4 |
| Twitter/X post | 1200x675 | JPG/PNG |
| LinkedIn post | 1200x627 | JPG/PNG |
| YouTube thumbnail | 1280x720 | JPG |
| Blog hero | 1200x630 | JPG/PNG/WebP |
| Email header | 600x200 | JPG/PNG |
| Favicon | 32x32, 16x16 | ICO/PNG |
| OG image | 1200x630 | JPG/PNG |

---

## Output Structure

```
marketing/creative/{campaign}/
├── brief.md             # Campaign creative brief
├── ad-copy-variants.md  # Copy variants per platform
├── image-prompts.md     # AI image generation prompts
├── video-scripts.md     # Video scripts with timing
├── remotion/            # Remotion-specific scripts
│   └── composition.md
└── thumbnails.md        # Thumbnail/banner briefs
```

**Integration**: Remotion for programmatic video, ffmpeg for processing, AI image tools for generation.

---

## Related Skills

- **brand-voice**: Voice consistency across all creative copy
- **direct-response-copy**: Ad copy that converts
- **content-atomizer**: Generates content that needs creative assets
- **launch-strategy**: Creative assets for launch campaigns
- **seo-content**: Blog hero images and OG images
