# Marketing Agents

5 sub-agents that `/cmo` spawns for parallel research and review. Installed to `~/.claude/agents/` by `mktg init` and `mktg update`.

## Research Agents

Spawned in parallel during foundation building (first 30 minutes of a new project).

### mktg-brand-researcher
Analyzes website, README, and existing copy to extract voice patterns. Writes `brand/voice-profile.md`. Uses the `brand-voice` skill methodology. Does not ask questions — researches, analyzes, and writes.

### mktg-audience-researcher
Finds communities, builds buyer personas, and maps watering holes using Exa MCP. Writes `brand/audience.md`. Uses the `audience-research` skill methodology.

### mktg-competitive-scanner
Researches competitors, analyzes positioning, and finds market gaps using Exa MCP. Writes `brand/competitors.md`. Uses the `competitive-intel` skill methodology.

## Review Agents

Available for quality checks on marketing output.

### mktg-content-reviewer
Reviews marketing copy for voice consistency, conversion strength, and clarity. Reads `brand/voice-profile.md` and scores content against the brand voice. Use after writing copy, landing pages, or email sequences.

### mktg-seo-analyst
Audits pages for on-page SEO, analyzes keyword gaps, and checks technical SEO. Reads `brand/keyword-plan.md` for target keywords. Use when auditing content or pages for search performance.

## How Agents Work

1. **Registry:** `agents-manifest.json` is the source of truth for all agent metadata (category, file path, reads/writes, referenced skill, tier).
2. **Installation:** `mktg init` and `mktg update` copy agent `.md` files from the package to `~/.claude/agents/`.
3. **Spawning:** `/cmo` spawns research agents via the Agent tool during foundation building. All 3 research agents launch in a single message for maximum parallelism.
4. **Autonomy:** Agents do not ask questions. They read their skill methodology, research using available tools, and write results to `brand/` files.
5. **Isolation:** Agents never call other agents. `/cmo` orchestrates.
