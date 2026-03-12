# Vibe Marketing Skills v2.0 — Architecture Deep Dive

**Version:** v2.0 | **Date:** February 2026 | **Platform:** Claude Code
**Total System:** 11 skills, 134 files, 15,310 lines of SKILL.md, 417KB distributable

---

## 1. What This Is

An agentic marketing skill system for Claude Code that gives founders and small teams senior-level marketing output. Not prompt templates — executable methodology. Each skill embeds deep domain expertise (100+ years of direct response copywriting, live SERP analysis, competitive intelligence) into decision frameworks that Claude follows.

The system remembers your brand across sessions, passes selective context between skills, and improves with every interaction through a learnings feedback loop.

**One command to start:** `/start-here` — the orchestrator scans project state, asks exactly two questions, builds brand foundation, and routes to the right skill.

---

## 2. System Architecture

### 2.1 Four-Layer Skill Taxonomy

```
Layer 1: FOUNDATION          Layer 2: STRATEGY
├── /start-here (orchestrator)    ├── /keyword-research
├── /brand-voice                  └── /lead-magnet
└── /positioning-angles

Layer 3: EXECUTION            Layer 4: DISTRIBUTION
├── /direct-response-copy         └── /content-atomizer
├── /seo-content
├── /email-sequences
├── /newsletter
└── /creative (5 modes)
```

Foundation builds identity. Strategy plans what to create. Execution creates it. Distribution spreads it. Skills can be invoked at any layer independently — the layers describe natural flow, not enforced dependencies.

### 2.2 File Structure

```
skills-v2/
├── README.md                          # Customer-facing docs
├── _system/
│   ├── brand-memory.md                # Shared state protocol (19KB)
│   ├── output-format.md               # Visual design system (33KB)
│   ├── schemas/                       # 6 JSON Schema contracts
│   │   ├── voice-profile.schema.json
│   │   ├── campaign-brief.schema.json
│   │   ├── keyword-plan.schema.json
│   │   ├── email-sequence-summary.schema.json
│   │   ├── ad-matrix.schema.json
│   │   └── content-brief.schema.json
│   └── scripts/
│       ├── install.sh                 # Customer installer
│       ├── doctor.sh                  # Health check (29 checks)
│       ├── e2e-fresh-install.sh       # Isolated E2E test (40 tests)
│       └── package.sh                 # Zip builder with manifest
│
├── start-here/SKILL.md               # Orchestrator (1,858 lines)
├── brand-voice/SKILL.md              # Voice extraction/building (1,501 lines)
├── positioning-angles/SKILL.md       # Competitive positioning (767 lines)
│   └── references/                   # 5 framework files
├── direct-response-copy/SKILL.md     # Conversion copy (1,238 lines)
│   └── references/COPYWRITING_PLAYBOOK.md  # Deep-dive frameworks (1,636 lines)
├── keyword-research/SKILL.md         # SEO keyword strategy (1,498 lines)
├── seo-content/SKILL.md              # Search-optimized content (1,746 lines)
│   └── references/eeat-examples.md
├── email-sequences/SKILL.md          # Email automation (1,737 lines)
├── lead-magnet/SKILL.md              # Lead gen assets (1,142 lines)
│   └── references/                   # 5 reference files
├── newsletter/SKILL.md               # Newsletter production (1,577 lines)
│   └── references/newsletter-examples.md
├── content-atomizer/SKILL.md         # Multi-platform distribution (1,715 lines)
│   └── references/platform-playbook.md
└── creative/SKILL.md                 # AI creative engine (531 lines)
    ├── references/
    │   ├── MODEL_REGISTRY.md          # API payloads and model specs
    │   └── VISUAL_INTELLIGENCE.md     # Visual psychology guide
    └── modes/                         # 5 creative mode playbooks
        ├── product-photo.md
        ├── product-video.md
        ├── social-graphics.md
        ├── talking-head.md
        └── ad-creative.md
```

### 2.3 Skill Size Distribution

| Skill | Lines | Role |
|-------|-------|------|
| start-here | 1,858 | Orchestrator — routing, workflows, gap analysis |
| seo-content | 1,746 | Live SERP analysis + content generation |
| email-sequences | 1,737 | 6 sequence types + ESP integration |
| content-atomizer | 1,715 | 8-platform distribution engine |
| newsletter | 1,577 | 6 newsletter archetypes |
| brand-voice | 1,501 | 3 extraction modes + voice test loop |
| keyword-research | 1,498 | 6-Circles Method + content planning |
| direct-response-copy | 1,238 | Conversion copy + 7-dimension scoring |
| lead-magnet | 1,142 | 7 format types with BUILD MODE |
| positioning-angles | 767 | Competitive intel + 8 angle generators |
| creative | 531 | Entry point (bulk in modes/ and references/) |
| **Total SKILL.md** | **15,310** | |
| + references | ~5,000 | Deep-dive frameworks loaded on-demand |
| + creative modes | ~12,000 | Mode-specific playbooks |
| **Total system** | **~32,000** | |

---

## 3. The Brand Memory System

### 3.1 Shared State Layer

Every skill reads from and writes to `./brand/` — a directory of markdown files that persists between sessions. This is the system's memory.

```
./brand/
├── voice-profile.md      Written by: /brand-voice
├── positioning.md         Written by: /positioning-angles
├── audience.md            Written by: /audience-research (v2.1)
├── competitors.md         Written by: /competitive-intel (v2.1)
├── creative-kit.md        Written by: /creative
├── stack.md               Written by: /start-here
├── keyword-plan.md        Written by: /keyword-research
├── assets.md              Append-only: all skills
└── learnings.md           Append-only: all skills
```

**Profile files** (7): Represent current state. Owning skill can overwrite with confirmation. Must show diff before replacing.

**Append-only files** (2): `assets.md` tracks every generated asset. `learnings.md` captures performance feedback. Never truncated — only appended.

### 3.2 The Context Paradox

This is the system's most critical architectural insight.

**The problem:** Naive skill systems dump all brand memory into every skill invocation. With 9 brand files potentially totaling 50KB+, this creates:
1. Context window pressure — less room for actual work
2. Attention dilution — the model tries to incorporate everything
3. Generic output — paradoxically, MORE context produces LESS specific results

**The solution:** A Context Matrix specifies exactly what each skill receives. Not everything — the right things.

| Skill | Receives | Withheld |
|-------|----------|----------|
| /brand-voice | business description, URL, content samples | keyword data, campaigns, competitors, creative kit |
| /positioning-angles | business, audience, competitors' claims, voice summary (1-2 sentences) | full voice profile, keyword plan, campaigns, email data |
| /direct-response-copy | full voice profile, chosen angle only, audience pain points | keyword plan, full competitor analysis, creative kit |
| /keyword-research | positioning angle, audience search behavior, competitor domains | voice profile, creative kit, email data, campaigns |
| /seo-content | full voice profile, target keyword + brief, audience expertise level | positioning (unless product article), email data, creative kit |
| /email-sequences | full voice profile, positioning angle, audience awareness level, lead magnet details, creative kit summary | keyword plan, full SEO content, full competitor analysis |
| /lead-magnet | voice tone + vocabulary, positioning angle, audience pain points | keyword plan, email history, creative kit, competitor depth |
| /newsletter | full voice profile, audience interests, engagement learnings | positioning, keyword plan, competitor analysis, campaigns |
| /content-atomizer | voice platform-adaptation table, source content, creative kit summary | full positioning, keyword plan, email data, campaigns |
| /creative | voice summary, positioning angle, full creative kit, stack.md | keyword plan, email data, full audience, competitor analysis |
| /start-here | ALL files | (nothing — orchestrator needs full picture) |

**Context freshness rules:**
- Under 7 days: Pass as-is
- 7-30 days: Pass with date flag
- 30-90 days: Summary only with verification note
- Over 90 days: Don't pass; recommend refreshing

**Why this matters:** A keyword research skill that receives the full voice profile, creative kit, and email history will produce output subtly influenced by all of that — losing focus on search intent. The same skill receiving only the positioning angle, audience search behavior, and competitor domains stays laser-focused on its actual job.

### 3.3 Graceful Degradation

Every skill follows the same three-tier pattern:

**Tier 1: No brand directory.** Skill works standalone with zero prior context. Shows: "No brand profile found — this skill works standalone. I'll ask what I need as we go."

**Tier 2: Partial brand directory.** Some files exist, others don't. Skill loads what's available, proceeds with defaults for the rest. Shows one consolidated status line: "Brand profile is partial (loaded voice-profile.md; positioning and audience not yet created)."

**Tier 3: Full brand directory.** All relevant files present. Skill shows what it loaded, confirms it's current, and uses it throughout.

No skill ever errors on missing brand files. The system degrades gracefully from full personalization to general defaults without the user doing anything.

---

## 4. The Orchestrator (start-here)

### 4.1 Two Operating Modes

**First-run mode** (no `./brand/` directory):
1. Ask exactly 2 questions: "What does your business do?" + goal picker (BUILD AUDIENCE / LAUNCH PRODUCT / GROW REVENUE / CREATE CONTENT SYSTEM)
2. Dispatch /brand-voice and /positioning-angles as parallel task agents
3. Present foundation report
4. Route to the goal-appropriate next skill

**Returning mode** (brand directory exists):
1. Scan complete project state (brand files, campaigns, tools, learnings)
2. Identify gaps using priority ordering
3. Route to requested skill OR suggest highest-impact next action

### 4.2 Workflow Detection and Confirmation

The orchestrator recognizes 7 pre-built workflows triggered by natural language:

| Workflow | Trigger | Steps |
|----------|---------|-------|
| Starting from Zero | First run / "help me set up" | /brand-voice + /positioning-angles (parallel) → goal routing |
| I Have an Idea | "launch this" / "new product" | /positioning-angles → /direct-response-copy → /lead-magnet |
| I Need Leads | "build my list" / "lead magnet funnel" | /lead-magnet → /direct-response-copy → /email-sequences → /content-atomizer |
| Content Strategy | "content plan" / "what should I write about" | /keyword-research → /seo-content → /content-atomizer → /newsletter |
| Launching Something | "product launch" / "launch campaign" | /positioning-angles → /direct-response-copy → /email-sequences → /content-atomizer → /creative |
| Start Newsletter | "newsletter" / "weekly email" | /newsletter (standalone or with /brand-voice first) |
| Creative Campaign | "visual campaign" / "brand shoot" | /creative (with brand kit setup if needed) |

**Workflow Confirmation Protocol:** For any workflow with 3+ steps, the orchestrator shows the full plan with time estimates and lets the user choose: run all, start with just step 1, or skip to a specific step. No auto-enrollment in multi-step chains.

### 4.3 Ten Anti-Patterns

Hard rules the orchestrator never violates:

1. **Never ask more than 2 questions before doing work.** Two qualifying questions, then start building.
2. **Never present the skill list as a menu.** The orchestrator decides — the user confirms or redirects.
3. **Never dump all context into every skill.** Follow the Context Matrix.
4. **Never run skills sequentially when they can run in parallel.** Independent foundation skills dispatch simultaneously.
5. **Never skip the project scan on returning visits.** Every session starts with state awareness.
6. **Never rebuild what already exists without asking.** Show existing, offer targeted update.
7. **Never give generic recommendations.** Every suggestion references a concrete skill with time estimate.
8. **Never forget to update assets.md.** Every asset-creating skill appends to the registry.
9. **Never confuse a workflow with a single skill.** "Build me a funnel" means the full chain, not just step 1.
10. **Never silently produce generic output.** When foundation is missing, offer the choice: quick foundation first, or proceed with defaults.

---

## 5. UX Design Principles

### 5.1 Standalone-First

Every skill is designed to be invoked directly without any prior context. A user who types `/email-sequences` and has never used the system before gets a working email sequence. Brand memory enhances output — it doesn't gate it.

This was validated through a comprehensive UX audit that scored all 11 skills on standalone readiness (overall grade: A-).

### 5.2 Progressive Enhancement, Not Progressive Gating

```
Level 0: Zero context      → "What are you selling?" → Solid output
Level 1: Voice profile      → Output matches brand tone
Level 2: + Positioning      → Output uses proven angle
Level 3: + Audience data    → Output targets specific pain points
Level 4: + Learnings        → Output avoids past mistakes
Level 5: + Full brand kit   → Fully personalized, consistent output
```

Each level adds quality. No level is required.

### 5.3 Quick Mode

When a user makes a specific, single-asset request ("write me a LinkedIn post about X"), the system skips ceremony:
- No project status scan
- No workflow proposal
- No gap analysis
- Direct to output with a brief WHAT'S NEXT section

Triggered only for specific deliverables with clear parameters. Exploratory requests get the full experience.

### 5.4 Opportunity Framing, Not Guilt

Gap analysis uses opportunity language ("A voice profile would make every output sound like you — want to create one?") instead of guilt language ("Everything will be generic without it"). The user's decision to skip foundation is respected, not judged.

### 5.5 Visual Design System

All output follows a terminal-native design system defined in `_system/output-format.md`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  DELIVERABLE NAME IN CAPS
  Generated Feb 17, 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [Content with 2-space indent, 55-char line width]

  FILES SAVED

  ./brand/voice-profile.md       ✓
  ./campaigns/q1/brief.md        ✓ (new)

  WHAT'S NEXT

  → /positioning-angles   Find your competitive angle (~10 min)
  → /lead-magnet          Build a list-growing asset (~15 min)

  Or tell me what you're working on and I'll route you.
```

**Character palette:** Heavy dividers (━), light dividers (─), box drawing (┌│└─┐), tree view (├──└──), status (✓✗◑○★), numbered options (①②③), action arrows (→). No markdown formatting, no emoji, no tables for single-column data.

---

## 6. Domain Depth — What Makes This More Than Prompts

### 6.1 Direct Response Copy (1,238 + 1,636 lines)

The crown jewel. Embeds complete methodologies from Schwartz (5 awareness levels), Hopkins (scientific advertising), Ogilvy (specificity + borrowed credibility), Halbert (starving crowd + AIDA), Caples (tested headline methods), Sugarman (slippery slide + psychological triggers), and Collier (conversation entry principle).

**Operational sections (SKILL.md):** Headlines with 5 pattern types, 10+ opening techniques, curiosity gap mechanics, flow techniques (bucket brigades, stutter technique, paragraph variation), pain quantification with math approach, So What Chain (3 levels deep to emotional/financial impact), founder story arc, testimonial structure, disqualification/velvet rope, CTA patterns, AI-tell detection with specific word/phrase/structure/voice kills.

**Reference library (COPYWRITING_PLAYBOOK.md):** Extended examples for every technique, hall of fame headlines with analysis, modern internet-native examples from ShipFast/Superhuman/Contrarian Thinking, the complete 7-framework deep dive.

**Variant generation:** Every copy project generates 5-10 headline variants across different frameworks (Direct Benefit, Curiosity Gap, Social Proof, Contrarian, Story) with a QUICK PICK summary. Body copy gets 2-3 complete variants (Control, Contrarian, Proof-Led).

**7-dimension scoring rubric:** Clarity, Specificity, Voice, Desire, Proof, Urgency, Flow — each 1-10. Total /70. Thresholds: 63+ exceptional, 56+ strong, 49+ passing, below 42 full rewrite. Priority fixes identified per dimension.

### 6.2 SEO Content (1,746 lines)

Research-dependent skill with live SERP analysis. Before writing, it captures the top 5 results (title, URL, content type, word count, structure, unique angles, gaps), SERP features (Featured Snippet format to match, People Also Ask questions to answer, AI Overview to compete with).

**People Also Ask is mandatory:** Every PAA question captured in research MUST appear in the content — either as an H2 section or FAQ entry. This ensures complete query coverage and Featured Snippet optimization.

**Content Refresh Mode:** When content already exists for a keyword, the skill re-runs SERP analysis, compares against the original, and generates specific update recommendations (add sections, update stats, add new FAQ entries, update schema).

**Schema markup generation:** Article JSON-LD, FAQPage JSON-LD from PAA questions, HowTo JSON-LD for tutorials. Output as copy-paste-ready code blocks.

**Research Mode signal:** Transparently shows "Data quality: LIVE" or "Data quality: ESTIMATED" based on whether web search tools are available. All estimated claims are prefixed with ~.

### 6.3 Positioning Angles (767 lines)

Performs live competitive web searches before generating angles. Maps the competitive messaging landscape into three tiers: saturated claims (3+ competitors), contested territory (1-2 competitors), and white space (no competitor coverage).

**8 angle generators:** Contrarian, Unique Mechanism, Transformation, Enemy, Speed/Ease, Specificity, Social Proof, Risk Reversal. Each has trigger conditions and example structures.

**Market sophistication assessment** (Schwartz): Evaluates whether the market is Stage 1 (new) through Stage 5 (iconic) and selects appropriate angle types accordingly.

**Optional 12-ad matrix:** After angle selection, generates a 4x3 grid (4 hook variations x 3 ad formats) with tracking IDs, hook text, visual concepts, body copy, and CTAs for systematic testing.

### 6.4 Lead Magnet (1,142 lines)

Competitive research grounds concepts in market reality — searches for competitor lead magnets, identifies gaps in format and angle coverage.

**BUILD MODE:** Doesn't just suggest concepts — actually writes the complete lead magnet content. For checklists: 10-25 numbered items with actions, rationale, and tips. For templates: actual template with [BRACKETS], example fills, section guidance. For quizzes: 7-15 questions with scoring logic and 3-5 result profiles.

**3 validation principles:** Specificity (narrow beats broad), Bridge (must logically connect to paid offer), Quick Win (solve one specific problem completely).

### 6.5 Creative Engine (531 + ~12,000 lines in modes)

AI creative production engine using Replicate API. One entry point routes to 5 specialized modes.

**Smart model selection:** User describes what they want, engine picks the model. Images always use Nano Banana Pro. Standard video uses Kling 2.5. Hero/flagship content runs Kling 2.5 + Veo 3.1 + Sora 2 in parallel for comparison. Lip-sync uses Kling Lip-Sync.

**5-Direction Style Exploration:** For new creative projects, generates 5 genuinely different creative directions (safe expected, opposite, cross-industry, emotion-first, wild card). User picks or combines elements. Style principles are locked and applied at scale.

**Prompt-only fallback:** When no Replicate API token exists, the skill generates detailed, model-specific prompts formatted for Midjourney, DALL-E, Ideogram, Runway, etc. The creative direction and brand consistency are valuable independent of the API.

**Cost model:** Pay-per-use. Images ~$0.02-0.04 each. Standard video ~$0.40-0.80. Hero comparison (3 models parallel) ~$2-3.

---

## 7. JSON Schema Contracts

6 schemas enable downstream automation and inter-skill data passing:

| Schema | Written By | Consumed By | Purpose |
|--------|-----------|-------------|---------|
| voice-profile | /brand-voice | All content skills | Tone spectrum, vocabulary, personality traits, platform adaptations |
| campaign-brief | Any skill starting a campaign | /start-here, downstream skills | Campaign metadata, asset tracking, results |
| keyword-plan | /keyword-research | /seo-content, /start-here | Clusters with priority, volume, difficulty, intent |
| email-sequence-summary | /email-sequences | ESP automation | Sequence structure, subject line variants, send timing |
| ad-matrix | /positioning-angles, /creative | Ad platforms, /creative | 12-cell hook x format testing matrix with performance tracking |
| content-brief | /keyword-research | /seo-content | SERP analysis, recommended structure, target metrics |

All schemas use JSON Schema draft 2020-12 with required/optional field separation. They enable:
- Automated handoff between skills (keyword plan → content brief → SEO article)
- ESP integration (email sequence → Mailchimp/ConvertKit/HubSpot)
- Ad platform integration (ad matrix → Meta Ads / Google Ads)
- Performance tracking (results fields on campaign briefs and ad matrices)

---

## 8. Infrastructure and Quality

### 8.1 Installation

`install.sh` copies the skill suite to `~/.claude/skills/vibe-marketing/`. Supports `--claude-only` mode (excludes creative engine for users without Replicate). Preserves script execute permissions. Validates source before copying.

### 8.2 Health Checks

`doctor.sh` runs 29 checks across 7 groups: system files, schemas, scripts, 10 core skills, creative skill (conditional), 6 reference libraries, and API keys (optional). Exits 0 on all required checks passing.

### 8.3 End-to-End Testing

`e2e-fresh-install.sh` creates an isolated temp directory, runs the full install pipeline, validates with doctor, then checks a 36-file manifest and verifies no files are empty. 40 total test assertions. Supports testing from source or from a packaged zip file. Temp directory is auto-cleaned on success, preserved on failure for debugging.

### 8.4 Packaging

`package.sh` builds a timestamped distributable zip. Pre-flight validates all 41 manifest files exist in source. Excludes development artifacts (.DS_Store, .git, .env, CLAUDE.md, test outputs, development scripts). Post-build verifies all manifest files are present in the zip.

**Current package:** `vibe-skills-v2-20260217.zip` — 45 files, 417KB.

---

## 9. Design Decisions and Trade-offs

### 9.1 Depth Over Breadth

The system has 11 skills, not 50. Each one is substantive (average 1,392 lines). The direct-response-copy skill alone embeds more copywriting methodology than most courses. The trade-off: loading a skill consumes significant context window. Mitigation: the reference material extraction (COPYWRITING_PLAYBOOK.md) allows on-demand loading of deep-dive content.

### 9.2 Markdown Over Code

Skills are pure markdown, not code. Claude reads and follows the instructions. This means:
- **Pro:** No runtime dependencies, no build step, no versioning conflicts
- **Pro:** Skills are human-readable and editable by non-developers
- **Pro:** The same skill file works across Claude Code, Claude Desktop, and API
- **Con:** No programmatic enforcement of the Context Matrix — Claude must follow instructions
- **Con:** No automated testing of skill behavior (only structure/installation testing)

### 9.3 Selective Context Over Full Context

The Context Paradox principle (withhold irrelevant brand files) is a design bet that selective information produces better output than comprehensive information. This is counter-intuitive — more data should mean better results. But with LLMs, attention is finite. Irrelevant context competes with relevant context for model attention, producing output that's influenced by everything and optimized for nothing.

### 9.4 Standalone Over Dependent

Every skill works at zero context. This means each skill must contain enough methodology to produce useful output without brand memory. The trade-off: skills are larger than they would be if they could assume context exists. The benefit: no user is ever blocked, and the system works from the first invocation.

### 9.5 Terminal-Native Visual Design

The output format system uses Unicode box-drawing characters instead of markdown. This is unusual for AI output. The rationale: Claude Code runs in a terminal. Markdown renders inconsistently in terminals. The custom visual system renders perfectly in every terminal, creates a distinctive premium feel, and forces concise formatting (55-char line width).

---

## 10. What's Not Here (Known Gaps)

1. **No runtime analytics.** No tracking of which skills get invoked, where users drop off, or which features are used. Flying blind on actual usage patterns.

2. **No automated behavior testing.** The E2E test validates file structure and installation — not whether skills actually produce good output when invoked. Behavior testing would require running each skill and evaluating output quality.

3. **No versioned migration.** If brand file formats change between v2.0 and v2.1, there's no automated migration path. Skills detect legacy formats and offer upgrades, but it's manual.

4. **Two v2.1 skills are placeholders.** `/audience-research` and `/competitive-intel` are referenced in the Context Matrix but don't ship in v2.0. Their brand files (audience.md, competitors.md) can be manually created.

5. **Creative engine requires external API.** The Replicate dependency is the only external service requirement. Prompt-only fallback exists but produces prompts, not images/video.

6. **No multi-user support.** The brand memory system assumes a single brand per project directory. Agencies managing multiple brands would need separate project directories.

---

*This document provides a complete architectural reference for third-party analysis of the Vibe Marketing Skills v2.0 system. The source code is at `/Users/jmdickerson2/Code/the-vibe-marketer/skills-v2/`.*
