# Remotion Slide Archetypes

6 reusable slide component patterns. Map content spec `type` to the matching archetype.

## Spring Presets

```typescript
const SPRINGS = {
  bouncy:  { damping: 12, stiffness: 150 },        // Numbers, logos — overshoot
  smooth:  { damping: 200 },                         // Transitions, subtle — no bounce
  heavy:   { damping: 15, stiffness: 80, mass: 2 }, // Anchor words — dramatic weight
  snappy:  { damping: 10, stiffness: 150 },          // Pop reveals — sharp overshoot
};
```

## 1. LogoIntroSlide

**Content spec type:** `logo_intro`
**Spring:** bouncy
**SFX:** switch.wav

```
Logo springs in with bounce → radial gold glow expands → 4 sparkle particles at staggered timing
Optional subtle rotation wobble (-2° → 0°)
```

**Key patterns:**
- `spring()` for logo scale (0 → 1)
- `interpolate()` for glow opacity (0 → 0.15 → 0.05)
- Sparkle particles: staggered delays (0.6s, 0.7s, 0.8s, 1.0s), fade in + fade out
- Use `<Img src={staticFile("logo.png")}>`

## 2. StatSlide

**Content spec type:** `stat`
**Spring:** bouncy
**SFX:** whoosh.wav

```
Giant number springs up with scale → gold divider wipes in → label fades up with Y translation
Optional: counter tick animation (0 → target number over 1 second)
```

**Key patterns:**
- `fitText()` for the hero number (fills container width)
- Counter tick: `Math.round(interpolate(frame, [start, end], [0, targetNumber]))`
- Gold divider: width interpolation (0% → 100%)
- `extrapolateRight: "clamp"` everywhere

## 3. AnchorWordSlide

**Content spec type:** `anchor_word`
**Spring:** heavy OR snappy (depending on word energy)
**SFX:** whoosh.wav

```
One massive word fills the slide → optional radial glow behind → label small above → body below
Heavy spring for dramatic words ("wait.", "remember.")
Snappy spring for action words ("opens.", "done.")
```

**Key patterns:**
- `fitText()` to fill 80% of slide width
- `textShadow` for gold glow: `0 0 60px rgba(212, 168, 67, 0.4)`
- Body text: fade in with slight Y offset after main word lands

## 4. EmotionalPivotSlide

**Content spec type:** `emotional_pivot`
**Spring:** smooth
**SFX:** page-turn.wav
**Light leak:** YES — trigger after text lands

```
Centered text with generous whitespace → glow pulse on key word → typewriter character reveal for body
Light leak overlay fades in after emotional moment
```

**Key patterns:**
- Typewriter: `text.slice(0, Math.floor(interpolate(frame, [start, end], [0, text.length])))`
- Glow pulse: `textShadow` opacity oscillates via sine wave
- Light leak: `<LightLeak hueShift={45}>` (45° shifts white → gold for brand)
- Generous padding (15-20% from edges)

## 5. CascadeSlide

**Content spec type:** `cascade`
**Spring:** smooth
**SFX:** whoosh.wav

```
Lines reveal sequentially with 0.3s stagger → each line slides up from below → optional scale on key word
```

**Key patterns:**
- `lines.map((line, i) => spring({ delay: i * 0.3 * fps }))`
- Each line: `translateY` interpolation (40px → 0px) + opacity (0 → 1)
- Key word (e.g., "dhikr"): scale from 80% → 100% for emphasis
- Left-aligned text with clear vertical rhythm

## 6. CTASlide

**Content spec type:** `cta`
**Spring:** smooth
**SFX:** switch.wav

```
Ornament draws in (two lines + dot) → tagline fades up → URL appears → handle last
Sequential fade-in with 0.4s delays between elements
```

**Key patterns:**
- Ornament: width interpolation for lines, opacity for dot
- URL: slightly larger font, gold color
- Handle: muted/secondary color, appears last
- All centered, generous vertical spacing

## Archetype-to-Type Mapping

| Content Spec `type` | Remotion Component | Spring | SFX | Light Leak |
|---------------------|-------------------|--------|-----|-----------|
| `logo_intro` | LogoIntroSlide | bouncy | switch | No |
| `stat` | StatSlide | bouncy | whoosh | No |
| `anchor_word` | AnchorWordSlide | heavy/snappy | whoosh | At pivots |
| `emotional_pivot` | EmotionalPivotSlide | smooth | page-turn | YES |
| `cascade` | CascadeSlide | smooth | whoosh | No |
| `cta` | CTASlide | smooth | switch | No |
| `comparison` | CascadeSlide (variant) | smooth | whoosh | No |
| `question` | AnchorWordSlide (variant) | heavy | page-turn | No |

## SFX URLs (from @remotion/sfx)

```typescript
import { whoosh, switchSound, pageTurn } from "@remotion/sfx";
// Use with <Audio src={whoosh} /> placed at transition boundaries
```

## Common Patterns

**Always use:**
- `interpolate()` with `extrapolateRight: "clamp"` and `extrapolateLeft: "clamp"`
- `spring()` with explicit `fps` from `useVideoConfig()`
- `@remotion/google-fonts` for font loading (never CSS @font-face)
- `staticFile()` for assets in `public/` directory
- `<Img>` component from remotion (not HTML `<img>`)

**Brand tokens file (`src/brand.ts`):**
```typescript
export const BRAND = {
  navy: "#0B1745",
  navyDeep: "#060E2A",
  gold: "#D4A843",
  goldMuted: "rgba(212, 168, 67, 0.18)",
  cream: "#FFF8E7",
  creamMuted: "rgba(255, 248, 231, 0.5)",
};
```

Read from `brand/creative-kit.md` and generate this file dynamically for each project.
