# Vibe Marketing Skills v2.0

Your marketing team in a terminal. 11 skills that build on each other,
remember your brand, and get sharper every time you use them.

Built for Claude Code. Designed for founders, solo marketers, and small
teams who need senior-level marketing output without the senior-level
headcount.

---

## Quick Start

```
/start-here
```

That is the only command you need to remember. The orchestrator scans your
project, asks two questions, builds your brand foundation, and routes you
to the right skill for whatever you are working on.

---

## What Is in the Package

### Foundation Skills

| Skill | What it does |
|-------|-------------|
| `/start-here` | Scans your project, builds your brand foundation, routes you to the right skill |
| `/brand-voice` | Extracts or builds a voice profile so every piece of content sounds like you |
| `/positioning-angles` | Finds the market angle that makes your offer stand out and sell |

### Strategy Skills

| Skill | What it does |
|-------|-------------|
| `/keyword-research` | Maps your content territory with data-backed keyword clusters and priorities |
| `/lead-magnet` | Generates lead magnet concepts and builds the actual content (checklists, guides, templates) |

### Execution Skills

| Skill | What it does |
|-------|-------------|
| `/direct-response-copy` | Writes landing pages, sales copy, headlines, and CTAs that convert |
| `/seo-content` | Produces long-form articles optimized for search that read like a human wrote them |
| `/email-sequences` | Builds welcome, nurture, launch, and re-engagement email sequences |
| `/newsletter` | Creates newsletter editions and format templates modeled on top creators |
| `/creative` | AI-powered image, video, and graphic generation across five production modes |

### Distribution Skills

| Skill | What it does |
|-------|-------------|
| `/content-atomizer` | Repurposes one piece of content into platform-optimized posts across 8 platforms |

### Creative Engine Modes

The `/creative` skill includes five specialized production modes:

| Mode | What it produces |
|------|-----------------|
| Product Photo | Studio-quality product photography with controlled lighting and composition |
| Product Video | Short-form product videos, demos, and motion content |
| Social Graphics | Platform-sized graphics for feeds, stories, covers, and carousels |
| Talking Head | Presenter-style video with lip sync from text or audio |
| Ad Creative | Performance ad variants with hook-format testing matrices |

---

## System Requirements

**Required:**
- Claude Code (Claude's official CLI)

**Optional (unlocks creative engine):**
- Replicate API key (`REPLICATE_API_TOKEN` in your `.env` file)
  Enables AI image generation, video production, and all `/creative` modes.

**Optional (enhances specific skills):**
- Email ESP API key (Mailchimp, ConvertKit, or HubSpot) for direct email deployment
- Buffer or Hootsuite API key for social post scheduling
- GA4 or PostHog for performance tracking

Skills detect your connected tools automatically and adapt. No tool is
required to start -- every skill produces portable output files you can
use anywhere.

---

## File Structure

```
skills-v2/
├── README.md                          <- You are here
├── _system/                           <- Shared infrastructure
│   ├── brand-memory.md                <- How skills read/write brand context
│   ├── output-format.md               <- Visual design system for all output
│   ├── schemas/                       <- JSON Schema contracts for structured data
│   │   ├── voice-profile.schema.json
│   │   ├── campaign-brief.schema.json
│   │   ├── keyword-plan.schema.json
│   │   ├── email-sequence-summary.schema.json
│   │   ├── ad-matrix.schema.json
│   │   └── content-brief.schema.json
│   └── scripts/                       <- Install, QA, and packaging scripts
│       ├── install.sh
│       ├── doctor.sh
│       ├── e2e-fresh-install.sh
│       └── package.sh
├── start-here/
│   └── SKILL.md                       <- Orchestrator and router
├── brand-voice/
│   └── SKILL.md                       <- Voice extraction and building
├── positioning-angles/
│   ├── SKILL.md                       <- Market angle discovery
│   └── references/                    <- Positioning frameworks (Dunford, Hormozi, Schwartz)
├── keyword-research/
│   └── SKILL.md                       <- Keyword strategy and clustering
├── seo-content/
│   ├── SKILL.md                       <- SEO article production
│   └── references/                    <- E-E-A-T guidelines and examples
├── direct-response-copy/
│   └── SKILL.md                       <- High-conversion copywriting
├── email-sequences/
│   └── SKILL.md                       <- Email automation sequences
├── lead-magnet/
│   ├── SKILL.md                       <- Lead magnet concept and build
│   └── references/                    <- Format examples by business type
├── newsletter/
│   ├── SKILL.md                       <- Newsletter edition creation
│   └── references/                    <- Top newsletter breakdowns
├── content-atomizer/
│   ├── SKILL.md                       <- Cross-platform repurposing
│   └── references/                    <- Platform playbook
└── creative/
    ├── SKILL.md                       <- Creative engine router
    ├── modes/                         <- Five production modes
    │   ├── product-photo.md
    │   ├── product-video.md
    │   ├── social-graphics.md
    │   ├── talking-head.md
    │   └── ad-creative.md
    └── references/                    <- Model registry and visual intelligence
        ├── MODEL_REGISTRY.md
        └── VISUAL_INTELLIGENCE.md
```

---

## How the Skills Work

### Brand Memory

Every skill reads from and writes to a shared `./brand/` directory at your
project root. This is how the system remembers who you are across sessions.

The first time you run `/start-here`, it creates your brand foundation:
- `voice-profile.md` -- How your brand sounds
- `positioning.md` -- Your market angle and differentiators
- `stack.md` -- Your connected tools and integrations
- `assets.md` -- Registry of everything the system has produced
- `learnings.md` -- Performance data that makes future output sharper

Skills only read the brand files they need. A keyword researcher does not
need your voice profile. A copywriter does not need your keyword plan.
This selective context keeps output focused and specific.

### Skill Chaining

Skills are organized into layers: Foundation, Strategy, Execution, and
Distribution. Each layer builds on the one before it.

```
Foundation    /brand-voice + /positioning-angles
     |
Strategy      /keyword-research, /lead-magnet, /creative (setup)
     |
Execution     /direct-response-copy, /seo-content, /email-sequences,
              /newsletter, /creative
     |
Distribution  /content-atomizer, /creative (ad mode)
```

The orchestrator (`/start-here`) handles routing and can chain skills into
complete workflows. Ask for "a lead magnet funnel" and it will run
`/lead-magnet`, `/direct-response-copy`, `/email-sequences`, and
`/content-atomizer` in sequence, passing context between each step.

### Output Formatting

Every skill uses a consistent visual design system built for terminal
readability. Output follows a four-section structure:

1. **Header** -- What was produced and when
2. **Content** -- The actual deliverable
3. **Files Saved** -- Exactly what was written to disk and where
4. **What's Next** -- Concrete next steps with skill references and time estimates

No markdown rendering, no HTML, no color codes. The visual system uses
Unicode box-drawing characters and a small set of status indicators
(`checkmark` for complete, `x` for missing, `star` for recommended).

---

## FAQ

**How do I update my brand voice after it is set?**

Run `/brand-voice` again. It detects the existing profile, shows you a
summary, and offers targeted update options -- adjust tone, update
vocabulary, add new samples, or full rebuild.

**How do I connect my email tool (Mailchimp, ConvertKit, etc.)?**

Add your API key to the `.env` file at your project root:
```
MAILCHIMP_API_KEY=your-key-here
```
Skills detect connected tools automatically on their next run. The
orchestrator will confirm the connection in your project scan.

**How do I connect the creative engine?**

Add your Replicate API token to `.env`:
```
REPLICATE_API_TOKEN=your-token-here
```
Then run `/creative` and it will detect the connection. Without Replicate,
the creative skill generates detailed prompts and briefs you can use with
any image/video tool.

**How do I get help or see my project status?**

Run `/start-here` at any time. It scans your entire project, shows what
exists, identifies gaps, and recommends the highest-impact next action.

**How do I run a multi-step workflow?**

Tell the orchestrator what you want in plain language:
- "Build me a lead magnet funnel"
- "Launch my product"
- "Create a content system"
- "Start a newsletter"

It recognizes these as multi-skill workflows and chains the right skills
together automatically.

**Can I edit the output files manually?**

Yes. Every file the system writes is human-readable markdown. Edit freely.
Skills check for existing files before overwriting and will show you a
diff and ask for confirmation before replacing anything.

**How does the system improve over time?**

After major deliverables, skills ask for feedback. Your responses are
logged to `./brand/learnings.md`. Future skill runs read relevant
learnings and adjust their output. The more you use it, the better it
gets at matching your preferences.

**What if I want to start over?**

Run `/start-here` and tell it you want to reset. It will guide you
through removing the `./brand/` and `./campaigns/` directories. No
files are deleted without your explicit confirmation.

**Where do campaign assets go?**

Skills write campaign assets to `./campaigns/{campaign-name}/` with
subdirectories for emails, social content, ads, and other asset types.
Every asset is also registered in `./brand/assets.md` so the orchestrator
can track your full inventory.

---

## Version

v2.0 -- Built February 2026

11 marketing skills, 5 creative engine modes, shared brand memory,
selective context passing, pre-built multi-skill workflows, JSON schema
contracts for downstream automation, and a visual design system built
for terminal-native output.
