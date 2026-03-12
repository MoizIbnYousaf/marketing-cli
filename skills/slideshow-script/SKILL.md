---
name: slideshow-script
description: "Generate 5 different narrative scripts for visual slideshows from a single positioning angle. Each script uses a different storytelling framework (AIDA, PAS, BAB, Stat-Flip, Myth-Buster) producing genuinely different stories, not layout variations. Use when someone needs TikTok scripts, carousel scripts, slideshow narratives, or says 'slideshow script', 'generate scripts', 'narrative scripts', 'content scripts', 'TikTok scripts', or 'storytelling frameworks'. Outputs YAML content specs that chain to /paper-marketing."
allowed-tools:
  - Bash(mktg status *)
---

# /slideshow-script — Narrative Script Generation

Generate 5 different narrative scripts from a single positioning angle. Each script uses a different storytelling framework, producing 5 publishable pieces of content instead of 5 variations of 1 script.

For scripting frameworks reference, see [references/frameworks.md](references/frameworks.md).
For content spec YAML schema, see [references/content-spec-schema.md](references/content-spec-schema.md).

## Why 5 Scripts, Not 5 Layouts

```
Old model:  1 script × 5 visual layouts = 1 usable output (pick 1, waste 4)
New model:  5 scripts × 5 visual layouts = 5 usable outputs (post all 5)
```

Each script has a DIFFERENT narrative, DIFFERENT hook, DIFFERENT proof points. When paired with /paper-marketing, each agent gets a unique script AND a unique design direction.

## Workflow

### Phase 1: Load Brand Context

Read in parallel:
- `brand/positioning.md` — available angles, headlines, proof points
- `brand/audience.md` — pain points, desires, language patterns
- `brand/voice-profile.md` — tone, vocabulary, do's/don'ts, signature phrases

### Phase 2: Select Positioning Angle

If the user hasn't specified an angle, present the available angles from `brand/positioning.md`:

```
"Which positioning angle should I write 5 scripts for?"

[List angles from positioning.md with their headlines]

Options:
1-N. Select a specific angle
N+1. "Use the primary angle"
```

### Phase 3: Generate 5 Scripts

For the selected positioning angle, generate 5 narratively distinct scripts — one per framework:

| # | Framework | Structure | Hook Style |
|---|-----------|-----------|------------|
| 1 | **AIDA** | Attention → Interest → Desire → Action | Bold claim or question |
| 2 | **PAS** | Problem → Agitate → Solution | Pain point the audience feels |
| 3 | **BAB** | Before → After → Bridge | "Life before" vs "life after" |
| 4 | **Star-Story-Solution** | Hook character → conflict → resolution | Personal/relatable story |
| 5 | **Stat-Flip** | Surprising data → reframe → CTA | Shocking statistic |

**Each script includes:**
- **Hook** (slide 1) — the first thing seen, must grab in 1-3 seconds
- **5-7 slides** — each with `type` annotation (stat, anchor_word, emotional_pivot, cascade, cta, logo_intro)
- **CTA** (final slide) — clear action with URL/handle
- **Animation hints** — spring preset suggestion per slide (bouncy, smooth, heavy, snappy)

**Script generation rules:**
- All 5 must use the SAME positioning angle but tell DIFFERENT stories
- No two scripts should share the same hook
- Each script should use different proof points from the positioning doc
- Voice rules from voice-profile.md apply to ALL scripts
- Slide count can vary (5-9) based on what the narrative needs

### Phase 4: Match Scripts to Visual Directions

Each script gets a recommended visual direction for /paper-marketing:

| Framework | Best Visual Direction | Why |
|-----------|---------------------|-----|
| AIDA | Typographic | Text IS the design, progressive revelation |
| PAS | Contrast Play / Split | Tension between problem and solution |
| BAB | Atmospheric | Emotional transformation needs breathing room |
| Star-Story-Solution | Editorial | Story flow needs magazine-like pacing |
| Stat-Flip | Data-Led | Numbers are the visual anchors |

These are recommendations — the user can override.

### Phase 5: Present for Approval

Use **AskUserQuestion** to show all 5 scripts with their visual direction:

```
"Here are 5 narrative scripts for '{angle_name}', each using a different storytelling framework:"

1. **AIDA** (→ Typographic): "{hook}" — Attention grab → feature interest → desire trigger → CTA
2. **PAS** (→ Contrast Play): "{hook}" — Pain → twist → relief
3. **BAB** (→ Atmospheric): "{hook}" — Before/after transformation
4. **Star-Story-Solution** (→ Editorial): "{hook}" — Story arc → resolution
5. **Stat-Flip** (→ Data-Led): "{hook}" — Shocking stat → reframe

Options:
1. "All 5 look great" — write all 5 content specs
2. "Regenerate #{n}" — rewrite a specific script
3. "Change the angle" — try a different positioning angle
4. "Edit a script" — modify specific slides
5. "Only use 3 of these" — select a subset
```

### Phase 6: Write Content Spec YAMLs

For each approved script, write a structured YAML file:

**Path:** `marketing/content-specs/{project}-{framework}.yaml`

Example: `marketing/content-specs/halalscreen-aida.yaml`

See [references/content-spec-schema.md](references/content-spec-schema.md) for the full schema.

```yaml
spec_version: 1
project: halalscreen
content_type: tiktok-slideshow
scripting_framework: AIDA
platform:
  name: tiktok
  width: 1080
  height: 1920
  aspect: "9:16"
positioning_angle: "The 30-Second Active Gate"
visual_direction: typographic
slides:
  - index: 1
    type: stat
    headline: "30"
    subhead: "seconds."
    body: null
    animation_hint: spring_bouncy
    role: hook
  - index: 2
    type: anchor_word
    headline: "SubhanAllah"
    subhead: "That's how long 33 takes."
    body: "سُبْحَانَ ٱللَّٰهِ"
    animation_hint: spring_heavy
    role: interest
  # ... more slides
  - index: 7
    type: cta
    headline: "halalscreen.com"
    subhead: "Remembrance before everything."
    body: null
    animation_hint: spring_smooth
    role: action
cta:
  url: "halalscreen.com"
  tagline: "Remembrance before everything."
  handle: "@halalscreen"
voice_constraints:
  tone: "calm, certain, spiritually grounded"
  avoid: ["hype", "guilt", "exclamation marks"]
  signature_phrases: ["Do Dhikr. Unlock Your Phone.", "Remembrance before everything."]
```

### Phase 7: Summary

Report what was written:
```
5 content specs written to marketing/content-specs/:
  1. halalscreen-aida.yaml (7 slides, Typographic)
  2. halalscreen-pas.yaml (6 slides, Contrast Play)
  3. halalscreen-bab.yaml (7 slides, Atmospheric)
  4. halalscreen-story.yaml (8 slides, Editorial)
  5. halalscreen-statflip.yaml (5 slides, Data-Led)

Next: Run /paper-marketing to design each script, or /tiktok-slideshow for the full pipeline.
```

## Standalone Usage

This skill works independently from any orchestrator:
- `/slideshow-script` alone → generates scripts for manual design work
- `/slideshow-script` → `/paper-marketing` → manual export (no video)
- `/slideshow-script` → `/content-atomizer` → repurpose scripts as text posts
- `/slideshow-script` → `/email-sequences` → use narratives in email campaigns

## Principles

- **5 narratives, not 5 variations** — every output should be publishable
- **Frameworks enforce diversity** — AIDA and PAS produce fundamentally different stories
- **Content spec is the contract** — downstream skills read YAML, not prose
- **Archetype annotations matter** — `type: stat` tells Paper agents AND Remotion what to emphasize
- **Voice rules are non-negotiable** — all 5 scripts must sound like the brand
