# Product Photo Mode

Generate professional product photography that sells. Not generic AI images — strategic visual assets that highlight product value, create desire, and convert viewers to buyers.

**Loaded by:** `creative/SKILL.md` when user selects mode 1 (Product Photos).
**Model selection:** Handled by `references/MODEL_REGISTRY.md` — never hardcode model IDs in prompts or workflows.
**Brand consistency:** Reads from `./brand/creative-kit.md` before every generation.

---

## Why This Mode Exists

**The problem:** Most AI product photos fail because they:
1. Look obviously AI-generated (uncanny details, wrong reflections)
2. Don't follow commercial photography principles
3. Miss what makes products sell (features hidden, benefits unclear)
4. Ignore platform-specific requirements (Amazon vs Instagram vs hero banners)

**The solution:** A systematic approach that:
- Uses proven commercial photography techniques in prompts
- Optimizes for specific platforms and use cases
- Highlights product benefits, not just appearance
- Creates desire through strategic styling and context
- Enforces e-commerce compliance automatically
- Supports reference-image workflows for brand-locked assets
- Generates complete shoot sets in a single command

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

### Reference Image Workflow (Image-to-Image)

When the user provides an existing product photo, brand reference, or style example, use the `image_input` parameter from MODEL_REGISTRY.md to guide generation.

**When to use reference images:**
- User has a physical product photo they want enhanced or restyled
- User wants to match an existing brand aesthetic from a screenshot
- User wants variations of an approved product shot
- User needs consistency with previously generated images

**Workflow:**

```
1. Receive reference image URL or file path
2. Upload to accessible URL if local file
3. Construct prompt describing desired changes/style
4. Include image_input parameter in API payload:

   {
     "model": "[see MODEL_REGISTRY.md]",
     "input": {
       "prompt": "{{product description + desired style changes}}",
       "image_input": ["{{reference_image_url}}"],
       "aspect_ratio": "{{ratio}}",
       "output_format": "png"
     }
   }

5. The model uses the reference to guide composition, color, and structure
6. Review output against reference for consistency
```

**Reference image best practices:**
- Use high-resolution references (1000px+ on longest side)
- The prompt should describe what to CHANGE, not what the reference already shows
- For style transfer: describe the new style, let the image provide the composition
- For enhancement: describe the improvements, let the image provide the product
- Combine with seed locking for reproducible reference-guided outputs

---

## Style Exploration (Before Execution)

**Critical principle:** Don't lock into one visual approach. Product photography has many valid styles — the right one depends on brand, platform, and competitive landscape.

### Why This Matters for Products

The same product photographed differently can feel:
- Premium luxury vs accessible value
- Innovative tech vs reliable traditional
- Lifestyle aspirational vs utility functional

**One style = hope. Multiple styles = strategic choice.**

### Generate 5 Different Approaches

For any new product photography project:

```
Style 1 - Clean E-commerce:
[Product] on pure white background, professional studio lighting,
sharp commercial photography, Amazon listing optimized,
clean minimal, product hero shot

Style 2 - Lifestyle Context:
[Product] in real-world [setting], natural lighting,
lifestyle product photography, human context,
aspirational but relatable

Style 3 - Dark Premium:
[Product] against dark gradient background, dramatic spotlight,
luxury product photography, premium positioning,
sophisticated mood, high-end commercial

Style 4 - Editorial Magazine:
[Product] editorial photography style, artistic composition,
magazine quality, creative angles, fashion-adjacent aesthetic

Style 5 - Warm Natural:
[Product] in warm natural setting, soft window light,
organic styling, [wood/linen/natural materials],
approachable premium feel
```

### Style Decision Framework

| Brand Positioning | Best Style Direction |
|-------------------|---------------------|
| Premium/Luxury | Dark Premium or Editorial Magazine |
| Accessible/Friendly | Lifestyle Context or Warm Natural |
| Tech/Innovation | Clean E-commerce or Dark Premium |
| Natural/Organic | Warm Natural or Lifestyle Context |
| Fashion/Beauty | Editorial Magazine or Dark Premium |
| Utility/Practical | Clean E-commerce or Lifestyle Context |

### Extract Principles from Winner

Once style is chosen, document:

```markdown
## Winning Style: [Name]

**Visual Principles:**
- Background: [specific approach]
- Lighting: [mood and direction]
- Color palette: [tones]
- Composition: [approach]
- Props/styling: [elements]

**Apply across:**
- Hero shot: [how]
- Secondary angles: [how]
- Lifestyle variants: [how]
- Detail shots: [how]
```

---

## Photography Shot Types

### Hero Shot (Primary)

The main product image. Highest stakes, most important.

```
[Product name] hero shot, professional product photography,
[lighting setup], [background], product as focal point,
commercial advertising quality, ultra-detailed, sharp focus,
space for text on [left/right] if needed
```

**What makes hero shots work:**
- Product clearly visible from best angle
- Lighting that creates depth and dimension
- Background that doesn't compete
- Composition that draws eye to product
- Space for marketing copy if needed

---

### Detail/Feature Shot

Highlights specific product features.

```
Close-up detail shot of [specific feature] on [product],
macro product photography, [feature] clearly visible,
shallow depth of field on [feature], professional lighting,
technical detail showcase
```

---

### Lifestyle/Context Shot

Product in use or realistic setting.

```
[Product] in [specific setting], lifestyle product photography,
[person using/product on surface/in environment],
natural lighting, authentic scene, editorial quality,
aspirational but believable context
```

---

### Group/Collection Shot

Multiple products or variants together.

```
Product collection shot, [multiple products] arranged together,
professional studio photography, cohesive styling,
group composition, clear hierarchy with [hero product] prominent,
commercial catalog quality
```

---

### Flat Lay

Top-down arrangement, popular for social media.

```
Flat lay photography, [product] arranged with [complementary items],
top-down view, [surface material], organized aesthetic,
styled composition, editorial product photography
```

---

### Scale/Size Reference

Shows product size with familiar objects.

```
[Product] with scale reference, shown next to [familiar object],
size comparison photography, clear proportion,
professional lighting, clean background
```

---

## Product Category Deep Dives

### Electronics & Tech

**Challenges:** Reflective surfaces, screens, small details
**Opportunities:** Premium tech aesthetic, innovation positioning

```
[Electronic product] professional tech photography,
controlled reflections on metallic/glass surfaces,
screen displaying [content or off], subtle rim lighting on edges,
dark gradient background, premium technology aesthetic,
clean minimal composition, commercial advertising quality
```

**Lighting for tech:**
```
+ subtle rim lighting on edges for dimension
+ controlled reflections (not eliminated, controlled)
+ gradient lighting on screens
+ separation light from background
```

**Common tech products:**
- Headphones: Show both ear cups, cable management, premium materials
- Phones/tablets: Screen content matters, show thinness
- Laptops: Screen angle, keyboard visible, premium materials
- Speakers: Show driver details, premium finishes
- Wearables: Show on wrist/body for scale

---

### Fashion & Apparel

**Challenges:** Fabric texture, accurate colors, shape/drape
**Opportunities:** Lifestyle aspiration, styling context

```
[Apparel item] fashion product photography,
visible fabric texture, accurate [color] reproduction,
natural draping/structure, [styled flat/on model/on hanger],
professional fashion lighting, editorial quality
```

**Key considerations:**
- **Flat lay:** Good for details, pattern visibility
- **On mannequin/form:** Shows structure without model
- **On model:** Highest aspiration, shows fit and movement
- **Hanging:** Simple, shows drape naturally

**Fabric-specific additions:**
- Silk/satin: `+ subtle sheen, controlled highlights, luxurious drape`
- Denim: `+ visible texture and weave, authentic blue tones`
- Leather: `+ rich material quality, subtle surface texture`
- Knitwear: `+ visible knit pattern, cozy texture, soft lighting`

---

### Food & Beverage

**Challenges:** Appetite appeal, freshness, color accuracy
**Opportunities:** Sensory triggers, desire creation

```
[Food/beverage product] professional food photography,
appetizing presentation, [steam/condensation/freshness cues],
natural daylight aesthetic, [surface/props],
editorial food styling, commercial quality
```

**Food photography essentials:**
- **Steam:** Shows freshness, warmth (for hot items)
- **Condensation:** Shows coldness, refreshment (for beverages)
- **Garnish:** Fresh herbs, citrus, adds life
- **Imperfection:** Slight drips, crumbs = authenticity

**Lighting for food:**
```
soft overhead natural daylight feel,
backlit for steam visibility,
side lighting for texture,
warm tones for appetite appeal
```

---

### Beauty & Cosmetics

**Challenges:** Color accuracy, texture rendering, premium feel
**Opportunities:** Aspirational beauty, sensory luxury

```
[Beauty product] professional cosmetic photography,
clean premium aesthetic, [product details visible],
soft diffused beauty lighting, [color] accurate rendering,
luxury cosmetic branding, commercial advertising quality
```

**Product-specific approaches:**
- **Lipstick/makeup:** Show color accurately, often swatched
- **Skincare:** Clean, clinical or spa-like depending on brand
- **Perfume:** Aspirational, often abstract/artistic
- **Haircare:** Often lifestyle with results implied

**Textures to showcase:**
```
+ visible product texture (cream, gel, powder, liquid)
+ packaging material quality
+ applicator/closure details
```

---

### Jewelry & Watches

**Challenges:** Reflections, sparkle, small scale
**Opportunities:** Ultimate luxury positioning

```
[Jewelry/watch] luxury product photography,
controlled reflections with intentional sparkle,
[metal type] surface quality, premium black/gradient background,
rim lighting on metal edges, macro detail visible,
high-end commercial jewelry photography
```

**Jewelry lighting formula:**
```
+ main light for overall exposure
+ rim/edge light for metal definition
+ small accent light for sparkle on stones
+ gradient background for depth
```

**Watch-specific:**
- Show time as 10:10 (traditional, balanced look)
- Highlight dial details, hands, indices
- Show case thickness and finishing
- Crown and pushers visible

---

### Home & Furniture

**Challenges:** Scale, context, room integration
**Opportunities:** Lifestyle aspiration, room transformation

```
[Furniture/home item] interior product photography,
shown in [styled room setting], professional interior photography,
natural window lighting, lifestyle context,
aspirational home aesthetic, editorial interiors quality
```

**Key considerations:**
- Show scale with familiar objects
- Style with complementary decor (not competing)
- Realistic room settings > white void
- Lifestyle aspiration = desire creation

---

## Lighting Mastery

Lighting is the difference between amateur and professional product photography.

### Studio Lighting Setups

**Three-Point (Classic):**
```
three-point lighting setup:
- key light from upper left (main illumination)
- fill light from right (soften shadows)
- rim light from behind (edge separation)
```

**Single Source (Dramatic):**
```
single dramatic spotlight from [direction],
deep shadows, high contrast, gradient falloff,
premium moody aesthetic
```

**Soft Diffused (Beauty):**
```
soft diffused overhead lighting,
large soft box, minimal shadows,
even illumination, beauty product aesthetic
```

**Rim/Edge (Definition):**
```
strong rim lighting from behind,
edge definition on product silhouette,
glowing outline effect, dark background
```

### Natural Lighting Setups

**Window Light (Lifestyle):**
```
natural window lighting from [side],
soft diffused daylight, organic shadows,
lifestyle photography aesthetic
```

**Golden Hour (Warm):**
```
golden hour lighting quality,
warm directional light, long soft shadows,
aspirational warmth
```

**Overcast (Even):**
```
soft overcast natural light,
even illumination, no harsh shadows,
diffused daylight aesthetic
```

### Lighting Direction Guide

| Direction | Effect | Best For |
|-----------|--------|----------|
| Front | Flat, even, safe | E-commerce basics |
| 45-degree side | Depth, dimension | Most products |
| Side (90-degree) | Dramatic texture | Textured items |
| Back | Silhouette, glow | Drama, beverages |
| Top (overhead) | Food, flat lay | Food, accessories |
| Under | Dramatic, unusual | Creative/artistic |

---

## Background & Staging

### Studio Backgrounds

**Pure White (#FFFFFF):**
```
on pure white background, seamless backdrop,
no shadows (or: soft drop shadow),
e-commerce clean aesthetic
```
*Best for: Amazon, Shopify, catalog, transparent backgrounds*

**Light Gray Gradient:**
```
on light gray gradient background,
subtle depth, soft shadow beneath product,
professional studio aesthetic
```
*Best for: Website heroes, professional presentations*

**Dark Gradient:**
```
against dark charcoal gradient background,
dramatic studio lighting, premium aesthetic,
product highlighted against dark
```
*Best for: Premium/luxury positioning, tech products*

**Colored Backdrop:**
```
against [color] background,
complementary or brand-aligned color,
bold product presentation
```
*Best for: Brand campaigns, social media*

### Surface Staging

**Marble:**
```
on white marble surface, elegant staging,
luxury product photography, subtle veining
```

**Wood:**
```
on [oak/walnut/rustic] wood surface,
warm organic aesthetic, natural grain visible
```

**Concrete:**
```
on concrete surface, industrial aesthetic,
modern minimal, textured background
```

**Fabric/Linen:**
```
on [white/neutral] linen fabric,
soft organic texture, lifestyle aesthetic
```

### Props & Styling

**Rule:** Props enhance, never compete.

**Good props:**
- Complementary materials (leaves for natural products)
- Lifestyle context items (coffee cup near morning product)
- Scale references (hand, familiar objects)
- Brand-aligned accessories

**Bad props:**
- Competing products
- Distracting colors
- Unrelated items
- Too many elements

---

## Composition Principles

### Rule of Thirds

```
product positioned at rule of thirds intersection,
not centered, dynamic composition,
visual interest through placement
```

### Centered (Hero)

```
product centered in frame,
symmetrical composition, hero positioning,
commanding central presence
```

### Negative Space (Text Room)

```
product positioned [left/right/lower],
negative space on [opposite side] for text overlay,
marketing composition, headline room
```

### Angle Guide

| Angle | Effect | Best For |
|-------|--------|----------|
| Eye level | Relatable, natural | Most products |
| Slightly above | Overview, context | Collections, scenes |
| Slightly below | Powerful, imposing | Premium, hero |
| 45-degree | Classic product shot | E-commerce |
| Top-down | Flat lay, pattern | Food, accessories |
| Macro/close | Detail, texture | Features, quality |

---

## Platform-Specific Optimization

### Amazon / E-commerce

```
Requirements:
- Main image: Pure white background
- 85%+ frame fill
- No text, graphics, or watermarks
- 1000x1000 minimum (1500x1500 preferred)
- RGB color

Prompt addition:
+ Amazon product listing optimized, pure white background,
product fills 85% of frame, no props or text,
e-commerce compliant, commercial product photography
```

### Shopify / DTC Website

```
More creative freedom than Amazon.
- Hero images can have context
- Lifestyle images encouraged
- Brand aesthetic consistent

Prompt addition:
+ e-commerce hero shot, [brand aesthetic] style,
website product page optimized, commercial quality
```

### Instagram / Social

```
- 1:1 or 4:5 aspect ratio
- Scroll-stopping visuals
- Lifestyle context often better
- Bold colors perform

Prompt addition:
+ Instagram product photography, [1:1/4:5] composition,
scroll-stopping visual, social media optimized,
lifestyle context, bold engaging aesthetic
```

### Hero Banner (Website)

```
- 16:9 or wider aspect ratio
- Space for text overlay
- Product as hero element
- Brand-aligned styling

Prompt addition:
+ hero banner product shot, 16:9 landscape composition,
product as hero element, space for headline on [side],
website banner optimized, marketing asset
```

### Pinterest

```
- 2:3 vertical (1000x1500)
- Aspirational lifestyle
- Text overlays work here
- Save-worthy aesthetic

Prompt addition:
+ Pinterest product pin, vertical 2:3 composition,
aspirational lifestyle photography, save-worthy visual,
space for text overlay, editorial product aesthetic
```

---

## Multi-Shot Consistency Technique

When generating multiple product photos (across shot types, angles, or campaign variants), visual consistency is critical. Inconsistent lighting, color temperature, or angle across images looks amateur and breaks brand trust.

### The Consistency Lock

Before generating any set of related images, establish and lock these parameters:

```markdown
## Consistency Lock — [Product Name]

**Lighting:**
- Type: [e.g., three-point studio, soft diffused, natural window]
- Direction: [e.g., key from upper left, fill from right]
- Temperature: [e.g., neutral 5500K, warm 3500K, cool 6500K]
- Mood: [e.g., bright and clean, dramatic and moody, warm and inviting]

**Color:**
- Color temperature keyword: [e.g., "neutral white balance", "warm golden tones", "cool blue cast"]
- Product color accuracy: [specific hex or color names for product colors]
- Background tone: [specific color/gradient]

**Camera:**
- Distance: [e.g., medium shot, close-up, wide establishing]
- Height: [e.g., eye level, slightly above, overhead]
- Lens feel: [e.g., "85mm portrait lens feel", "macro close-up", "wide angle"]

**Styling:**
- Surface: [specific material]
- Props: [specific items, or none]
- Background: [specific setup]

**Seed Strategy:**
- Base seed: [number] (use same seed across shots for maximum consistency)
- Vary only: [what changes between shots — angle, crop, props]
```

### Applying the Lock Across Shots

Once locked, every prompt in the set includes the locked parameters as a prefix or suffix:

```
[SHOT-SPECIFIC CONTENT],
[LOCKED LIGHTING], [LOCKED COLOR TEMPERATURE],
[LOCKED BACKGROUND], [LOCKED STYLING],
[LOCKED QUALITY TERMS]
```

**Example — 4-shot consistent set:**

```
Lock: warm studio lighting from upper left, neutral white balance,
light gray gradient background, marble surface, premium commercial quality

Shot 1 (Hero):
Premium wireless headphones hero shot, product centered,
warm studio lighting from upper left, neutral white balance,
light gray gradient background, marble surface, premium commercial quality

Shot 2 (Detail):
Close-up of ear cushion texture on premium wireless headphones,
shallow depth of field, warm studio lighting from upper left,
neutral white balance, light gray gradient background,
marble surface, premium commercial quality

Shot 3 (Lifestyle):
Premium wireless headphones on modern desk workspace,
warm studio lighting from upper left, neutral white balance,
light gray gradient background visible through scene,
premium commercial quality

Shot 4 (Flat Lay):
Premium wireless headphones flat lay with carrying case and cable,
warm studio lighting from upper left, neutral white balance,
marble surface, top-down composition, premium commercial quality
```

### Seed Locking for Maximum Consistency

For the tightest visual consistency, use the `seed` parameter from MODEL_REGISTRY.md:

1. Generate the first image (hero shot) without a seed
2. If the result is good, note the generation — use that image as the style anchor
3. For subsequent shots, use a fixed seed value and vary only the shot-specific content
4. Same seed + similar prompt structure = consistent lighting, color grading, and rendering style

**Important:** Seed ensures consistency only when prompts are structurally similar. Drastically different prompts will diverge even with the same seed. Keep the locked parameters identical across all prompts.

---

## Complete Shoot Mode

**One command produces an entire product photo set.** Instead of generating shots one at a time, the complete shoot dispatches all shot types in parallel using Claude Code task agents.

### What Gets Generated

A complete shoot produces 5 images in parallel:

| Shot | Type | Aspect Ratio | Purpose |
|------|------|-------------|---------|
| 1 | Hero Shot | 16:9 | Primary marketing image, headline space |
| 2 | Detail/Feature | 1:1 | Close-up of key selling feature |
| 3 | Lifestyle | 4:5 | Product in real-world context |
| 4 | Flat Lay | 1:1 | Top-down with complementary items |
| 5 | Scale Reference | 1:1 | Size context with familiar object |

### How to Trigger

User says any of:
- "Do a complete shoot for [product]"
- "Full product shoot"
- "Generate all shot types for [product]"
- "Complete photo set"

### Execution Flow

```
COMPLETE SHOOT WORKFLOW

Step 1: Gather Product Brief
├─ Product name and description
├─ Key features to highlight
├─ Target platform(s)
├─ Brand kit loaded? (if not, prompt for it)
└─ Style preference (or run style exploration first)

Step 2: Establish Consistency Lock
├─ Lock lighting, color temp, background, styling
├─ Document in consistency lock format
└─ All 5 agents will read this lock

Step 3: Dispatch 5 Parallel Agents
├─ Agent 1: Hero shot (16:9)
├─ Agent 2: Detail shot (1:1)
├─ Agent 3: Lifestyle shot (4:5)
├─ Agent 4: Flat lay (1:1)
└─ Agent 5: Scale reference (1:1)

Each agent:
  1. Reads brand kit (creative-kit.md)
  2. Reads consistency lock
  3. Constructs shot-specific prompt
  4. Calls MODEL_REGISTRY.md image API
  5. Saves to ./campaigns/{product}/photos/{shot-type}/
  6. Reports back with URL + quality assessment

Step 4: Present All 5 Results
├─ Display all shots in a grid review
├─ Note any consistency issues
├─ Offer per-shot iteration or full reshoot
└─ Run e-commerce compliance check if needed

Step 5: Iterate or Approve
├─ Replace individual shots that need work
├─ Approve complete set
└─ Export to campaigns directory
```

### Complete Shoot Output Template

```markdown
## Complete Shoot — [Product Name]

### Consistency Lock Applied
- Lighting: [locked setup]
- Color Temperature: [locked temp]
- Background: [locked background]
- Surface: [locked surface]

---

### Shot 1: Hero
![Hero](url)
**Aspect Ratio:** 16:9
**Prompt:** > [prompt used]
**Status:** Pending review

### Shot 2: Detail
![Detail](url)
**Aspect Ratio:** 1:1
**Feature Highlighted:** [feature]
**Prompt:** > [prompt used]
**Status:** Pending review

### Shot 3: Lifestyle
![Lifestyle](url)
**Aspect Ratio:** 4:5
**Setting:** [context]
**Prompt:** > [prompt used]
**Status:** Pending review

### Shot 4: Flat Lay
![Flat Lay](url)
**Aspect Ratio:** 1:1
**Styled With:** [items]
**Prompt:** > [prompt used]
**Status:** Pending review

### Shot 5: Scale Reference
![Scale](url)
**Aspect Ratio:** 1:1
**Reference Object:** [object]
**Prompt:** > [prompt used]
**Status:** Pending review

---

**Actions:**
- [ ] Approve all shots
- [ ] Iterate on specific shot(s): [list numbers]
- [ ] Reshoot with different style
- [ ] Run e-commerce compliance check
- [ ] Export to campaigns directory
```

### Wall-Clock Time

Because all 5 shots generate in parallel, total time equals the slowest single generation (typically 15-40 seconds per image), not the sum. A full 5-image shoot completes in under 1 minute.

---

## E-Commerce Compliance Checker

Before delivering product photos for marketplace listings, validate against platform-specific requirements. Non-compliant images get rejected by automated listing systems or perform poorly in search.

### Amazon Product Image Requirements

| Requirement | Rule | How to Check |
|-------------|------|-------------|
| Background | Pure white (RGB 255,255,255) | Prompt must include "pure white background" |
| Frame fill | Product fills 85%+ of image | Prompt must include "product fills 85% of frame" |
| Text/graphics | No text, logos, watermarks, or overlays | Prompt must NOT include text overlay instructions |
| Borders | No borders, insets, or additional images | Single product, clean edges |
| Color mode | RGB (not CMYK) | Use PNG or JPG output format |
| Minimum size | 1000x1000 pixels (1500x1500 preferred) | Model generates at sufficient resolution natively |
| Main image | Product only, no accessories unless included in sale | Remove lifestyle props for main listing image |
| Additional | Lifestyle, infographic, size chart allowed | Shots 2-7 in listing can include context |

### Shopify Product Image Requirements

| Requirement | Rule | How to Check |
|-------------|------|-------------|
| Recommended size | 2048x2048 pixels | Model generates at sufficient resolution |
| Aspect ratio | Square (1:1) recommended for consistency | Set aspect_ratio to "1:1" |
| File format | JPEG, PNG, GIF, WebP | Use output_format "png" or "jpg" |
| File size | Under 20MB | PNG at model resolution is well within this |
| Background | Consistent across all products (white recommended) | Lock background in consistency settings |
| Multiple angles | 3-5 images per product recommended | Use complete shoot mode |

### Compliance Check Workflow

Run this check after generation, before delivery:

```
E-COMMERCE COMPLIANCE CHECK

Product: [name]
Platform: [Amazon / Shopify / Both]
Shot Type: [main listing / secondary / lifestyle]

Amazon Main Image:
□ Pure white background (no gray, no gradient, no color)
□ Product fills 85%+ of frame
□ No text, logos, or watermarks in image
□ No borders or inset images
□ Single product (no lifestyle props)
□ Product is the actual product (not illustration/drawing)
□ Sharp focus, professional quality
□ Correct color representation

Amazon Secondary Images:
□ May include lifestyle context
□ May include text overlays / infographics
□ May show size/scale references
□ Must still be professional quality
□ No offensive or misleading content

Shopify:
□ Square aspect ratio (1:1)
□ Consistent background across all product images
□ Minimum 3 images per product
□ High resolution (2048x2048 target)
□ Fast-loading file size

Result: [PASS / FAIL — list specific failures]
Action: [Re-generate with corrected prompt / Approve as-is]
```

### Auto-Correcting Non-Compliant Prompts

If the compliance check fails, auto-correct the prompt:

| Failure | Auto-Correction |
|---------|----------------|
| Background not white | Append: "on pure white background, seamless white backdrop, RGB 255 255 255" |
| Product too small | Append: "product fills 85 percent of frame, tight crop on product" |
| Contains text/graphics | Remove any text overlay instructions from prompt |
| Has lifestyle props | Remove prop/context instructions, add "product only, no props" |
| Not sharp enough | Append: "ultra-sharp focus, high resolution, professional product photography" |
| Colors look off | Append: "accurate color rendering, true-to-life colors, neutral white balance" |

---

## File Output Conventions

### Directory Structure

All product photo outputs are saved to organized directories under the project root:

```
./campaigns/{product-name}/photos/
├── hero/
│   └── hero-{product}-16x9-v1.png
├── detail/
│   └── detail-{feature}-1x1-v1.png
├── lifestyle/
│   └── lifestyle-{setting}-4x5-v1.png
├── ecommerce/
│   └── ecommerce-{product}-1x1-v1.png
├── flat-lay/
│   └── flatlay-{product}-1x1-v1.png
├── scale/
│   └── scale-{product}-1x1-v1.png
└── explorations/
    ├── direction-1.png
    ├── direction-2.png
    ├── direction-3.png
    ├── direction-4.png
    └── direction-5.png
```

### Naming Convention

```
[shot-type]-[descriptor]-[aspect-ratio]-[version].ext

Examples:
hero-wireless-headphones-16x9-v1.png
detail-ear-cushion-1x1-v1.png
lifestyle-desk-workspace-4x5-v1.png
ecommerce-main-listing-1x1-v1.png
flatlay-accessories-1x1-v1.png
scale-hand-reference-1x1-v1.png
```

### Saving Generated Images

After each successful generation:

1. Download the image from the Replicate output URL
2. Save to the correct subdirectory under `./campaigns/{product}/photos/`
3. Use the naming convention above
4. If iterating, increment the version number (v1 -> v2 -> v3)
5. Keep all versions — do not overwrite previous iterations

### Campaign Export

When a complete shoot is approved, the full set lives at:

```
./campaigns/{product-name}/photos/
```

This path is referenced by other skills (ad-creative, social-graphics, content-atomizer) when they need product imagery for downstream assets.

---

## Execution Workflow

### Step 1: Gather Requirements

```
[ ] What product? (specific details, materials, features)
[ ] What use case? (Amazon, hero banner, social, etc.)
[ ] What style? (or need style exploration?)
[ ] What aspect ratio?
[ ] Text space needed?
[ ] Brand colors/aesthetic?
[ ] Reference images available?
[ ] Complete shoot or single shot?
```

### Step 2: Style Exploration (if new product/brand)

Generate 5 different visual approaches, pick winner, extract principles.

### Step 3: Construct Prompt

Use the formula:
```
[Product specific description] + [Shot type] + [Lighting] +
[Background/staging] + [Composition] + [Quality boosters] +
[Platform optimization]
```

### Step 4: Generate

Refer to `references/MODEL_REGISTRY.md` for the current image generation payload. Construct the API call with your prompt and the verified payload structure.

```
Model: [see MODEL_REGISTRY.md → Image Generation → Default Model]
Payload: [see MODEL_REGISTRY.md → Verified API Payload]
Inputs: prompt, aspect_ratio, output_format, output_quality
```

If using a reference image, add `image_input` to the payload per MODEL_REGISTRY.md specifications.

### Step 5: Review & Iterate

**Check against requirements:**
- Product accurately represented?
- Correct lighting mood?
- Background works?
- Composition effective?
- Platform requirements met?

**Common iteration adjustments:**
```
Too dark → add "bright, well-lit, high key"
Too cluttered → add "minimal, clean, simple"
Wrong angle → specify angle explicitly
Reflections wrong → add "controlled reflections"
Not premium enough → add "luxury, premium, high-end"
```

### Step 6: Approve or Variant

- If approved → Save to `./campaigns/{product}/photos/` and deliver final
- If close → Iterate with adjustments
- If fundamentally wrong → New prompt approach

---

## Quality Checklist

### Technical Quality
- [ ] Resolution sufficient for intended use
- [ ] No obvious AI artifacts (weird reflections, melted details)
- [ ] Sharp focus on product
- [ ] Appropriate for platform requirements

### Product Accuracy
- [ ] Product features clearly visible
- [ ] Colors accurate to actual product
- [ ] Scale/proportions correct
- [ ] Key selling points highlighted

### Commercial Quality
- [ ] Looks professionally photographed
- [ ] Lighting creates depth and dimension
- [ ] Background supports (not competes with) product
- [ ] Composition is intentional

### Platform Fit
- [ ] Correct aspect ratio
- [ ] Meets platform requirements (Amazon white, etc.)
- [ ] Style matches platform expectations
- [ ] Text space if needed

### Brand Consistency (v2)
- [ ] Colors match creative-kit.md palette
- [ ] Style matches locked visual principles
- [ ] Consistent with other shots in the set
- [ ] Mood aligns with brand personality

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Looks obviously AI | Generic prompt | Add specific commercial photography terms |
| Wrong reflections | Not controlled | Add "controlled reflections, professional lighting" |
| Flat lighting | No direction | Specify lighting direction and type |
| Product unclear | Too much context | Simplify, focus on product |
| Wrong scale | No reference | Add scale context or familiar objects |
| Colors off | Model interpretation | Be very specific about colors |
| Too perfect | Hyperreal rendering | Add subtle imperfection cues if needed |
| Wrong background | Default used | Explicitly specify background |
| Not commercial | Missing quality terms | Add "commercial, advertising, professional" |
| Competing elements | Props too prominent | Simplify staging, props should be subtle |
| Inconsistent set | No consistency lock | Apply multi-shot consistency technique |
| Amazon rejection | Non-compliant image | Run e-commerce compliance checker |
| Style drift across shots | Different prompts diverge | Use seed locking + identical locked parameters |

---

## Output Format

```markdown
## Product Photo Generated

**Product:** [name]
**Shot Type:** [hero/detail/lifestyle/etc.]
**Style:** [visual approach]
**Aspect Ratio:** [ratio]
**Saved To:** ./campaigns/[product]/photos/[shot-type]/[filename]

**Image URL:** [URL]

**Prompt Used:**
> [full prompt for reference]

**Quality Check:**
- [ ] Product accurate
- [ ] Lighting effective
- [ ] Background appropriate
- [ ] Platform requirements met
- [ ] Brand kit aligned
- [ ] E-commerce compliant (if applicable)

**Feedback?**
- Product representation accurate?
- Lighting/mood right?
- Background works?
- Ready to approve or iterate?

**Options:**
- [ ] Approve this shot
- [ ] Iterate (specify changes)
- [ ] Generate different angle
- [ ] Try different style approach
- [ ] Run complete shoot (all 5 shot types)
- [ ] Run e-commerce compliance check
```

---

## Integration with Creative Engine

```
PRODUCT PHOTO PIPELINE (v2)

┌─────────────────────────────────────────┐
│  Request arrives                        │
│  → From creative SKILL.md (mode 1)     │
│  → Or direct invocation                 │
│  → Clarify product and requirements     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Brand Kit Check                        │
│  → Load ./brand/creative-kit.md        │
│  → If missing, prompt user to create    │
│  → Apply brand colors/style to prompts  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Style Exploration (if needed)          │
│  → Generate 5 different approaches      │
│  → User selects winner                  │
│  → Extract principles for consistency   │
│  → Save explorations to campaigns dir   │
└─────────────────────────────────────────┘
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
┌──────────────────┐  ┌──────────────────────┐
│  Single Shot     │  │  Complete Shoot       │
│  → One prompt    │  │  → 5 parallel agents  │
│  → One image     │  │  → Consistency lock   │
│  → Quick iterate │  │  → Full product set   │
└──────────────────┘  └──────────────────────┘
          │                    │
          └─────────┬──────────┘
                    ▼
┌─────────────────────────────────────────┐
│  Product Photo Mode (THIS FILE)         │
│  → Construct platform-optimized prompt  │
│  → Reference MODEL_REGISTRY.md for API  │
│  → Generate image(s)                    │
│  → Review against quality checklist     │
│  → Run compliance check (if e-commerce) │
│  → Iterate as needed                    │
└─────────────────────────────────────────┘
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
┌──────────────────┐  ┌──────────────────┐
│  Save & Deliver  │  │  Route to Video  │
│  → Save to       │  │  → Product video │
│    campaigns dir │  │    mode for      │
│  → Export ready  │  │    animation     │
└──────────────────┘  └──────────────────┘
```

---

## Handoff Protocols

### Receiving from Creative Engine (SKILL.md)

```yaml
Receive:
  product: "[what product]"
  category: "[electronics/fashion/food/etc.]"
  shot_type: "[hero/detail/lifestyle/etc.]"
  platform: "[Amazon/Instagram/hero banner/etc.]"
  style: "[if established]"
  brand_kit: "[path to creative-kit.md]"
  reference_image: "[URL if provided]"
  text_space: true/false
  complete_shoot: true/false
```

### Returning to Creative Engine

```yaml
Return:
  status: "complete" | "needs_iteration" | "needs_different_approach"
  deliverables:
    - path: "./campaigns/[product]/photos/[type]/[filename]"
      url: "[image URL]"
      shot_type: "[type]"
      aspect_ratio: "[ratio]"
      prompt_used: "[prompt]"
      compliance: "pass" | "fail" | "not_checked"
  additional_shots_available: true/false
  consistency_lock: "[lock parameters if established]"
```

### Routing to Video Mode

```yaml
Route to product-video mode:
  image_url: "[approved product image URL]"
  image_path: "./campaigns/[product]/photos/hero/[filename]"
  product: "[product name]"
  animation_type: "[reveal/360/floating/etc.]"
  platform: "[destination platform]"
  consistency_lock: "[carry forward from photo shoot]"
```

### Routing to Ad Creative Mode

```yaml
Route to ad-creative mode:
  product_photos:
    hero: "./campaigns/[product]/photos/hero/[filename]"
    lifestyle: "./campaigns/[product]/photos/lifestyle/[filename]"
    detail: "./campaigns/[product]/photos/detail/[filename]"
  product: "[product name]"
  campaign_goal: "[awareness/conversion/etc.]"
  platforms: ["Facebook", "Instagram", "Google Display"]
```

---

## Pro Tips from Commercial Photography

### What Actually Sells

1. **Show the benefit, not just the product** — Headphones in use > headphones floating
2. **Lighting creates desire** — Dramatic lighting = premium perception
3. **Context triggers imagination** — "I could use that here"
4. **Details signal quality** — Close-ups show craftsmanship
5. **Consistency builds brand** — Same style across all product shots

### Common Amateur Mistakes

1. **Flat front lighting** — Use directional light for depth
2. **Random backgrounds** — Match background to positioning
3. **Product too small** — Fill the frame (especially e-commerce)
4. **Competing props** — Props enhance, never distract
5. **Inconsistent style** — Build a system, not one-offs

### The 80/20 of Product Photography

80% of results come from:
1. Specific product description in prompt
2. Appropriate lighting direction/type
3. Background that supports positioning
4. Platform-correct composition

Get these four right and you'll outperform most AI product photos.

### v2 Additions to the 80/20

The remaining 20% that separates good from great:
5. Multi-shot consistency (same light, same temp, same mood across all images)
6. Reference image guidance (build on proven results, not from scratch)
7. E-commerce compliance (no rejected listings, no wasted time)
8. Complete shoot workflow (full product set in one command, not five separate sessions)

---

## Example Prompts (Complete)

### Tech Hero Shot
```
Premium wireless over-ear headphones hero shot,
silver and black colorway, soft padding visible,
floating against dark charcoal gradient background,
dramatic single spotlight from upper left,
subtle rim lighting on edges, metallic surface reflections controlled,
negative space on right for headline,
commercial technology advertising photography,
ultra-detailed, professional quality, 16:9 composition
```

### Skincare E-commerce
```
Luxury skincare serum bottle product photography,
glass bottle with dropper, golden serum visible,
on pure white background, Amazon listing optimized,
soft diffused studio lighting, product fills 85% of frame,
clean minimal composition, accurate color rendering,
commercial beauty product photography, 1:1 square
```

### Food Lifestyle
```
Artisan coffee bag product in lifestyle setting,
kraft paper bag with window showing beans,
on rustic wooden kitchen counter, morning light through window,
fresh coffee beans scattered, ceramic mug nearby,
lifestyle food photography, warm inviting tones,
editorial quality, aspirational home aesthetic
```

### Jewelry Macro
```
Diamond engagement ring luxury photography,
platinum band, brilliant cut center stone,
extreme detail macro shot, sparkle on facets,
black gradient background, controlled reflections,
rim lighting on metal edges, jeweler quality detail,
high-end commercial jewelry photography
```

### Fashion Flat Lay
```
Premium leather wallet flat lay photography,
brown full-grain leather, visible stitching detail,
on white marble surface, minimalist styling,
styled with brass key holder and pen,
top-down composition, editorial menswear aesthetic,
soft even lighting, luxury accessories photography
```

### Complete Shoot Prompt Set (Consistent)

This example shows all 5 prompts for a complete shoot with consistency lock applied:

```
CONSISTENCY LOCK:
- Lighting: soft three-point studio lighting, key from upper left
- Color temp: neutral white balance, 5500K daylight
- Background: light gray gradient
- Surface: white marble
- Quality: commercial advertising photography, ultra-detailed, sharp focus

---

Shot 1 — Hero (16:9):
Premium ceramic pour-over coffee dripper hero shot,
matte white glaze, wooden collar detail,
centered composition with negative space on right for text,
soft three-point studio lighting key from upper left,
neutral white balance, light gray gradient background,
white marble surface, commercial advertising photography,
ultra-detailed, sharp focus

Shot 2 — Detail (1:1):
Close-up of wooden collar and ceramic join on pour-over coffee dripper,
visible wood grain and glaze texture, shallow depth of field,
soft three-point studio lighting key from upper left,
neutral white balance, light gray gradient background,
white marble surface, commercial advertising photography,
ultra-detailed, sharp focus

Shot 3 — Lifestyle (4:5):
Ceramic pour-over coffee dripper on kitchen counter,
morning coffee ritual scene, fresh brewed coffee dripping,
steam rising, natural window light supplemented by
soft three-point studio lighting key from upper left,
neutral white balance, aspirational home aesthetic,
commercial advertising photography, ultra-detailed, sharp focus

Shot 4 — Flat Lay (1:1):
Ceramic pour-over coffee dripper flat lay arrangement,
with paper filters, coffee beans, wooden scoop, and mug,
top-down composition, soft three-point studio lighting key from upper left,
neutral white balance, light gray gradient background,
white marble surface, styled editorial,
commercial advertising photography, ultra-detailed, sharp focus

Shot 5 — Scale Reference (1:1):
Ceramic pour-over coffee dripper next to standard coffee mug,
size comparison clearly visible, both items on white marble surface,
soft three-point studio lighting key from upper left,
neutral white balance, light gray gradient background,
commercial advertising photography, ultra-detailed, sharp focus
```

---

## Reference Image Examples

### Style Transfer from Brand Photo

```
User provides: Existing brand product photo with specific lighting/mood
Goal: New product in the same visual style

Prompt: "Premium bluetooth speaker product photography,
matching the warm editorial style of the reference image,
same lighting direction and color grading,
same background treatment and composition approach,
commercial advertising quality"

API: Include image_input parameter per MODEL_REGISTRY.md
```

### Enhancement of Physical Photo

```
User provides: Phone photo of their actual product
Goal: Professional-quality version

Prompt: "Professional product photography of [product from reference],
upgraded to commercial studio quality,
three-point studio lighting, clean background,
sharp focus, color-corrected, professional retouching aesthetic"

API: Include image_input parameter per MODEL_REGISTRY.md
```

### Variation Generation

```
User provides: Approved product photo they want variants of
Goal: Same product, different angles/contexts

Prompt: "Same product as reference image but from [new angle],
in [new setting], maintaining the same lighting quality
and color temperature, consistent commercial style"

API: Include image_input parameter per MODEL_REGISTRY.md
```

---

*This mode is part of the Vibe Marketing Skills v2 creative engine. It is loaded by `creative/SKILL.md` when the user selects mode 1 (Product Photos). All model configurations are maintained in `references/MODEL_REGISTRY.md` — never hardcode model IDs in this file.*
