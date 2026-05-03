# Brand System Template

This is the template for extracting a design system from a project's `brand/` directory. The `/paper-marketing` skill reads brand files at runtime and populates this structure.

## How It Works

1. Skill reads `brand/creative-kit.md` (primary source for design tokens)
2. Falls back to `brand/voice-profile.md` for copy rules
3. Falls back to asking the user if neither exists
4. Writes `brand/creative-kit.md` if it had to gather info manually

## Expected creative-kit.md Structure

```markdown
# Creative Kit

## Palette

| Token | Hex | Role |
|-------|-----|------|
| bg-primary | #XXXXXX | Primary background |
| bg-deep | #XXXXXX | Deeper background, page bg |
| accent | #XXXXXX | Headlines, accents, section labels |
| accent-muted | rgba(...) | Subtle highlight fills |
| accent-line | rgba(...) | Dividers, rules |
| text-primary | #XXXXXX | Body text |
| text-muted | rgba(...) | Subdued body text |
| text-dim | rgba(...) | Ghost text, metadata |
| surface | #XXXXXX | Card/panel backgrounds |

## Typography

| Role | Font | Weight | Size | Notes |
|------|------|--------|------|-------|
| Display headline | {font} | 700 | 72-96px | |
| Section headline | {font} | 600 | 36-48px | |
| Body | {font} | 400 | 18-22px | 1.5 line-height |
| Label / meta | {font} | 500 | 11-14px | All-caps, tracked |
| Stat number | {font} | 700 | 120-160px | Accent color |

## Slide Dimensions

| Format | Width | Height | Ratio | Use |
|--------|-------|--------|-------|-----|
| Instagram carousel | 1080px | 1350px | 4:5 | Primary content |
| Instagram square | 1080px | 1080px | 1:1 | Feed posts |
| Instagram story | 1080px | 1920px | 9:16 | Stories, reels, TikTok |

## Layout

- Padding: {X}px horizontal, {Y}px vertical
- Section labels: accent color, all-caps, tracked
- Dividers: accent-line, 1px
- Footer: brand mark + handle, text-dim
```

## Slide Archetypes (Universal)

These work for any brand. The colors and fonts come from the brand system.

### Hook Slide (slide 1)
- Large statement or question in accent color (display size)
- No section label
- Purpose: stop the scroll

### Content Slide (slides 2-N)
- Section label at top (accent, small caps)
- Headline in text-primary (section headline size)
- Body text in text-muted (body size)
- Optional stat number in accent (stat size)
- Purpose: deliver value

### Evidence Slide
- Large number in accent (stat size)
- Single explanatory line in text-primary
- Reframe or positioning statement below
- Purpose: proof through data

### CTA Slide (final)
- Brand tagline in accent
- Handle / URL in text-primary
- Divider above footer
- Purpose: close with authority, not urgency

## Content Templates (Universal)

### Stat Post
```
[SECTION LABEL: accent, small caps]
[BIG NUMBER: accent, 120-160px]
[Explanatory line: text-primary]
[Reframe: text-primary]
[divider: accent-line]
[Brand + URL: text-dim]
```

### Quote / Statement
```
[Large quote: accent, 72-88px]
[divider: accent-line]
[Brand: text-dim]
```

### Proof Point
```
[SECTION LABEL: accent]
[Bold statement: text-primary, 36px]
[Body: text-muted, 18px]
[divider: accent-line]
[Brand: text-dim]
```

### Demo / Product
```
[Headline: text-primary, 36px]
[Product mockup: surface bg, rounded rect]
[Action line: text-primary]
[divider: accent-line]
[Brand: text-dim]
```
