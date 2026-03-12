---
name: brand-voice
description: "Define or extract a consistent brand voice that other skills can use. Three modes: Extract (analyze existing content), Build (construct from scratch), or Auto-Scrape (provide a URL, skill does the research). Use when starting a project, when copy sounds generic, or when output needs to sound like a specific person/brand. Triggers on: what's my voice, analyze my brand, help me define my voice, make this sound like me, voice guide, brand personality, analyze my website."
category: foundation
tier: must-have
reads:
  - brand/positioning.md
  - brand/audience.md
writes:
  - brand/voice-profile.md
triggers:
  - what's my voice
  - analyze my brand
  - define my voice
  - make this sound like me
  - voice guide
  - brand personality
  - analyze my website
  - brand voice
---

# /brand-voice -- Brand Voice Engine

Generic copy converts worse than copy with a distinct voice. Not because the
words are different -- because the reader feels like they're hearing from a
PERSON, not a marketing team.

This skill defines that voice. Either by extracting it from existing content,
building it strategically from scratch, or auto-scraping a URL to analyze a
brand's public presence.

Read brand/ context per the brand memory protocol.

Follow the output formatting rules.

---

## Brand Memory

Brand memory: Follow brand memory protocol in /cmo skill.


## Three Modes

### Mode 1: Extract (analyze existing content)

User provides 3-5 pieces of existing content (blog posts, emails, social posts, about page, etc).

**The analysis process:**

1. **Read all provided content** -- look for patterns, not individual word choices
2. **Identify the voice DNA:**
   - Sentence structure (short/punchy vs. flowing/complex)
   - Vocabulary level (everyday vs. technical vs. academic)
   - Emotional register (warm/friendly vs. authoritative vs. irreverent)
   - Perspective (first-person storytelling vs. objective analysis)
   - Rhythm (varies sentence length? staccato? musical?)
3. **Map the personality axes** (see Voice DNA Framework below)
4. **Generate the voice profile**
5. **Write to ./brand/voice-profile.md**

### Mode 2: Build (construct from scratch)

No existing content. Build voice strategically through guided questions.

**The question sequence:**

1. "If your brand were a person at a dinner party, how would they talk?"
2. "Who is your audience? Technical builders, creative professionals, busy executives, everyday consumers, or a mix?"
3. "Name 2-3 brands whose tone you admire (not their product -- their VOICE)."
4. "What words should NEVER appear in your marketing? What feels off-brand?"
5. "Show me something you've written that felt 'right' -- even a Slack message or email."

### Mode 3: Auto-Scrape (URL analysis)

User provides a URL. Skill uses Exa MCP to research the brand's public presence.

1. Use Exa MCP to search for the brand's website content, social profiles, and public-facing copy
2. Analyze homepage, about page, social bios, recent posts
3. Extract voice patterns using the same DNA framework as Mode 1
4. Present findings and ask user to confirm/adjust
5. Generate voice profile

---

## Voice DNA Framework

Every voice maps across these axes:

### Personality Spectrum

Rate each 1-10 with brief justification:
- Formal / Casual
- Reserved / Expressive
- Serious / Playful
- Traditional / Progressive
- Complex / Simple
- Cautious / Bold

### Voice Markers

**Sentence patterns:** Average length, variation, structure (simple/compound/fragmented)

**Vocabulary:** Jargon level (none/light/technical), power words, forbidden words

**Perspective:** Person (I/we/you), distance (intimate/conversational/professional), authority (peer/mentor/expert/challenger)

### The Do/Don't Table

Minimum 5 rows, maximum 10. Specific voice behaviors and example phrases.

### Platform Adaptation Table

| Platform | Tone Shift | Length | Special Notes |
|----------|-----------|--------|--------------|
| LinkedIn | More professional, authority-forward | Medium | Lead with insight |
| Twitter/X | Punchier, more direct | Short | Fragment sentences OK |
| Instagram | Warmer, more visual language | Short-Medium | Casual, aspirational |
| Email | Most personal, conversational | Medium-Long | First-person storytelling |
| Blog/SEO | Most detailed, structured | Long | Can be more technical |
| TikTok | Most casual, spoken-word feel | Very short | Conversational, raw |
| Threads | Thoughtful, conversational | Short-Medium | Opinion-led |
| Bluesky | Nuanced, substantive | Short | Informed, not aggressive |

---

## Output Format

### Header

```
  BRAND VOICE PROFILE
  [Brand/Person Name]
  Generated [Month Day, Year]
```

### Content

1. **Voice Summary** (2-3 sentences capturing the essence)
2. **Personality Spectrum** (rated axes)
3. **Voice Markers** (sentence patterns, vocabulary, perspective)
4. **The Do/Don't Table**
5. **Platform Adaptation Table**
6. **Sample Copy** (3 examples: short social post, email opener, landing page headline)

### Files Saved

Write to `./brand/voice-profile.md`.

### What's Next

```
  -> /positioning-angles   Find your market angle
  -> /direct-response-copy Write copy in your voice
  -> /content-atomizer     Create social content
```

---

## File Output Protocol

Write ./brand/voice-profile.md with: last updated, voice summary, personality spectrum, voice markers, do/don't table, platform adaptations, sample copy.

**If ./brand/voice-profile.md already exists:** Read existing file, show what will change, ask for confirmation before overwriting.

---

## Feedback

Feedback: Append learnings to brand/learnings.md.


## Invocation

This skill activates when:
- User asks "what's my voice" or "analyze my brand"
- User says copy sounds "generic" or "off-brand"
- Another skill needs voice context but ./brand/voice-profile.md doesn't exist
- User provides a URL and asks to analyze the brand

## What This Skill Is NOT

- Does NOT write copy (that is /direct-response-copy)
- Does NOT define positioning (that is /positioning-angles)
- Does NOT research the audience (that is /audience-research)
- Does NOT create visual identity (that is /creative)
