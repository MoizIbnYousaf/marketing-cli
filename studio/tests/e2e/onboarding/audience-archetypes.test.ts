// tests/e2e/onboarding/audience-archetypes.test.ts
//
// Lane 8 E2E coverage for the Lane 10 `## Archetypes` schema. Real markdown
// fixtures matching the contract in
// marketing-cli/skills/audience-research/SKILL.md are written to a temp
// brand/ directory and parsed via the production parser at
// lib/audience-archetypes.ts. No mocks: real fs + real parser.
//
// Tests cover happy path, "not measured" markers, missing-field detection,
// and the cross-cutting "no archetypes section" empty case.

import { test, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  parseAudienceArchetypes,
  type AudienceArchetype,
} from "../../../lib/audience-archetypes"

let workDir: string

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "mktg-archetypes-"))
  mkdirSync(join(workDir, "brand"), { recursive: true })
})

afterEach(() => {
  if (workDir) {
    rmSync(workDir, { recursive: true, force: true })
  }
})

function writeAudienceFile(body: string): string {
  const path = join(workDir, "brand", "audience.md")
  writeFileSync(path, body, "utf-8")
  return path
}

test("Case 1: happy path - parses two archetypes from a real-shape audience.md", () => {
  const fixture = `---
title: Audience Profile
type: audience-research
skill: audience-research
date: 2026-05-08
personas: 2
primary_persona: Marketing Ops Engineer
archetypes: 2
---

# Audience Profile - DemoCo

## Archetypes

Card-shaped summary of every persona.

### Archetype: Marketing Ops Engineer

- **one_liner:** A solo marketing-ops IC at a mid-sized SaaS who already runs informal agents in Notion and Zapier.
- **demographic:** IC role, 40 to 200 person SaaS, technical level high.
- **top_pain:** "I spend three days a week gluing Zapier flows together."
- **top_desire:** "Replace my Zapier with something that actually has memory."
- **watering_hole:** r/SaaS, marketing-ops Slack groups, Substack newsletters.
- **language_quote:** "Stop calling these things AI agents and just give me a real workflow engine."

### Archetype: Indie Founder

- **one_liner:** A bootstrapped solo founder who is the entire marketing department.
- **demographic:** 1 to 5 person team, technical level medium.
- **top_pain:** "I do not have time to write content; I have to ship product."
- **top_desire:** "Take 80% of marketing off my plate without it sounding generic."
- **watering_hole:** X (formerly Twitter), Indie Hackers, Build in Public threads.
- **language_quote:** "Marketing is the part of my job I postpone every day."

---

## Primary Persona: Marketing Ops Engineer
[long-form prose...]
`

  const path = writeAudienceFile(fixture)
  const md = readFileSync(path, "utf-8")
  const result = parseAudienceArchetypes(md)

  expect(result.errors).toEqual([])
  expect(result.archetypes).toHaveLength(2)

  const [first, second] = result.archetypes as readonly AudienceArchetype[]
  expect(first!.name).toBe("Marketing Ops Engineer")
  expect(first!.one_liner).toContain("solo marketing-ops IC")
  expect(first!.demographic).toContain("40 to 200 person SaaS")
  expect(first!.top_pain).toBe(
    "I spend three days a week gluing Zapier flows together.",
  )
  expect(first!.top_desire).toBe(
    "Replace my Zapier with something that actually has memory.",
  )
  expect(first!.watering_hole).toContain("r/SaaS")
  expect(first!.language_quote).toBe(
    "Stop calling these things AI agents and just give me a real workflow engine.",
  )

  expect(second!.name).toBe("Indie Founder")
  expect(second!.one_liner).toContain("bootstrapped solo founder")
  expect(second!.language_quote).toBe(
    "Marketing is the part of my job I postpone every day.",
  )
})

test("Case 2: 'not measured' markers preserved verbatim per skill contract", () => {
  // The audience-research skill explicitly tells the agent to write
  // "not measured" rather than fabricate when it lacks evidence. The
  // parser treats that as a present value (the rendered card can show it
  // as a muted state) rather than triggering a missing-field error.
  const fixture = `# Audience Profile

## Archetypes

### Archetype: Brand New Persona

- **one_liner:** Early-stage founder with no usage data yet.
- **demographic:** not measured
- **top_pain:** not measured
- **top_desire:** Establish a coherent brand voice.
- **watering_hole:** not measured
- **language_quote:** "I do not even know who I am writing for yet."
`

  const path = writeAudienceFile(fixture)
  const md = readFileSync(path, "utf-8")
  const result = parseAudienceArchetypes(md)

  expect(result.errors).toEqual([])
  expect(result.archetypes).toHaveLength(1)
  const a = result.archetypes[0]!
  expect(a.name).toBe("Brand New Persona")
  expect(a.demographic).toBe("not measured")
  expect(a.top_pain).toBe("not measured")
  expect(a.watering_hole).toBe("not measured")
  // Verify a non-"not measured" field still parses correctly.
  expect(a.top_desire).toBe("Establish a coherent brand voice.")
  expect(a.language_quote).toBe("I do not even know who I am writing for yet.")
})

test("Case 3: missing required field surfaces as a parse error, valid archetypes still returned", () => {
  // Real-world drift case: agent forgets one of the six required fields.
  // Parser must not silently emit a partial archetype. It must (a) skip the
  // broken one, (b) report which field(s) were missing, and (c) still
  // return any sibling archetypes that parsed cleanly.
  const fixture = `# Audience Profile

## Archetypes

### Archetype: Broken Persona

- **one_liner:** A persona missing the language_quote.
- **demographic:** Missing-quote case.
- **top_pain:** "We forgot to ship the quote field."
- **top_desire:** "Catch the missing field before it lands in prod."
- **watering_hole:** Internal review queue.

### Archetype: Healthy Persona

- **one_liner:** A persona with every field present.
- **demographic:** Healthy demographic line.
- **top_pain:** "All six fields are here."
- **top_desire:** "Keep parsing this one."
- **watering_hole:** The card-shaped output.
- **language_quote:** "Six is the magic number."
`

  const path = writeAudienceFile(fixture)
  const md = readFileSync(path, "utf-8")
  const result = parseAudienceArchetypes(md)

  expect(result.errors).toHaveLength(1)
  expect(result.errors[0]!.archetype).toBe("Broken Persona")
  expect(result.errors[0]!.missingFields).toContain("language_quote")

  expect(result.archetypes).toHaveLength(1)
  expect(result.archetypes[0]!.name).toBe("Healthy Persona")
  expect(result.archetypes[0]!.language_quote).toBe(
    "Six is the magic number.",
  )
})

test("Case 4: file with no Archetypes section returns empty result, no errors", () => {
  // L0 brand state: the audience-research skill has not run yet, audience.md
  // is the template. Parser must return cleanly so callers can show an
  // empty state rather than crashing.
  const fixture = `# Audience Profile

This is the template. Run audience-research to populate it.

## Primary Persona: <name>

[unfilled]
`
  const path = writeAudienceFile(fixture)
  const md = readFileSync(path, "utf-8")
  const result = parseAudienceArchetypes(md)

  expect(result.archetypes).toEqual([])
  expect(result.errors).toEqual([])
})

test("Case 5: empty / malformed input returns empty result without throwing", () => {
  // Defensive: callers may pipe in undefined, "", or non-markdown.
  expect(parseAudienceArchetypes("").archetypes).toEqual([])
  expect(parseAudienceArchetypes("# Just a title\n").archetypes).toEqual([])
  // Cast to satisfy the function's runtime guard against non-string input.
  expect(parseAudienceArchetypes(undefined as unknown as string).archetypes).toEqual([])
})
