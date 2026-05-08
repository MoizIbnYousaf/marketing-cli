# Brand Memory Schema

Source of truth for what `brand/*.md` files must contain. Skills write to these files; Studio surfaces and downstream skills read from them. When a section is required, every writer must produce it. Reduce drift by checking new sections against this file before merging.

## Files

| File | Purpose | Required sections | Freshness | Writers |
|------|---------|-------------------|-----------|---------|
| voice-profile.md | How the brand sounds | Personality, Vocabulary, Sentence patterns | 30 days | brand-voice |
| positioning.md | Why the brand is different | Angle, Proof points, Differentiation | 30 days | positioning-angles |
| audience.md | Who the brand talks to | Archetypes, Primary Persona, Watering Holes | 30 days | audience-research |
| competitors.md | Who the brand competes with | Direct, Indirect, Positioning gaps | 30 days | competitive-intel |
| landscape.md | Market snapshot | Claims, Players, Trends, Claims Blacklist | 14 days (content-grounding) / 90 days (general) | landscape-scan |
| keyword-plan.md | What people search for | Primary, Secondary, Long-tail | 90 days | keyword-research |
| creative-kit.md | Visual identity | Colors, Typography, Style anchors, Visual Brand Style | 180 days | visual-style |
| stack.md | Marketing tools in use | Current tools, Integrations | 180 days | manual |
| assets.md | Created assets log | Append-only | never stale | all skills |
| learnings.md | What worked/didn't | Append-only | never stale | all skills |

## Section contracts

### audience.md > `## Archetypes`

Card-shaped persona summary. One archetype per persona. Studio's archetype-pulse-cards reads this section directly. Each archetype is a heading at H3 (`### Archetype: [Name]`) followed by exactly six fields:

| Field | Type | Description |
|---|---|---|
| `one_liner` | string | Who they are and what they want, single sentence |
| `demographic` | string | Role, company size, technical level on one line |
| `top_pain` | string | The single biggest pain in their words |
| `top_desire` | string | The single biggest goal in their words |
| `watering_hole` | string | Primary community / channel where they spend time |
| `language_quote` | string | One actual quote or representative phrase, in quotes |

If a field has no evidence, the writer must emit `"not measured"` rather than fabricate. Studio renders fields verbatim. Order is fixed — readers parse by field name, not position, but writers must produce all six.

### landscape.md > `## Claims Blacklist`

Required output of /landscape-scan. Lists ecosystem claims that the catalog has determined are false, stale, or unverifiable, plus a "What To Say Instead" column. /cmo and every content skill read this section before any ecosystem claim and refuse to emit blacklisted claims. See `skills/landscape-scan/SKILL.md` for the producer contract.

### creative-kit.md > `## Visual Brand Style`

Optional but recommended. Free-form description of the visual aesthetic that image-gen and creative use as a style anchor. When present, `mktg brand kit get visual --json` returns it as a typed field.

## Progressive Enhancement

| Level | Context available | Behavior |
|-------|-------------------|----------|
| L0 | No brand files | Skills work with zero context. Generic output. |
| L1 | voice-profile.md | Personality-aligned output |
| L2 | + positioning + audience | Targeted, differentiated output |
| L3 | + competitors + landscape | Competitively aware output |
| L4 | All 10 files populated | Full CMO-grade output |

## Adding a new file

1. Add a row to the Files table above with required sections, freshness window, and the writer skill.
2. If the file ships structured sub-sections that other skills consume (the Archetypes pattern), add a section contract below.
3. Update the writer skill's `writes:` frontmatter and document the output format inside its SKILL.md.
4. Update `skills-manifest.json` if a new skill is involved.

## Adding a new structured section to an existing file

1. Add a Section contracts entry above that defines: header level, field list, types, "not measured" rule.
2. Update the producing skill's Output format to match.
3. Notify any reading surface (Studio component, downstream skill) that the section is now available.
