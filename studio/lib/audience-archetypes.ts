// lib/audience-archetypes.ts
//
// Parser for the `## Archetypes` block in `brand/audience.md`. Lane 10
// (frostbyte) added this structured contract to the audience-research skill:
// every persona produces a card-shaped archetype with six required fields
// (one_liner, demographic, top_pain, top_desire, watering_hole,
// language_quote). Studio surfaces consume this typed shape instead of
// re-parsing free-form markdown.
//
// History note: this module was originally written so a new
// archetype-pulse-cards.tsx could read brand/audience.md. silverspark's
// Wave B Pulse rebuild dropped archetype cards from the dashboard, so the
// parser currently has no UI consumer in-tree. Keep the parser anyway --
// the schema is shared by audience-research, document-review, and any
// future surface that wants archetypes (Skill Browser persona view,
// brainstorm card stack, etc.). Tests in
// tests/e2e/onboarding/audience-archetypes.test.ts exercise the contract
// against real audience.md fixtures.

export interface AudienceArchetype {
  /** Persona name from the heading "### Archetype: <name>". */
  readonly name: string
  /** "Who they are and what they want, one sentence." */
  readonly one_liner: string
  /** "Role, company size, technical level - single line." */
  readonly demographic: string
  /** "The single biggest pain in their words." */
  readonly top_pain: string
  /** "The single biggest goal in their words." */
  readonly top_desire: string
  /** Primary community / channel. */
  readonly watering_hole: string
  /** A representative quote in the persona's own words. */
  readonly language_quote: string
}

const REQUIRED_FIELDS = [
  "one_liner",
  "demographic",
  "top_pain",
  "top_desire",
  "watering_hole",
  "language_quote",
] as const

export type ArchetypeField = (typeof REQUIRED_FIELDS)[number]

export interface ArchetypeParseError {
  readonly archetype: string
  readonly missingFields: readonly ArchetypeField[]
}

export interface ArchetypeParseResult {
  /** All archetypes successfully parsed (every required field present). */
  readonly archetypes: readonly AudienceArchetype[]
  /** Archetypes that were missing one or more required fields. */
  readonly errors: readonly ArchetypeParseError[]
}

/**
 * Parse the `## Archetypes` block out of an `audience.md` file.
 *
 * Strategy:
 *   1. Find the `## Archetypes` heading.
 *   2. Slice from there to the next `## ` heading at the same level (or end of file).
 *   3. Split that slice on `### Archetype:` headings.
 *   4. For each section, parse `- **field:** value` lines.
 *
 * Free-form markdown around the structured fields (intro paragraph between
 * the `## Archetypes` heading and the first `### Archetype:`) is ignored.
 * Empty input or a missing `## Archetypes` block returns an empty result;
 * callers can show their own empty state.
 */
export function parseAudienceArchetypes(markdown: string): ArchetypeParseResult {
  if (!markdown || typeof markdown !== "string") {
    return { archetypes: [], errors: [] }
  }

  // 1. Locate the section. Match a heading line starting "## Archetypes"
  // (allow trailing whitespace and an optional emoji glyph).
  const sectionMatch = markdown.match(/^##\s+Archetypes\b.*$/m)
  if (!sectionMatch || sectionMatch.index === undefined) {
    return { archetypes: [], errors: [] }
  }

  const sectionStart = sectionMatch.index + sectionMatch[0].length
  // 2. End-of-section is the next `## ` heading at the same level, OR EOF.
  const tail = markdown.slice(sectionStart)
  const nextSectionMatch = tail.match(/^##\s+(?!#)/m)
  const sectionBody = nextSectionMatch && nextSectionMatch.index !== undefined
    ? tail.slice(0, nextSectionMatch.index)
    : tail

  // 3. Each archetype begins at "### Archetype:". Collect the heading start
  // (so we can slice the body up to the next heading) + body start.
  type ArchetypeBoundary = {
    name: string
    headingStart: number
    bodyStart: number
  }
  const boundaries: ArchetypeBoundary[] = []
  const headingRegex = /^###\s+Archetype:\s*(.+?)\s*$/gm
  let m: RegExpExecArray | null
  while ((m = headingRegex.exec(sectionBody)) !== null) {
    boundaries.push({
      name: m[1]!.trim(),
      headingStart: m.index,
      bodyStart: m.index + m[0].length,
    })
  }

  const archetypes: AudienceArchetype[] = []
  const errors: ArchetypeParseError[] = []

  for (let i = 0; i < boundaries.length; i++) {
    const current = boundaries[i]!
    const next = boundaries[i + 1]
    const bodyEnd = next ? next.headingStart : sectionBody.length
    const body = sectionBody.slice(current.bodyStart, bodyEnd)

    const fields = parseFieldLines(body)
    const missing: ArchetypeField[] = []
    for (const f of REQUIRED_FIELDS) {
      if (!fields[f]) missing.push(f)
    }
    if (missing.length > 0) {
      errors.push({ archetype: current.name, missingFields: missing })
      continue
    }

    archetypes.push({
      name: current.name,
      one_liner: fields.one_liner!,
      demographic: fields.demographic!,
      top_pain: fields.top_pain!,
      top_desire: fields.top_desire!,
      watering_hole: fields.watering_hole!,
      language_quote: fields.language_quote!,
    })
  }

  return { archetypes, errors }
}

/**
 * Parse `- **field:** value` lines out of an archetype body. The skill
 * encourages "not measured" instead of fabrication, which we treat as a
 * present (truthy) value -- the caller can render it verbatim.
 */
function parseFieldLines(body: string): Partial<Record<ArchetypeField, string>> {
  const out: Partial<Record<ArchetypeField, string>> = {}
  // Skill contract emits `- **field:**` (colon inside the bold delimiters).
  // Allow optional whitespace and an extra colon outside in case a future
  // template drift moves the colon out.
  const lineRegex = /^\s*[-*]\s+\*\*([a-z_]+):?\*\*:?\s*(.+?)\s*$/gm
  let m: RegExpExecArray | null
  while ((m = lineRegex.exec(body)) !== null) {
    const key = m[1]! as ArchetypeField
    if (!REQUIRED_FIELDS.includes(key)) continue
    let value = m[2]!.trim()
    // Strip surrounding quotes for language_quote so consumers can render
    // it however they like (chip, blockquote, etc.) without double-quoting.
    if (
      value.length >= 2 &&
      ((value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}
