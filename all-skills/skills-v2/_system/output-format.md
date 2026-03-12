# Output Format Reference

**System file for Vibe Marketing Skills v2**
Every skill MUST follow this formatting specification. This is the visual design
system that makes our output feel like a report from a senior marketing
professional -- not a chatbot reply. The formatting is a core part of the $299+
product experience.

---

## Design Principles

1. **Scannable in 5 seconds.** A busy founder should get the gist by skimming.
   Key information is always in a predictable location.

2. **Shows the work.** Every deliverable displays what was saved, where it lives,
   and what to do next. No orphaned output that leaves the user wondering
   "now what?"

3. **Consistent visual language.** All 16+ skills use the same character palette,
   section order, and spacing rules. A user who has seen one skill output can
   instantly read any other.

4. **Terminal-native.** We design for monospace terminals (Claude Code). No
   markdown rendering, no HTML, no color codes. Our visual system is built
   entirely from Unicode box-drawing characters and a small set of status
   indicators.

5. **Professional restraint.** No emoji. No exclamation marks. No "Great news!"
   filler. The output is the deliverable -- present it and move on.

6. **Files first, output second.** The real deliverable lives on the filesystem
   (`./brand/`, `./campaigns/`), organized and clearly tagged. The terminal
   output is the navigation layer: it shows what was saved, summarizes the key
   decisions, and routes the user forward. Do not dump entire deliverables
   into the output stream when they should be saved as files. Long content
   (full articles, complete email sequences, detailed briefs) belongs in files.
   The output references and summarizes them.

7. **Recommended option visible in 5 seconds.** When presenting multiple
   options (angles, headlines, concepts), the recommended pick must be
   visible without scrolling. Use a QUICK PICK summary block at the top,
   then expand into details below.

---

## Character Palette

These are the ONLY decorative characters used across all skills. Do not
introduce others without updating this file.

```
DIVIDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  Heavy (major sections)
──────────────────────────────────────────────────── Light (sub-sections)

BOX DRAWING
┌──────────────────────────────────────────────────┐
│  Boxed content goes here                         │
│  Used for examples, highlights, comparisons      │
└──────────────────────────────────────────────────┘

TREE VIEW
├── Branch item
├── Branch item
└── Last item

NESTED TREE
├── Parent
│   ├── Child
│   └── Child
└── Parent

STATUS INDICATORS
✓   Complete / present / passed / saved
✗   Missing / failed / not found
◑   In progress / currently generating
○   Available but not connected (optional)
★   Recommended option

NUMBERED OPTIONS
①  ②  ③  ④  ⑤  ⑥  ⑦  ⑧  ⑨  ⑩

ACTION ARROWS
→   Points to a next step, command, or action
```

---

## Required Output Structure

Every skill output MUST include these four sections, in this exact order.
No exceptions. If a section is not applicable (rare), include it with a note
explaining why it was skipped.

### Section 1: Header

The header frames the deliverable. It tells the user exactly what they are
looking at and when it was made.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [DELIVERABLE NAME IN CAPS]
  Generated [Month Day, Year]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Rules:
- Deliverable name is ALL CAPS, describes the output type (not the skill name)
- Date uses format: `Feb 16, 2026`
- Two-space indent before text content
- One blank line between the name and the date
- Heavy dividers (━) top and bottom, exactly 49 characters wide

Example:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  BRAND VOICE PROFILE
  Generated Feb 16, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Section 2: Content

This is the actual deliverable. Its structure varies by skill. See the
template library below for common patterns.

Rules:
- All content uses 2-space indent from the left margin
- Sub-sections are separated by a single light divider (─)
- Use tree view for hierarchical data
- Use numbered options (①②③) for choices
- Use boxed content for examples and comparisons
- Keep line width at or below 55 characters for terminal readability

### Section 3: Files Saved

Always show the user exactly what was written to disk.

```
  FILES SAVED

  ./brand/voice-profile.md       ✓
  ./brand/positioning.md         ✓ (updated)
  ./brand/assets.md              ✓ (3 entries added)
  ./campaigns/q1/brief.md        ✓ (new)
```

Rules:
- Section label is `FILES SAVED` in caps, 2-space indent
- Each file on its own line with 2-space indent
- File paths use `./` relative prefix (relative to project root)
- Status indicator (✓) right-aligned or consistently spaced
- Parenthetical note when a file was updated vs created
- If no files were saved (rare -- e.g., analysis-only output), display:
  ```
    FILES SAVED

    No files written (analysis-only output)
  ```

### Section 4: What's Next

Guide the user to the logical next step. This is where the product earns its
price -- it does not just deliver an asset, it tells you what to do with it.

```
  WHAT'S NEXT

  Your [deliverable] is ready. Recommended next moves:

  → /skill-name       Brief description (est. time)
  → /skill-name       Brief description (est. time)
  → /skill-name       Brief description (est. time)

  Or tell me what you're working on and I'll route you.
```

Rules:
- Always offer 2-4 concrete next steps
- Each next step references a real skill with `/skill-name`
- Include a time estimate in parentheses: `(~5 min)`, `(~15 min)`
- End with the routing fallback line
- If the output is the final step in a workflow, say so:
  ```
    WHAT'S NEXT

    This completes the [workflow name] workflow.
    All assets are saved and ready to deploy.

    → /start-here     Review your full project status
    → /campaign        Launch a new campaign with these assets
  ```

### Quick Mode

When a user makes a specific, single-asset request (e.g., "write me a LinkedIn post about X", "give me 5 subject lines", "generate a product photo"), skip the ceremony and deliver the asset directly. Quick mode means:

- No project status scan
- No multi-step workflow proposal
- No gap analysis or missing-file warnings
- Just the requested output, formatted per this guide

**Trigger:** The request is a single, specific deliverable with clear parameters. The user knows what they want.

**Still include:** The `WHAT'S NEXT` block at the end (so they know what's available), but keep it to 2-3 lines max.

**When NOT to use quick mode:** The user says "help me with...", "where should I start", "set up my...", or anything exploratory. Those get the full experience.

---

### Visual Conversion Checkpoint

Skills that produce copy or content (landing pages, lead magnets, email
sequences, ad copy) MUST offer a visual build step before advancing to
the next skill in a chain. Do not silently jump to the next workflow step.

```
  WHAT'S NEXT

  Your landing page copy is saved. Before
  moving on:

  → /creative         Build this as a visual
                      landing page (~15 min)
  → "Skip to next"   Continue to /email-sequences

  Or tell me what you're working on and
  I'll route you.
```

Rules:
- The visual conversion option (/creative) is always the FIRST next step
- The "skip" option explicitly names the next skill in the chain
- The user chooses -- the system does not auto-advance
- This applies to: /direct-response-copy, /lead-magnet, /newsletter,
  /email-sequences, /content-atomizer

---

## Template Library

These templates cover the most common output patterns. Skill authors should
use these as starting points, not deviate into custom layouts.

### Template: Project Scan

Used by the orchestrator and `/start-here` to show the current state of the
user's project.

```
  Brand Foundation
  ├── Voice Profile       ✓ loaded (last updated Feb 10)
  ├── Positioning         ✓ loaded (angle: "The Anti-Course Course")
  ├── Audience Research   ✗ not found
  └── Competitor Intel    ✗ not found

  Marketing Stack
  ├── Replicate API       ✓ connected
  ├── Mailchimp           ✓ connected (4,200 subscribers)
  └── GA4                 ○ not connected (optional)

  Campaign Assets
  ├── Welcome Sequence    ✓ 7 emails (Feb 1)
  ├── Lead Magnet         ✓ "Cold Email Kit" (Feb 5)
  └── Blog Posts          2 published, 1 draft
```

Rules:
- Group items into logical categories
- Category names on their own line, no indicator
- Status indicators aligned in a column
- Brief context after the indicator (date, count, name)
- ✗ for missing items that are recommended
- ○ for missing items that are optional

### Template: Numbered Options with Recommendation

Used when presenting the user with strategic choices (positioning angles,
headline variants, campaign concepts).

```
  ① THE ANTI-COURSE COURSE                ★ recommended
  "Most freelance courses teach theory from
  people who stopped freelancing. This one
  ships templates from someone billing
  $40k/month."
  → Best for: cold traffic, ads, skeptical buyers

  ──────────────────────────────────────────────

  ② THE MATH ANGLE
  "The difference between $3k and $10k months
  is 2 clients. Here's how to land them."
  → Best for: email, content, warm audience

  ──────────────────────────────────────────────

  ③ THE BEHIND-THE-CURTAIN
  "Every proposal template, follow-up script,
  and pricing calculator I used to hit $40k
  months -- yours in one download."
  → Best for: lead magnets, landing pages
```

Rules:
- Use circled numbers ①②③, not 1. 2. 3.
- Recommended option gets ★ on the same line as the title
- Option titles in ALL CAPS
- Description in quotes (it is the actual copy being proposed)
- `→ Best for:` line tells the user where this option works
- Light divider between options

### Template: Quick Pick Summary

When a skill presents multiple options (positioning angles, lead magnet concepts,
headline variants, subject lines), the recommended pick MUST appear at the top
before detailed options. This ensures the user sees the recommendation without
scrolling.

```
  QUICK PICK
  ──────────────────────────────────────────────

  ★ Recommended: ① THE ANTI-COURSE COURSE
  "Most freelance courses teach theory. This
  one ships templates from someone billing
  $40k/month."
  → Best for: cold traffic, ads, skeptical buyers

  ──────────────────────────────────────────────

  All options detailed below ↓
```

Rules:
- QUICK PICK block appears immediately after the header, before any detailed
  content
- Uses ★ indicator on the recommendation line
- Includes the option number so users can find it in the full list
- One-line rationale or copy excerpt
- Light dividers above and below
- Ends with "All options detailed below ↓" to signal more content follows
- If no clear recommendation, skip the QUICK PICK block entirely

### Template: Campaign Completion Summary

Used when a multi-asset campaign is finished.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  CAMPAIGN COMPLETE: Product Launch Q1
  "Stop Guessing. Start Shipping."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ASSETS CREATED

  Email Sequence (5 emails)
  └── ./campaigns/q1-launch/emails/
      ├── 01-announcement.md       Day 0
      ├── 02-problem.md            Day 2
      ├── 03-proof.md              Day 4
      ├── 04-objections.md         Day 6
      └── 05-close.md              Day 7

  Landing Page
  └── ./campaigns/q1-launch/landing-page.md
      Hero, features, testimonials, CTA

  Social Assets
  └── ./campaigns/q1-launch/social/
      ├── twitter-thread.md        12-post thread
      ├── linkedin-post.md         Long-form post
      └── ig-carousel.md           10 slides

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  REGISTRY UPDATED              ✓
  LEARNINGS JOURNAL UPDATED     ✓

  Angle used:   The Anti-Course Course
  Voice:        Direct, proof-heavy, no jargon
  Audience:     Freelancers ($3-8k/mo, want $15k+)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Rules:
- Campaign name and headline in the header block
- Assets grouped by type with tree view showing directory structure
- Brief context on the same line as each file
- Footer block confirms registry and learnings journal were updated
- Metadata (angle, voice, audience) summarized in footer

### Template: On-Brand / Off-Brand Comparison

Used by brand voice to show examples of correct vs incorrect tone.

```
  ┌──────────────────────────────────────────────┐
  │                                              │
  │  ✓ On-brand                                  │
  │  "I booked $14k last month using exactly     │
  │  three cold email templates."                │
  │                                              │
  │  ✗ Off-brand                                 │
  │  "Leverage our proven methodology to unlock  │
  │  your earning potential."                    │
  │                                              │
  └──────────────────────────────────────────────┘
```

Rules:
- Full-width box with blank lines as padding top and bottom
- ✓ and ✗ indicators before the labels
- Labels are `On-brand` and `Off-brand` (not "Good" / "Bad")
- Example text in quotes
- Blank line between the two examples

### Template: Progress Display

Used during multi-step operations to show real-time status.

**During execution:**
```
  Building your brand foundation...

  ◑ Extracting brand voice        analyzing website...
  ◑ Finding positioning angles    mapping competitive landscape...
  ◑ Researching your audience     mining communities...
```

**After completion:**
```
  ✓ Brand voice extracted          ./brand/voice-profile.md
  ✓ 3 positioning angles found     ./brand/positioning.md
  ✓ Audience profile built          ./brand/audience.md
```

Rules:
- ◑ for in-progress items, with lowercase status description
- ✓ for completed items, with the output file path
- Status descriptions and file paths right-aligned in a column
- Opening line describes the overall operation, ends with `...`

### Template: Tool Detection Status

Used by the orchestrator to show connected marketing integrations.

```
  Marketing Stack Detection

  ✓ Replicate API       connected (image + video ready)
  ✓ Mailchimp           connected (list: 4,200 subscribers)
  ○ GA4                 not connected (optional -- enables
                        performance tracking)
  ✗ Buffer              not found (add for social scheduling)
```

Rules:
- ✓ for connected tools with capability note
- ○ for optional tools that are not connected
- ✗ for recommended tools that are missing
- Long descriptions can wrap with indent alignment

### Template: Single Asset Generation (Creative)

Used when a single creative asset (image, video, audio) is generated.

```
  IMAGE GENERATED

  Model:   Flux Pro 1.1
  Prompt:  A minimalist desk setup with a MacBook
           showing a revenue dashboard, warm light,
           editorial photography style
  Ratio:   1:1 (Instagram feed)

  Output:  https://replicate.delivery/pbxt/...
  Saved:   ./campaigns/q1-launch/hero-01.png

  ──────────────────────────────────────────────

  Actions:
  → "Iterate"          Generate 4 more variants
  → "Different style"  Try a new visual direction
  → "Animate"          Convert to short video
  → "Adapt"            Resize for other platforms
```

Rules:
- Asset type in ALL CAPS as the sub-header
- Metadata as key-value pairs with aligned colons
- Prompt text can wrap, indented to align with the first line
- Output URL and saved path on separate labeled lines
- Actions section separated by a light divider
- Actions in quotes (they are things the user can say)

### Template: Content Preview with Metrics

Used when generating copy (email subject lines, ad copy, headlines) to show
the output alongside relevant data.

```
  SUBJECT LINE VARIANTS

  ① "Your proposal template is broken (here's
     mine)"
     → Open rate est: high (curiosity + specificity)

  ② "I just sent this to a $12k client"
     → Open rate est: high (voyeurism + proof)

  ③ "The 3-email sequence that books calls"
     → Open rate est: medium (utility, clear value)

  ──────────────────────────────────────────────

  Winner: ① -- strongest curiosity gap,
  aligns with direct voice profile.

  Recommended A/B test: ① vs ②
```

Rules:
- Variants use circled numbers
- Copy in quotes, can wrap with hanging indent
- Performance estimate on the `→` line with reasoning
- Recommendation below the light divider, with rationale

### Template: Data Table (Simple)

Used when presenting structured data that benefits from alignment
(keyword research, competitor comparison, performance metrics).

```
  TOP KEYWORDS BY OPPORTUNITY

  Keyword                    Vol    Diff   Score
  ──────────────────────────────────────────────
  freelance proposal         2,400   35    ★★★★
  cold email template        8,100   62    ★★★
  freelance pricing guide    1,900   28    ★★★★★
  how to find clients        12,000  78    ★★
  freelance contract         6,500   45    ★★★

  ──────────────────────────────────────────────
  Vol = monthly searches, Diff = ranking difficulty (0-100)
  Score = opportunity rating based on vol, diff, and intent
```

Rules:
- Column headers with consistent spacing
- Light dividers above and below the data rows
- Legend below the table explaining abbreviations
- Star ratings (★) for qualitative scores
- Numbers use commas for thousands

### Template: Sequence Overview

Used when generating multi-part content (email sequences, content calendars,
drip campaigns).

```
  7-EMAIL WELCOME SEQUENCE

  Day 0   "Here's the kit you asked for"
           Deliver lead magnet, set expectations
           CTA: Download the kit

  Day 1   "The $14k month story"
           Origin story, build trust with proof
           CTA: Read the case study

  Day 3   "Most freelancers skip this step"
           Teach one concept, demonstrate expertise
           CTA: Try the template

  Day 5   "What 4,200 freelancers taught me"
           Social proof, community angle
           CTA: Join the community

  Day 7   "The math behind $10k months"
           Bridge to paid offer with logic
           CTA: Watch the free training

  Day 10  "Quick question"
           Short, personal, re-engagement
           CTA: Reply to this email

  Day 14  "[First name], still stuck at $5k?"
           Final push, direct CTA to offer
           CTA: Enroll now
```

Rules:
- Day number left-aligned, subject line in quotes on the same line
- One-line description of the email's purpose
- CTA on its own labeled line
- Blank line between each entry in the sequence

### Template: Error / Warning Display

Used when something goes wrong or needs user attention.

```
  ┌──────────────────────────────────────────────┐
  │                                              │
  │  ✗ BRAND VOICE NOT FOUND                     │
  │                                              │
  │  This skill needs your brand voice profile   │
  │  to generate on-brand copy.                  │
  │                                              │
  │  → /brand-voice    Build it now (~10 min)    │
  │  → Continue        Generate with defaults    │
  │                                              │
  └──────────────────────────────────────────────┘
```

Rules:
- Use a box for errors and warnings -- they must stand out
- ✗ indicator with the error title in ALL CAPS
- Brief explanation of what went wrong and why it matters
- Always offer at least one action to resolve the issue
- Never use the word "error" -- describe the situation plainly

---

## Formatting Rules

These rules apply to ALL output across ALL skills. No exceptions.

### Spacing and Indentation
1. Use 2-space indent for all content inside sections
2. Use 4-space indent for nested content within a 2-space block
3. Leave exactly one blank line between sections
4. Leave exactly one blank line before and after dividers
5. No trailing whitespace on any line

### Line Width
6. Maximum line width is 55 characters for body text
7. Dividers are exactly 49 characters wide (heavy) or context-appropriate (light)
8. Boxed content adjusts width to its content but caps at 50 characters inner width
9. File paths and URLs may exceed the line width limit if necessary

### Dividers
10. Heavy dividers (━) for major section boundaries (header top/bottom, footer)
11. Light dividers (─) for sub-section breaks within content
12. Never stack dividers (no heavy followed immediately by light)
13. Never use dividers inside boxed content

### Status Indicators
14. Status indicators (✓ ✗ ◑ ○ ★) are always followed by exactly 2 spaces
15. In columnar layouts, align the text after status indicators
16. Never combine indicators (no ✓★ or ✗○)

### File Paths
17. Always use `./` relative prefix (relative to project root)
18. Never put file paths in backticks or code blocks in output
19. Show actual paths, not placeholders
20. When a file is updated (not created), note it: `✓ (updated)`

### Text Style
21. Section labels in ALL CAPS: `FILES SAVED`, `WHAT'S NEXT`
22. Deliverable names in ALL CAPS in headers
23. Option titles in ALL CAPS in numbered lists
24. Everything else in sentence case
25. No markdown formatting (no **, no `, no #) inside formatted output
26. Use verb-first language for actions: "Iterate", "Adapt", "Build"
27. Time estimates in parentheses: `(~5 min)`, `(~15 min)`, `(~30 min)`

### Actions and Next Steps
28. Actions use the → arrow prefix
29. Skill references use `/skill-name` format
30. User-sayable actions are in quotes: `→ "Iterate"`
31. Always include 2-4 next steps in the WHAT'S NEXT section

---

## Anti-Patterns

These are explicit things to NEVER do. If you catch yourself doing any of
these, stop and reformat.

### DO NOT use markdown inside formatted output
```
WRONG:
  ## Brand Voice Profile
  **Tone:** Direct and confident
  - Uses specific numbers
  - Avoids jargon

RIGHT:
  BRAND VOICE PROFILE

  Tone: Direct and confident
  ├── Uses specific numbers
  └── Avoids jargon
```

### DO NOT use bullet points for structured data
```
WRONG:
  - Voice Profile: loaded
  - Positioning: loaded
  - Audience: not found

RIGHT:
  ├── Voice Profile     ✓ loaded
  ├── Positioning       ✓ loaded
  └── Audience          ✗ not found
```

### DO NOT use chatbot preamble
```
WRONG:
  Here is your brand voice profile! I've analyzed
  your website and social media to create this.

RIGHT:
  (Just start with the header. The output IS the
  deliverable. No preamble needed.)
```

### DO NOT put file paths in code blocks
```
WRONG:
  Saved to `./brand/voice-profile.md`

RIGHT:
  Saved:  ./brand/voice-profile.md
```

### DO NOT use tables for single-column data
```
WRONG:
  | Asset           | Status  |
  |-----------------|---------|
  | Voice Profile   | Done    |
  | Positioning     | Done    |

RIGHT:
  ├── Voice Profile   ✓ done
  └── Positioning     ✓ done
```

### DO NOT mix formatting systems
```
WRONG:
  ## Campaign Assets        <-- markdown header

  ├── emails/               <-- tree view
  └── social/

  **Status:** Complete      <-- markdown bold

RIGHT:
  CAMPAIGN ASSETS

  ├── emails/
  └── social/

  Status: Complete
```

### DO NOT use emoji
```
WRONG:
  🎉 Campaign complete!
  📧 5 emails generated
  🚀 Ready to launch

RIGHT:
  CAMPAIGN COMPLETE
  ✓ 5 emails generated
  Ready to launch
```

### DO NOT omit the FILES SAVED section
Every skill that writes files MUST show what it wrote. The user should never
have to go hunting for output.

### DO NOT omit the WHAT'S NEXT section
Every skill MUST guide the user forward. Even if the workflow is complete,
point them to `/start-here` or suggest a new direction.

---

## Spacing Reference

This section shows the exact whitespace structure of a complete skill output
for reference. Dots represent spaces.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                                    ← blank line
..DELIVERABLE NAME                                  ← 2-space indent
..Generated Feb 16, 2026                            ← 2-space indent
                                                    ← blank line
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                                    ← blank line
..Content starts here                               ← 2-space indent
..More content                                      ← 2-space indent
                                                    ← blank line
..──────────────────────────────────────────────     ← light divider
                                                    ← blank line
..Sub-section content                               ← 2-space indent
                                                    ← blank line
..FILES SAVED                                       ← 2-space indent
                                                    ← blank line
.../path/to/file.md..............✓                  ← 2-space indent
.../path/to/other.md.............✓ (updated)        ← 2-space indent
                                                    ← blank line
..WHAT'S NEXT                                       ← 2-space indent
                                                    ← blank line
..Your deliverable is ready.                        ← 2-space indent
                                                    ← blank line
..→ /skill-name.....Description (~5 min)            ← 2-space indent
..→ /skill-name.....Description (~10 min)           ← 2-space indent
                                                    ← blank line
..Or tell me what you're working on and             ← 2-space indent
..I'll route you.                                   ← 2-space indent
```

---

## Complete Example: Brand Voice Skill Output

This is a full example of a properly formatted skill output for reference.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  BRAND VOICE PROFILE
  Generated Feb 16, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  VOICE DNA

  Tone:        Direct, proof-heavy, zero jargon
  Personality: The friend who figured it out first
  Pacing:      Short sentences. Then a longer one
               to drive the point home.

  ──────────────────────────────────────────────

  SIGNATURE PATTERNS

  ├── Leads with specific numbers ("$14k", "3
  │   templates", "47 minutes")
  ├── Uses "you" more than "we"
  ├── Breaks grammar rules on purpose for rhythm
  └── Ends with a clear, single CTA

  ──────────────────────────────────────────────

  VOCABULARY

  ┌──────────────────────────────────────────────┐
  │                                              │
  │  ✓ On-brand                                  │
  │  "I booked $14k last month using exactly     │
  │  three cold email templates."                │
  │                                              │
  │  ✗ Off-brand                                 │
  │  "Leverage our proven methodology to unlock  │
  │  your earning potential."                    │
  │                                              │
  └──────────────────────────────────────────────┘

  Words to use        Words to avoid
  ├── book            ├── leverage
  ├── land            ├── unlock
  ├── ship            ├── empower
  ├── build           ├── synergy
  └── test            └── methodology

  ──────────────────────────────────────────────

  FILES SAVED

  ./brand/voice-profile.md       ✓
  ./brand/vocabulary.md          ✓
  ./brand/examples.md            ✓ (12 samples)

  WHAT'S NEXT

  Your voice profile is set. Every skill will
  use it from here on. Recommended next moves:

  → /positioning       Find your market angle (~10 min)
  → /audience          Research your ideal buyers (~15 min)
  → /competitor-intel  See what competitors are doing (~10 min)

  Or tell me what you're working on and I'll route you.
```

---

## Skill Author Checklist

Before shipping a skill, verify:

- [ ] Output starts with a heavy-divider header block
- [ ] Deliverable name is ALL CAPS in the header
- [ ] Date is formatted as `Mon DD, YYYY`
- [ ] Content uses 2-space indent throughout
- [ ] Hierarchical data uses tree view, not bullets
- [ ] Choices use circled numbers, not plain numbers
- [ ] Light dividers separate sub-sections
- [ ] FILES SAVED section lists every file written
- [ ] File paths use `./` relative prefix
- [ ] WHAT'S NEXT section offers 2-4 concrete actions
- [ ] Actions reference real skill names with `/skill-name`
- [ ] Time estimates are included in parentheses
- [ ] No markdown formatting inside the output
- [ ] No emoji anywhere in the output
- [ ] No chatbot preamble ("Here is your...", "I've created...")
- [ ] Line width stays at or below 55 characters
- [ ] Status indicators are consistent (✓ ✗ ◑ ○ ★)
