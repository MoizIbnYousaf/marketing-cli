---
name: cmo-output-format
description: |
  Output formatting rules for all marketing skill deliverables.
  Terminal-native design system using Unicode box-drawing characters.
---

# Output Format Rules

Every skill output is a deliverable from a senior marketing professional — not a chatbot reply.

## Design Principles

1. **Scannable in 5 seconds.** Key info in predictable locations.
2. **Shows the work.** Every output displays what was saved, where, and what to do next.
3. **Terminal-native.** Monospace. No markdown rendering. Unicode box-drawing only.
4. **Professional restraint.** No emoji. No exclamation marks. No filler.
5. **Files first.** Deliverables live on the filesystem. Terminal output is the navigation layer.

## Required Sections (every skill output, this order)

### 1. Header

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  DELIVERABLE NAME IN CAPS
  Generated Mar 12, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Content

The actual deliverable. Structure varies by skill.

### 3. Files Saved

```
  FILES SAVED

  ./brand/voice-profile.md       ✓
  ./brand/positioning.md         ✓ (updated)
  ./brand/assets.md              ✓ (3 entries added)
```

### 4. What's Next

```
  WHAT'S NEXT

  Your deliverable is ready. Recommended:

  → /skill-name       Description (~5 min)
  → /skill-name       Description (~10 min)

  Or tell me what you're working on and I'll route you.
```

## Character Palette

```
DIVIDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  Heavy (major sections)
──────────────────────────────────────────────────── Light (sub-sections)

TREE VIEW
├── Branch item
└── Last item

STATUS INDICATORS
✓   Complete / saved / passed
✗   Missing / failed
◑   In progress
○   Available but not connected
★   Recommended option

NUMBERED OPTIONS
①  ②  ③  ④  ⑤

ACTIONS
→   Next step or command
```

## Formatting Rules

- 2-space indent for all content
- 4-space indent for nested content
- Max 55 characters line width for body text
- Heavy dividers (━) for major boundaries, 49 chars wide
- Light dividers (─) for sub-sections
- Status indicators followed by 2 spaces
- File paths use `./` relative prefix, no backticks
- Section labels in ALL CAPS
- Date format: `Mon DD, YYYY`

## Anti-Patterns

- No markdown inside formatted output (no **, no `, no #)
- No bullet points for structured data — use tree view (├── └──)
- No chatbot preamble ("Here is your...", "I've created...")
- No emoji anywhere
- No tables for single-column data — use tree view
- Never omit FILES SAVED or WHAT'S NEXT sections

## Quick Mode

When the user makes a specific, single-asset request ("write me a LinkedIn post about X"):

- Skip project status scan
- Skip multi-step workflow proposal
- Deliver the asset directly
- Still include WHAT'S NEXT (2-3 lines)

## Visual Conversion Checkpoint

Skills that produce copy (landing pages, emails, lead magnets) must offer a visual build step:

```
  → /creative         Build this as a visual page
  → "Skip to next"    Continue to /email-sequences
```

The user chooses. Never auto-advance.
