# Brand Memory Protocol

> Shared infrastructure for Vibe Marketing Skills v2.
> Every skill references this file to understand how to read and write persistent brand context.

---

## Overview

Brand memory is the system that lets every marketing skill remember who the user is, what their brand sounds like, who they sell to, and what has worked before. It lives in a `./brand/` directory at the project root and accumulates over time as the user runs skills.

Skills reference this file with a line in their SKILL.md like:

```
Read ./brand/ per _system/brand-memory.md
```

That single line means: "Before I start my work, load the relevant brand context using the protocol defined here."

---

## The ./brand/ Directory

```
./brand/
  voice-profile.md        <- Written by /brand-voice
  positioning.md          <- Written by /positioning-angles
  audience.md             <- Written by /audience-research
  competitors.md          <- Written by /competitive-intel
  creative-kit.md         <- Written by /creative setup
  stack.md                <- Written by /start-here (tools, API keys, connected services)
  assets.md               <- Asset registry (updated by all skills)
  learnings.md            <- Performance learnings (accumulates over time)
  keyword-plan.md         <- Written by /keyword-research
```

### File Ownership

Each profile file has a **primary owner** -- the skill that creates and maintains it. Other skills may read any file but should never overwrite a file they do not own. The owner is noted above after the arrow.

### File Categories

**Profile files** (create-or-overwrite): `voice-profile.md`, `positioning.md`, `audience.md`, `competitors.md`, `creative-kit.md`, `stack.md`, `keyword-plan.md`
These represent the current state of a brand dimension. When the owning skill runs, it produces a new version of the file.

**Append-only files** (never overwrite): `assets.md`, `learnings.md`
These accumulate entries over time. Every skill may append to them. No skill should ever truncate or replace their contents.

---

## How Skills READ Brand Memory

### 1. Check for the directory

On every skill invocation, check whether `./brand/` exists.

- **If it exists**: proceed to step 2.
- **If it does not exist**: skip brand loading entirely. Do not error. Proceed with the skill as if this is a first-time user and note in your opening message: "I don't see a brand profile yet. You can run /start-here or /brand-voice first to set one up, or I'll work without it."

### 2. Load only what you need

Each skill declares which brand files it depends on. Do not read every file on every invocation. Examples:

| Skill | Reads |
|-------|-------|
| /brand-voice | positioning.md (if exists), audience.md (if exists) |
| /email-sequences | voice-profile.md, positioning.md, audience.md, creative-kit.md |
| /seo-content | voice-profile.md, keyword-plan.md, audience.md |
| /creative | voice-profile.md, positioning.md, creative-kit.md, stack.md |
| /competitive-intel | competitors.md (to update), positioning.md |
| /newsletter | voice-profile.md, audience.md, learnings.md |
| /lead-magnet | voice-profile.md, positioning.md, audience.md |
| /keyword-research | positioning.md, audience.md, competitors.md |
| /direct-response-copy | voice-profile.md, positioning.md, audience.md, creative-kit.md |
| /content-atomizer | voice-profile.md, creative-kit.md |
| /positioning-angles | audience.md, competitors.md |
| /start-here | ALL brand files, .env, ./campaigns/ (orchestrator needs full picture) |

### 3. Handle missing files gracefully

If a file your skill wants does not exist, do not error. Instead:

- Note what is missing internally. **Do not list each missing file individually** — if multiple files are absent, consolidate into a single status line: "Brand profile is partial (loaded voice-profile.md; positioning and audience not yet created)."
- Ask the user the questions that file would have answered, OR proceed with reasonable defaults.
- At the end, suggest one high-impact next step: "Running /brand-voice would give me your tone profile so I can match it next time."

### 4. Use loaded context visibly

When you load brand context, show the user you are using it. Do not silently absorb it. Examples:

- "I see your brand voice is conversational-but-sharp with a bias toward short sentences. Using that."
- "Your positioning is 'The Anti-Course Course' -- I'll build this email sequence around that angle."
- "I found 3 competitor profiles in your brand memory. I'll differentiate against them."
- "Your learnings file says long-form LinkedIn posts outperform short ones for your audience. Noted."

This builds trust and lets the user correct stale data.

### 5. Detect stale or conflicting data

If a file's content seems outdated or conflicts with what the user is saying in the current session:

- Flag it: "Your voice profile says you avoid humor, but the brief you just gave me is pretty playful. Want me to update the voice profile?"
- Do not silently override brand memory with session context. Always confirm.

---

## How Skills WRITE to Brand Memory

### Profile Files (create-or-overwrite)

These files represent the latest state of a brand dimension.

**Creating a new file:**
1. Generate the content through your skill's workflow.
2. Write the file to `./brand/{filename}.md`.
3. Confirm to the user: "Created your voice profile at ./brand/voice-profile.md."

**Overwriting an existing file:**
1. Read the existing file first.
2. Show the user what will change: "Your current positioning focuses on 'speed.' The new version shifts to 'simplicity.' Here's a diff of the key changes: ..."
3. Ask for confirmation: "Replace the existing file? (y/n)"
4. Only overwrite after explicit confirmation.
5. Confirm: "Updated your positioning. Changes: shifted primary angle from speed to simplicity, added 2 new proof points."

### Append-Only Files (assets.md, learnings.md)

**Never overwrite. Always append.**

1. Read the existing file to understand current entries.
2. Append your new entries at the bottom of the appropriate section.
3. Confirm: "Added 3 new assets to the registry."

If the file does not exist yet, create it with the standard template (see formats below) and then add your entries.

### Writing Conventions

- Always include a `## Last Updated` line at the top of profile files with the date and the skill that wrote it.
- Use consistent markdown formatting (see schemas in `_system/schemas/` for structured data).
- Keep files human-readable. A marketer should be able to open any brand file and understand it without running a skill.

---

## Campaign Directory Structure

Campaigns are distinct from brand memory. Brand memory is persistent context about the brand. Campaigns are time-bound projects that reference brand memory.

```
./campaigns/
  {campaign-name}/
    brief.md              <- Campaign goal, angle, audience segment
    emails/               <- Individual email files
      01-delivery.md
      02-quick-win.md
      03-value-story.md
      04-case-study.md
      05-soft-pitch.md
      06-hard-pitch.md
      ...
    social/               <- Platform-specific social content
      linkedin/
      twitter/
      instagram/
    ads/                  <- Ad creative briefs + image prompts
    landing-page.md       <- Landing page copy
    results.md            <- Performance data (manual or API-pulled)
```

### Campaign Naming

Use lowercase-kebab-case: `spring-launch-2026`, `webinar-funnel-q1`, `black-friday-flash`.

### Campaign Brief Format

Every campaign directory must have a `brief.md`. See `_system/schemas/campaign-brief.schema.json` for the structured schema. The markdown version should include:

```markdown
# Campaign: {Name}

## Goal
{What success looks like, with a number if possible}

## Angle
{The positioning angle being used -- reference ./brand/positioning.md}

## Audience Segment
{Who this targets -- reference ./brand/audience.md}

## Timeline
{Start date - End date}

## Channels
{Where this campaign will run}

## Status
{planning | active | complete}

## Voice Notes
{Any campaign-specific voice adjustments from ./brand/voice-profile.md}
```

### Cross-Referencing

Skills creating campaign assets should:
1. Create the asset in the campaign directory.
2. Append an entry to `./brand/assets.md` with the path.
3. Reference the campaign brief for context.

---

## Assets Registry Format

File: `./brand/assets.md`

```markdown
# Asset Registry

> Auto-maintained by Vibe Marketing Skills. Do not manually reorder.
> New entries are appended at the bottom of the Active Assets table.

## Active Assets

| Asset | Type | Created | Campaign | Status | Notes |
|-------|------|---------|----------|--------|-------|
| welcome-sequence | Email (6-part) | 2026-01-15 | spring-launch | live | 42% open rate |
| hero-banner-v2 | Image | 2026-01-18 | spring-launch | live | 1200x630, dark variant |
| linkedin-carousel | Social | 2026-01-20 | — | draft | 8 slides, needs review |

## Retired Assets

| Asset | Type | Retired | Reason |
|-------|------|---------|--------|
```

### Appending Rules

- New rows go at the bottom of the **Active Assets** table.
- Set Status to `draft` on creation. The user updates to `live` or `retired`.
- When an asset moves to retired, the skill (or user) moves the row to the Retired Assets table with a reason.

---

## Learnings Journal Format

File: `./brand/learnings.md`

```markdown
# Learnings Journal

> Auto-maintained by Vibe Marketing Skills. Newest entries at the bottom of each section.
> Skills append here after deliverable feedback. Never delete entries.

## What Works
- [2026-01-15] [/email-sequences] Subject lines with numbers outperform questions (62% vs 41% open rate)
- [2026-01-22] [/seo-content] Long-form guides (2500+ words) rank faster than listicles for this niche

## What Doesn't Work
- [2026-01-15] [/email-sequences] Emoji in subject lines decreased open rate by 8%
- [2026-01-20] [/creative] Stock photography feels off-brand; AI-generated with brand colors works better

## Audience Insights
- [2026-01-18] [/brand-voice] Audience responds to directness over polish -- "just tell me what to do" energy
- [2026-01-25] [/newsletter] Tuesday 7am sends outperform Thursday 10am by 23%
```

### Appending Rules

- Always include the date in `[YYYY-MM-DD]` format.
- Always include the skill name in `[/skill-name]` format.
- Write findings as specific, actionable observations. Not "emails worked well" but "subject lines under 40 characters had 15% higher open rates."
- Append to the correct section. If unsure, use **Audience Insights** as the default.

---

## Self-Reported Feedback Collection

After any major deliverable (email sequence, landing page, ad set, content piece), skills should collect feedback. This is how the system learns.

### The Feedback Prompt

Present this after delivering the final output:

```
How did this perform?

a) Great -- shipped as-is
b) Good -- made minor edits
c) Rewrote significantly
d) Haven't used yet

(You can answer later -- just run this skill again and tell me.)
```

### Processing Feedback

**If (a) "Great":**
- Log to learnings.md under "What Works" with specifics about what was delivered.
- Example entry: `- [2026-02-01] [/email-sequences] 6-part welcome sequence shipped as-is. Angle: social proof heavy. Tone: conversational.`

**If (b) "Good -- minor edits":**
- Ask: "What did you change? Even small details help me improve."
- Log the change to learnings.md. If it reveals a voice/tone issue, suggest updating voice-profile.md.
- Example entry: `- [2026-02-01] [/email-sequences] User softened CTA language in emails 4-6. Note: default CTAs may be too aggressive for this audience.`

**If (c) "Rewrote significantly":**
- Ask: "Can you share what you changed or paste the final version? I'll learn from the diff."
- If they share it, analyze the differences and log specific findings.
- If the rewrite reveals a pattern (e.g., voice is consistently wrong), suggest re-running /brand-voice.
- Example entry: `- [2026-02-01] [/email-sequences] User rewrote sequence -- shifted from educational to story-driven. Voice profile may need update.`

**If (d) "Haven't used yet":**
- Note it. Do not log anything to learnings.md yet.
- Optionally remind them next time the skill runs: "Last time I created a welcome sequence for you. Did you ever ship it? I'd love to know how it went."

---

## Stack File Format

File: `./brand/stack.md`

```markdown
# Marketing Stack

> Written by /start-here. Updated when new tools are connected.

## Connected Tools

| Tool | Type | Status | Config |
|------|------|--------|--------|
| Replicate | Image/Video API | connected | API key in .env |
| Mailchimp | Email ESP | connected | API key in .env |
| Vercel | Hosting | connected | Project linked |
| PostHog | Analytics | connected | API key in .env |

## MCP Servers

| Server | Tools Available | Status |
|--------|----------------|--------|
| playwright | Browser automation, screenshots | running |
| firecrawl | Web scraping, competitor research | running |

## Not Connected (Recommended)

| Tool | Why | Setup |
|------|-----|-------|
| ConvertKit | Better creator-focused email than Mailchimp | Run /start-here to configure |
```

### Tool Detection Chain

Every skill that can use external tools must follow this resolution order:

1. **Check for MCP server**: Query available MCP tools. If a relevant server is running (e.g., Playwright for screenshots, Firecrawl for scraping), use MCP tools directly.
2. **No MCP? Check for API key**: Look in `.env` for the relevant API key (e.g., `REPLICATE_API_TOKEN`, `MAILCHIMP_API_KEY`). If found, make direct API calls.
3. **No API key? Output compatible files**: Generate output in a format the user can manually import into their tool. For example, export email HTML that can be pasted into any ESP.
4. **Don't know their tools? Ask and guide**: If a skill needs a tool category (e.g., "email sending") and nothing is configured, ask: "What email tool do you use? I can output in a format that works with it, or help you connect it for next time."

After resolving a tool, update `./brand/stack.md` if it is not already listed.

---

## Research Quality Signal

Skills that depend on external data (competitor analysis, SERP research, keyword volumes, trending topics, news) MUST declare their research mode at the start of output. The user should always know whether they are getting live data or conceptual analysis.

### When to Show the Research Signal

Any skill that performs research as part of its workflow. The primary research-dependent skills are:

- `/keyword-research` — SERP analysis, keyword volumes, competitor rankings
- `/seo-content` — SERP gap analysis, People Also Ask, competitor content
- `/positioning-angles` — competitive landscape, market positioning
- `/newsletter` — trending topics, curated links, news briefing
- `/competitive-intel` — competitor teardowns (v2.1)
- `/audience-research` — community mining, buyer profiles (v2.1)

### Research Mode Display

Show this block after the header, before content begins:

**When web search or MCP tools are available:**
```
  RESEARCH MODE
  ├── Web search      ✓ connected
  ├── Sources accessed:
  │   ├── google.com/search?q=...
  │   ├── ahrefs.com/...
  │   └── [3 more sources]
  └── Data quality: LIVE
```

**When NO research tools are available:**
```
  RESEARCH MODE
  ├── Web search      ✗ not available
  ├── Data quality: ESTIMATED
  │   Using conceptual analysis based on brand
  │   context and training data. Results are
  │   directional, not verified.
  └── To upgrade:
      → Connect a web search MCP server
        (firecrawl, playwright, or web-search)
      → Or ask me to proceed — I'll flag
        estimates clearly in the output.
```

### Rules

1. Always show the research signal. Never silently fall back to conceptual data.
2. When using conceptual data, flag specific claims that would benefit from verification: "Estimated: competitor X likely ranks for this term (verify with live SERP check)."
3. Ask the user before proceeding with estimated data: "I don't have web search connected. I can give you a conceptual analysis based on what I know, but live data would be more accurate. Want me to proceed, or set up web search first?"
4. If the user proceeds with estimated data, prefix research-dependent sections with `~` to indicate estimates: `~2,400 monthly searches` vs `2,400 monthly searches`.

---

## Voice Injection Protocol

When `./brand/voice-profile.md` exists and is loaded, the skill output should **demonstrate** the brand's voice, not just acknowledge it.

### What This Means

**Wrong — acknowledging voice:**
```
  I see your brand voice is confident and direct.
  Here are your positioning angles:
  [generic-sounding output]
```

**Right — demonstrating voice:**
```
  Loading your voice profile... confident,
  direct, zero fluff.

  [output written IN that voice — short sentences,
  specific numbers, no hedging, brand vocabulary]
```

### Rules

1. If the voice profile says "short sentences," use short sentences in the output itself.
2. If the brand avoids certain words, do not use those words anywhere in the output.
3. The opening acknowledgment line should use the brand's own vocabulary and pacing.
4. This applies to ALL content sections, not just copy deliverables. Even analysis and recommendations should reflect the brand's tone.

---

## Schema References

Structured schemas for validation and interoperability live in `_system/schemas/`:

- `voice-profile.schema.json` -- Structure for voice profile data
- `campaign-brief.schema.json` -- Structure for campaign briefs
- `keyword-plan.schema.json` -- Structure for keyword clusters, priorities, and content roadmaps
- `email-sequence-summary.schema.json` -- Structure for email sequence metadata (type, timing, subject lines)
- `ad-matrix.schema.json` -- Structure for the 12-ad hook x format testing matrix
- `content-brief.schema.json` -- Structure for individual content briefs (keyword, SERP data, outline)

Skills may use these schemas to validate their output or to generate structured JSON alongside the human-readable markdown files.

---

## Principles

1. **Human-readable first.** Every file in `./brand/` should make sense to a marketer reading it in a text editor. Structured data (JSON) is secondary.

2. **Graceful degradation.** No skill should break because a brand file is missing. The system works on day one with zero context and gets better over time.

3. **Visible context use.** Always show the user what brand context you loaded and how it shaped your output. Never silently absorb context.

4. **Append, don't destroy.** Learnings and assets accumulate. Profile files are versioned by overwrite-with-confirmation. Nothing is ever silently deleted.

5. **Confirm before overwrite.** Any time a profile file already exists and would be replaced, show the diff and ask.

6. **Cross-skill coherence.** A brand voice written by /brand-voice should be honored by /email-sequences, /seo-content, /newsletter, and every other skill. The brand memory is the shared source of truth.

7. **Feedback loops close.** Every major deliverable ends with a feedback prompt. Feedback gets logged. Logged learnings get read by future skill runs. The system improves with use.
