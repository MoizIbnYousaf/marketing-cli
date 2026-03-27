---
name: cmo-brand-memory
description: |
  Brand memory protocol for reading and writing persistent brand context.
  How skills interact with the brand/ directory.
---

# Brand Memory Protocol

Brand memory lives in `./brand/` at the project root. It accumulates as skills run and persists across sessions.

## Directory Structure

```
./brand/
  voice-profile.md     ← Written by brand-voice
  positioning.md       ← Written by positioning-angles
  audience.md          ← Written by audience-research
  competitors.md       ← Written by competitive-intel
  landscape.md         ← Written by landscape-scan
  creative-kit.md      ← Written by creative (setup mode)
  stack.md             ← Written by mktg init
  keyword-plan.md      ← Written by keyword-research
  assets.md            ← Append-only (all skills)
  learnings.md         ← Append-only (all skills)
```

## File Ownership

Each file has a primary owner — the skill that creates and maintains it. Other skills may read any file but never overwrite a file they do not own.

**Profile files** (create-or-overwrite): voice-profile, positioning, audience, competitors, landscape, creative-kit, stack, keyword-plan.
**Append-only files** (never overwrite): assets.md, learnings.md.

## Reading Protocol

### 1. Check for the directory

On every skill invocation, check whether `./brand/` exists.

- **Exists**: Load relevant files (step 2).
- **Does not exist**: Skip brand loading. Do not error. Note: "No brand profile yet. Run /cmo or mktg init to set one up, or I'll work without it."

### 2. Load only what you need

Each skill declares which brand files it reads. Do not load everything.

| Skill | Reads |
|-------|-------|
| brand-voice | positioning.md, audience.md |
| positioning-angles | audience.md, competitors.md |
| direct-response-copy | voice-profile.md, positioning.md, audience.md, landscape.md |
| seo-content | voice-profile.md, keyword-plan.md, audience.md, landscape.md |
| email-sequences | voice-profile.md, positioning.md, audience.md, landscape.md |
| content-atomizer | voice-profile.md, creative-kit.md, landscape.md |
| keyword-research | positioning.md, audience.md, competitors.md |
| lead-magnet | voice-profile.md, positioning.md, audience.md |
| newsletter | voice-profile.md, audience.md, learnings.md |
| creative | voice-profile.md, positioning.md, creative-kit.md |

### 3. Handle missing files gracefully

If a file does not exist, do not error. Instead:

- Note what is missing internally.
- Consolidate into a single status line: "Brand profile partial (loaded voice-profile.md; positioning and audience not yet created)."
- Proceed with reasonable defaults or ask the user the questions that file would have answered.
- Suggest one high-impact next step: "Running brand-voice would give me your tone profile."

### 4. Show context use visibly

When loading brand context, show the user:

- "Using your brand voice: conversational-but-sharp, short sentences."
- "Your positioning is 'The Anti-Course Course' — building this around that angle."
- "Found 3 competitor profiles. Differentiating against them."

### 5. Detect stale data

If a file seems outdated or conflicts with what the user is saying:

- Flag it: "Your voice profile says you avoid humor, but your brief is playful. Update the voice profile?"
- Never silently override brand memory with session context. Always confirm.

## Writing Protocol

### Profile files (create-or-overwrite)

1. Generate content through the skill's workflow.
2. If file exists: read it first, show what will change, ask for confirmation.
3. Write to `./brand/{filename}.md`.
4. Include a `## Last Updated` line with date and skill name.
5. Confirm: "Created brand/voice-profile.md."

### Append-only files (assets.md, learnings.md)

1. Read existing file to understand current entries.
2. Append new entries at the bottom of the appropriate section.
3. Never overwrite or truncate.
4. Confirm: "Added 3 new entries to brand/assets.md."

## Respect the Claims Blacklist

`brand/landscape.md` contains a **Claims Blacklist** — a table of ecosystem claims that are factually wrong, outdated, or unverifiable. This is a hard gate:

1. Before any content skill makes a claim about the market, ecosystem, competitors, or industry trends, check the Claims Blacklist in `brand/landscape.md`.
2. If a claim appears in the blacklist, **DO NOT make it.** Use the "What To Say Instead" column for the approved alternative.
3. If `landscape.md` does not exist or is stale (>14 days), warn the user before making ecosystem claims: "I don't have a current ecosystem snapshot. Any market claims I make may be outdated. Run /landscape-scan to ground my output in current reality."
4. The blacklist is append-only within a landscape scan cycle. Skills never remove entries — only `/landscape-scan` refreshes the full file.

This prevents the most common marketing failure mode: confidently stating things about the market that are no longer true.

## Progressive Enhancement Levels

- **L0**: Zero context. Skill works by asking the user 3-5 key questions.
- **L1**: Voice profile only. Output matches brand tone.
- **L2**: Voice + positioning + audience. Output is targeted and differentiated.
- **L3**: Full brand + keyword plan + landscape — output strategic, data-informed, and grounded in current ecosystem reality.
- **L4**: Full brand + learnings + campaign history. Output compounds on past results.

Every skill must work at L0. Brand memory enhances output — it never gates it.

## Learnings Journal Format

```markdown
## What Works
- [YYYY-MM-DD] [/skill-name] Specific, actionable finding with numbers

## What Doesn't Work
- [YYYY-MM-DD] [/skill-name] Specific finding with numbers

## Audience Insights
- [YYYY-MM-DD] [/skill-name] Behavioral or preference insight
```

Always include date, skill name, and specific numbers. Not "emails worked well" but "subject lines under 40 chars had 15% higher open rates."

## Feedback Collection

After any major deliverable, collect feedback:

```
How did this perform?
a) Great — shipped as-is
b) Good — made minor edits
c) Rewrote significantly
d) Haven't used yet
```

Log (a) and (b) to learnings.md. For (c), ask what changed and log the diff. For (d), remind next session.
