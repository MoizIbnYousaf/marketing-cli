# Social Graphics Mode

Create platform-optimized graphics for social media. Not generic images that happen to be the right size — graphics engineered for each platform's specific algorithm, user behavior, and visual language.

**Loaded by:** `creative/SKILL.md` when user selects Social Graphics mode.
**Model selection:** Handled by `references/MODEL_REGISTRY.md` — never hardcode model IDs in prompts or workflows.
**Brand consistency:** Reads from `./brand/creative-kit.md` before every generation.
**File output:** Saves to `./campaigns/{campaign}/social/{platform}/` for organized delivery.

---

## Why This Mode Exists

**The problem:** Every platform has different:
- Aspect ratios and safe zones
- Visual languages that perform
- Algorithm preferences
- User attention patterns
- Text overlay requirements

Generic "social media graphics" underperform because they ignore these differences.

**The solution:** Platform-specific knowledge built into prompt construction, so every graphic is optimized for where it will live. Plus a template system that stores brand layouts for repeatable, on-brand content production at scale.

---

## Model Selection

**Do NOT hardcode model IDs.** Always refer to `references/MODEL_REGISTRY.md` for the current default image model and its verified API payload.

As of this writing, the default image model is **Nano Banana Pro** (`google/nano-banana-pro`), selected for best-in-class typography, photorealism, and style control at 15-40 second generation times.

### How to Call

1. Open `references/MODEL_REGISTRY.md`
2. Find the **Image Generation** section
3. Copy the verified payload structure
4. Insert your constructed prompt and desired aspect ratio
5. Execute the API call via Replicate

### Why Nano Banana Pro for Social Graphics

Nano Banana Pro is the single model for all social graphic generation — including text-heavy designs. It handles:

- **Typography rendering:** Legible headlines, quote text, CTAs directly in the image
- **Platform-native aesthetics:** Photorealism, illustration, minimal, bold — all in one model
- **Aspect ratio control:** Native support for every social platform ratio (1:1, 4:5, 9:16, 16:9, 2:3, etc.)
- **Speed:** 15-40 seconds per image means rapid iteration and batch generation

There is no need to route to a separate typography model. Nano Banana Pro handles text rendering natively. See the [Text Rendering Instructions](#text-rendering-instructions) section for how to get clean typography.

---

## Text Rendering Instructions

Nano Banana Pro has strong native typography capabilities. Use these instructions to get clean, legible text in social graphics.

### Core Text Rendering Principles

1. **Specify text exactly in quotes.** The model renders text most accurately when it appears in quotation marks within the prompt.
2. **Keep text short.** 1-6 words render cleanly. Longer passages increase the chance of artifacts.
3. **Describe the typography style.** "Bold sans-serif," "elegant serif," "handwritten script" — be explicit.
4. **Specify placement.** "Text centered at top," "headline across bottom third," "text overlay left side."
5. **Describe contrast.** "White text on dark background," "black text with light backdrop" — the model needs contrast guidance.

### Text Rendering Prompt Formula

```
[Visual scene/background description],
text "[EXACT TEXT HERE]" in [typography style] font,
[text placement] of the frame,
[text color] on [background contrast],
[text size relative to frame],
[platform] graphic, [aspect ratio] composition
```

### Examples by Use Case

**Quote Card:**
```
Elegant minimalist background with soft gradient from navy to midnight blue,
text "The best time to start is now" in bold modern sans-serif font,
centered in the frame with generous padding,
white text on dark background, large prominent lettering,
Instagram feed graphic, 1:1 square composition
```

**Announcement Graphic:**
```
Vibrant celebration background with confetti and bold colors,
text "NOW LIVE" in heavy condensed sans-serif font,
centered top third of the frame,
white text with subtle shadow for contrast,
large impactful lettering, excitement energy,
Instagram Stories graphic, 9:16 vertical composition
```

**YouTube Thumbnail Text:**
```
[Scene description with subject],
text "GAME CHANGER" in bold impact-style font,
positioned on the left third of the frame,
yellow text with black outline for maximum readability,
large enough to read at small thumbnail size,
YouTube thumbnail, 16:9 landscape composition
```

**CTA Banner:**
```
Clean professional background with brand-appropriate colors,
text "Get Started Free" in clean modern sans-serif font,
centered in the lower third of the frame,
high contrast text on solid color block,
button-like presentation, clear and inviting,
LinkedIn graphic, 1.91:1 landscape composition
```

### Typography Style Reference

| Style | Prompt Language | Best For |
|-------|----------------|----------|
| Bold Sans-Serif | "bold modern sans-serif font, clean geometric letterforms" | Headlines, announcements, CTAs |
| Elegant Serif | "elegant serif font, sophisticated classic letterforms" | Quotes, luxury brands, editorial |
| Handwritten Script | "flowing handwritten script font, personal authentic feel" | Personal brands, lifestyle, invitations |
| Condensed Impact | "heavy condensed impact-style font, compressed bold letters" | YouTube thumbnails, urgency, sales |
| Minimal Clean | "thin light sans-serif font, minimal clean typography" | Luxury, tech, sophistication |
| Playful Rounded | "playful rounded font, friendly approachable letterforms" | Kids, casual brands, fun content |

### Text Rendering Quality Checklist

- [ ] Text specified in quotation marks in the prompt
- [ ] 6 words or fewer per text element
- [ ] Typography style explicitly described
- [ ] Placement specified (top/center/bottom, left/center/right)
- [ ] Contrast described (light on dark or dark on light)
- [ ] Size context given (large, prominent, readable at small size)

### When Text Quality Is Critical

For critical text rendering (legal text, exact brand slogans, phone numbers), generate the image as a background and composite text in post-production. AI text rendering is strong but not pixel-perfect for every character.

**Fallback workflow:**
```
1. Generate the graphic without text (describe "clean space for text overlay")
2. Use a design tool to add exact text in post
3. This guarantees 100% text accuracy at the cost of an extra step
```

For most social media use cases, Nano Banana Pro's native text rendering is more than sufficient. The fallback is only needed when every character must be letter-perfect.

---

## Platform Specifications

### Instagram

| Placement | Ratio | Pixels | Safe Zone |
|-----------|-------|--------|-----------|
| Feed (Square) | 1:1 | 1080x1080 | Full frame |
| Feed (Portrait) | 4:5 | 1080x1350 | Best engagement |
| Stories | 9:16 | 1080x1920 | Avoid top 250px, bottom 200px |
| Reels Cover | 9:16 | 1080x1920 | Center content |
| Carousel | 1:1 or 4:5 | 1080x1080/1350 | Consistent across slides |

**Instagram Visual Language:**
- Bold, vibrant colors
- High contrast
- Clean compositions
- Scroll-stopping first frame
- Text minimal (algorithm prefers)

---

### YouTube

| Placement | Ratio | Pixels | Safe Zone |
|-----------|-------|--------|-----------|
| Thumbnail | 16:9 | 1280x720 | Right 1/3 for timestamp overlay |
| Channel Banner | 16:9 | 2560x1440 | Safe area: 1546x423 center |
| Community Post | 1:1 | 1080x1080 | Full frame |

**YouTube Thumbnail Formula:**
```
FACE + EMOTION + BRIGHT COLOR + CONTRAST + TEXT SPACE
```

Thumbnails compete against dozens of others. Survival requires:
- Human face with exaggerated expression (if relevant)
- 3 or fewer colors, extremely bold
- Text readable at phone size
- Contrast that pops in sidebar

---

### LinkedIn

| Placement | Ratio | Pixels | Safe Zone |
|-----------|-------|--------|-----------|
| Feed Post | 1.91:1 | 1200x627 | Full frame |
| Article Header | 1.91:1 | 1200x627 | Full frame |
| Profile Banner | 4:1 | 1584x396 | Center focal point |
| Square Post | 1:1 | 1080x1080 | Works well too |

**LinkedIn Visual Language:**
- Professional but not boring
- Clean, sophisticated aesthetics
- Thought leadership positioning
- Data visualization performs well
- Avoid overly casual/meme-y

---

### Twitter/X

| Placement | Ratio | Pixels | Safe Zone |
|-----------|-------|--------|-----------|
| Feed Image | 16:9 | 1200x675 | Optimal |
| Feed Image | 1.91:1 | 1200x628 | Also works |
| Feed Image | 1:1 | 1080x1080 | Square option |
| Header | 3:1 | 1500x500 | Safe area centered |

**Twitter Visual Language:**
- High contrast (dark mode dominant)
- Bold, shareable visuals
- Meme-adjacent aesthetics OK
- Hot takes benefit from visual punch
- Screenshots of text perform well

---

### TikTok

| Placement | Ratio | Pixels | Safe Zone |
|-----------|-------|--------|-----------|
| Video Cover | 9:16 | 1080x1920 | Avoid bottom 150px (UI) |
| Profile | 1:1 | 200x200 | Keep simple |

**TikTok Visual Language:**
- Native, not polished
- "Shot on phone" aesthetic often wins
- Bold text overlays
- Faces perform
- Trend-aware styling

---

### Pinterest

| Placement | Ratio | Pixels | Safe Zone |
|-----------|-------|--------|-----------|
| Standard Pin | 2:3 | 1000x1500 | Optimal |
| Long Pin | 1:2.1 | 1000x2100 | More real estate |
| Square Pin | 1:1 | 1000x1000 | Works but less optimal |

**Pinterest Visual Language:**
- Aspirational aesthetic
- Warm, inviting tones
- Clear text overlay (Pinterest users read)
- Step-by-step works well
- Lifestyle context

---

### Facebook

| Placement | Ratio | Pixels | Safe Zone |
|-----------|-------|--------|-----------|
| Feed Post | 1.91:1 | 1200x630 | Standard |
| Square Post | 1:1 | 1080x1080 | Also works |
| Story | 9:16 | 1080x1920 | Same as Instagram |
| Cover Photo | 16:9 | 820x312 (desktop display) | Safe area center |

**Facebook Visual Language:**
- Broader demographic appeal
- Less edgy than Twitter
- Community/family vibes
- Video thumbnails important
- Event graphics common

---

## Platform-Specific Prompt Templates

### Instagram Feed (4:5 Portrait)

```
[Subject] for Instagram feed, bold vibrant colors,
clean minimal composition, scroll-stopping visual impact,
high contrast, lifestyle aesthetic, modern photography style,
portrait 4:5 composition, subject centered with breathing room,
professional quality, engaging immediate appeal
```

**What makes it work:**
- "Bold vibrant colors" — Algorithm favors engagement
- "Scroll-stopping" — Primes for thumb-pausing moment
- "4:5 composition" — Optimal feed real estate
- "Breathing room" — Space for engagement UI elements

---

### Instagram Stories (9:16)

```
[Subject] for Instagram Stories, vertical 9:16 composition,
subject centered in middle third (avoiding top and bottom),
bold engaging visual, bright colors, clean composition,
space for text overlay or sticker placement,
story-native aesthetic, immediate visual impact
```

**What makes it work:**
- "Middle third" — Avoids UI overlay zones
- "Space for text/sticker" — Interactive element room
- "Story-native" — Matches platform expectation

---

### YouTube Thumbnail

```
YouTube thumbnail style, [subject/person] with [emotion] expression,
high contrast dramatic lighting, bold vibrant colors,
clean background for text overlay on [left/right] side,
click-worthy composition, face prominent in frame,
professional thumbnail aesthetic, extreme visual clarity
```

**Emotion Modifiers:**
| Emotion | Prompt Addition |
|---------|-----------------|
| Surprise | "shocked expression, wide eyes, raised eyebrows, open mouth" |
| Excitement | "excited expression, big genuine smile, enthusiastic energy" |
| Curiosity | "intrigued expression, raised eyebrow, knowing look" |
| Confidence | "confident expression, slight smirk, assured posture" |
| Concern | "concerned expression, worried face, serious" |

**Color Psychology for Thumbnails:**
| Color | Best For | Why |
|-------|----------|-----|
| Yellow | Most click-worthy | Highest attention in sidebar |
| Red | Urgency, drama | Hot takes, breaking news |
| Blue | Tech, education | Trust, authority |
| Green | Money, success | Finance, growth |
| Orange | Entertainment | Warm, inviting |
| Purple | Creative, unique | Stands out from typical |

---

### LinkedIn Professional

```
Professional LinkedIn graphic, [subject/concept],
clean sophisticated aesthetic, corporate-appropriate colors,
thought leadership positioning, business context,
modern professional photography style, confident tone,
1.91:1 landscape composition, space for headline overlay,
high-end professional quality
```

**LinkedIn Variations:**
- **Data/Insight:** Add "data visualization style, clean infographic aesthetic"
- **Personal Brand:** Add "executive portrait style, approachable authority"
- **Company:** Add "brand-aligned color palette, corporate identity"

---

### Twitter/X Post

```
Twitter-optimized graphic, [subject], high contrast for dark mode,
bold simple composition, shareable visual impact,
16:9 landscape, punchy immediate appeal,
conversation-starter aesthetic, timeline scroll-stopping,
clean professional quality with edge
```

**Twitter Variations:**
- **Hot Take:** Add "provocative visual tension, bold statement energy"
- **Thread Intro:** Add "curiosity-inducing, incomplete story visual"
- **Data/Stat:** Add "stark data visualization, number prominent"

---

### Pinterest Pin

```
Pinterest pin style, [subject] in aspirational setting,
vertical 2:3 composition, rich warm aesthetic,
inspirational lifestyle photography, save-worthy visual,
clear space at top for text overlay, beautiful staging,
high-quality editorial feel, dreamy aspirational mood
```

**Pinterest Performs Best With:**
- Step-by-step previews
- Before/after concepts
- Lifestyle aspiration
- How-to previews
- Collection/roundup style

---

### TikTok Cover

```
TikTok cover image, [subject/scene], vertical 9:16,
native authentic aesthetic (not over-produced),
bold engaging composition, face-forward if person,
content centered above bottom navigation area,
trend-aware styling, scroll-stopping thumbnail,
high contrast, clear at small size
```

---

## Content Type Templates

### Quote Graphics

Nano Banana Pro handles text rendering directly. Use the text rendering instructions from the [Text Rendering Instructions](#text-rendering-instructions) section.

```
Minimalist quote graphic for [platform],
text "[QUOTE TEXT]" in [typography style] font,
clean background, [color palette],
text centered in frame with generous padding,
sophisticated aesthetic, modern design,
[aspect ratio for platform]
```

**For quotes longer than 6 words:** Split into multiple lines in the prompt, or generate the background and composite text in post-production.

---

### Product Announcement

```
Product announcement graphic for [platform],
[product] hero shot, celebration/launch energy,
bold attention-grabbing composition, premium aesthetic,
space for headline and details, excitement visual,
[platform-specific aspect ratio], commercial quality
```

---

### Event Promotion

```
Event promotion graphic for [platform], [event type] theme,
engaging inviting composition, date/time visual priority,
exciting anticipation mood, bold readable design,
[platform aspect ratio], event marketing aesthetic
```

---

### Behind-the-Scenes

```
Behind-the-scenes content for [platform],
authentic candid aesthetic, real moment capture,
[subject/scene], genuine unpolished feel,
personality-forward composition, relatable vibe,
[platform aspect ratio], native platform aesthetic
```

---

### Testimonial/Social Proof

```
Testimonial graphic for [platform], clean professional design,
space for quote text, trustworthy aesthetic,
person placeholder or abstract human element,
credibility-building composition, [brand colors],
[platform aspect ratio]
```

---

## Style Exploration (Before Execution)

**Critical insight:** Don't lock into one style early. Generate multiple genuinely DIFFERENT visual directions first.

### Why This Matters for Social Graphics

Social graphics live in noisy feeds. The "right" style isn't obvious — it depends on:
- Platform visual language
- Audience expectations
- Competitive landscape
- Brand positioning

**One style = hope. Multiple styles = informed choice.**

### The Style Exploration Process

```
1. GENERATE 4-5 DIFFERENT STYLES
   -> Not variations of one style
   -> Genuinely different visual languages
   -> Same subject, different aesthetic approaches

2. IDENTIFY WINNER
   -> Which stops the scroll?
   -> Which matches platform vibe?
   -> Which feels most "brand"?

3. EXTRACT PRINCIPLES
   -> What makes this style work?
   -> Color palette?
   -> Composition approach?
   -> Lighting mood?

4. APPLY TO FORMATS
   -> Same principles, different platforms
   -> Build content SYSTEM
   -> Repeatable, not one-off
```

### Style Exploration Prompt Template

For any new social graphics project, generate these 5 directions:

```
Style 1 - Clean Minimal:
[Subject] for [platform], clean minimal aesthetic, white space,
single focal point, modern typography space, sophisticated restraint

Style 2 - Bold Vibrant:
[Subject] for [platform], bold vibrant colors, high contrast,
dynamic composition, energetic attention-grabbing

Style 3 - Warm Lifestyle:
[Subject] for [platform], warm lifestyle aesthetic, natural tones,
authentic feeling, relatable human-centered

Style 4 - Dark & Premium:
[Subject] for [platform], dark moody aesthetic, premium feel,
sophisticated lighting, luxury positioning

Style 5 - Playful Creative:
[Subject] for [platform], playful creative aesthetic, unexpected angles,
personality-forward, memorable differentiation
```

### Style Decision Framework

After generating options:

| Question | Guides Toward |
|----------|---------------|
| Does brand feel established/premium? | Dark & Premium or Clean Minimal |
| Is brand approachable/friendly? | Warm Lifestyle or Playful Creative |
| Competing against boring competitors? | Bold Vibrant or Playful Creative |
| Professional B2B context? | Clean Minimal or Dark & Premium |
| Consumer/lifestyle product? | Warm Lifestyle or Bold Vibrant |

### Extract Principles Template

Once winner is identified, document:

```markdown
## Winning Style: [Name]

**What makes it work:**
- Color palette: [specific colors]
- Composition: [approach]
- Lighting: [mood/direction]
- Typography space: [how handled]
- Mood: [feeling it creates]

**Apply to other platforms:**
- Instagram Feed: [how to adapt]
- LinkedIn: [how to adapt]
- Twitter: [how to adapt]
- etc.
```

This creates a repeatable SYSTEM, not just one graphic.

---

## Template System

The template system stores brand layouts in `./brand/creative-kit.md` so every graphic stays on-brand without re-specifying visual identity each time.

### How Templates Work

1. **First generation:** Explore styles, pick a winner, extract principles
2. **Save template:** Store the winning style as a named template in `creative-kit.md`
3. **Reuse:** All future graphics reference the template for instant brand consistency
4. **Evolve:** Update the template when brand evolves — all future content follows

### Template Schema

Store templates in the `## Social Graphics Templates` section of `./brand/creative-kit.md`:

```markdown
## Social Graphics Templates

### Template: [template-name]

**Created:** [date]
**Style Family:** [Clean Minimal / Bold Vibrant / Warm Lifestyle / Dark Premium / Playful Creative]

**Visual Identity:**
- Primary colors: [hex codes or descriptions]
- Secondary colors: [hex codes or descriptions]
- Background style: [gradient/solid/textured/photographic]
- Mood: [one-line description]

**Typography:**
- Headline font style: [bold sans-serif / elegant serif / etc.]
- Body font style: [clean sans-serif / etc.]
- Text color: [color on what background]
- Text placement: [top/center/bottom preference]

**Composition Rules:**
- Subject placement: [centered / rule of thirds / left-weighted / etc.]
- Negative space: [generous / tight / balanced]
- Visual hierarchy: [what draws eye first, second, third]

**Platform Adaptations:**
- Instagram Feed: [specific notes]
- Instagram Stories: [specific notes]
- LinkedIn: [specific notes]
- Twitter: [specific notes]
- YouTube Thumbnail: [specific notes]

**Prompt Prefix:**
[The standard prompt fragment to prepend to all generations using this template]

**Prompt Suffix:**
[The standard prompt fragment to append to all generations using this template]
```

### Using a Template

When generating with a saved template:

```
1. Read ./brand/creative-kit.md
2. Find the matching template by name
3. Construct the prompt:
   [template prompt prefix] + [specific content for this graphic] + [template prompt suffix]
4. Apply the platform-specific aspect ratio
5. Generate via MODEL_REGISTRY.md payload
6. Review against template's composition rules
```

### Template Examples

**Example: SaaS Brand "TechForward"**
```markdown
### Template: techforward-social

**Created:** 2026-02-16
**Style Family:** Clean Minimal

**Visual Identity:**
- Primary colors: electric blue (#0066FF), white (#FFFFFF)
- Secondary colors: slate gray (#64748B), light gray (#F1F5F9)
- Background style: clean gradient from white to light gray
- Mood: confident, modern, trustworthy

**Typography:**
- Headline font style: bold clean sans-serif, geometric letterforms
- Body font style: light sans-serif
- Text color: electric blue or white depending on background
- Text placement: centered or left-aligned

**Composition Rules:**
- Subject placement: centered with generous padding
- Negative space: generous — let the content breathe
- Visual hierarchy: headline > visual element > supporting detail

**Prompt Prefix:**
"Clean modern tech aesthetic, electric blue and white color scheme, sophisticated minimal design, professional SaaS brand feel,"

**Prompt Suffix:**
"high-end professional quality, modern technology brand, clean white space, confident authoritative tone"
```

**Example: Lifestyle Brand "Glow Naturals"**
```markdown
### Template: glow-naturals-social

**Created:** 2026-02-16
**Style Family:** Warm Lifestyle

**Visual Identity:**
- Primary colors: warm terracotta (#C67A4B), cream (#FFF8F0)
- Secondary colors: sage green (#8FAE7E), soft gold (#D4A574)
- Background style: warm natural textures, soft light
- Mood: warm, authentic, nurturing, natural

**Typography:**
- Headline font style: elegant serif with organic feel
- Body font style: clean rounded sans-serif
- Text color: terracotta or cream depending on background
- Text placement: centered or overlaid on negative space in photos

**Composition Rules:**
- Subject placement: slightly off-center, lifestyle context
- Negative space: balanced — not cluttered but not empty
- Visual hierarchy: hero image > headline > product detail

**Prompt Prefix:**
"Warm natural lifestyle aesthetic, terracotta and cream tones, organic authentic feel, soft golden hour lighting,"

**Prompt Suffix:**
"beautiful natural styling, warm inviting mood, lifestyle editorial quality, aspirational but approachable"
```

---

## Content Calendar Mode

Generate a full week (or more) of on-brand social graphics in a single session. Each graphic gets a unique concept while maintaining brand consistency through the template system.

### How Content Calendar Mode Works

```
1. USER PROVIDES:
   - Brand/template name (must exist in creative-kit.md)
   - Platform(s) to target
   - Number of posts (e.g., "7 days of Instagram content")
   - Content themes or pillars (optional but recommended)
   - Campaign name for file organization

2. ENGINE GENERATES:
   - One graphic per day/slot with unique concept
   - Matching captions with hashtags
   - Consistent visual identity across all posts
   - Platform-optimized for each target
   - Organized file output

3. OUTPUT:
   - Images saved to ./campaigns/{campaign}/social/{platform}/
   - Calendar summary with dates, concepts, captions
   - All graphics reference the same template for brand consistency
```

### Content Pillar System

Organize posts around content pillars to ensure variety:

| Pillar | Purpose | Example |
|--------|---------|---------|
| **Educate** | Teach something useful | Tips, how-tos, explainers |
| **Inspire** | Motivate or uplift | Quotes, success stories, vision |
| **Engage** | Start conversations | Questions, polls, hot takes |
| **Promote** | Drive action | Product features, offers, CTAs |
| **Entertain** | Build affinity | Behind-scenes, humor, trends |
| **Connect** | Build community | User stories, team spotlights, values |

### Weekly Calendar Template (7 posts)

```
Monday    - Educate   | "Tip of the week" or how-to
Tuesday   - Inspire   | Quote or success story
Wednesday - Engage    | Question or conversation starter
Thursday  - Promote   | Product feature or offer
Friday    - Entertain | Behind-the-scenes or fun content
Saturday  - Connect   | Community spotlight or values
Sunday    - Inspire   | Motivational or reflective
```

### Content Calendar Execution

For each post in the calendar:

```
Step 1: Load template from creative-kit.md
Step 2: Select content pillar for this slot
Step 3: Generate concept (subject + message)
Step 4: Construct prompt:
        [template prefix] + [platform template] + [specific concept] + [template suffix]
Step 5: Set aspect ratio for target platform
Step 6: Generate image via MODEL_REGISTRY.md
Step 7: Write caption with hashtags
Step 8: Save to ./campaigns/{campaign}/social/{platform}/day-{N}-{pillar}.png
Step 9: Log to calendar summary
```

### Calendar Output Format

After generating all posts, produce a calendar summary:

```markdown
## Content Calendar: {campaign}

**Brand:** {brand/template name}
**Platform:** {platform}
**Period:** {start date} - {end date}
**Template Used:** {template name from creative-kit.md}

### Day 1 — Monday — Educate
**Concept:** [description]
**Image:** ./campaigns/{campaign}/social/{platform}/day-1-educate.png
**Caption:**
> [Caption text with hashtags]

**Image URL:** [generation URL]

---

### Day 2 — Tuesday — Inspire
**Concept:** [description]
**Image:** ./campaigns/{campaign}/social/{platform}/day-2-inspire.png
**Caption:**
> [Caption text with hashtags]

**Image URL:** [generation URL]

---

[... repeat for each day ...]
```

### Multi-Platform Calendar

When generating for multiple platforms simultaneously:

```
./campaigns/{campaign}/social/
├── instagram/
│   ├── day-1-educate.png      (4:5)
│   ├── day-2-inspire.png      (4:5)
│   ├── ...
│   └── day-7-inspire.png      (4:5)
├── linkedin/
│   ├── day-1-educate.png      (1.91:1)
│   ├── day-2-inspire.png      (1.91:1)
│   ├── ...
│   └── day-7-inspire.png      (1.91:1)
├── twitter/
│   ├── day-1-educate.png      (16:9)
│   ├── ...
│   └── day-7-inspire.png      (16:9)
└── calendar-summary.md
```

Each platform variant uses the same concept but adapts composition and aspect ratio. The template's platform adaptation notes guide the differences.

---

## Per-Platform Auto-Adaptation

When a graphic needs to exist across multiple platforms, automatically adapt it rather than requiring manual re-prompting for each.

### Auto-Adaptation Workflow

```
1. Generate PRIMARY graphic (user's specified platform or highest-priority)
2. Extract the core concept and visual approach from the prompt
3. For each additional platform:
   a. Look up platform specs (ratio, safe zones, visual language)
   b. Modify the prompt for platform-specific requirements
   c. Apply platform-specific aspect ratio
   d. Generate the adapted variant
   e. Save to platform-specific directory
4. Present all variants for review
```

### Platform Adaptation Rules

| From | To | Adaptation |
|------|----|------------|
| Instagram Feed (4:5) | Stories (9:16) | Recenter subject in middle third, add vertical breathing room |
| Instagram Feed (4:5) | LinkedIn (1.91:1) | Widen composition, add professional tone language, shift to landscape |
| Instagram Feed (4:5) | Twitter (16:9) | Widen to landscape, increase contrast for dark mode, add edge/punch |
| Instagram Feed (4:5) | Pinterest (2:3) | Extend vertical, add text overlay space at top, warm aspirational tone |
| Instagram Feed (4:5) | Facebook (1.91:1) | Similar to LinkedIn but broader demographic appeal language |
| YouTube Thumbnail (16:9) | Twitter (16:9) | Can often use as-is (both 16:9), reduce click-bait energy if needed |
| LinkedIn (1.91:1) | Facebook (1.91:1) | Minimal change (similar ratios), soften corporate tone slightly |
| Pinterest (2:3) | Instagram Feed (4:5) | Crop or reimagine for square-ish format, maintain warm tones |
| Any format | Stories/TikTok (9:16) | Full vertical recomposition needed — cannot simply crop |

### Prompt Adaptation Modifiers

When adapting a prompt from one platform to another, apply these modifiers:

**To Instagram:**
```
Add: "bold vibrant colors, clean composition, scroll-stopping, lifestyle aesthetic"
Ratio: 4:5 (feed) or 9:16 (stories)
```

**To LinkedIn:**
```
Add: "professional sophisticated aesthetic, corporate-appropriate, thought leadership"
Remove: any casual/meme/trendy language
Ratio: 1.91:1
```

**To Twitter/X:**
```
Add: "high contrast for dark mode, bold shareable, punchy immediate appeal"
Ratio: 16:9
```

**To Pinterest:**
```
Add: "aspirational lifestyle, warm inviting, save-worthy, editorial quality"
Ratio: 2:3
```

**To TikTok:**
```
Add: "native authentic aesthetic, not over-produced, trend-aware"
Remove: any overly polished/corporate language
Ratio: 9:16
```

**To Facebook:**
```
Add: "broad demographic appeal, community-friendly, engaging"
Ratio: 1.91:1
```

### Auto-Adaptation API Pattern

For each adapted platform, construct and execute a separate API call:

```json
{
  "model": "[see MODEL_REGISTRY.md]",
  "input": {
    "prompt": "{{adapted_prompt_with_platform_modifiers}}",
    "aspect_ratio": "{{platform_ratio}}",
    "output_format": "png",
    "output_quality": 90,
    "number_of_images": 1
  }
}
```

Generate all platform variants in parallel when possible to minimize total wait time.

---

## Execution Workflow

### Step 1: Read Brand Context

```
□ Check ./brand/creative-kit.md for existing templates
□ If template exists, load it
□ If no template, proceed with style exploration first
```

### Step 2: Platform Requirements

```
□ Which platform(s)?
□ Which placement? (feed/stories/cover/etc.)
□ Aspect ratio confirmed?
□ Safe zones understood?
□ Multi-platform needed?
```

### Step 3: Content Type

```
□ What type of content? (announcement/quote/product/etc.)
□ Text overlay needed? (use Text Rendering Instructions)
□ Brand colors required?
□ Specific elements must include?
```

### Step 4: Construct Platform-Optimized Prompt

Use templates above, customize for specific need. If using a saved template, prepend prefix and append suffix.

### Step 5: Generate

Refer to `references/MODEL_REGISTRY.md` for the verified API payload. Insert your prompt and aspect ratio.

```
1. Open references/MODEL_REGISTRY.md
2. Copy the Image Generation verified payload
3. Insert prompt and aspect_ratio
4. Execute via Replicate API
5. Access output[0] for the image URL
```

### Step 6: Platform-Specific Review

Check against platform requirements:
- Correct ratio?
- Safe zones respected?
- Visual language matches platform?
- Scroll-stopping quality?
- Text space if needed?
- Text rendering clean? (if applicable)

### Step 7: Save Output

```
Save to: ./campaigns/{campaign}/social/{platform}/{descriptive-name}.png
```

### Step 8: Iterate or Approve

If multi-platform, generate adapted variants for remaining platforms.

---

## Multi-Platform Scaling

When one concept needs multiple platforms:

### Strategy: Generate Primary, Then Adapt

```
1. Generate for PRIMARY platform (where it matters most)
2. Approve composition and style
3. Generate variants for other platforms
   - Adjust aspect ratio
   - Adjust composition for different safe zones
   - Apply platform-specific prompt modifiers
   - Maintain visual consistency
4. Save each variant to its platform directory
```

### Platform Adaptation Matrix

| From -> To | Composition Change |
|-----------|-------------------|
| Instagram Feed -> Stories | Recenter subject in middle third |
| YouTube Thumb -> Twitter | Can often use as-is (both 16:9) |
| LinkedIn -> Facebook | Minimal change (similar ratios) |
| Pinterest -> Instagram | Square crop or reimagine |
| Any -> Stories/TikTok | Full vertical recomposition needed |

### Batch Generation

```
For campaign "Product Launch":
├── instagram/
│   ├── feed-4x5.png               (4:5) - primary
│   └── stories-9x16.png           (9:16) - adapted
├── linkedin/
│   └── feed-1.91x1.png            (1.91:1) - professional version
├── twitter/
│   └── feed-16x9.png              (16:9) - punchy version
└── facebook/
    └── feed-1.91x1.png            (1.91:1) - broader appeal version
```

---

## File Output Structure

All social graphics are saved to an organized directory structure for easy handoff and management.

### Directory Convention

```
./campaigns/{campaign-name}/social/
├── instagram/
│   ├── feed/
│   │   ├── {concept}-4x5.png
│   │   └── ...
│   ├── stories/
│   │   ├── {concept}-9x16.png
│   │   └── ...
│   └── reels/
│       └── {concept}-cover-9x16.png
├── youtube/
│   ├── thumbnails/
│   │   ├── {concept}-16x9.png
│   │   └── ...
│   └── community/
│       └── {concept}-1x1.png
├── linkedin/
│   ├── {concept}-1.91x1.png
│   └── ...
├── twitter/
│   ├── {concept}-16x9.png
│   └── ...
├── pinterest/
│   ├── {concept}-2x3.png
│   └── ...
├── facebook/
│   ├── {concept}-1.91x1.png
│   └── ...
├── tiktok/
│   ├── {concept}-cover-9x16.png
│   └── ...
└── calendar-summary.md (if using content calendar mode)
```

### File Naming Convention

```
{descriptive-concept}-{aspect-shorthand}.{format}

Examples:
  product-launch-announcement-4x5.png
  weekly-tip-typography-basics-16x9.png
  customer-quote-sarah-1x1.png
  day-3-engage-conversation-starter-4x5.png
```

### Saving Workflow

After each successful generation:

```
1. Create campaign directory if it doesn't exist:
   mkdir -p ./campaigns/{campaign}/social/{platform}/

2. Download the generated image from the output URL

3. Save with descriptive filename:
   ./campaigns/{campaign}/social/{platform}/{name}-{ratio}.png

4. Log the generation in the output summary
```

---

## Quality Checklist

### Technical
- [ ] Correct aspect ratio for platform
- [ ] Resolution sufficient (minimum specs met)
- [ ] Safe zones respected (no critical content in overlay areas)
- [ ] File saved to correct campaign directory

### Platform Fit
- [ ] Visual language matches platform
- [ ] Would scroll-stop on this platform specifically
- [ ] Appropriate for platform's audience
- [ ] Text (if any) readable at typical view size

### Typography (if text included)
- [ ] Text specified in quotes in the prompt
- [ ] Typography style explicitly described
- [ ] Text placement matches composition
- [ ] Contrast sufficient for readability
- [ ] All characters rendered correctly
- [ ] Readable at mobile screen size

### Composition
- [ ] Subject clear and prominent
- [ ] Space for text overlay if needed
- [ ] Doesn't compete with platform UI elements
- [ ] Colors work on platform (dark mode consideration)

### Brand
- [ ] Consistent with brand aesthetic
- [ ] Colors appropriate
- [ ] Tone matches brand voice
- [ ] Matches saved template (if using template system)

### Content Calendar (if applicable)
- [ ] All posts generated with unique concepts
- [ ] Content pillars distributed correctly
- [ ] Captions written with hashtags
- [ ] Calendar summary document complete
- [ ] Files organized by day and pillar

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Looks generic | Platform not specified | Use platform-specific template |
| Wrong vibe for platform | Cross-platform prompt | Rewrite for specific platform language |
| Content in unsafe zone | Template not followed | Specify safe zone in prompt |
| Too polished for TikTok | Wrong aesthetic | Add "native, authentic, not over-produced" |
| Too casual for LinkedIn | Wrong aesthetic | Add "professional, sophisticated, corporate-appropriate" |
| Won't scroll-stop | Lacks contrast/impact | Add "bold, high contrast, scroll-stopping" |
| Text unreadable | Bad text space | Specify "clear space for text overlay" |
| Wrong ratio | Default used | Explicitly state ratio in prompt |
| Text garbled | Too many words | Keep text to 6 words or fewer per element |
| Text wrong font | Style not specified | Explicitly describe typography style in prompt |
| Brand inconsistent | No template used | Save and reference a template in creative-kit.md |
| Calendar posts look same | No pillar variety | Use content pillar system for thematic diversity |
| Files disorganized | No directory structure | Follow file output convention strictly |

---

## Platform-Specific Tips

### Instagram
- 4:5 gets more real estate than 1:1 — default to portrait
- Algorithm favors engagement — bold colors help
- First frame of carousel is everything
- Avoid heavy text (algorithm deprioritizes)

### YouTube
- Thumbnail is 50% of click decision
- Face + emotion dramatically increases CTR
- Test against actual competitors' thumbnails
- Yellow genuinely outperforms other colors

### LinkedIn
- Thought leadership aesthetic wins
- Data/insight graphics get shared
- Avoid anything that looks like an ad
- Professional does not equal boring

### Twitter/X
- Dark mode dominant — high contrast essential
- Memes and screenshots perform
- Hot take energy works
- Ratio-able graphics (quotes) spread

### Pinterest
- Vertical wins — 2:3 or longer
- Text on pin = good (users read)
- Aspirational + actionable
- Save-worthy > like-worthy

### TikTok
- Native aesthetic beats polished
- Face-forward works
- Match trending visual styles
- Avoid looking like an ad

---

## Output Format

### Single Graphic Output

```markdown
## Social Graphic Generated

**Platform:** [platform]
**Placement:** [feed/stories/thumbnail/etc.]
**Aspect Ratio:** [ratio]
**Template Used:** [template name or "none"]

**Image URL:** [URL]
**Saved To:** ./campaigns/{campaign}/social/{platform}/{filename}.png

**Platform Optimization:**
- [x] Correct ratio
- [x] Safe zones respected
- [x] Platform visual language
- [x] Scroll-stopping quality

**Typography Check:** (if text included)
- [x] Text renders cleanly
- [x] Font style matches intent
- [x] Readable at mobile size

**Feedback?**
- Does it match platform vibe?
- Scroll-stopping enough?
- Text space adequate?
- Ready to approve or iterate?

**Multi-Platform?**
- [ ] Generate additional platform variants
- [ ] Specify platforms needed
```

### Multi-Platform Output

```markdown
## Multi-Platform Graphics Generated

**Campaign:** {campaign-name}
**Concept:** [description]
**Template Used:** [template name]

### Instagram Feed (4:5)
- **URL:** [URL]
- **Saved:** ./campaigns/{campaign}/social/instagram/{name}-4x5.png
- **Status:** [x] Platform-optimized

### LinkedIn (1.91:1)
- **URL:** [URL]
- **Saved:** ./campaigns/{campaign}/social/linkedin/{name}-1.91x1.png
- **Status:** [x] Platform-optimized

### Twitter (16:9)
- **URL:** [URL]
- **Saved:** ./campaigns/{campaign}/social/twitter/{name}-16x9.png
- **Status:** [x] Platform-optimized

[... additional platforms ...]

**All Variants Approved?**
- [ ] Yes, proceed to scheduling
- [ ] Need iteration on [platform]
```

### Content Calendar Output

```markdown
## Content Calendar Generated

**Campaign:** {campaign-name}
**Platform:** {platform}
**Period:** {date range}
**Posts Generated:** {count}
**Template Used:** {template name}

**Output Directory:** ./campaigns/{campaign}/social/{platform}/

### Calendar Overview

| Day | Pillar | Concept | File | Caption Preview |
|-----|--------|---------|------|-----------------|
| Mon | Educate | [concept] | day-1-educate.png | [first 50 chars...] |
| Tue | Inspire | [concept] | day-2-inspire.png | [first 50 chars...] |
| Wed | Engage | [concept] | day-3-engage.png | [first 50 chars...] |
| Thu | Promote | [concept] | day-4-promote.png | [first 50 chars...] |
| Fri | Entertain | [concept] | day-5-entertain.png | [first 50 chars...] |
| Sat | Connect | [concept] | day-6-connect.png | [first 50 chars...] |
| Sun | Inspire | [concept] | day-7-inspire.png | [first 50 chars...] |

**Full details:** See ./campaigns/{campaign}/social/calendar-summary.md
```

---

## Integration with Creative Engine

```
SOCIAL GRAPHICS PIPELINE

┌─────────────────────────────────────────┐
│  Request with platform specified        │
│  -> Or route from creative/SKILL.md    │
└─────────────────────────────────────────┘
                    │
                    v
┌─────────────────────────────────────────┐
│  LOAD BRAND CONTEXT                     │
│  -> Read ./brand/creative-kit.md       │
│  -> Load template if exists            │
│  -> Extract brand colors, style, tone  │
└─────────────────────────────────────────┘
                    │
                    v
┌─────────────────────────────────────────┐
│  social-graphics mode (THIS FILE)       │
│  -> Identify platform requirements     │
│  -> Apply platform-specific template   │
│  -> Apply brand template if available  │
│  -> Generate with MODEL_REGISTRY.md    │
│  -> Review against platform checklist  │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        v                       v
┌──────────────────┐   ┌──────────────────┐
│  Single Platform │   │  Multi-Platform  │
│  -> Generate     │   │  -> Generate     │
│  -> Save to      │   │    primary       │
│    campaigns/    │   │  -> Auto-adapt   │
│                  │   │    variants      │
│                  │   │  -> Save all to  │
│                  │   │    campaigns/    │
└──────────────────┘   └──────────────────┘
        │                       │
        v                       v
┌──────────────────┐   ┌──────────────────┐
│  Content Calendar│   │  Template Save   │
│  -> Batch gen    │   │  -> If new style │
│  -> All pillars  │   │    approved,     │
│  -> Calendar     │   │    save to       │
│    summary       │   │    creative-kit  │
└──────────────────┘   └──────────────────┘
```

---

## Handoff Protocols

### Receiving from creative/SKILL.md

```yaml
Receive:
  platform: "Instagram"
  placement: "Feed"
  content_type: "Product announcement"
  subject: "[what to show]"
  brand_colors: "[if specified]"
  text_needed: true/false
  text_content: "[exact text if needed]"
  template_name: "[if brand template exists]"
  campaign_name: "[for file organization]"
  multi_platform: true/false
  additional_platforms: ["LinkedIn", "Twitter"]
  calendar_mode: false
  calendar_days: 0
```

### Returning

```yaml
Return:
  status: "complete"
  deliverables:
    - platform: "Instagram"
      placement: "Feed"
      aspect_ratio: "4:5"
      url: "[URL]"
      saved_to: "./campaigns/{campaign}/social/instagram/{name}.png"
  template_saved: true/false
  template_name: "[if saved]"
  multi_platform_available: true
  additional_platforms_needed: "[list if requested]"
  calendar_generated: false
  calendar_summary: "[path if generated]"
```

---

## Tips from Experience

### What Works
1. **Platform-first thinking** — Start with where it lives, not what it shows
2. **Ratio is non-negotiable** — Wrong ratio = wrong everything
3. **Safe zones matter** — Platform UI will cover content
4. **Visual language matching** — LinkedIn does not equal TikTok aesthetically
5. **Bold beats subtle** — Social is noisy, you need to pop
6. **Templates create consistency** — Save your winning style and reuse it
7. **Calendar mode saves hours** — Batch generation beats one-at-a-time
8. **Text rendering works** — Nano Banana Pro handles headlines natively, no separate tool needed

### What Doesn't Work
1. **One size fits all** — Generic "social media" prompts
2. **Ignoring platform culture** — Too polished for TikTok, too casual for LinkedIn
3. **Forgetting mobile** — Most viewing is phone-sized
4. **Text-heavy images** — Most platforms deprioritize
5. **Subtle visuals** — Get lost in the scroll
6. **No saved templates** — Rebuilding brand identity from scratch each time
7. **Paragraph-length text** — AI text rendering works best at 6 words or fewer
8. **Skipping style exploration** — Locking into the first idea without comparing alternatives

### The 80/20
80% of social graphic success comes from:
1. Correct aspect ratio
2. Platform-appropriate visual language
3. Scroll-stopping contrast/colors
4. Clear focal point

Get these four right and you'll outperform most content.

---

## Quick Reference: Common Workflows

### "Make me an Instagram post"

```
1. Load brand template from creative-kit.md (if exists)
2. Use Instagram Feed (4:5) prompt template
3. Add brand-specific modifiers
4. Generate via MODEL_REGISTRY.md
5. Save to ./campaigns/{campaign}/social/instagram/
```

### "I need this on all platforms"

```
1. Generate primary platform version
2. Get approval
3. Run auto-adaptation for each additional platform
4. Save all variants to platform-specific directories
5. Present multi-platform output summary
```

### "Generate a week of content"

```
1. Confirm brand template and platform
2. Map 7 days to content pillars
3. Generate unique concept for each day
4. Batch generate all 7 graphics
5. Write captions with hashtags
6. Save to calendar directory structure
7. Produce calendar summary document
```

### "Make a YouTube thumbnail"

```
1. Use YouTube Thumbnail prompt template
2. Apply emotion modifier (surprise/excitement/curiosity/etc.)
3. Apply color psychology (yellow for clicks, blue for trust, etc.)
4. Generate at 16:9
5. Verify text space and face prominence
6. Save to ./campaigns/{campaign}/social/youtube/thumbnails/
```

### "Create a quote graphic"

```
1. Use Text Rendering Instructions
2. Keep quote to 6 words or fewer if possible
3. Specify typography style explicitly
4. Describe text placement and contrast
5. Generate for target platform ratio
6. Verify text renders cleanly
7. If text is garbled, regenerate or use fallback (background + post-production text)
```
