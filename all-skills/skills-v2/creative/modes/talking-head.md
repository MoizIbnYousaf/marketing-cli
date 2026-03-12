# Talking Head Mode

Generate talking head videos, presenter content, UGC-style testimonials, and lip-synced videos. This mode handles AI presenter generation, script-to-video pipelines, lip-sync workflows, and platform-optimized delivery for every format where a person speaks to camera.

**Loaded by:** `creative/SKILL.md` when user selects mode 4 (Talking Head).
**Model selection:** Handled by `references/MODEL_REGISTRY.md` — never hardcode model IDs in prompts or workflows.
**Brand consistency:** Reads from `./brand/creative-kit.md` before every generation.
**Presenter consistency:** Approved presenters saved to `./brand/creative-kit.md` for reuse across videos.
**File output:** All deliverables saved to `./campaigns/{campaign}/video/talking-head/`

---

## Why This Mode Exists

**The problem:** Talking head videos are the most persuasive content format but:
1. Recording yourself is time-consuming and requires confidence
2. Professional presenters are expensive ($500-5000+ per video)
3. UGC creators charge $100-500 per post and may not match your brand
4. Iterating on scripts means re-filming everything
5. Scaling personalized video is nearly impossible manually
6. Each video model has a different API interface, making multi-model comparison error-prone
7. No single model wins every prompt — quality depends on the specific content
8. FTC and platform rules on AI-generated presenters are evolving rapidly

**The solution:** AI talking heads that:
- Generate professional presenter videos in minutes
- Let you iterate on scripts without re-recording
- Create unlimited variants for A/B testing
- Maintain consistent brand presenter identity
- Scale personalized outreach cost-effectively
- Reference MODEL_REGISTRY.md for all API payloads (never hardcodes model names)
- Run parallel multi-model generation and let the user pick the winner
- Include proper AI-generated content disclosures
- Save approved presenters to the creative kit for cross-video reuse

**The game-changer:** Combining avatar generation + lip-sync + TTS lets you:
- Create a consistent "brand spokesperson"
- Update any script without re-filming
- Test multiple presenter styles quickly
- Produce video content at 10x the speed
- Generate voiceover in a consistent brand voice via TTS
- Localize into multiple languages from a single base video

---

## Model Selection

**Do NOT hardcode model IDs.** Always refer to `references/MODEL_REGISTRY.md` for the current default video model and its verified API payload.

As of this writing, the models used in this mode are:

### Video Generation Models

| Role | Model | Registry Section | Estimated Cost (5s clip) |
|------|-------|-----------------|--------------------------|
| **Default** | Kling 2.5 Turbo Pro | Video Generation > Default Model | ~$0.40 |
| **Comparison** | Google Veo 3.1 | Video Generation > Comparison Model: Google Veo 3.1 | ~$0.80-1.50 |
| **Comparison** | OpenAI Sora 2 | Video Generation > Comparison Model: OpenAI Sora 2 | ~$0.60-1.20 |

### Lip-Sync Model

| Role | Model | Registry Section | Estimated Cost |
|------|-------|-----------------|---------------|
| **Lip-Sync** | Kling Lip-Sync | Lip-Sync > Model: Kling Lip-Sync | ~$0.30-0.60 |

### How to Call

1. Open `references/MODEL_REGISTRY.md`
2. Find the **Video Generation** or **Lip-Sync** section
3. Copy the verified payload structure for the desired model
4. Insert your constructed prompt, source image, and parameters
5. Execute the API call via Replicate
6. For hero content: run all three video models in parallel (see Parallel Multi-Model Generation below)

### Cross-Model Parameter Cheat Sheet

Every video model uses different parameter names for the same concept. Always consult MODEL_REGISTRY.md before writing any API call.

| Concept | Kling 2.5 | Veo 3.1 | Sora 2 |
|---------|-----------|---------|--------|
| **Starting image** | `start_image` | `image` | `input_reference` |
| **Duration** | `duration` (5, 10) | `duration` (4, 6, 8) | `seconds` (4-12) |
| **Aspect ratio** | `aspect_ratio` ("16:9") | `aspect_ratio` ("16:9") | `aspect_ratio` ("landscape") |
| **Prompt adherence** | `guidance_scale` (0-1) | — | — |
| **Negative prompt** | `negative_prompt` | `negative_prompt` | — |
| **Audio generation** | Not native | `generate_audio` | Native (always on) |
| **Ending frame** | `end_image` | `last_frame` | — |
| **Resolution control** | Fixed 1080p | `resolution` ("720p", "1080p") | Fixed |
| **Reproducibility** | — | `seed` | — |

### Model Strengths for Talking Head Content

Refer to MODEL_REGISTRY.md for authoritative details. Summary for presenter-specific routing decisions:

**Kling 2.5 Turbo Pro (Default for Talking Heads):**
- Best for people and natural movement
- Most realistic human faces
- Handles casual movements well (ideal for UGC)
- Best lip-sync ecosystem (Kling Lip-Sync pairs natively)
- Strong at controlled expressions and gestures

**Google Veo 3.1:**
- Highest fidelity video output
- Native audio generation (set `generate_audio: true`)
- Good for establishing scenes with ambient audio
- Slower generation, higher cost
- No square aspect ratio support

**OpenAI Sora 2:**
- Strong prompt comprehension
- Good at character-driven content
- Native audio generation (always on)
- Most variable generation times
- No square aspect ratio support

### When to Use Which — Talking Head Specific

```
FOR MAXIMUM REALISM (people quality):
    → Kling 2.5 Turbo Pro (best faces, most natural movement)

FOR SPEED + QUALITY BALANCE:
    → Kling 2.5 Turbo Pro (fastest for people content)

FOR BUILT-IN AUDIO:
    → Veo 3.1 (generates audio with video)

FOR UGC AUTHENTICITY:
    → Kling 2.5 (handles casual movements well)

FOR CORPORATE/FORMAL:
    → Kling 2.5 or Sora 2 (cleaner, more controlled)

FOR HERO/FLAGSHIP:
    → Run all 3 in parallel, pick winner
```

---

## Parallel Multi-Model Generation

For hero content and any case where quality matters more than cost, run the same presenter prompt through all three video models simultaneously.

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

### Translating One Prompt to Three APIs

Given a presenter prompt, the payload differs per model. Example for a 16:9 talking head T2V call:

**Kling 2.5 payload (from MODEL_REGISTRY.md):**
```json
{
  "model": "kwaivgi/kling-v2.5-turbo-pro",
  "input": {
    "prompt": "{{presenter_prompt}}",
    "duration": 5,
    "aspect_ratio": "16:9",
    "guidance_scale": 0.5
  }
}
```

**Veo 3.1 payload (from MODEL_REGISTRY.md):**
```json
{
  "model": "google/veo-3.1",
  "input": {
    "prompt": "{{presenter_prompt}}",
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
    "prompt": "{{presenter_prompt}}",
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
| Kling Lip-Sync | 2-10s clip | $0.30-0.60 | 1-3min |

### Common Workflow Cost Estimates

| Workflow | What You Get | Estimated Cost |
|----------|-------------|---------------|
| Single model presenter | 1 video | ~$0.40-1.20 |
| Parallel comparison (3 models) | 3 videos to compare | ~$2.00-2.50 |
| Style exploration (5 styles x 1 model) | 5 presenter approaches | ~$2.00-6.00 |
| Presenter + lip-sync | 1 presenter video + 1 synced video | ~$0.70-1.80 |
| Full pipeline (generate + lip-sync + 3 models) | 3 videos + lip-sync on winner | ~$2.50-3.10 |
| UGC batch (5 variants, single model) | 5 different UGC videos | ~$2.00-5.00 |

### Cost Communication Template

Before executing, inform the user:

```
ESTIMATED GENERATION COST
─────────────────────────
Models: [list models]
Clips: [number of clips]
Duration per clip: [seconds]
Lip-sync: [yes/no]
Estimated total: ~$X.XX
Estimated time: ~Xmin (parallel) / ~Xmin (sequential)

Proceed? [Y/n]
```

---

## Presenter Style Exploration (Before Generation)

**Critical insight:** Don't generate with one style and hope it works. Explore genuinely DIFFERENT presenter styles first.

### The Style Exploration Process

**STEP 1: GENERATE 4-5 DIFFERENT PRESENTER STYLES**

This is NOT: Same person with different clothes
This IS: Fundamentally different presenter archetypes that each tell a different story

```
[YOUR BRAND] - Style Exploration

Generate presenter concepts for these 5 directions:

1. CORPORATE AUTHORITY
   - Demographic: 35-50, professional appearance
   - Setting: Modern office, corporate environment
   - Wardrobe: Business professional, suit/blazer
   - Energy: Confident, measured, authoritative
   - Vibe: "Trust the expert"

2. RELATABLE FRIEND
   - Demographic: 25-40, approachable look
   - Setting: Home office, kitchen, casual space
   - Wardrobe: Smart casual, comfortable
   - Energy: Warm, conversational, genuine
   - Vibe: "Let me share what worked for me"

3. ENERGETIC CREATOR
   - Demographic: 22-35, creator aesthetic
   - Setting: Ring light setup, content studio
   - Wardrobe: Trendy casual, branded
   - Energy: High, dynamic, enthusiastic
   - Vibe: "You HAVE to try this"

4. EXPERT EDUCATOR
   - Demographic: 30-55, credible appearance
   - Setting: Study, library, professional backdrop
   - Wardrobe: Smart casual, glasses optional
   - Energy: Calm, explanatory, helpful
   - Vibe: "Let me explain how this works"

5. LIFESTYLE ASPIRATIONAL
   - Demographic: 28-45, aspirational look
   - Setting: Beautiful home, travel location, luxury
   - Wardrobe: Elevated casual, tasteful
   - Energy: Relaxed confidence, success aura
   - Vibe: "This is what my life looks like"
```

**STEP 2: IDENTIFY WINNER**

After generating style exploration:
```
REVIEW each presenter style:

Which presenter:
- Best matches brand voice?
- Would audience trust most?
- Fits the content type?
- Has right energy level?
- Would work across multiple videos?

WINNER: [Selected style]
BECAUSE: [Why this style wins for this brand/use case]
```

**STEP 3: EXTRACT PRESENTER PRINCIPLES**

Once winner identified:
```
WINNING STYLE EXTRACTION

Demographics:
- Age range: [X-X]
- Gender: [if specific]
- Ethnicity: [if specific]
- Overall look: [descriptors]

Environment:
- Primary setting: [where they present from]
- Background elements: [what's visible]
- Lighting style: [natural/studio/mixed]

Wardrobe:
- Style: [formal/casual/etc.]
- Colors: [palette]
- Accessories: [if any]

Delivery:
- Energy level: [1-10]
- Speaking pace: [slow/medium/fast]
- Hand gestures: [minimal/moderate/expressive]
- Eye contact: [direct to camera always]

Audio:
- Voice tone: [warm/authoritative/energetic]
- Pacing: [conversational/punchy/measured]
```

**STEP 4: SAVE TO CREATIVE KIT**

Once a presenter is approved, save the full specification to `./brand/creative-kit.md` so it can be reused across all future videos. See the Presenter Consistency System section below.

**STEP 5: APPLY ACROSS CONTENT**

Use extracted principles for:
- All future videos maintain consistency
- Same presenter = brand recognition
- Variations in script, not in presenter

---

## Presenter Archetype Deep Dives

### Corporate Authority

**When to use:** B2B, financial services, healthcare, enterprise SaaS, professional services

**Visual Formula:**
```
[Man/Woman] in [30s-50s], [silver/dark hair], wearing [tailored blazer/suit],
in [modern glass office/conference room with city view], [warm professional lighting],
[confident composed expression], [seated at desk OR standing with slight lean],
[direct eye contact with camera], [subtle hand gestures], corporate executive style
```

**Setting Options:**
- Corner office with city view
- Modern conference room
- Executive desk with minimal decor
- Standing at presentation screen
- Seated in designer chair

**Wardrobe Options:**
- Tailored navy blazer over white shirt
- Grey suit, no tie (modern)
- Classic suit with subtle tie
- Blazer over turtleneck (thought leader)
- Professional dress (solid colors)

**Energy Markers:**
- Measured pace
- Deliberate movements
- Confident pauses
- Minimal but purposeful gestures
- Assured vocal tone

**TTS Voice Selection for Corporate Authority:**
- Voice qualities: Deep, measured, confident, warm baritone or clear alto
- ElevenLabs recommended voices: Professional male/female, mature tone
- Pace: 0.9x-1.0x speed (slightly slower conveys authority)
- Avoid: Overly energetic, breathy, or youthful voices

---

### Relatable Friend (UGC Style)

**When to use:** DTC brands, consumer products, wellness, beauty, lifestyle

**Visual Formula:**
```
Friendly [demographic] sitting in [casual setting], natural window light,
holding/showing [product], genuine excited expression, talking directly to
camera like filming a selfie video, authentic UGC testimonial style, casual
comfortable body language, 5 seconds
```

**Setting Options:**
- Bright kitchen counter
- Cozy living room couch
- Home office with plants
- Bedroom getting-ready setup
- Outdoor patio/balcony

**Wardrobe Options:**
- Cozy sweater/cardigan
- Simple t-shirt
- Casual button-down
- Loungewear (if brand appropriate)
- Athleisure

**Energy Markers:**
- Conversational rhythm
- Natural pauses ("honestly?", "okay so...")
- Expressive facial reactions
- Genuine enthusiasm without over-selling
- Relatable body language

**UGC Script Patterns:**
```
DISCOVERY: "Okay so I found this [product] and I'm obsessed..."
REVIEW: "So I've been using [product] for [time] and here's my honest take..."
COMPARISON: "I used to use [old product] but then I tried [new product]..."
TRANSFORMATION: "Before [product] I was [problem]. Now? [result]."
```

**UGC Authenticity Markers:**
- Slightly imperfect framing
- Natural lighting (not studio)
- Casual wardrobe
- Real reactions, not posed
- Personal space as backdrop
- Eye contact with camera

**TTS Voice Selection for Relatable Friend:**
- Voice qualities: Warm, conversational, natural inflection, mid-range
- ElevenLabs recommended voices: Young adult, conversational tone
- Pace: 1.0x-1.1x speed (natural conversational)
- Avoid: Robotic, overly polished, or broadcasting voices

---

### Energetic Creator

**When to use:** Gen-Z products, entertainment, gaming, trendy DTC, social apps

**Visual Formula:**
```
[Young energetic creator] in [22-35], [colorful trendy outfit], in [content
studio with ring light/neon lights], [bright dynamic lighting], [animated
expressions], [lots of movement and gestures], [high energy delivery],
[fast-paced enthusiastic style], YouTube/TikTok creator aesthetic
```

**Setting Options:**
- Ring light setup visible
- LED/neon accent lighting
- Streaming/gaming setup
- Colorful backdrop
- Outdoor action setting

**Wardrobe Options:**
- Graphic tees
- Bold colors
- Branded merch
- Trendy streetwear
- Statement accessories

**Energy Markers:**
- Fast-paced delivery
- Big expressions
- Lots of hand movement
- Pattern interrupts
- Enthusiasm at 10

**Creator Script Patterns:**
```
HOOK: "STOP scrolling. This is important."
REVEAL: "I literally just discovered [thing] and I'm freaking out."
CHALLENGE: "I bet you can't guess what [product] does."
REACTION: "[reaction to trying product]... WAIT what?!"
```

**TTS Voice Selection for Energetic Creator:**
- Voice qualities: Bright, energetic, youthful, expressive range
- ElevenLabs recommended voices: Young, dynamic, high energy
- Pace: 1.1x-1.3x speed (fast, punchy delivery)
- Avoid: Flat, monotone, or overly mature voices

---

### Expert Educator

**When to use:** Online courses, professional services, B2B explainers, tutorials

**Visual Formula:**
```
[Knowledgeable expert] in [30s-55], [smart casual or academic style],
in [home study/office with books/whiteboard], [balanced lighting],
[thoughtful composed expression], [explaining with purposeful gestures],
[patient instructive tone], educator/thought leader style
```

**Setting Options:**
- Study with bookshelves
- Office with credentials visible
- Whiteboard/screen behind
- Standing at presentation
- Desk with relevant props

**Wardrobe Options:**
- Button-down shirt
- Blazer over casual shirt
- Sweater over collared shirt
- Glasses (authority signal)
- Minimal accessories

**Energy Markers:**
- Patient pace
- Teaching rhythm
- Logical structure
- Illustrative gestures
- "Here's what matters" moments

**TTS Voice Selection for Expert Educator:**
- Voice qualities: Clear, articulate, patient, explanatory cadence
- ElevenLabs recommended voices: Mature professional, teacher tone
- Pace: 0.9x-1.0x speed (allows comprehension, conveys thoughtfulness)
- Avoid: Rushed, overly casual, or monotone voices

---

### Lifestyle Aspirational

**When to use:** Luxury brands, high-ticket services, aspirational DTC, travel, real estate

**Visual Formula:**
```
[Elegant successful person] in [30s-50s], [elevated casual attire],
in [beautiful interior/scenic location], [golden hour OR designer lighting],
[relaxed confident demeanor], [speaking with quiet confidence], [minimal
but graceful movement], aspirational lifestyle aesthetic
```

**Setting Options:**
- Designer living room
- Travel location (balcony view)
- Luxury car interior
- High-end restaurant/hotel
- Yacht/beach/resort

**Wardrobe Options:**
- Designer casual
- Linen/natural fabrics
- Neutral luxury palette
- Subtle jewelry/watch
- Effortlessly elegant

**Energy Markers:**
- Relaxed confidence
- No rushing
- "I have time" energy
- Subtle smile
- Quiet success vibes

**TTS Voice Selection for Lifestyle Aspirational:**
- Voice qualities: Smooth, unhurried, refined, warm confidence
- ElevenLabs recommended voices: Sophisticated, calm delivery
- Pace: 0.85x-0.95x speed (unhurried = luxury)
- Avoid: Hyperactive, sharp, or salesy voices

---

## TTS Integration Guidance

### Why External TTS Matters

The Kling Lip-Sync model includes basic TTS via `text` + `voice_id`, but it has limited voice options and no voice consistency across sessions. For brand-level talking head content, external TTS gives you:

- **Voice cloning** — match a specific voice consistently
- **Voice selection** — hundreds of voices to match any archetype
- **Multi-language** — generate the same script in any language
- **Fine control** — adjust pace, emphasis, pauses, emotion
- **Brand consistency** — same voice across every video, forever

### ElevenLabs Integration (Recommended)

ElevenLabs is the recommended TTS provider for talking head content due to voice quality, cloning capability, and extensive voice library.

**Voice Selection Process:**
```
1. IDENTIFY archetype (Corporate, Friend, Creator, Educator, Aspirational)
2. BROWSE ElevenLabs voice library filtering by:
   - Gender matching presenter visual
   - Age range matching presenter demographic
   - Accent matching target market
   - Energy level matching archetype
3. TEST 3-5 candidate voices with a sample script
4. SELECT winner based on:
   - Natural fit with presenter visual
   - Audience trust factor
   - Clarity at speaking pace
   - Emotional range
5. SAVE voice_id to creative-kit.md alongside presenter spec
```

**Voice Selection Criteria Per Archetype:**

| Archetype | Gender Match | Age Feel | Tone | Pace | Key Quality |
|-----------|-------------|----------|------|------|-------------|
| Corporate Authority | Match visual | 35-55 | Confident, warm | Moderate-slow | Trustworthy |
| Relatable Friend | Match visual | 25-40 | Conversational | Natural | Authentic |
| Energetic Creator | Match visual | 22-35 | Bright, dynamic | Fast | Exciting |
| Expert Educator | Match visual | 30-55 | Clear, patient | Moderate | Credible |
| Lifestyle Aspirational | Match visual | 30-50 | Smooth, refined | Slow | Aspirational |

**ElevenLabs API Pattern:**
```
1. Generate audio from script text using selected voice
2. Download audio file (MP3 or WAV)
3. Pass audio_file to Kling Lip-Sync
4. Result: presenter video with perfectly matched voiceover
```

**ElevenLabs Script Tips:**
- Use SSML-style pauses: add "..." for natural breath breaks
- Capitalize for emphasis: "This is REALLY important"
- Short sentences sync better than long complex ones
- Add punctuation for rhythm: periods = full pause, commas = brief pause
- Test pronunciation of brand names and technical terms

### Alternative TTS Providers

| Provider | Strengths | Best For |
|----------|-----------|----------|
| ElevenLabs | Voice cloning, quality, library size | Brand voice, premium content |
| OpenAI TTS | Fast, affordable, good quality | Quick prototypes, batch content |
| Google Cloud TTS | Multi-language, SSML support | International campaigns |
| Amazon Polly | Cost-effective at scale | High-volume personalization |
| Azure Speech | Neural voices, SSML | Enterprise integrations |

### TTS to Lip-Sync Workflow

```
SCRIPT → TTS (ElevenLabs) → AUDIO FILE → LIP-SYNC (Kling) → FINAL VIDEO

Step 1: Write script (use duration calculator below)
Step 2: Generate audio via TTS with selected voice
Step 3: Download audio as MP3 or WAV
Step 4: Pass audio_file + presenter video to Kling Lip-Sync
Step 5: Review sync quality
Step 6: Deliver or iterate
```

---

## Script-to-Video Pipeline

The complete pipeline from key message to finished talking head video.

### Pipeline Overview

```
KEY MESSAGE
    │
    ▼
SCRIPT WRITING (exact duration targeting)
    │
    ▼
TTS AUDIO GENERATION (brand voice)
    │
    ▼
PRESENTER VIDEO GENERATION (multi-model)
    │
    ▼
LIP-SYNC APPLICATION
    │
    ▼
FTC COMPLIANCE CHECK
    │
    ▼
PLATFORM OPTIMIZATION
    │
    ▼
FILE OUTPUT to ./campaigns/{campaign}/video/talking-head/
```

### Step 1: Key Message Extraction

Start with the core message:
```
KEY MESSAGE BRIEF
─────────────────
Product/Service: [name]
Core message: [one sentence]
Target audience: [who]
Desired action: [what they should do]
Tone: [archetype reference]
Platform: [where it will go]
Duration target: [seconds]
```

### Step 2: Script Writing to Exact Duration

Use the duration calculator to write a script that fits the target length precisely.

**Duration Calculation:**

| Word Count | Duration | Use Case |
|------------|----------|----------|
| 15 words | ~5 seconds | Social hook |
| 30 words | ~10 seconds | Instagram Reel |
| 45 words | ~15 seconds | TikTok optimal |
| 60 words | ~20 seconds | Short testimonial |
| 90 words | ~30 seconds | Product explainer |
| 150 words | ~60 seconds | Full testimonial |

**Rule:** ~150 words per minute at natural conversational pace

**Script Writing Template:**
```
TARGET: [X] seconds = [Y] words

SCRIPT DRAFT:
───────────────────────────
[Hook - first 1-3 seconds, ~5-10 words]
[Value/Story - middle section]
[CTA - final 3-5 seconds, ~10-15 words]
───────────────────────────
WORD COUNT: [actual count]
ESTIMATED DURATION: [seconds]
ADJUSTMENT NEEDED: [add/cut X words]
```

### Step 3: TTS Audio Generation

Using the approved voice (saved in creative-kit.md):
```
1. Load approved voice_id from creative-kit.md
2. Feed final script to TTS provider
3. Set pace to archetype-appropriate speed
4. Generate audio file
5. Verify duration matches target (+/- 1 second)
6. If duration is off: adjust script word count and regenerate
```

### Step 4: Presenter Video Generation

Generate the presenter video using the approved presenter spec (from creative-kit.md):
```
1. Load presenter spec from creative-kit.md
2. Construct presenter prompt from saved specification
3. Generate via multi-model parallel (hero) or default model (standard)
4. Duration should match or slightly exceed audio duration
5. User selects preferred video output
```

### Step 5: Lip-Sync Application

Apply the TTS audio to the selected presenter video:

**Audio-driven lip-sync (from MODEL_REGISTRY.md):**
```json
{
  "model": "kwaivgi/kling-lip-sync",
  "input": {
    "video_url": "{{selected_presenter_video_url}}",
    "audio_file": "{{tts_audio_url}}"
  }
}
```

### Step 6: Quality Review and Delivery

See Quality Checklist section below.

---

## Script Structures

### HOOK-VALUE-CTA (15-30 seconds)
```
Hook (0-3 sec): [Attention-grabber - question, statement, or pattern interrupt]
Value (3-20 sec): [Main message, benefit, or story]
CTA (20-30 sec): [Clear next step]
```

### PROBLEM-AGITATE-SOLVE (30-60 seconds)
```
Problem (0-10 sec): [Name the pain point]
Agitate (10-30 sec): [Make them feel it]
Solve (30-60 sec): [Present the solution + CTA]
```

### BEFORE-AFTER (15-30 seconds)
```
Before (0-10 sec): [Life before product/solution]
After (10-25 sec): [Transformation/result]
CTA (25-30 sec): [How to get same result]
```

### Tone Templates

**Professional/Corporate:**
```
"[Name] here with [Company]. Today I want to share how [product/insight]
can help you [achieve outcome]. Here's what you need to know..."
```

**Casual/UGC:**
```
"Okay so I've been using [product] for [time] and honestly? I'm obsessed.
Here's why [specific benefit]. If you [problem], you need this."
```

**Expert/Educational:**
```
"One thing I see people get wrong about [topic] is [misconception].
Here's what actually works: [insight]. Let me show you..."
```

**Energetic/Sales:**
```
"Stop what you're doing. [Product] just changed everything. I'm serious -
[result] in [timeframe]. You HAVE to try this."
```

**Aspirational:**
```
"[Casual opening]. I wanted to share something that's completely transformed
[area of life]. [Product] gave me [result]. Here's how it works..."
```

---

## Lip-Sync Workflow

For adding speech to existing videos using Kling Lip-Sync.

### When to Use Lip-Sync

- You have a great presenter video but need different script
- Client wants to change messaging after video generation
- Creating personalized versions of same base video
- Adding voiceover to product demo videos
- Dubbing content for different languages
- Using external TTS for brand voice consistency

### Audio-Driven Lip-Sync (Recommended)

Use when you have a pre-recorded or TTS-generated audio file.

**Payload (from MODEL_REGISTRY.md):**
```json
{
  "model": "kwaivgi/kling-lip-sync",
  "input": {
    "video_url": "{{source_video_url}}",
    "audio_file": "{{audio_url}}"
  }
}
```

### Text-Driven Lip-Sync (Quick Prototyping)

Use for quick tests when voice quality is not critical.

**Payload (from MODEL_REGISTRY.md):**
```json
{
  "model": "kwaivgi/kling-lip-sync",
  "input": {
    "video_url": "{{source_video_url}}",
    "text": "{{spoken_text}}",
    "voice_id": "en_AOT",
    "voice_speed": 1
  }
}
```

### When to Use Model TTS vs. External Audio

| Scenario | Approach | Why |
|----------|----------|-----|
| Quick prototype | Use `text` + `voice_id` | Fastest path. One API call does everything. |
| Brand-specific voice | External TTS (ElevenLabs) then `audio_file` | Model TTS voices are limited. External gives voice cloning. |
| Voiceover already recorded | Use `audio_file` | You have the audio. No synthesis needed. |
| Multiple languages | External TTS then `audio_file` | Model TTS language/accent options are limited. |
| Testimonial/UGC content | Use `audio_file` with real voice recording | Authenticity matters. Real voices convert better. |
| Script iteration/testing | Use `text` + `voice_id` | Fast turnaround for script comparison. |
| Final production delivery | External TTS then `audio_file` | Maximum quality and voice control. |

### Lip-Sync Quality Tips

- Source video should have face visible 70%+ of time
- Forward-facing shots work better than profiles
- Avoid videos with heavy face movement/turning
- Audio should be clear without background noise
- Script pacing should match natural speech
- Video must be 2-10 seconds (Kling Lip-Sync requirement)
- Video resolution must be 720p-1080p
- Audio file must be under 5MB
- Keep sentences short (easier sync)

---

## Audio and Voice Considerations

### When Using Veo 3.1 Native Audio

**Strengths:**
- Generates synchronized audio with video
- Natural ambient sounds
- Speech that matches lip movement
- Good for establishing scenes

**Limitations:**
- Less control over specific script
- Audio quality varies
- May need post-processing

### Voice-Over Tips

**If recording your own VO for lip-sync:**
```
[ ] Record in quiet environment
[ ] Use consistent distance from mic
[ ] Match energy to presenter style
[ ] Natural pauses between sentences
[ ] Clear enunciation
[ ] Export as MP3 or WAV
```

**If using TTS (text input via Kling built-in):**
```
[ ] Use punctuation for natural pauses
[ ] Write phonetically for tricky words
[ ] Keep sentences conversational length
[ ] Test different phrasings
[ ] Consider adding "..." for pauses
```

**If using external TTS (ElevenLabs recommended):**
```
[ ] Select voice matching presenter archetype
[ ] Test voice with sample script before full generation
[ ] Adjust pace to match archetype (see TTS Voice Selection tables)
[ ] Export at highest quality (WAV preferred, MP3 acceptable)
[ ] Verify audio duration matches video duration
[ ] Save voice_id to creative-kit.md for future use
```

---

## Presenter Consistency System

Consistency is the key to building brand recognition with AI presenters. One approved presenter used across all videos creates the illusion of a real brand spokesperson.

### Why Consistency Matters

- **Brand recognition:** Viewers remember a face, not a product
- **Trust building:** Same person appearing repeatedly builds familiarity
- **Production efficiency:** No need to re-explore styles for every video
- **Cross-campaign coherence:** All content looks like it comes from one source

### Saving an Approved Presenter to Creative Kit

After the style exploration process identifies a winner, save the complete specification to `./brand/creative-kit.md`:

```markdown
## Approved Presenter: [Name/Identifier]

**Approved:** [date]
**Archetype:** [Corporate Authority / Relatable Friend / Energetic Creator / Expert Educator / Lifestyle Aspirational]

### Visual Specification
- **Demographics:** [age range, gender, ethnicity, overall look]
- **Setting:** [primary setting, background elements, lighting style]
- **Wardrobe:** [style, colors, accessories]
- **Energy:** [level 1-10, specific markers]
- **Expression:** [default expression, range]
- **Gestures:** [minimal/moderate/expressive, specific notes]

### Voice Specification
- **TTS Provider:** [ElevenLabs / OpenAI / etc.]
- **Voice ID:** [voice_id string]
- **Voice Name:** [human-readable name from provider]
- **Pace:** [speed multiplier, e.g., 0.95x]
- **Tone:** [warm/authoritative/energetic/etc.]

### Generation Prompt (Reusable)
```
[The exact prompt that produced the approved presenter video.
Copy this verbatim for all future videos with this presenter.
Only change: duration and aspect ratio per platform.]
```

### Reference Videos
- **Approval video URL:** [URL of the video that was approved]
- **Lip-sync sample URL:** [URL of lip-synced version if available]

### Usage Notes
- [Any specific notes about what works/doesn't work]
- [Platform-specific adjustments if needed]
- [Known limitations or artifacts to watch for]
```

### Reusing an Approved Presenter

When creating new talking head content:

```
1. CHECK creative-kit.md for approved presenter
2. IF approved presenter exists:
   a. Load generation prompt verbatim
   b. Load voice_id and TTS settings
   c. Only modify: duration, aspect_ratio, platform-specific adjustments
   d. Skip style exploration entirely
3. IF no approved presenter:
   a. Run full style exploration process
   b. Save winner to creative-kit.md
   c. Then proceed with content generation
```

### Updating an Approved Presenter

Presenters may need updating when:
- Brand repositions or pivots
- New campaign requires different energy
- User explicitly requests a new look
- Technical quality improves with new models

**Update process:**
```
1. Run new style exploration alongside current presenter
2. Compare new options vs. current presenter
3. If new presenter wins: update creative-kit.md
4. If current presenter still wins: keep as-is
5. Archive old presenter spec (don't delete — may need for legacy content)
```

---

## FTC Compliance Module

AI-generated presenter videos are subject to evolving regulations. This section covers the current requirements and best practices for disclosure.

### Why FTC Compliance Matters

- **Legal requirement:** The FTC requires disclosure when AI-generated likenesses are used in advertising
- **Platform enforcement:** Major platforms are implementing AI content labeling requirements
- **Consumer trust:** Transparent disclosure builds trust rather than eroding it
- **Future-proofing:** Regulations are tightening, not loosening — build compliance into the workflow now

### Disclosure Requirements

**FTC Guidelines (Current as of 2026):**
- AI-generated presenters in advertising must be disclosed
- Disclosure must be "clear and conspicuous"
- Cannot be buried in fine print or hidden behind clicks
- Must appear before or during the content, not only after

**Required Disclosure Language:**
```
Options (use the one most natural for your format):

1. "This video features an AI-generated presenter"
2. "Presenter created with AI"
3. "AI-generated spokesperson"
4. "[Brand] AI presenter"
```

### Platform-Specific AI Content Policies

**Meta (Facebook/Instagram):**
- Requires AI-generated content label on ads
- Use Meta's built-in "AI-generated" content label
- Apply during ad setup in Ads Manager
- Organic content: add text disclosure in caption

**TikTok:**
- Requires AI-generated content disclosure
- Use TikTok's AI label feature when uploading
- Add #AIgenerated or similar hashtag
- Text overlay disclosure in first 3 seconds recommended

**YouTube:**
- Requires disclosure for "altered or synthetic" content
- Use YouTube's AI content declaration in upload settings
- For ads: disclose in ad setup and in video itself
- Shorts: text overlay in first frame

**LinkedIn:**
- Requires transparency for AI-generated content
- Disclose in post text
- For video: text overlay or caption disclosure
- Professional context demands higher transparency standard

**General Web (Landing pages, email, etc.):**
- FTC guidelines apply regardless of platform
- Add disclosure near the video player
- Include in video description or caption
- Consider text overlay in video itself

### Implementing Disclosure in Video

**Method 1: Text Overlay (Recommended for all platforms)**
```
Add text overlay in post-production:
- Position: Bottom-left or top-right corner
- Timing: First 3-5 seconds of video
- Style: Small, readable, non-intrusive
- Text: "AI-generated presenter" or platform-appropriate variant
- Font: Match brand typography
- Opacity: 70-90% (visible but not distracting)
```

**Method 2: Verbal Disclosure (For longer content)**
```
Include in script:
- Position: Within first 10 seconds
- Style: Natural, not apologetic
- Example: "I'm [Brand]'s AI presenter, and today I want to share..."
- Tone: Confident — AI is a feature, not a flaw
```

**Method 3: Caption/Description (Supplementary)**
```
Add to video description/caption:
- "This video features an AI-generated presenter"
- Include relevant hashtags: #AIgenerated #AIpresenter
- Link to brand's AI disclosure policy if applicable
```

### Compliance Checklist

Before publishing any talking head video:
```
[ ] AI-generated presenter disclosure included in video (text overlay or verbal)
[ ] Platform-specific AI content label applied (Meta, TikTok, YouTube, etc.)
[ ] Video description/caption includes disclosure
[ ] Disclosure appears within first 5 seconds
[ ] Disclosure is clear and conspicuous (readable, not hidden)
[ ] No claims of real person endorsement
[ ] No impersonation of real individuals
[ ] Testimonial claims are truthful (even with AI presenter)
[ ] Check platform's current AI content policy (policies evolve)
```

### What NOT to Do

- Do NOT impersonate real people (celebrities, influencers, competitors)
- Do NOT claim AI presenter is a real customer giving a real testimonial
- Do NOT hide or obscure the AI disclosure
- Do NOT use AI presenter to make claims the brand cannot substantiate
- Do NOT skip disclosure because "no one will know" — platforms are building detection
- Do NOT assume today's rules will stay the same — check quarterly

### Compliance-Aware Script Templates

**UGC-Style with Disclosure:**
```
"Hi, I'm [Brand]'s AI presenter. Now that that's out of the way —
let me tell you about something amazing. I've been programmed with
real customer feedback, and here's what people are saying about [product]..."
```

**Corporate with Disclosure:**
```
"[Pause for text overlay: AI-generated presenter]
Welcome. Today I want to walk you through how [product] can help you
[achieve outcome]..."
```

**Creator-Style with Disclosure:**
```
"Before we dive in — full transparency, I'm AI-generated. But the results
I'm about to show you? Those are 100% real. Let's go..."
```

---

## Platform-Specific Optimization

### TikTok/Reels (9:16)

**Specs:**
- Aspect Ratio: 9:16 (vertical)
- Duration: 15-30 seconds optimal
- Safe Zone: Keep face/text center 60%

**Style Adjustments:**
```
→ Higher energy delivery
→ Faster pacing
→ Hook in first 1-2 seconds
→ Pattern interrupts
→ Jump cuts acceptable
→ Casual/authentic feel
```

**Prompt Modifier:**
```
...[base prompt], filmed vertically like TikTok/Reels content,
energetic creator style, direct eye contact with camera
```

**AI Disclosure:** Use platform's built-in AI label + text overlay in first 3 seconds

### YouTube (16:9)

**Specs:**
- Aspect Ratio: 16:9 (landscape)
- Duration: 30-120 seconds
- Safe Zone: Standard letterbox

**Style Adjustments:**
```
→ More measured pacing
→ Can be longer form
→ More professional setups accepted
→ Room for B-roll integration
→ Intro/outro structure
```

**Prompt Modifier:**
```
...[base prompt], widescreen YouTube style, professional yet engaging,
room for graphics/lower thirds
```

**AI Disclosure:** Use YouTube's AI content declaration in upload settings + text overlay

### LinkedIn (1:1 or 16:9)

**Specs:**
- Aspect Ratio: 1:1 (square) or 16:9
- Duration: 30-60 seconds optimal
- Tone: Professional but personal

**Style Adjustments:**
```
→ Professional appearance
→ Business-appropriate setting
→ Thought leadership tone
→ Value-first messaging
→ Credibility signals
```

**Prompt Modifier:**
```
...[base prompt], professional LinkedIn style, credible expert appearance,
business casual in modern office environment
```

**AI Disclosure:** Disclose in post text + text overlay in video

### Instagram Stories (9:16)

**Specs:**
- Aspect Ratio: 9:16
- Duration: 15 seconds max per segment
- Ephemeral feel

**Style Adjustments:**
```
→ Casual, in-the-moment feel
→ Can be "rougher" quality
→ Direct audience address
→ Personal/behind-scenes vibe
→ Clear single message per story
```

**AI Disclosure:** Use Meta's AI-generated content label + caption disclosure

### Ads (Various)

**Facebook/Instagram Ads:**
- 1:1, 4:5, or 9:16
- 15-30 second optimal
- Hook in 0-3 seconds
- Clear CTA
- AI disclosure via Meta Ads Manager labeling

**YouTube Ads:**
- 16:9
- 15-30 second (skippable) or 6 second (bumper)
- Brand visible throughout
- AI disclosure in ad setup + text overlay

---

## Use Cases Deep Dive

### 1. Lip-Sync Overlay

**Best for:** Adding voiceover to existing video, dubbing, personalization

**Input Requirements:**
- Video with visible face (front-facing works best)
- Audio file (MP3, WAV) OR text script

**Workflow:**
```json
{
  "model": "kwaivgi/kling-lip-sync",
  "input": {
    "video_url": "{{source_video_url}}",
    "audio_file": "{{audio_url}}"
  }
}
```

**Or with text (uses built-in TTS):**
```json
{
  "model": "kwaivgi/kling-lip-sync",
  "input": {
    "video_url": "{{source_video_url}}",
    "text": "{{spoken_text}}",
    "voice_id": "en_AOT",
    "voice_speed": 1
  }
}
```

---

### 2. AI Presenter Generation

**Best for:** Creating presenter content from scratch, brand spokesperson

**Multi-Model Workflow (from MODEL_REGISTRY.md):**

```json
// Kling 2.5
{
  "model": "kwaivgi/kling-v2.5-turbo-pro",
  "input": {
    "prompt": "[presenter prompt]",
    "aspect_ratio": "16:9",
    "duration": 5,
    "guidance_scale": 0.5
  }
}
```

```json
// Veo 3.1 (with native audio)
{
  "model": "google/veo-3.1",
  "input": {
    "prompt": "[presenter prompt]",
    "aspect_ratio": "16:9",
    "duration": 8,
    "generate_audio": true,
    "resolution": "1080p"
  }
}
```

```json
// Sora 2
{
  "model": "openai/sora-2",
  "input": {
    "prompt": "[presenter prompt]",
    "seconds": 8,
    "aspect_ratio": "landscape"
  }
}
```

**Then add lip-sync if specific script needed (from MODEL_REGISTRY.md):**
```json
{
  "model": "kwaivgi/kling-lip-sync",
  "input": {
    "video_url": "[generated video URL]",
    "audio_file": "[TTS audio URL]"
  }
}
```

---

### 3. UGC-Style Content

**Best for:** Authentic testimonials, product reviews, social proof

**The UGC Formula:**
```
[Relatable person] + [Casual setting] + [Natural lighting] +
[Authentic delivery] + [Genuine reaction] = Believable UGC
```

**Prompt Template:**
```
Friendly [demographic] sitting in [casual setting], natural window light,
holding/showing [product], genuine excited expression, talking directly to
camera like filming a selfie video, authentic UGC testimonial style, casual
comfortable body language, 5 seconds
```

---

### 4. Personal Brand Series

**Best for:** Thought leaders, course creators, coaches, consultants

**Consistency Formula:**
```
ESTABLISH ONCE, USE FOREVER:
- Same presenter appearance (saved in creative-kit.md)
- Same setting/background
- Same wardrobe style
- Same energy level
- Same lighting setup
- Same TTS voice (voice_id saved in creative-kit.md)

Only change: Script and specific content
```

**Series Prompt Template:**
```
[Consistent presenter description from creative-kit.md], [same setting],
[same lighting], [same wardrobe style], [same energy], discussing [new topic],
[consistent delivery style], 5 seconds
```

---

### 5. Multi-Language Dubbing

**Best for:** International campaigns, localized content, global brands

**Workflow:**
```
1. Generate presenter video once (approve visual)
2. Write scripts in each target language
3. Generate TTS audio per language using ElevenLabs multi-language voices
4. Run Kling Lip-Sync for each language version
5. Result: Same presenter, multiple languages
```

**Cost advantage:** One presenter video generation (~$0.40-1.20) + one lip-sync per language (~$0.30-0.60 each) = dramatically cheaper than filming multiple takes.

---

## Execution Workflow

### Step 1: Clarify Requirements

Before generating:
```
[ ] What's the use case? (UGC, corporate, educational, etc.)
[ ] What platform? (TikTok, YouTube, LinkedIn, ads)
[ ] What aspect ratio? (9:16, 16:9, 1:1)
[ ] What duration? (and word count)
[ ] What presenter style? (see archetypes)
[ ] What's the script/message?
[ ] Need lip-sync to specific audio?
[ ] Is there an approved presenter in creative-kit.md?
[ ] Budget constraints?
```

### Step 2: Style Selection

If not predefined and no approved presenter in creative-kit.md:
```
[ ] Generate style exploration with 4-5 different presenter styles
[ ] Present options to user
[ ] Extract principles from winner
[ ] Save to creative-kit.md for future reuse
[ ] Document voice selection alongside visual spec
```

If approved presenter exists in creative-kit.md:
```
[ ] Load presenter spec from creative-kit.md
[ ] Load voice_id from creative-kit.md
[ ] Skip to Step 3
```

### Step 3: Script Writing

```
[ ] Extract key message
[ ] Calculate word count for target duration
[ ] Write script using appropriate structure (Hook-Value-CTA, PAS, Before-After)
[ ] Apply tone template matching archetype
[ ] Review word count against duration target
[ ] Finalize script
```

### Step 4: Estimate Cost and Confirm

```
ESTIMATED GENERATION COST
─────────────────────────
Models: [list models]
Clips: [number of clips]
Duration per clip: [seconds]
TTS generation: [included/separate]
Lip-sync: [yes/no]
Estimated total: ~$X.XX
Estimated time: ~Xmin

Proceed? [Y/n]
```

### Step 5: Construct Prompt

Use this formula:
```
[PRESENTER DESCRIPTION] + [SETTING] + [LIGHTING] +
[EXPRESSION/ENERGY] + [ACTION] + [STYLE MODIFIER] + [DURATION]
```

### Step 6: Multi-Model Generation

```
Run same prompt through:
1. Kling 2.5 (~3min) — default, best for faces
2. Veo 3.1 (~5min) — with audio, highest fidelity
3. Sora 2 (~6min) — strong prompt adherence

Present all three to user for selection.
```

For standard content (not hero), use default model only (Kling 2.5).

### Step 7: TTS Audio Generation

If lip-sync is needed:
```
1. Load voice_id from creative-kit.md
2. Generate audio from final script via TTS
3. Verify audio duration matches video duration
4. Download audio file
```

### Step 8: Add Lip-Sync (If Needed)

If specific script delivery required:
```
1. User approves video from Step 6
2. Run through Kling Lip-Sync with TTS audio
3. Input: selected video + audio file
4. Output: synced talking head
```

**Payload (from MODEL_REGISTRY.md):**
```json
{
  "model": "kwaivgi/kling-lip-sync",
  "input": {
    "video_url": "[approved video URL]",
    "audio_file": "[TTS audio URL]"
  }
}
```

### Step 9: FTC Compliance Check

```
[ ] AI disclosure text overlay added (or planned for post-production)
[ ] Platform-specific AI label will be applied on upload
[ ] Script does not make unsubstantiated claims
[ ] No impersonation of real individuals
[ ] Description/caption disclosure prepared
```

### Step 10: Deliver and Iterate

```markdown
## Talking Head Video Delivered

**Style:** [Archetype used]
**Platform:** [Target platform]
**Duration:** [X seconds]
**Presenter:** [Name from creative-kit.md or "New — pending approval"]

### Selected Video
[video URL]
**Model:** [which model — from MODEL_REGISTRY.md]
**Estimated Cost:** ~$[amount]

### Lip-Sync Version (if applicable)
[video URL]
**Script:** "[excerpt...]"
**Voice:** [voice name/ID]

### FTC Compliance
- AI disclosure: [included/pending post-production]
- Platform label: [to be applied on upload]

**Saved to:** ./campaigns/{campaign}/video/talking-head/[filename].mp4

**Options:**
- [ ] Approve and use
- [ ] Adjust script and resync
- [ ] Try different presenter style
- [ ] Save presenter to creative-kit.md
```

---

## File Output

All generated talking head assets are saved to the campaign directory.

### Output Directory Structure

```
./campaigns/{campaign}/video/talking-head/
├── presenter-exploration/
│   ├── corporate-authority-kling-v1.mp4
│   ├── relatable-friend-kling-v1.mp4
│   ├── energetic-creator-kling-v1.mp4
│   ├── expert-educator-kling-v1.mp4
│   └── lifestyle-aspirational-kling-v1.mp4
├── generation/
│   ├── presenter-kling-v1.mp4
│   ├── presenter-veo-v1.mp4
│   ├── presenter-sora-v1.mp4
│   └── presenter-kling-v2.mp4       (iteration)
├── audio/
│   ├── script-v1-elevenlabs.mp3
│   ├── script-v2-elevenlabs.mp3
│   └── script-v1-spanish.mp3        (localization)
├── lip-sync/
│   ├── presenter-synced-v1.mp4
│   ├── presenter-synced-v2.mp4
│   └── presenter-synced-spanish.mp4  (localization)
└── approved/
    ├── final-talking-head.mp4        (selected winner)
    └── final-talking-head-spanish.mp4
```

### File Naming Convention

```
{purpose}-{model}-v{version}.mp4

Examples:
  presenter-kling-v1.mp4
  ugc-testimonial-kling-v1.mp4
  corporate-intro-veo-v1.mp4
  product-explainer-sora-v1.mp4
  presenter-synced-v1.mp4            (lip-synced version)
  presenter-synced-spanish-v1.mp4    (localized lip-sync)
```

### Saving Deliverables

After the user approves a video:
1. Download the video from the generation URL
2. Save to `./campaigns/{campaign}/video/talking-head/generation/` with the naming convention
3. If lip-synced: save synced version to `./campaigns/{campaign}/video/talking-head/lip-sync/`
4. Copy the approved final version to `./campaigns/{campaign}/video/talking-head/approved/`
5. Log the generation metadata (model, prompt, cost, timestamp, voice_id)
6. If new presenter approved: save spec to `./brand/creative-kit.md`

---

## Quality Checklist

### Technical Quality
- [ ] Face clearly visible throughout
- [ ] No uncanny valley artifacts
- [ ] Consistent appearance (no morphing)
- [ ] Smooth natural movement
- [ ] Appropriate resolution for platform

### Presenter Quality
- [ ] Matches intended archetype
- [ ] Expression appropriate for message
- [ ] Energy level fits content type
- [ ] Wardrobe matches brand/context
- [ ] Setting supports message
- [ ] Consistent with creative-kit.md specification (if approved presenter exists)

### Lip-Sync Quality (if applicable)
- [ ] Mouth movement matches audio
- [ ] Natural speech rhythm
- [ ] No obvious desync
- [ ] Head movement doesn't break sync
- [ ] Audio quality clear

### Content Quality
- [ ] Script delivered clearly
- [ ] Pacing appropriate for platform
- [ ] Hook captures attention
- [ ] Message comes through
- [ ] CTA clear (if applicable)

### Voice Quality (if TTS used)
- [ ] Voice matches presenter archetype
- [ ] Pace feels natural for the content
- [ ] Pronunciation correct (especially brand names)
- [ ] Emotional tone matches script intent
- [ ] No robotic artifacts or unnatural pauses

### FTC Compliance Quality
- [ ] AI disclosure present and visible
- [ ] Disclosure appears within first 5 seconds
- [ ] Platform-specific AI label will be applied
- [ ] No misleading claims about real person endorsement
- [ ] Description/caption disclosure prepared

### Platform Fit
- [ ] Correct aspect ratio for destination platform
- [ ] Duration within platform optimal range
- [ ] Safe zones respected (mobile UI overlays)
- [ ] Thumbnail/first frame compelling
- [ ] Works with platform compression

---

## Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Uncanny valley feel | Model limitations | Use Kling v2.5 for most realistic faces |
| Face morphing mid-video | Long duration | Keep videos shorter (5-10 sec), extend with cuts |
| Lip-sync drift | Audio/video mismatch | Use shorter scripts, clear enunciation |
| Wrong energy level | Prompt too vague | Be explicit about energy: "calm" vs "enthusiastic" |
| Generic stock presenter | No specific direction | Add detailed demographic and style descriptors |
| Setting doesn't match | Prompt conflict | Prioritize setting description, remove conflicts |
| Awkward hand movement | Unspecified gestures | Add gesture direction or specify "minimal movement" |
| Bad lighting | Missing lighting prompt | Always include lighting: "warm natural light" |
| Doesn't look like brand | No style consistency | Save presenter spec to creative-kit.md and reuse |
| Audio quality poor | Model TTS limitations | Use external TTS (ElevenLabs) instead of text input |
| Voice doesn't match visual | Wrong TTS voice selected | Re-select voice per archetype guidelines |
| Lip-sync rejected | Video too long/short | Trim video to 2-10 seconds per Kling Lip-Sync requirements |
| Audio file too large | Uncompressed audio | Compress to MP3 under 5MB |
| Side profile sync fails | Non-frontal face | Use front-facing presenter videos for lip-sync |
| Script too long for duration | Word count miscalculation | Recalculate: ~150 words per minute |
| API parameter error | Wrong param name for model | Check cross-model cheat sheet in MODEL_REGISTRY.md |
| Aspect ratio rejected | Model doesn't support it | Check MODEL_REGISTRY.md — Veo/Sora have no square support |
| Generation timeout | Model overloaded | Retry; allow extra buffer for Sora 2 |
| Presenter inconsistent across videos | Not using saved spec | Load presenter prompt from creative-kit.md |

---

## Iteration Strategies

### When Presenter Is Close But Not Right

**Problem:** Almost there but something's off
**Strategy:** Targeted prompt adjustments

```
Wrong energy → adjust energy descriptors: "calm measured" vs "enthusiastic dynamic"
Wrong age → adjust age range: "early 30s" vs "late 40s"
Wrong setting → change environment descriptors
Wrong wardrobe → update clothing description
Expression off → add explicit expression: "warm genuine smile" vs "confident neutral"
```

### When Presenter Is Completely Wrong

**Problem:** Output doesn't match intent
**Strategy:** Different approach entirely

Don't iterate on broken foundation:
1. Try different archetype entirely
2. Try different model
3. Simplify prompt dramatically
4. Check if Kling v2.5 gives better face quality

### When Lip-Sync Quality Is Poor

**Problem:** Audio doesn't match mouth movement
**Strategy:** Technical fixes

```
- Use shorter scripts (fewer words = easier sync)
- Ensure audio has clear enunciation
- Use front-facing video (not profiles)
- Try generating a new presenter video with more frontal positioning
- Use recorded audio instead of model TTS for better quality
- Verify video is 2-10 seconds
- Check audio file is under 5MB
```

### When Voice Doesn't Match

**Problem:** TTS voice feels wrong for the presenter
**Strategy:** Voice re-selection

```
1. Review archetype voice guidelines (see TTS Voice Selection tables)
2. Test 3-5 alternative voices from ElevenLabs library
3. Prioritize: natural match to visual > quality > cost
4. Re-generate lip-sync with new voice
5. Update voice_id in creative-kit.md when satisfied
```

### When Budget Is a Concern

**Problem:** Need to minimize generation costs
**Strategy:** Targeted model selection

```
- Use Kling 2.5 only (cheapest at ~$0.40/clip)
- Use model TTS (text input) instead of external TTS for prototyping
- Skip parallel comparison for non-hero content
- Reuse approved presenter video for multiple scripts via lip-sync
- Plan scripts carefully before generating (avoid wasted generations)
```

---

## Output Format

### Style Exploration Output
```markdown
## Presenter Style Exploration

**Brand/Project:** [Name]
**Use Case:** [What videos will be used for]
**Platform:** [Target platform]

### Style 1: Corporate Authority
[video URL]
- Demographic: [specifics]
- Setting: [description]
- Energy: [level]
- Saved to: ./campaigns/{campaign}/video/talking-head/presenter-exploration/

### Style 2: Relatable Friend
[video URL]
- Demographic: [specifics]
- Setting: [description]
- Energy: [level]

### Style 3: Energetic Creator
[video URL]
- Demographic: [specifics]
- Setting: [description]
- Energy: [level]

### Style 4: Expert Educator
[video URL]
- Demographic: [specifics]
- Setting: [description]
- Energy: [level]

### Style 5: Lifestyle Aspirational
[video URL]
- Demographic: [specifics]
- Setting: [description]
- Energy: [level]

**Recommendation:** Style [X] best fits because [reasons]
**Feedback needed:** Which direction resonates?
**Next step:** Approve a style to save to creative-kit.md
```

### Generated Video Output
```markdown
## Talking Head Video Generated

**Style:** [Archetype]
**Platform:** [Target]
**Duration:** [X seconds]
**Presenter:** [From creative-kit.md or "New"]

### Model Outputs:

**Kling 2.5:** [URL] (~$0.40)
**Veo 3.1:** [URL] (includes audio) (~$1.00)
**Sora 2:** [URL] (~$0.80)

**Total generation cost:** ~$2.20

**Prompt Used:**
> [full prompt for reference]

**Next Steps:**
- [ ] Select preferred video
- [ ] Generate TTS audio for lip-sync
- [ ] Add lip-sync to specific script
- [ ] Request variation
- [ ] Approve for use
- [ ] Save presenter to creative-kit.md
```

### Lip-Sync Output
```markdown
## Lip-Sync Video Delivered

**Source Video:** [URL]
**Script:** "[excerpt...]"
**Duration:** [X seconds]
**Voice:** [voice name, voice_id]
**TTS Provider:** [ElevenLabs / Model built-in / Recorded]

**Final Video:** [URL]
**Estimated Cost:** ~$[lip-sync cost]
**Saved to:** ./campaigns/{campaign}/video/talking-head/lip-sync/[filename].mp4

**Quality Check:**
- Sync accuracy: [pass/fail]
- Natural rhythm: [pass/fail]
- Audio clarity: [pass/fail]
- Expression match: [pass/fail]

**FTC Compliance:**
- AI disclosure: [included/pending]
- Platform label: [to apply on upload]

**Options:**
- [ ] Approve and use
- [ ] Adjust script and resync
- [ ] Try different source video
- [ ] Try different voice
```

---

## Pipeline Integration

```
TALKING HEAD PIPELINE

┌─────────────────────────────────────────┐
│  Request arrives (direct or routed)     │
│  → Clarify: platform, duration, style   │
│  → Determine: generation vs lip-sync    │
│  → Check creative-kit.md for presenter  │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  Style Undefined │   │  Style Defined   │
│  (no approved    │   │  (approved       │
│   presenter in   │   │   presenter in   │
│   creative-kit)  │   │   creative-kit)  │
│  → Run style     │   │  → Load spec     │
│    exploration   │   │  → Skip to       │
│  → Save winner   │   │    generation    │
└──────────────────┘   └──────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Script Writing                         │
│  → Key message extraction               │
│  → Duration-targeted word count         │
│  → Tone matching archetype              │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Cost Estimation                        │
│  → Calculate based on models + clips    │
│  → Include TTS + lip-sync costs         │
│  → Present to user for confirmation     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  talking-head mode (THIS MODE)          │
│  → Multi-model generation               │
│  → Present options                      │
│  → TTS audio generation                 │
│  → Add lip-sync                         │
│  → FTC compliance check                 │
│  → Quality check                        │
│  → Save to campaigns/{campaign}/        │
│    video/talking-head/                  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│  Delivery                               │
│  → Platform-optimized output            │
│  → AI disclosure included               │
│  → Ready for ads/social/content         │
│  → Presenter saved to creative-kit.md   │
└─────────────────────────────────────────┘
```

---

## Handoff Protocols

### Receiving from creative workflow
```yaml
Receive:
  use_case: "talking head" | "UGC" | "presenter" | "lip-sync"
  campaign: "[campaign name]"
  platform: "[target platform]"
  aspect_ratio: "[ratio]"
  duration: "[seconds]"
  style: "[archetype or custom]"
  script: "[text]"
  audio_url: "[if lip-sync with audio]"
  video_url: "[if lip-sync to existing]"
  budget_limit: "[if specified]"
```

### Returning to Workflow
```yaml
Return:
  status: "complete" | "needs_selection" | "needs_iteration"
  deliverables:
    - url: "[video URL]"
      local_path: "./campaigns/{campaign}/video/talking-head/[filename].mp4"
      model: "[which model — from MODEL_REGISTRY.md]"
      has_audio: true | false
      has_lip_sync: true | false
      duration: "[seconds]"
      voice_id: "[if TTS used]"
      estimated_cost: "[cost]"
  presenter_saved: true | false
  ftc_disclosure: "included" | "pending_post_production"
  total_cost: "[sum of all generations]"
  feedback_needed: "[any questions]"
```

### Receiving Video from product-video mode
```yaml
Receive for lip-sync:
  video_url: "[product video URL]"
  local_path: "./campaigns/{campaign}/video/[filename].mp4"
  aspect_ratio: "[ratio]"
  script: "[voiceover text]"
  audio_url: "[optional, if pre-recorded]"
```

### Routing to product-video mode
```yaml
Route to product-video mode:
  reason: "Need product footage before adding presenter overlay"
  product: "[product name]"
  video_style: "[motion style from product-video mode]"
  return_to: "talking-head mode for voiceover/lip-sync"
```

---

## Tips from Experience

### What Works

1. **Consistency beats variety** — Same presenter across videos builds recognition
2. **Kling v2.5 for faces** — Most realistic human generation
3. **Shorter is safer** — 5-10 second clips avoid quality degradation
4. **Explicit energy levels** — "calm and measured" vs "enthusiastic and dynamic"
5. **Multi-model approach** — Always generate with 2-3 models for hero content, let user pick
6. **Lip-sync extends value** — One good video can become many scripts
7. **External TTS for production** — ElevenLabs voice quality far exceeds model built-in TTS
8. **Save everything to creative-kit.md** — Presenter spec + voice_id = instant reuse
9. **FTC disclosure builds trust** — Be transparent about AI, audiences respect honesty
10. **Duration-target your scripts** — Calculate word count before writing, not after

### What Doesn't Work

1. **Vague presenter description** — "A person talking" = generic results
2. **Long continuous takes** — Quality degrades after 10-15 seconds
3. **Ignoring setting** — Presenter without context looks artificial
4. **Skipping style exploration** — First idea rarely best for brand
5. **Mismatched energy** — Corporate script + UGC style = awkward
6. **Complex movements** — Walking + talking + gesturing = artifacts
7. **Model TTS for final delivery** — Built-in TTS voices are limited and inconsistent
8. **Skipping FTC disclosure** — Platforms are building AI detection, regulations are tightening
9. **Regenerating presenter for every video** — Save and reuse from creative-kit.md
10. **Hardcoding model IDs** — Always use MODEL_REGISTRY.md

### The 80/20

80% of talking head success comes from:
1. Clear presenter archetype selection
2. Matching energy to platform
3. Short, punchy scripts at exact word count
4. Using Kling v2.5 for realism

Get these four right, and you'll get good results.

### Multi-Model Strategy

When to invest in parallel comparison:
- **Hero content** (website presenters, launch videos) — Always run all three
- **Social content** (feed posts, stories) — Default model is fine
- **UGC batch** (multiple testimonial variants) — Default model, iterate on scripts
- **Ad creative** (paid campaigns) — Run all three, A/B test the winners
- **Personalized outreach** (sales videos) — Default model + lip-sync

### Budget Management

```
BUDGET TIERS
─────────────────────────────────
Lean:     1 model, no lip-sync           ~$0.40
Standard: 1 model + lip-sync            ~$0.70-1.00
Premium:  3 models, lip-sync on winner   ~$2.50-3.10
Hero:     3 models + exploration + sync  ~$4.50-6.00
Campaign: 5 variants + 3 languages       ~$5.00-10.00+
```

---

## Quick Reference

| Task | Model | Process |
|------|-------|---------|
| Generate presenter video | All 3 models | Multi-model parallel, user picks |
| Add speech to existing video | Kling Lip-Sync | Direct, ~1min |
| Presenter + specific script | Generate → TTS → Lip-Sync | Three-step pipeline |
| Video with built-in audio | Veo 3.1 | Single generation |
| Most realistic face | Kling v2.5 | Single or multi-model |
| Fastest generation | Kling v2.5 | Single generation |
| UGC style | Kling v2.5 | Handles casual movement best |
| Brand voice consistency | ElevenLabs TTS → Lip-Sync | External TTS, saved voice_id |
| Multi-language dubbing | Kling Lip-Sync (per language) | One video + multiple audio files |
| Quick script test | Kling Lip-Sync with `text` | Built-in TTS, fastest path |
| Reuse approved presenter | Load from creative-kit.md | Skip exploration, direct generation |

---

## Appendix: Model API Quick Reference

**Always verify against MODEL_REGISTRY.md before executing.** This appendix is a convenience reference only.

### Video Generation Call Patterns

**Kling 2.5 T2V (Presenter Generation):**
```
Model: kwaivgi/kling-v2.5-turbo-pro
Duration param: duration (5 or 10)
Ratio param: aspect_ratio ("16:9", "9:16", "1:1")
Extras: guidance_scale (0-1), negative_prompt
```

**Veo 3.1 T2V (Presenter with Audio):**
```
Model: google/veo-3.1
Duration param: duration (4, 6, or 8)
Ratio param: aspect_ratio ("16:9", "9:16")
Extras: generate_audio (bool), resolution ("720p", "1080p"), negative_prompt, seed
```

**Sora 2 T2V (Presenter Generation):**
```
Model: openai/sora-2
Duration param: seconds (4-12)
Ratio param: aspect_ratio ("landscape", "portrait")
Extras: openai_api_key (optional)
```

### Lip-Sync Call Patterns

**Kling Lip-Sync (Audio-Driven):**
```
Model: kwaivgi/kling-lip-sync
Video param: video_url (2-10s, 720p-1080p, <100MB)
Audio param: audio_file (.mp3, .wav, .m4a, .aac, <5MB)
```

**Kling Lip-Sync (Text-Driven):**
```
Model: kwaivgi/kling-lip-sync
Video param: video_url (2-10s, 720p-1080p, <100MB)
Text param: text (free text)
Voice param: voice_id (e.g., "en_AOT")
Speed param: voice_speed (0.5-2.0, default 1)
```

**Important:** `audio_file` and `text` are mutually exclusive. `video_url` and `video_id` are mutually exclusive.

---

*This mode is part of the Vibe Marketing Skills v2 creative engine. Model configurations are maintained in `references/MODEL_REGISTRY.md`. When model schemas change upstream, MODEL_REGISTRY.md is updated first, then this mode file is updated to match.*
