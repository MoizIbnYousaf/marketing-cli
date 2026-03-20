# Paper MCP Workflow for Social Cards

Reference for Phase 4 (DESIGN) of the social campaign pipeline.

## When to Create Visuals

Not every post gets an image. Use this decision framework:

| Post Type | Image? | Why |
|-----------|--------|-----|
| Personal observation / hot take | No | Text-only feels more authentic, like a real person thinking |
| Problem statement / vent | No | Raw text hits harder |
| Comparison or contrast | Yes | Visual makes the gap/difference tangible |
| Process or workflow | Yes | Flow diagram is shareable/saveable |
| Data or metrics | Yes | Numbers as visual anchors |
| Terminal/code reference | Yes | Terminal mockup shows developer credibility |
| Product announcement | Yes | Hero card with feature list |
| Builder update | No | Personal voice, no corporate graphic |

The image must add something the text cannot say alone. Never just repeat the tweet text as a graphic.

## Image Types

| Type | When | Example |
|------|------|---------|
| Split comparison | Contrasting two things | "Runs" vs "Works well" with criteria |
| Terminal mockup | Code/CLI reference | macOS terminal with real commands |
| Timeline/gap visual | Before/after or evolution | Runtimes (polished) vs Tooling (bare) |
| Flow diagram | Process or steps | Numbered step cards with arrows |
| Comparison table | Feature matrix | Two columns with checkmarks vs dashes |
| Hero announcement | Launch or milestone | Product name, feature list, CTA |

## Paper MCP Steps

1. `mcp__paper__get_basic_info()` — Check workspace
2. `mcp__paper__get_font_family_info()` — Verify brand fonts
3. Create artboards (1200x675 for X+LinkedIn compatibility)
4. Build designs incrementally (header, content, footer per artboard)
5. Screenshot and review each design
6. `mcp__paper__finish_working_on_nodes()` when done

## Design System for Social Cards

- **Background:** Use project's dark marketing color
- **Accent:** Use project's primary brand color
- **Fonts:** Project's brand fonts (display, body, mono)
- **Layout:** header (logo + domain), content (the visual), footer (accent line + product tag)
- **Styling:** All inline styles, display: flex, no grid/margins/tables
