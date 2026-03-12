---
name: paper-marketing
description: >
  On-brand visual marketing content using Paper MCP and parallel agent teams.
  Reads the project's brand/ directory to build a design system, then spawns
  5 designer agents in parallel — each creating a unique artboard with a
  different on-brand layout interpretation of the same content. Produces
  Instagram carousels, social posts, story slides, and visual assets.
  Triggers on "paper marketing", "design carousel", "create slides",
  "visual content", "instagram design", "social graphics", "paper prototype
  marketing", "design in paper", or any request to create visual marketing
  assets in Paper.
allowed-tools:
  - Bash(mktg status *)
---

# /paper-marketing — On-Brand Visual Content in Paper MCP

Spawn 5 parallel designer agents in Paper, each creating a unique on-brand interpretation of the same marketing content. Same brand system, different creative executions.

For Paper MCP HTML rules, see [references/paper-mcp-rules.md](references/paper-mcp-rules.md).
For brand system extraction template, see [references/brand-system-template.md](references/brand-system-template.md).

## Workflow

### Phase 1: Load Brand System + Discover Paper File

**Step 1a: Load brand context.** Run `mktg status --json` to confirm brand files exist. Then read in parallel:
- `brand/voice-profile.md` — tone, vocabulary, do's/don'ts, signature phrases
- `brand/creative-kit.md` — colors (hex + roles), fonts (families + weights + sizes), spacing rhythm
- `brand/positioning.md` — angles, headlines, proof points
- `brand/assets.md` — what already exists (avoid duplication)

**Step 1b: Extract the design system.** From brand files, build:
- **Palette**: every color token with hex and role (bg, accent, text, muted, divider)
- **Typography**: font families, weights, sizes for each role (display, section, body, label, stat)
- **Layout tokens**: slide dimensions, padding, content area, footer structure
- **Voice rules**: signature phrases, copy rules, words to use/avoid
- **Positioning angles**: available angles and their headline directions

If `creative-kit.md` is missing, use AskUserQuestion to gather basics (bg color light/dark, accent color, font preference), then write the result to `brand/creative-kit.md` so it persists.

**Step 1c: Discover the Paper workspace.** Call `mcp__paper__get_basic_info()` and record:
- **File name** — this is the workspace all agents will use
- **Existing artboards** — names and IDs, so agents know what's already there
- **Loaded fonts** — so agents can use them without guessing

**Step 1d: Confirm with AskUserQuestion:**
```
"I see Paper file '{fileName}' is open with artboards: {list}. I'll create 5 new artboards here for the marketing designs. Right file?"

Options:
1. "Yes, use this file" — proceed
2. "Different file" — user specifies which file to open
```

Do NOT proceed until the user confirms.

### Phase 2: Build the Plan

This is the most important phase. Present a concrete plan to the user using **AskUserQuestion** before spawning any agents.

#### 2a. Determine Content Type

Use AskUserQuestion if not clear from context:
```
"What visual content should I create 5 variations of?"

Options:
1. "Instagram carousel (1080x1350, 5-9 slides)" — educational/positioning
2. "Instagram single post (1080x1080 or 1080x1350)" — stat, quote, proof point
3. "Instagram story / Reel cover (1080x1920)" — single claim, how-it-works
4. "Social graphics batch" — multiple formats
5. "Custom" — specify format and dimensions
```

#### 2b. Select 5 On-Brand Variations

All 5 use the SAME brand palette, fonts, and voice rules. The variation is in **layout, emphasis, and creative interpretation**.

Read the brand system extracted in Phase 1. Select 5 directions that are tangibly different:

**Variation types for marketing content:**

| Direction | What Changes | Good For |
|-----------|-------------|----------|
| **Typographic** | Text-dominant, massive display type, minimal decoration | Quote posts, positioning statements |
| **Data-Led** | Giant stat numbers as visual anchors, text secondary | Proof points, market data, before/after |
| **Editorial** | Magazine-layout feel, asymmetric text placement, generous white space | Long-form carousel slides, thought leadership |
| **Product-Forward** | Mockup/screenshot center stage, text supports the visual | Feature demos, Shield View showcases, app screenshots |
| **Atmospheric** | Arabic script as decoration, calligraphic accents, spacious and reverent | Spiritual content, Quranic references, Ramadan |
| **Bold Minimal** | One idea per slide, maximum white space, zero ornamentation | Hook slides, CTAs, single-message posts |
| **Structured** | Clear grid feel, numbered steps, consistent slot layout | How-it-works, listicles, tutorials |
| **Contrast Play** | Dramatic scale differences (huge headline + tiny label), weight extremes | Attention-grabbing hooks, comparison content |
| **Stacked** | Vertical rhythm, everything centered, one element per visual beat | Stories, reels covers, vertical scroll feel |
| **Split** | Two-column or two-zone layout, comparison or tension between halves | Before/after, problem/solution, old way/new way |

Rules for selection:
- Each must be **tangibly different** (different layout structure, emphasis, visual rhythm)
- At least one text-dominant and one with visual/product elements
- At least one bold/experimental and one safe/proven
- All 5 MUST use the brand palette, fonts, and voice — the variation is layout, not style

#### 2c. Present the Plan

Use **AskUserQuestion** to show the user the 5 proposed directions:
```
"Here are 5 on-brand design variations I'll create in parallel. Same colors, fonts, and voice — different layout and emphasis. Want to swap any?"

1. **Typographic** — massive display type, text as the hero, minimal decoration
2. **Data-Led** — giant stat numbers, text supports the data
3. **Editorial** — magazine feel, asymmetric placement, generous breathing room
4. **Bold Minimal** — one idea, maximum space, zero ornamentation
5. **Structured** — numbered steps, consistent grid, clear information hierarchy

Options:
1. "These 5 look great, go" — proceed as-is
2. "Swap one out" — user specifies which to replace
3. "I want different variations" — user describes what they want
```

Do NOT proceed until the user approves the 5 variations.

#### 2d. Define Content Spec

Write out the exact content each agent will design with. This includes:
- Every text string (headings, body copy, labels, CTAs)
- Which positioning angle is being used (from `brand/positioning.md`)
- Every slide/section and its purpose
- Information hierarchy (what's most important)
- Signature phrases to use (from `brand/voice-profile.md`)

**Show the content spec to the user** via AskUserQuestion:
```
"Here's the content every designer will work with. Anything to add or change?"

[slide-by-slide or section-by-section copy]

Options:
1. "Looks complete, go" — proceed
2. "Missing something" — user adds content
3. "Change the copy" — user edits specific text
```

This content spec goes into every task description verbatim so agents don't hallucinate content. Do NOT proceed to Phase 3 until the user approves BOTH the 5 variations (2c) AND the content spec (2d).

### Phase 3: Create Team and Tasks

```
TeamCreate: name="paper-mktg", description="5 on-brand marketing designers in Paper"
```

Create 5 tasks (all parallel, no dependencies) + 1 review task (blocked by all 5).

**Each task description MUST include all of this** (the agent picking it up has zero prior context):

1. **Paper Workspace**: File name (from get_basic_info), existing artboards to avoid, loaded fonts available
2. **Context**: What is being designed, which project, what the product does (1-2 sentences)
3. **Brand System**: Full palette (every hex with role), typography (every font/weight/size with role), layout tokens (padding, dimensions, footer structure). Copied verbatim from Phase 1b extraction.
4. **Voice Rules**: Key do's/don'ts from voice-profile.md. Signature phrases available. Words to avoid.
5. **Design Brief**: This variation's specific layout approach, emphasis, and vibe (one-sentence personality). What makes this variation different from the other 4.
6. **Content Spec**: Every piece of text, every slide/section, copied verbatim from Phase 2d
7. **Paper MCP Workflow**: The exact 6-step tool sequence
8. **Paper HTML Rules**: From [references/paper-mcp-rules.md](references/paper-mcp-rules.md)
9. **Tradeoffs**: What could go wrong with this layout variation and how to counter it
10. **Artboard spec**: Name ("Marketing: {variation_name}"), width, height

### Phase 4: Spawn 5 Designer Agents

Spawn all 5 in a **single message** (parallel). Each agent gets:

```
subagent_type: "general-purpose"
model: "sonnet"
team_name: "paper-mktg"
run_in_background: true
```

**Agent prompt structure:**

```
You are a senior marketing designer creating on-brand visual content.
Your layout approach: {variation_style}. {one-sentence vibe}

## Your Task
Design {content_type} for {project_name} in Paper design tool. Create ONE artboard ({width}x{height}).

Read your full task description by calling TaskGet with taskId "{id}",
then mark it in_progress with TaskUpdate. When done, mark it completed.

## Paper Workspace
You are working in Paper file "{fileName}".
Existing artboards: {list of existing artboard names}.
Loaded fonts: {list of fonts from get_basic_info}.
Your artboard will be created alongside these. Do NOT modify existing artboards.

## Paper MCP Workflow
1. mcp__paper__get_basic_info() — confirm file state, note existing artboards
2. mcp__paper__get_font_family_info({brand fonts}) — VERIFY every font before use
3. mcp__paper__create_artboard() — name: "Marketing: {variation_name}", width/height
4. mcp__paper__write_html() — ONE visual group per call (max ~15 lines HTML)
5. mcp__paper__get_screenshot() — every 2-3 writes, critique and fix
6. mcp__paper__finish_working_on_nodes() — ALWAYS call when done

## Brand System
{full palette, typography, layout tokens from task description}

## Voice Rules
{key do's/don'ts, signature phrases, words to avoid}

## Design Brief
{this variation's layout approach, emphasis, vibe, tradeoffs}

## Content
{verbatim content spec from task description}

## Paper HTML Rules
- Inline styles ONLY (style="...")
- display: flex for ALL containers (no grid, no margins, no tables)
- Google Fonts via font-family name (verify with get_font_family_info first)
- NO emojis — use SVG icons or text
- Arabic text: direction: rtl; font-family: "Noto Naskh Arabic"
- ONE visual group per write_html call. Build incrementally.
- Screenshot every 2-3 writes. Critique spacing, hierarchy, contrast, alignment.
- Set layer-name attribute for semantic names in the layer tree.
```

### Phase 5: Monitor and Review

1. Shut down agents as they complete (`SendMessage type: "shutdown_request"`)
2. When all 5 done, screenshot each artboard via `mcp__paper__get_screenshot()`
3. Present all 5 with critique for each:
   - **Best element**: The standout design/layout decision
   - **Brand fidelity**: Does it feel on-brand? Colors, fonts, voice correct?
   - **Risk**: What could go wrong if this is the chosen direction
4. Ask user via AskUserQuestion:
```
"Here are all 5 variations. What would you like to do?"

Options:
1. "Use #{n}" — pick one as the final
2. "Mix elements" — combine the best parts of multiple variations
3. "Refine #{n}" — iterate on a favorite
4. "Create more slides in #{n}'s style" — extend the chosen direction to a full carousel
5. "Start over with different content" — new round
```
5. Clean up: `TeamDelete`

### Phase 6: Log and Register (if workflow logging active)

If a workflow log exists at `marketing/logs/`, append steps for:
- Which brand files were read
- Which content type was created
- Which variation was chosen
- What the final artboard looks like
- Tool calls made

Update `brand/assets.md` with the new asset.

## Principles

- **AskUserQuestion heavily**: Confirm variations, content, and approach before spending agent compute.
- **Rich task descriptions**: An agent picking up a task cold must have everything it needs. No assumptions. Include the full brand system in every task.
- **Incremental writes**: Each write_html = ONE visual group. User watches real-time in Paper.
- **Screenshot reviews**: Agents screenshot every 2-3 writes and self-critique against the brand system.
- **Font verification**: Always get_font_family_info before using any font.
- **Distinct variations**: If two designs look similar, the skill failed. Same brand, different layouts.
- **Brand fidelity**: Every variation MUST use the project's brand palette, fonts, and voice. The variation is in layout and emphasis, never in brand identity.
- **Universal**: Works for any project with `brand/` files. Reads brand system at runtime, never hardcodes.
