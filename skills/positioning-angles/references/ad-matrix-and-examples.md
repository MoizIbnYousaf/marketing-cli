# Ad Testing Matrix & Extended Examples

> Extracted from SKILL.md for token efficiency. Load when the user selects an angle and wants ad creative or when reviewing the full worked example.

---

## 12-Ad Testing Matrix

After the user selects an angle, offer:

"Want me to generate a testing matrix for this angle? I'll map 4 hooks across 3 formats for a 12-ad testing grid."

If yes, produce the matrix:

```
------------------------------------------------------

  AD TESTING MATRIX
  Angle: [selected angle name]

------------------------------------------------------

       | Format A        | Format B       | Format C
       | (Static Image)  | (Video)        | (Carousel)
  -----+-----------------+----------------+--------------
  H1   | MA-H1-A         | MA-H1-B        | MA-H1-C
       | [hook 1 + fmt]  | [hook 1 + fmt] | [hook 1 + fmt]
  -----+-----------------+----------------+--------------
  H2   | MA-H2-A         | MA-H2-B        | MA-H2-C
       | [hook 2 + fmt]  | [hook 2 + fmt] | [hook 2 + fmt]
  -----+-----------------+----------------+--------------
  H3   | MA-H3-A         | MA-H3-B        | MA-H3-C
       | [hook 3 + fmt]  | [hook 3 + fmt] | [hook 3 + fmt]
  -----+-----------------+----------------+--------------
  H4   | MA-H4-A         | MA-H4-B        | MA-H4-C
       | [hook 4 + fmt]  | [hook 4 + fmt] | [hook 4 + fmt]

------------------------------------------------------
```

**Matrix structure:**
- 4 rows = 4 different hooks derived from the selected angle
  - H1: The direct statement hook (lead with the claim)
  - H2: The question hook (lead with curiosity)
  - H3: The proof hook (lead with evidence)
  - H4: The contrarian hook (lead with a challenge)

- 3 columns = 3 ad formats
  - Format A: Static image (single visual + headline)
  - Format B: Video (talking head or motion + headline)
  - Format C: Carousel (multi-slide story)

**Each cell contains:**
- Cell ID (e.g., MA-H1-A) for tracking
- Hook text tailored to the format
- Visual concept (1 sentence)
- Primary text (ad body, 1-2 sentences)
- CTA text

**After generating the matrix:**
- Ask which cells to develop first
- Suggest: "Pick 3-4 cells and I can hand them to /creative for production"
- Note: "The cell IDs let you track performance back to specific hook/format combos"

---

## Extended Example: Claude Skills Pack

### Context
- Product: 10 marketing skills for Claude Code
- Transformation: Better marketing output without becoming a marketer
- Alternatives: Generic prompting, hiring copywriters, learning marketing yourself
- Mechanism: Skills transfer expertise through principles, not just prompts

### Competitive Landscape

```
------------------------------------------------------

  COMPETITIVE MESSAGING LANDSCAPE

------------------------------------------------------

  Competitors Analyzed
  |-- PromptBase -- "Find the best prompts"
  |-- Jasper -- "AI copilot for enterprise
  |   marketing teams"
  |-- Copy.ai -- "GTM AI platform"
  +-- Generic prompt packs on Gumroad

  ----------------------------------------------

  Saturated Claims
  |-- "Save hours on content creation"
  |-- "AI-powered marketing"
  +-- "Generate copy in seconds"

  Partially Claimed
  |-- "Enterprise-grade" -- Jasper only
  +-- "Marketplace model" -- PromptBase only

  Underexploited Territory
  |-- Nobody frames it as expertise transfer
  |   (not just prompt shortcuts)
  |-- The "methodology-inside" angle is
  |   wide open (prompts vs. principles)
  +-- Solo founders/builders have no
      champion in this space

------------------------------------------------------
```

### Market Assessment

```
  MARKET ASSESSMENT

  Sophistication: Stage 3 -- mechanism needed
  Transformation: Better marketing output
                  without becoming a marketer
  Mechanism: Skills encode marketing
             principles, not just prompts
  Primary alternative: Generic AI prompting
                       or hiring a copywriter
```

### Angle Options

```
  1  THE CAPABILITY TRANSFER              * recommended
     Statement: Give Claude marketing superpowers so
     you don't need them yourself
     Psychology: Buyers want the outcome without the
     learning curve
     Headline: "Turn Claude into a marketing team
     that actually sells."
     Best for: Technical/builder audience

  2  THE ANTI-GENERIC
     Statement: Stop getting generic AI output that
     sounds like everyone else
     Psychology: Universal frustration with AI output
     quality
     Headline: "Same Claude. Different playbook.
     10x output."
     Best for: Audience disappointed with AI results

  3  THE METHODOLOGY TRANSFER
     Statement: Packaged expertise from $400k+ in
     real results
     Psychology: Credibility through specific proof
     Headline: "The marketing methodology behind
     $400k+ in 9 months -- now packaged for Claude."
     Best for: Results-focused audience

  4  THE TIME RECAPTURE
     Statement: Stop spending hours on AI babysitting
     Psychology: Quantifies the hidden cost
     Headline: "You're burning 10+ hours a month on
     AI babysitting. Skills fix this."
     Best for: Time-constrained audience

  5  THE SPECIALIST UNLOCK
     Statement: Access copywriter/marketer expertise
     without hiring one
     Psychology: Positions against the expensive
     alternative
     Headline: "Specialist marketing output without
     specialist costs."
     Best for: Audience that balked at hiring costs

  Why * The Capability Transfer: At Stage 3, the market
  needs a mechanism. This angle frames skills as expertise
  transfer (not prompt shortcuts), which is the white space
  no competitor occupies.
```
