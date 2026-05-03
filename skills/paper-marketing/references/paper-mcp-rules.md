# Paper MCP Rules

## HTML Rules

- Inline styles ONLY (`style="..."`)
- `display: flex` for ALL layout containers
- NO `display: grid`, NO margins, NO HTML tables
- `display: block` acceptable for simple leaf elements (text, shapes)
- Assume `border-box` sizing
- All Google Fonts available via `font-family` name
- Locally installed fonts also supported
- NO emojis as icons. Use SVG icons, text labels, or omit.
- Use `<pre>` or `white-space: pre` for code blocks
- Arabic text: `direction: rtl; font-family: "Noto Naskh Arabic"`
- Set `layer-name` attribute for semantic node names in the layer tree

## Tool Sequence

```
1. mcp__paper__get_basic_info()           — file state, existing artboards
2. mcp__paper__get_font_family_info()     — ALWAYS verify fonts before use
3. mcp__paper__create_artboard()          — one per design
4. mcp__paper__write_html()              — ONE visual group per call
5. mcp__paper__get_screenshot()           — every 2-3 writes
6. mcp__paper__finish_working_on_nodes()  — when done
```

## Review Checkpoints (Every 2-3 Writes)

Screenshot and evaluate:
- **Spacing**: Uneven gaps, cramped groups, empty areas without purpose
- **Typography**: Too small, poor line-height, weak heading/body hierarchy
- **Contrast**: Low contrast text, elements blending into background
- **Alignment**: Elements that should share lanes but don't
- **Clipping**: Content cut off at edges (fix with height: "fit-content")

## write_html Modes

- `insert-children`: Add HTML as children of target node
- `replace`: Remove target and insert HTML in its place

## Key Constraints

- Maximum ~15 lines HTML per write_html call
- Build piece by piece: hero first, then body, then footer, etc.
- Use `duplicate_nodes` + `update_styles` + `set_text_content` for repeated elements
- Absolute positioning OK for decorative elements, not for full-artboard covers

## Available Tools Reference

| Tool | Purpose |
|------|---------|
| `get_basic_info` | File name, artboards, loaded fonts |
| `get_font_family_info` | Check if a font family is available + its weights/styles |
| `create_artboard` | Create new artboard with name, width, height |
| `write_html` | Write HTML into a node (inline styles only) |
| `get_screenshot` | Capture visual of a node or artboard |
| `get_selection` | See what user has selected |
| `get_tree_summary` | See node hierarchy of an artboard |
| `get_children` | List direct children of a node |
| `get_node_info` | Read text content or details of a node |
| `get_computed_styles` | Get precise CSS values of nodes |
| `get_jsx` | Get component structure for code generation |
| `update_styles` | Modify styles on existing nodes |
| `set_text_content` | Change text in existing nodes |
| `duplicate_nodes` | Copy nodes for repeated elements |
| `delete_nodes` | Remove nodes |
| `rename_nodes` | Rename layers |
| `finish_working_on_nodes` | MUST call when done designing |
| `get_fill_image` | Get image data from a node |
| `get_guide` | Get Paper-specific guides (e.g., figma-import) |
