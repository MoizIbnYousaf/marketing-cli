# Product Video Mode

Transform static product images into cinematic video content. This mode handles product reveals, animated hero shots, 360 showcases, and e-commerce video — all the video types that make products feel premium and desirable.

**Loaded by:** `creative/SKILL.md` when user selects mode 2 (Product Video).
**Model selection:** Handled by `references/MODEL_REGISTRY.md` — never hardcode model IDs in prompts or workflows.
**Brand consistency:** Reads from `./brand/creative-kit.md` before every generation.
**File output:** All deliverables saved to `./campaigns/{product}/video/`

---

## Why This Mode Exists

**The problem:** Video content converts dramatically better than static images, but:
1. Traditional product video requires expensive shoots
2. Most AI video prompts produce generic, floaty results
3. Different platforms need different video styles
4. Wrong motion can cheapen even premium products
5. Each video model has a different API interface, making multi-model comparison error-prone
6. No single model wins every prompt — quality depends on the specific content

**The solution:** A systematic approach that:
- Uses proven commercial motion styles
- Matches motion to product category and positioning
- Leverages multi-model generation for quality selection
- Anchors animation to approved static images (I2V workflow)
- References MODEL_REGISTRY.md for all API payloads (never hardcodes model names)
- Runs parallel multi-model generation and lets the user pick the winner
- Plans multi-clip sequences that edit together into longer pieces
- Tracks estimated generation cost per model before execution

---

## Model Selection

**Do NOT hardcode model IDs.** Always refer to `references/MODEL_REGISTRY.md` for the current default video model and its verified API payload.

As of this writing, the three video models available are:

| Role | Model | Registry Section | Estimated Cost (5s clip) |
|------|-------|-----------------|--------------------------|
| **Default** | Kling 2.5 Turbo Pro | Video Generation > Default Model | ~$0.40 |
| **Comparison** | Google Veo 3.1 | Video Generation > Comparison Model: Google Veo 3.1 | ~$0.80-1.50 |
| **Comparison** | OpenAI Sora 2 | Video Generation > Comparison Model: OpenAI Sora 2 | ~$0.60-1.20 |

### How to Call

1. Open `references/MODEL_REGISTRY.md`
2. Find the **Video Generation** section
3. Copy the verified payload structure for the desired model
4. Insert your constructed motion prompt, source image, and aspect ratio
5. Execute the API call via Replicate
6. For hero content: run all three models in parallel (see Parallel Multi-Model Generation below)

### Cross-Model Parameter Cheat Sheet

Every video model uses different parameter names for the same concept. Always consult MODEL_REGISTRY.md before writing any API call.

| Concept | Kling 2.5 | Veo 3.1 | Sora 2 |
|---------|-----------|---------|--------|
| **Starting image** | `start_image` | `image` | `input_reference` |
| **Duration** | `duration` (5, 10) | `duration` (4, 6, 8) | `seconds` (4-12) |
| **Aspect ratio** | `aspect_ratio` ("16:9") | `aspect_ratio` ("16:9") | `aspect_ratio` ("landscape") |
| **Prompt adherence** | *(removed)* | — | — |
| **Negative prompt** | `negative_prompt` | `negative_prompt` | — |
| **Audio generation** | Not native | `generate_audio` | Native (always on) |
| **Ending frame** | `end_image` | `last_frame` | — |
| **Resolution control** | Fixed 1080p | `resolution` ("720p", "1080p") | Fixed |
| **Reproducibility** | — | `seed` | — |

### Model Strengths and Weaknesses

Refer to MODEL_REGISTRY.md for authoritative details. Summary for prompt-routing decisions:

**Kling 2.5 Turbo Pro (Default):**
- Best motion control, cinematic depth, consistent quality
- Strong prompt adherence
- Best for human subjects and natural motion
- Longer video coherence (5s and 10s)
- Sometimes adds unwanted elements
- Fast camera movements can cause warping at edges

**Google Veo 3.1:**
- Highest fidelity video output
- Can generate matching audio (set `generate_audio: true`)
- Cinematic quality
- Slower generation, higher cost
- Sometimes "interprets" prompts loosely
- No square aspect ratio support

**OpenAI Sora 2:**
- Strong prompt comprehension
- Good motion coherence
- Native audio generation (always on)
- Most variable generation times
- Sometimes over-stylizes
- No square aspect ratio support

### When to Use Which

```
GENERAL PRODUCT → Kling 2.5 (reliable, fast, cheapest)
NEEDS AUDIO → Veo 3.1 (native audio, highest fidelity)
HAS PEOPLE → Kling 2.5 (best human motion)
HERO/FLAGSHIP → Run all 3 in parallel, pick winner
UNCERTAIN → Run all 3 in parallel, pick winner
```

---

## Parallel Multi-Model Generation

For hero content and any case where quality matters more than cost, run the same motion prompt through all three video models simultaneously.

### Why Parallel Beats Sequential

- No single model wins every prompt — the best output varies by content
- Running in parallel takes the same wall-clock time as the slowest model (~6 min)
- Running sequentially would take ~15 minutes for all three
- Total cost for a parallel comparison run: ~$2.20 (see Cost Awareness below)
- Eliminates guessing — present all three, let the user pick

### Parallel Execution Pattern

Use task agents to fire all three API calls simultaneously:

```
PARALLEL GENERATION PLAN
─────────────────────────────────────────────
Task 1: Kling 2.5     → cost ~$0.40, time ~3min
Task 2: Veo 3.1       → cost ~$1.00, time ~5min
Task 3: Sora 2        → cost ~$0.80, time ~6min
─────────────────────────────────────────────
Total:                   ~$2.20, ~6min (parallel)
```

**Steps:**
1. Construct the motion prompt (shared across all models)
2. Translate the prompt into each model's API format (check MODEL_REGISTRY.md for parameter names)
3. Launch all three API calls in parallel
4. Poll for completion (all should finish within ~6 minutes)
5. Present all three outputs side-by-side for user selection

### Translating One Prompt to Three APIs

Given a motion prompt and source image, the payload differs per model. Example for a 16:9 I2V call:

**Kling 2.5 payload (from MODEL_REGISTRY.md):**
```json
{
  "model": "kwaivgi/kling-v2.5-turbo-pro",
  "input": {
    "prompt": "{{motion_prompt}}",
    "start_image": "{{source_image_url}}",
    "duration": 5,
    "aspect_ratio": "16:9"
  }
}
```

**Veo 3.1 payload (from MODEL_REGISTRY.md):**
```json
{
  "model": "google/veo-3.1",
  "input": {
    "prompt": "{{motion_prompt}}",
    "image": "{{source_image_url}}",
    "duration": 8,
    "aspect_ratio": "16:9",
    "resolution": "1080p",
    "generate_audio": true
  }
}
```

**Sora 2 payload (from MODEL_REGISTRY.md):**
```json
{
  "model": "openai/sora-2",
  "input": {
    "prompt": "{{motion_prompt}}",
    "input_reference": "{{source_image_url}}",
    "seconds": 8,
    "aspect_ratio": "landscape"
  }
}
```

**Critical:** Always verify these payloads against MODEL_REGISTRY.md before execution. Parameter names change when models update.

---

## Cost Awareness

Before generating, always estimate and communicate the cost to the user.

### Per-Generation Estimates

| Model | Duration | Estimated Cost | Typical Time |
|-------|----------|---------------|--------------|
| Kling 2.5 | 5s clip | $0.30-0.50 | 2-5min |
| Kling 2.5 | 10s clip | $0.60-1.00 | 4-8min |
| Veo 3.1 | 8s clip (720p) | $0.60-0.80 | 3-6min |
| Veo 3.1 | 8s clip (1080p) | $1.00-1.50 | 5-8min |
| Sora 2 | 8s clip | $0.60-1.20 | 3-10min |

### Common Workflow Cost Estimates

| Workflow | What You Get | Estimated Cost |
|----------|-------------|---------------|
| Single model, single clip | 1 video | ~$0.40-1.20 |
| Parallel comparison (3 models) | 3 videos to compare | ~$2.00-2.50 |
| Multi-style exploration (3 styles x 1 model) | 3 motion approaches | ~$1.20-3.60 |
| Multi-style x multi-model (3 styles x 3 models) | 9 videos to compare | ~$6.00-7.50 |
| Multi-clip stitch (4 clips x 1 model) | 1 edited sequence | ~$1.60-4.80 |
| Full hero production (stitch + comparison) | Complete hero video | ~$5.00-10.00 |

### Cost Communication Template

Before executing, inform the user:

```
ESTIMATED GENERATION COST
─────────────────────────
Models: [list models]
Clips: [number of clips]
Duration per clip: [seconds]
Estimated total: ~$X.XX
Estimated time: ~Xmin (parallel) / ~Xmin (sequential)

Proceed? [Y/n]
```

---

## I2V vs T2V: Why Image-First Wins

### Image-to-Video (I2V) — RECOMMENDED

```
product-photo mode → [approve image] → product-video mode (I2V)
```

**Why I2V is superior for products:**
- Frame 1 is exactly what you approved
- Product appearance locked in
- Motion anchored to known composition
- Easy iteration without changing product
- If video fails, you still have the approved image

### Text-to-Video (T2V)

Only use when:
- No source image available
- Need completely new composition
- Exploring motion concepts before committing to image

T2V requires extremely detailed prompts and often needs multiple attempts.

---

## Motion Style Exploration

**Don't lock into one motion style.** Generate multiple approaches, pick the winner.

### Why Motion Style Matters

The same product animated differently can feel:
- Premium vs cheap
- Innovative vs traditional
- Exciting vs calming
- Professional vs amateur

**One style = hope. Multiple styles = informed choice.**

### 5 Motion Style Directions

For any product, consider these distinct approaches:

```
Style 1 - Slow Reveal (Premium):
Slow cinematic push-in, dramatic lighting shifts,
atmospheric particles, elegant pacing, luxury feel

Style 2 - Orbit Showcase (360):
Camera smoothly orbits product, reveals all angles,
professional product demo, informational

Style 3 - Floating Premium (Tech):
Product floats weightlessly, gentle hover motion,
dreamlike quality, premium tech aesthetic

Style 4 - Dynamic Energy (Bold):
Fast camera moves, dramatic angles, high energy,
sports/action commercial aesthetic

Style 5 - Contextual/Lifestyle:
Product in use or setting, natural motion,
lifestyle commercial, relatable context
```

### Style Decision Framework

| Product Positioning | Best Motion Style |
|---------------------|-------------------|
| Luxury/Premium | Slow Reveal or Floating Premium |
| Tech/Innovation | Floating Premium or Dynamic Energy |
| Practical/Everyday | Orbit Showcase or Contextual |
| Fashion/Lifestyle | Contextual or Slow Reveal |
| Sports/Action | Dynamic Energy |
| Food/Beverage | Slow Reveal or Contextual |

---

## Motion Style Deep Dives

### Slow Reveal (Premium)

The go-to for luxury and premium products. Builds anticipation, creates desire.

```
Slow cinematic push-in toward [product], smooth elegant motion,
dramatic spotlight illumination with subtle light shifts,
atmospheric dust particles drifting through light beam,
premium commercial reveal, luxurious pacing, 5 seconds
```

**Key elements:**
- **Speed:** Slow, deliberate (builds anticipation)
- **Camera:** Push-in (draws viewer to product)
- **Lighting:** Dramatic shifts (creates dimension)
- **Atmosphere:** Particles/bokeh (premium feel)

**Variations:**
```
+ gradual brightness increase (dawn reveal)
+ side lighting sweep (sculptural reveal)
+ spot to fill (dramatic to detailed)
+ emerging from darkness (mystery reveal)
```

---

### Orbit Showcase (360)

Shows product from multiple angles. Informational but can be premium.

```
Camera smoothly orbits around [product], elegant 180-degree arc,
lighting shifts to reveal different surfaces and angles,
product remains perfectly centered, professional product showcase,
commercial demo quality, smooth continuous motion, 5 seconds
```

**Key elements:**
- **Speed:** Moderate, steady (professional)
- **Camera:** Orbiting (reveals all angles)
- **Lighting:** Shifts with camera (reveals features)
- **Product:** Centered, stable (not rotating itself)

**Variations:**
```
+ low angle orbit (powerful, imposing)
+ high angle orbit (overview, accessible)
+ half orbit with return (A-B-A motion)
+ orbit with zoom (combining movements)
```

---

### Floating Premium (Tech)

Weightless, dreamlike quality. Perfect for tech products.

```
[Product] floating weightlessly in space, gentle hovering motion
with subtle micro-movements, soft rotating drift,
premium tech aesthetic, clean minimal environment,
dreamlike quality, smooth ethereal motion, 5 seconds
```

**Key elements:**
- **Speed:** Very slow (dreamlike)
- **Motion:** Floating, hovering (defies gravity)
- **Environment:** Clean, minimal (focus on product)
- **Quality:** Ethereal, otherworldly (premium tech)

**Variations:**
```
+ subtle particle field (space tech)
+ gentle light ripples (premium feel)
+ minimal rotation (revealing sides)
+ breathing motion (organic tech)
```

---

### Dynamic Energy (Bold)

High energy for products that need excitement. Sports, gaming, lifestyle.

```
Dynamic reveal of [product], fast camera sweep with dramatic angles,
high energy motion with impact moment, bold lighting changes,
sports commercial aesthetic, exciting and engaging,
powerful reveal with kinetic energy, 5 seconds
```

**Key elements:**
- **Speed:** Fast, punchy (exciting)
- **Camera:** Dramatic angles, sweeps (energy)
- **Lighting:** Bold changes (dramatic)
- **Feel:** Impact, power (commanding)

**Variations:**
```
+ whip pan reveal (extreme speed)
+ crash zoom (sudden attention)
+ rotating explosion (dynamic start)
+ stop-motion style beats (rhythmic energy)
```

---

### Contextual/Lifestyle

Product in realistic use or setting. Relatable, aspirational.

```
[Product] in [setting], natural environmental motion,
[person interacting/environmental movement/ambient motion],
lifestyle commercial quality, authentic feel,
relatable context, aspirational but believable, 5 seconds
```

**Key elements:**
- **Speed:** Natural pace (realistic)
- **Motion:** Environmental (wind, hands, ambient)
- **Setting:** Realistic context (relatable)
- **Feel:** Authentic (not over-produced)

**Variations:**
```
+ morning light shift (time passing)
+ hand reach/grab (product use)
+ environmental wind (outdoor context)
+ steam/condensation (food/beverage)
```

---

## Camera Motion Vocabulary

Master these terms for precise motion control.

### Camera Movements

| Movement | Description | Best For |
|----------|-------------|----------|
| **Push-in** | Camera moves toward subject | Reveals, focus, intimacy |
| **Pull-out** | Camera moves away from subject | Context reveal, endings |
| **Orbit** | Camera circles subject | 360 showcase, features |
| **Dolly** | Smooth lateral movement | Panning reveals, scanning |
| **Crane** | Vertical movement | Grand reveals, overhead |
| **Tracking** | Following movement | Motion, lifestyle |

### Motion Speeds

| Speed | Description | Creates |
|-------|-------------|---------|
| **Slow** | Deliberate, elegant | Premium, luxury, contemplation |
| **Moderate** | Natural pace | Professional, informational |
| **Fast** | Quick, dynamic | Energy, excitement, urgency |
| **Variable** | Speed changes | Drama, emphasis, rhythm |

### Subject Movements

| Movement | Description | Best For |
|----------|-------------|----------|
| **Float** | Gentle hovering | Tech, premium, dreamlike |
| **Rotate** | Spinning on axis | Feature reveal, 360 |
| **Shimmer** | Light play across surface | Luxury, jewelry, metallic |
| **Settle** | Coming to rest | Endings, product placement |
| **Rise** | Ascending motion | Reveals, emergence |

### Atmospheric Elements

| Element | Description | Creates |
|---------|-------------|---------|
| **Particles** | Floating dust/light | Premium, cinematic |
| **Bokeh** | Background blur animation | Focus, depth |
| **Light shift** | Changing illumination | Drama, dimension |
| **Reflections** | Moving light on surfaces | Luxury, quality |
| **Shadows** | Shadow movement | Time, drama |

---

## Product Category Deep Dives

### Electronics and Tech

**Motion characteristics:**
- Controlled reflections moving across surfaces
- Subtle LED/screen glow animation
- Premium tech aesthetic
- Clean, precise motion

```
[Tech product] with controlled reflections moving across
metallic surfaces, subtle indicator lights glowing,
premium technology commercial motion, clean precise aesthetic,
professional tech showcase, sophisticated reveal
```

**Best styles:** Floating Premium, Slow Reveal
**Avoid:** Chaotic motion, uncontrolled reflections

---

### Fashion and Apparel

**Motion characteristics:**
- Natural fabric movement
- Subtle wind/flow effects
- Fashion editorial quality
- Elegant, aspirational

```
[Apparel item] with natural fabric movement, subtle wind effect
creating gentle flow, fashion commercial motion quality,
elegant and aspirational, editorial photography in motion
```

**Best styles:** Slow Reveal, Contextual
**Avoid:** Stiff fabric, unnatural movement

---

### Food and Beverage

**Motion characteristics:**
- Rising steam (hot items)
- Condensation (cold items)
- Fresh ingredient motion
- Appetizing reveal

```
[Food/beverage product] with [steam rising/condensation forming],
fresh appetizing motion, food commercial aesthetic,
delicious reveal, mouth-watering presentation,
warm inviting tones in motion
```

**Best styles:** Slow Reveal, Contextual
**Key elements:** Steam, pour, drip, fresh

---

### Beauty and Cosmetics

**Motion characteristics:**
- Smooth texture reveals
- Shimmer and sparkle
- Luxury beauty aesthetic
- Elegant product motion

```
[Beauty product] with smooth cream/liquid texture in motion,
subtle shimmer and light play, luxury beauty commercial aesthetic,
elegant product reveal, premium cosmetic presentation,
sophisticated and aspirational
```

**Best styles:** Slow Reveal, Floating Premium
**Avoid:** Fast motion, harsh lighting

---

### Jewelry and Watches

**Motion characteristics:**
- Sparkling reflections
- Light dancing across facets
- Luxury slow motion
- Elegant rotation

```
[Jewelry/watch] with sparkling reflections, light dancing
across precious surfaces and facets, luxury jewelry commercial,
elegant slow rotation revealing brilliance,
premium positioning, sophisticated motion
```

**Best styles:** Slow Reveal, Orbit Showcase
**Key:** Controlled sparkle, not chaotic reflections

---

### Furniture and Home

**Motion characteristics:**
- Environmental context motion
- Natural light shifts
- Lifestyle integration
- Scale demonstration

```
[Furniture/home product] in styled room setting,
natural light shifting through window, environmental motion,
lifestyle interior commercial, aspirational home aesthetic,
showing product in context, inviting atmosphere
```

**Best styles:** Contextual, Slow Reveal
**Key:** Show scale, show in use

---

## Audio Layer Guidance

Video content often needs audio. There are three distinct approaches, and the right one depends on content type and destination platform.

### Approach 1: Model-Native Audio

Some video models generate synchronized audio as part of the video output. This is the fastest path to audio-inclusive video.

**Veo 3.1 (native audio via `generate_audio: true`):**
- Generates contextually aware audio matched to visual content
- Best for ambient sounds, environmental audio, product sounds
- Adds processing time (~30-60s extra)
- Quality is good for ambient/environmental, weaker for speech
- Set `generate_audio: true` in the API payload (see MODEL_REGISTRY.md)

**Sora 2 (audio always on):**
- Always generates audio alongside video
- Cannot be disabled
- Audio quality varies — sometimes excellent, sometimes distracting
- Review audio carefully; you may want to strip it in post

**Kling 2.5 (no native audio):**
- Does not generate audio
- Output is silent video
- Add audio in post-production if needed

### Approach 2: Voiceover via TTS

For narrated product videos, generate the video silently and add voiceover separately.

**Workflow:**
```
1. Generate product video (any model, audio off or stripped)
2. Write voiceover script
3. Generate voiceover audio via TTS service (ElevenLabs, etc.)
4. Combine video + voiceover in post
```

**When to use TTS voiceover:**
- Product explanation or feature walkthrough
- Brand voice consistency required
- Multiple language versions needed
- Testimonial-style narration

**Voiceover script tips for product video:**
- Keep it short: 5-second video = 10-15 words maximum
- Lead with benefit, not feature
- Match energy to motion style (slow reveal = calm voice, dynamic = energetic)
- Leave breathing room — silence between phrases is powerful

### Approach 3: Intentional Silence

Sometimes the best audio is no audio. Many platforms auto-mute video in feeds.

**When silence is the right choice:**
- Social feed content (Instagram, Facebook, LinkedIn auto-mute)
- Video will have music added in post-production
- Clean asset for editor to work with
- Product speaks for itself visually
- Platform relies on captions, not audio

### Audio Decision Matrix

| Content Type | Platform | Recommended Audio Approach |
|--------------|----------|---------------------------|
| Premium reveal | Website hero | Model-native ambient (Veo 3.1) |
| Tech product | Product page | Silence or subtle ambient |
| Lifestyle context | Instagram feed | Silence (auto-muted) |
| Feature walkthrough | YouTube | TTS voiceover |
| Food/beverage | TikTok | Model-native (sizzle, pour sounds) |
| Fashion | Instagram Reels | Silence (music added in post) |
| Testimonial | Landing page | TTS voiceover or recorded audio |
| E-commerce listing | Amazon/Shopify | Silence |

### Audio Prompt Additions (Veo 3.1)

When using Veo 3.1 with `generate_audio: true`, append audio direction to your motion prompt:

```
With accompanying audio:
+ subtle cinematic bass swell on reveal
+ ambient room tone with product sounds
+ gentle electronic undertone
+ natural environmental audio
```

### When to Skip Audio

- Will add music in post
- Platform auto-mutes
- Need flexibility for voiceover
- Clean audio for other edit
- Budget-conscious (audio adds generation time and cost)

---

## Clip Stitching: Multi-Clip Sequences

Single 5-second clips are the atomic unit of AI video. For longer content, plan multiple clips that edit together into a cohesive sequence.

### Why Clip Stitching

AI video models produce their best output in short durations (5-8 seconds). Longer generations (10s+) often have quality dips in the middle. Instead of fighting this limitation, embrace it:

- Plan a sequence of 4-6 short clips
- Each clip has a distinct camera angle, motion style, or perspective
- Together they tell a visual story
- This matches how real commercials are shot and edited

### Sequence Planning Template

Before generating any clips, plan the full sequence:

```
CLIP SEQUENCE PLAN
─────────────────────────────────────────────
Product: [product name]
Total duration: [target seconds]
Clips: [number]
Edit style: [cut/dissolve/matched]

Clip 1 (0:00-0:05): [description]
  Motion: [style]
  Camera: [movement]
  Purpose: [establish/reveal/detail/context/close]

Clip 2 (0:05-0:10): [description]
  Motion: [style]
  Camera: [movement]
  Purpose: [establish/reveal/detail/context/close]

Clip 3 (0:10-0:15): [description]
  Motion: [style]
  Camera: [movement]
  Purpose: [establish/reveal/detail/context/close]

Clip 4 (0:15-0:20): [description]
  Motion: [style]
  Camera: [movement]
  Purpose: [establish/reveal/detail/context/close]
─────────────────────────────────────────────
Estimated cost: [clips x per-clip cost]
Estimated time: [max clip time if parallel]
```

### Common Sequence Structures

**The Classic Product Reveal (4 clips, 20 seconds):**
```
Clip 1: Wide establishing shot, product in darkness, slow reveal
Clip 2: Medium orbit, product rotating to show key features
Clip 3: Close-up detail, texture/material quality visible
Clip 4: Hero shot, full product, tagline moment
```

**The Lifestyle Story (4 clips, 20 seconds):**
```
Clip 1: Context setting, environment without product
Clip 2: Product introduction, enters the scene
Clip 3: Product in use, interaction moment
Clip 4: Product hero shot, aspirational framing
```

**The Feature Walkthrough (5 clips, 25 seconds):**
```
Clip 1: Full product hero shot, establishing
Clip 2: Feature 1 detail, camera focuses on specific area
Clip 3: Feature 2 detail, different angle
Clip 4: Feature 3 detail, close-up
Clip 5: Pull back to full product, closing hero shot
```

**The Quick Social Cut (3 clips, 15 seconds):**
```
Clip 1: Attention-grabbing dynamic reveal
Clip 2: Product detail or use moment
Clip 3: Clean product shot with space for text overlay
```

### Stitching Tips

1. **Maintain consistent lighting** across clips by using similar prompt language for lighting in each clip
2. **Use the same source image** as the starting point for all clips (I2V) to maintain product consistency
3. **Vary camera angle and distance** between clips — this is what makes edits feel professional
4. **Plan transition moments** — end each clip in a state that cuts naturally to the next
5. **Generate all clips for a sequence in parallel** to save time
6. **Use end_image/last_frame** parameters (Kling and Veo) to control clip endpoints for smoother transitions
7. **Cost multiplies linearly** — a 4-clip sequence costs 4x a single clip

### Stitching Cost Estimate

| Sequence Length | Clips | Model | Estimated Cost | Estimated Time |
|----------------|-------|-------|---------------|----------------|
| 15 seconds | 3 clips | Kling 2.5 | ~$1.20 | ~5min parallel |
| 20 seconds | 4 clips | Kling 2.5 | ~$1.60 | ~5min parallel |
| 20 seconds | 4 clips | All 3 models | ~$8.80 | ~6min parallel |
| 25 seconds | 5 clips | Kling 2.5 | ~$2.00 | ~5min parallel |
| 30 seconds | 6 clips | Kling 2.5 | ~$2.40 | ~5min parallel |

---

## Sound Design Considerations

### When to Use Audio

Consider these recommendations based on content type:

| Content Type | Audio Recommendation |
|--------------|---------------------|
| Premium reveal | Subtle ambient + bass swell |
| Tech product | Electronic tones, clean |
| Lifestyle | Environmental sounds |
| Food | Sizzle, pour, crunch |
| Fashion | Music-driven |

### Audio in Multi-Clip Sequences

When stitching clips into a sequence, audio strategy needs to be consistent across all clips:

**Option A: Generate audio per-clip (Veo 3.1)**
- Each clip gets its own audio
- May need post-production to smooth audio transitions between clips
- Best for environmental/ambient audio that can overlap

**Option B: Silent clips + post-production audio**
- Generate all clips silently
- Add music track, voiceover, or sound design in post
- Most professional approach for polished content
- Recommended for sequences longer than 10 seconds

**Option C: Audio on hero clip only**
- Generate the key clip with audio (Veo 3.1)
- Generate supporting clips silently
- Use the audio clip as the anchor, extend audio in post

---

## Platform Specifications

### Hero Banners (Website)

```
Ratio: 16:9
Duration: 5-8 seconds
Loop: Clean loop or freeze-end
Motion: Premium reveal or floating
Quality: High bitrate, clean compression
```

### Instagram Feed

```
Ratio: 1:1 (square) or 4:5 (portrait)
Duration: 5-15 seconds
Loop: Seamless loops perform best
Motion: Scroll-stopping first frame
Quality: Mobile-optimized
```

**Note on square (1:1):** Kling 2.5 supports 1:1 natively. Veo 3.1 and Sora 2 do not — generate at 16:9 and crop to square in post. See MODEL_REGISTRY.md for supported aspect ratios per model.

### Instagram Stories/Reels

```
Ratio: 9:16 (vertical)
Duration: 5-15 seconds
Loop: Optional
Motion: Vertical-optimized composition
Quality: Mobile-first
Safe Zone: Avoid top/bottom UI areas
```

### TikTok

```
Ratio: 9:16 (vertical)
Duration: 5-15 seconds
Style: More dynamic, native aesthetic
Motion: Not over-produced
Quality: Mobile-optimized
```

### Product Pages

```
Ratio: 16:9 or 1:1
Duration: 5-15 seconds
Loop: Clean loops
Motion: Informational (orbit, features)
Quality: Fast loading
```

### YouTube (Pre-roll / Shorts)

```
Ratio: 16:9 (standard) or 9:16 (Shorts)
Duration: 6-15 seconds (pre-roll), 15-60 seconds (Shorts)
Motion: Hook in first 2 seconds
Quality: 1080p minimum
Audio: Required for YouTube (use Veo 3.1 or add in post)
```

---

## Execution Workflow

### Step 1: Source Image

**Option A:** Use approved image from product-photo mode
```
Source: [approved product image URL]
Ratio: [must match desired video ratio]
```

**Option B:** Generate image first
Route to product-photo mode, approve the image, then return here.

### Step 2: Motion Style Selection

Choose approach or generate multiple for comparison:

```
[ ] Slow Reveal (Premium)
[ ] Orbit Showcase (360)
[ ] Floating Premium (Tech)
[ ] Dynamic Energy (Bold)
[ ] Contextual/Lifestyle
[ ] Explore multiple (generate 2-3 approaches)
```

### Step 3: Construct Motion Prompt

Formula:
```
[Motion style template] + [Product-specific additions] +
[Category modifications] + [Duration] + [Quality terms]
```

**For I2V prompts:** Describe the MOTION, not the static scene. The model can see the starting image. Saying "camera slowly orbits right, product rotates to reveal label" is correct. Saying "a bottle of wine on a table" is wrong.

### Step 4: Estimate Cost and Confirm

Before generating, present the cost estimate:

```
GENERATION PLAN
─────────────────────────
Model(s): [list]
Clips: [number]
Duration: [seconds per clip]
Estimated cost: ~$X.XX
Estimated time: ~Xmin

Proceed? [Y/n]
```

### Step 5: Multi-Model Generation

For hero content, run the same prompt through all three models in parallel. For standard content, use the default model (Kling 2.5).

**Kling 2.5 (from MODEL_REGISTRY.md):**
```json
{
  "model": "kwaivgi/kling-v2.5-turbo-pro",
  "input": {
    "prompt": "[motion prompt]",
    "start_image": "[source image URL]",
    "duration": 5,
    "aspect_ratio": "16:9"
  }
}
```

**Veo 3.1 (from MODEL_REGISTRY.md):**
```json
{
  "model": "google/veo-3.1",
  "input": {
    "prompt": "[motion prompt]",
    "image": "[source image URL]",
    "duration": 8,
    "aspect_ratio": "16:9",
    "resolution": "1080p",
    "generate_audio": true
  }
}
```

**Sora 2 (from MODEL_REGISTRY.md):**
```json
{
  "model": "openai/sora-2",
  "input": {
    "prompt": "[motion prompt]",
    "input_reference": "[source image URL]",
    "seconds": 8,
    "aspect_ratio": "landscape"
  }
}
```

**Run in parallel.** Poll for completion (~2-6 minutes depending on model).

**Critical reminder:** Always verify payload structure against MODEL_REGISTRY.md before execution. Parameter names differ across models and may change when models update.

### Step 6: Present Options

```markdown
## Product Video Options Generated

**Source Image:** [URL]
**Motion Style:** [style description]
**Aspect Ratio:** [ratio]

### Option 1: Kling 2.5
**Video URL:** [URL]
**Generation Time:** [actual time]
**Estimated Cost:** ~$0.40
**Audio:** None (silent)
**Notes:** [any observations]

### Option 2: Veo 3.1 (with audio)
**Video URL:** [URL]
**Generation Time:** [actual time]
**Estimated Cost:** ~$1.00
**Audio:** Native audio generated
**Notes:** [any observations]

### Option 3: Sora 2
**Video URL:** [URL]
**Generation Time:** [actual time]
**Estimated Cost:** ~$0.80
**Audio:** Native audio generated
**Notes:** [any observations]

**Which output do you prefer?**
- Motion quality?
- Matches product positioning?
- Audio appropriate?
- Ready to approve or try different style?
```

### Step 7: Approve or Iterate

- **Approved:** Save selected video to `./campaigns/{product}/video/` and deliver
- **Close but not right:** Adjust prompt, regenerate
- **Wrong style:** Try different motion approach
- **Technical issue:** Debug, regenerate
- **Want longer video:** Plan a clip stitch sequence (see Clip Stitching above)

---

## File Output

All generated video assets are saved to the campaign directory for the product.

### Output Directory Structure

```
./campaigns/{product}/video/
├── hero-reveal-kling-v1.mp4
├── hero-reveal-veo-v1.mp4
├── hero-reveal-sora-v1.mp4
├── hero-reveal-kling-v2.mp4        (iteration)
├── orbit-showcase-kling-v1.mp4
├── sequence/
│   ├── clip-01-establish.mp4
│   ├── clip-02-detail.mp4
│   ├── clip-03-feature.mp4
│   └── clip-04-hero.mp4
└── approved/
    ├── hero-reveal-final.mp4        (selected winner)
    └── orbit-showcase-final.mp4
```

### File Naming Convention

```
{style}-{model}-v{version}.mp4

Examples:
  slow-reveal-kling-v1.mp4
  orbit-showcase-veo-v1.mp4
  dynamic-energy-sora-v2.mp4
  lifestyle-context-kling-v1.mp4
```

### Saving Deliverables

After the user approves a video:
1. Download the video from the generation URL
2. Save to `./campaigns/{product}/video/` with the naming convention
3. Copy the approved version to `./campaigns/{product}/video/approved/`
4. Log the generation metadata (model, prompt, cost, timestamp)

---

## Quality Checklist

### Technical Quality
- [ ] Resolution matches platform requirements
- [ ] No obvious AI artifacts (warping, morphing)
- [ ] Smooth motion (no jitter, stuttering)
- [ ] Consistent throughout duration
- [ ] Clean compression (no blocking)

### Motion Quality
- [ ] Motion style matches product positioning
- [ ] Speed appropriate for intended feel
- [ ] Camera movement intentional
- [ ] No unwanted elements added
- [ ] Product remains recognizable throughout

### Commercial Quality
- [ ] Looks professionally produced
- [ ] Would work in commercial context
- [ ] Elevates product perception
- [ ] Appropriate for platform
- [ ] Matches brand aesthetic

### Platform Fit
- [ ] Correct aspect ratio
- [ ] Appropriate duration
- [ ] Works with platform compression
- [ ] Loop-friendly (if needed)
- [ ] Safe zones respected (mobile)

### Audio Quality (when applicable)
- [ ] Audio matches visual content
- [ ] No jarring or distracting sounds
- [ ] Appropriate volume level
- [ ] Audio enhances (not distracts from) product
- [ ] Silence where silence is the right choice

---

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Product morphs/changes | Model interpretation | Simpler motion prompt, use I2V |
| Motion too fast | Prompt too energetic | Add "slow," "elegant," "smooth" |
| Motion too slow | Over-specified slowness | Adjust speed terms |
| Wrong elements appear | Model hallucination | Simpler prompt, different model |
| Reflections wrong | Uncontrolled light | Add "controlled reflections" |
| Looks cheap | Wrong motion style | Match style to positioning |
| Doesn't loop | Not specified | Add "seamless loop" to prompt |
| Wrong aspect | Default used | Specify ratio in API call (check MODEL_REGISTRY.md for parameter name) |
| No audio (Veo) | Not enabled | Set `generate_audio: true` |
| Background changes | Unstable composition | Use cleaner source image |
| API parameter error | Wrong param name for model | Check cross-model cheat sheet in MODEL_REGISTRY.md |
| Aspect ratio rejected | Model doesn't support it | Check MODEL_REGISTRY.md — Veo/Sora have no square support |
| Generation timeout | Model overloaded | Retry; allow extra buffer for Sora 2 |
| Quality dip mid-video | 10s generation issue | Use 5s clips and stitch instead |

---

## Iteration Strategies

### When Motion Is Close But Not Right

**Problem:** Almost there but something's off
**Strategy:** Targeted prompt adjustments

```
Too fast → add "slow," "elegant," "deliberate"
Too static → add "dynamic," "moving," "shifting"
Too chaotic → add "smooth," "controlled," "stable"
Wrong mood → adjust atmosphere terms
```

### When Motion Is Completely Wrong

**Problem:** Output doesn't match intent
**Strategy:** Different approach entirely

Don't iterate on broken foundation:
1. Try different motion style
2. Try different model
3. Simplify prompt dramatically
4. Check source image quality

### When Technical Issues Occur

**Problem:** Artifacts, morphing, glitches
**Strategy:** Technical fixes

```
- Use cleaner source image
- Simpler motion request
- Different model
- Lower complexity prompt
- For Kling: reduce camera speed to avoid edge warping
- For Veo: check portrait aspect ratio for unexpected cropping
- For Sora: ensure reference image matches aspect ratio
```

### When Budget Is a Concern

**Problem:** Need to minimize generation costs
**Strategy:** Targeted model selection

```
- Use Kling 2.5 only (cheapest at ~$0.40/clip)
- Skip parallel comparison
- Get motion style right with one model before comparing
- Use 5s clips, not 10s
- Plan sequences carefully before generating (avoid wasted clips)
```

---

## Output Format

### Single Output
```markdown
## Product Video Generated

**Product:** [name]
**Motion Style:** [style]
**Model:** [selected model — see MODEL_REGISTRY.md]
**Aspect Ratio:** [ratio]
**Duration:** [seconds]
**Estimated Cost:** ~$[amount]

**Video URL:** [URL]
**Saved to:** ./campaigns/[product]/video/[filename].mp4

**Motion Prompt Used:**
> [full prompt for reference]

**Quality Check:**
- [ ] Motion quality
- [ ] Product consistency
- [ ] Platform appropriate
- [ ] Commercial quality
- [ ] Audio appropriate (if applicable)

**Feedback?**
- Motion style right?
- Speed appropriate?
- Ready to approve or iterate?
```

### Multi-Option Output
```markdown
## Product Video Options

**Source Image:** [URL]
**Motion Style:** [style]

### Option 1: [Model] (~$[cost])
- URL: [video URL]
- Audio: [yes/no]
- Observations: [notes]

### Option 2: [Model] (~$[cost])
- URL: [video URL]
- Audio: [yes/no]
- Observations: [notes]

### Option 3: [Model] (~$[cost])
- URL: [video URL]
- Audio: [yes/no]
- Observations: [notes]

**Total generation cost:** ~$[total]

**Select preferred output:**
- [ ] Option 1
- [ ] Option 2
- [ ] Option 3
- [ ] Try different motion style
```

### Clip Sequence Output
```markdown
## Clip Sequence Generated

**Product:** [name]
**Sequence:** [description]
**Total Duration:** [seconds]
**Model:** [model]
**Total Cost:** ~$[amount]

### Clip 1: [purpose]
- URL: [video URL]
- Duration: [seconds]
- Motion: [style]

### Clip 2: [purpose]
- URL: [video URL]
- Duration: [seconds]
- Motion: [style]

### Clip 3: [purpose]
- URL: [video URL]
- Duration: [seconds]
- Motion: [style]

### Clip 4: [purpose]
- URL: [video URL]
- Duration: [seconds]
- Motion: [style]

**All clips saved to:** ./campaigns/[product]/video/sequence/

**Next steps:**
- Review clip quality individually
- Approve sequence for stitching
- Re-generate any weak clips
- Add audio in post-production
```

---

## Integration with Pipeline

```
PRODUCT VIDEO PIPELINE

┌─────────────────────────────────────────┐
│  Request arrives                        │
│  → Direct or from creative workflow     │
│  → Source image required?               │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  Has source      │   │  Needs source    │
│  image           │   │  image           │
└───────┬──────────┘   └────────┬─────────┘
        │                       │
        │                       ▼
        │              ┌──────────────────┐
        │              │  product-photo   │
        │              │  mode            │
        │              │  → Generate      │
        │              │  → Approve       │
        │              └────────┬─────────┘
        │                       │
        └───────────┬───────────┘
                    ▼
┌─────────────────────────────────────────┐
│  Motion Style Selection                 │
│  → Single style or multiple exploration │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Cost Estimation                        │
│  → Calculate based on models + clips    │
│  → Present to user for confirmation     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  product-video mode (THIS MODE)         │
│  → Construct motion prompt              │
│  → Multi-model parallel generation      │
│  → Present options                      │
│  → User selects winner                  │
│  → Save to campaigns/{product}/video/   │
└─────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐
│ Delivery │ │ Clip     │ │ Route to     │
│ → Final  │ │ Stitch   │ │ talking-head │
│   video  │ │ → Plan   │ │ mode         │
│          │ │   more   │ │ → Voiceover  │
│          │ │   clips  │ │ → Lip-sync   │
└──────────┘ └──────────┘ └──────────────┘
```

---

## Handoff Protocols

### Receiving from product-photo mode
```yaml
Receive:
  source_image: "[approved image URL]"
  product: "[product name]"
  aspect_ratio: "[ratio]"
  style_direction: "[if established from image session]"
  platform: "[destination platform]"
```

### Receiving from creative workflow
```yaml
Receive:
  product: "[product name]"
  video_purpose: "[hero/social/product page/etc.]"
  motion_style: "[if specified]"
  platform: "[destination platform]"
  source_image: "[if available]"
  budget_limit: "[if specified]"
  clip_count: "[if multi-clip sequence requested]"
```

### Returning to Workflow
```yaml
Return:
  status: "complete" | "needs_iteration" | "needs_different_approach"
  deliverables:
    - url: "[video URL]"
      local_path: "./campaigns/{product}/video/[filename].mp4"
      model: "[which model — from MODEL_REGISTRY.md]"
      duration: "[seconds]"
      aspect_ratio: "[ratio]"
      has_audio: true/false
      prompt_used: "[motion prompt]"
      estimated_cost: "[cost]"
  additional_options_generated: true/false
  total_cost: "[sum of all generations]"
```

### Routing to Talking Head Mode
```yaml
Route to talking-head mode:
  video_url: "[approved product video]"
  local_path: "./campaigns/{product}/video/approved/[filename].mp4"
  voiceover_needed: true
  voiceover_content: "[script or description]"
  integration_style: "[overlay/transition/split]"
```

---

## Pro Tips

### What Makes Product Video Work

1. **Motion matches positioning** — Premium products need premium motion
2. **Less is often more** — Subtle motion > chaotic movement
3. **First frame matters** — Thumbnail is first impression
4. **Consistency throughout** — Product should be recognizable entire duration
5. **Purpose-driven motion** — Every movement should have reason

### Common Mistakes to Avoid

1. **Over-animated** — Too much motion cheapens products
2. **Wrong speed** — Fast motion for luxury = mistake
3. **Generic prompts** — "Product reveal" is too vague
4. **Ignoring source** — Bad source image = bad video
5. **Single model reliance** — Different models excel differently
6. **Hardcoding model IDs** — Always use MODEL_REGISTRY.md
7. **Wrong parameter names** — Each model uses different names for the same concept
8. **Skipping cost estimate** — Always tell the user what it will cost before generating
9. **Generating 10s when 5s will do** — Longer is not better; shorter clips stitch better

### The 80/20 of Product Video

80% of results come from:
1. Quality source image (I2V workflow)
2. Appropriate motion style for product
3. Speed matching product positioning
4. Clean, simple motion prompts

Get these four right and you'll outperform most AI product videos.

### Multi-Model Strategy

When to invest in parallel comparison:
- **Hero content** (website banners, launch videos) — Always run all three
- **Social content** (feed posts, stories) — Default model is fine
- **Product pages** (e-commerce listings) — Default model, maybe two for key products
- **Ad creative** (paid campaigns) — Run all three, A/B test the winners

### Budget Management

```
BUDGET TIERS
─────────────────────────────────
Lean:     1 model, 1 style         ~$0.40
Standard: 1 model, 3 styles        ~$1.20
Premium:  3 models, 1 style        ~$2.20
Hero:     3 models, 3 styles       ~$6.60
Campaign: 3 models, 3 styles, stitch ~$10+
```

---

## Example Prompts (Complete)

### Tech Hero Reveal
```
Slow cinematic push-in toward premium wireless headphones,
floating weightlessly against dark gradient background,
dramatic spotlight shifts revealing metallic surfaces,
controlled reflections moving across ear cups,
atmospheric particles drifting through light beam,
premium technology commercial, smooth elegant motion,
5 seconds, 16:9
```

### Skincare Orbit
```
Camera smoothly orbits luxury skincare serum bottle,
elegant 180-degree arc revealing glass bottle from all angles,
light shifts to reveal golden serum liquid inside,
clean white environment, professional product showcase,
beauty commercial quality, sophisticated motion,
5 seconds, 1:1 square
```

### Food Reveal
```
Slow reveal of artisan coffee package on rustic wooden surface,
steam rising from freshly poured cup nearby,
morning light shifting through window, warm golden tones,
fresh coffee beans gently settling, appetizing motion,
food commercial aesthetic, inviting atmosphere,
5 seconds, 9:16 vertical
```

### Watch Showcase
```
Premium watch floating with gentle hover motion,
light dancing across crystal and polished steel,
subtle rotation revealing dial details,
luxury jewelry commercial motion, elegant and sophisticated,
controlled sparkle on metal surfaces,
premium positioning, 5 seconds, 16:9
```

### Fashion Wind
```
Silk scarf with natural wind movement creating elegant flow,
subtle fabric ripples and gentle billowing motion,
fashion editorial quality, aspirational and sophisticated,
light catching silk sheen as fabric moves,
lifestyle commercial aesthetic, 5 seconds, 4:5
```

### Clip Stitch: Premium Headphone Launch (4 clips)

```
CLIP SEQUENCE: Premium Headphone Launch
─────────────────────────────────────────

Clip 1 — Emergence (5s, 16:9):
Premium wireless headphones emerging from darkness,
single spotlight gradually illuminating from above,
atmospheric particles catching light, slow cinematic reveal,
premium technology commercial, luxurious pacing

Clip 2 — Orbit Detail (5s, 16:9):
Camera smoothly orbits wireless headphones at close range,
revealing ear cup texture and metallic finish details,
controlled reflections moving across brushed aluminum,
professional product showcase, moderate steady motion

Clip 3 — Floating Tech (5s, 16:9):
Headphones floating weightlessly with gentle hover motion,
subtle micro-movements, soft rotating drift revealing both sides,
clean minimal dark environment, premium tech aesthetic,
dreamlike quality, smooth ethereal motion

Clip 4 — Hero Landing (5s, 16:9):
Headphones settling onto reflective surface with elegant motion,
final hero positioning, dramatic front-facing angle,
controlled reflections on surface below, premium closing shot,
commercial end-frame quality, sophisticated motion
─────────────────────────────────────────
Estimated: 4 clips x Kling 2.5 = ~$1.60, ~5min parallel
```

---

## Appendix: Model API Quick Reference

**Always verify against MODEL_REGISTRY.md before executing.** This appendix is a convenience reference only.

### Image-to-Video Call Patterns

**Kling 2.5 I2V:**
```
Model: kwaivgi/kling-v2.5-turbo-pro
Image param: start_image
Duration param: duration (5 or 10)
Ratio param: aspect_ratio ("16:9", "9:16", "1:1")
Extras: negative_prompt (guidance_scale has been REMOVED from API)
```

**Veo 3.1 I2V:**
```
Model: google/veo-3.1
Image param: image
Duration param: duration (4, 6, or 8)
Ratio param: aspect_ratio ("16:9", "9:16")
Extras: generate_audio (bool), resolution ("720p", "1080p"), negative_prompt, seed
```

**Sora 2 I2V:**
```
Model: openai/sora-2
Image param: input_reference
Duration param: seconds (4-12)
Ratio param: aspect_ratio ("landscape", "portrait")
Extras: openai_api_key (optional)
```

### Text-to-Video Call Patterns

**Kling 2.5 T2V:**
```
Model: kwaivgi/kling-v2.5-turbo-pro
No image param needed
Duration param: duration (5 or 10)
Ratio param: aspect_ratio ("16:9", "9:16", "1:1")
Extras: negative_prompt (guidance_scale has been REMOVED from API)
```

**Veo 3.1 T2V:**
```
Model: google/veo-3.1
No image param needed
Duration param: duration (4, 6, or 8)
Ratio param: aspect_ratio ("16:9", "9:16")
Extras: generate_audio (bool), resolution ("720p", "1080p"), negative_prompt, seed
```

**Sora 2 T2V:**
```
Model: openai/sora-2
No image param needed
Duration param: seconds (4-12)
Ratio param: aspect_ratio ("landscape", "portrait")
Extras: openai_api_key (optional)
```

---

*This mode is part of the Vibe Marketing Skills v2 creative engine. Model configurations are maintained in `references/MODEL_REGISTRY.md`. When model schemas change upstream, MODEL_REGISTRY.md is updated first, then this mode file is updated to match.*
