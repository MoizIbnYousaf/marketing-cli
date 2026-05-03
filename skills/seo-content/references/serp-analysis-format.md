# SERP Analysis Format

Use Exa MCP or firecrawl for live SERP research. Present findings in this format.

---

## SERP Analysis Output

```
──────────────────────────────────────────────

SERP ANALYSIS: "{target keyword}"

Top 5 results:
├── 1. {Title} -- {domain}
│      {content type}, ~{N} words, {date}
│      Angle: {their angle}
│      Gap: {what they miss}
│
├── 2. {Title} -- {domain}
│      {content type}, ~{N} words, {date}
│      Angle: {their angle}
│      Gap: {what they miss}
│
├── 3. {Title} -- {domain}
│      {content type}, ~{N} words, {date}
│      Angle: {their angle}
│      Gap: {what they miss}
│
├── 4. {Title} -- {domain}
│      {content type}, ~{N} words, {date}
│      Angle: {their angle}
│      Gap: {what they miss}
│
└── 5. {Title} -- {domain}
       {content type}, ~{N} words, {date}
       Angle: {their angle}
       Gap: {what they miss}

──────────────────────────────────────────────

SERP FEATURES

├── Featured Snippet    {format or "none"}
├── People Also Ask     {N} questions captured
└── AI Overview         {present/absent, summary}

──────────────────────────────────────────────

OPPORTUNITY ASSESSMENT

{1-3 sentence summary of the gap your content
will fill and why it can win}

──────────────────────────────────────────────
```

---

## People Also Ask Capture

Pull ALL PAA questions for the target keyword.

**How to capture:**
1. Search the target keyword
2. Record every PAA question shown
3. Click/expand each PAA to get second-level questions
4. Record those too
5. Search 2-3 keyword variations to find additional PAA questions

**How PAA shapes the content:**
- Each PAA question becomes an H2 or FAQ entry
- Answer PAA questions directly (Featured Snippet format)
- PAA phrasing is used in headers (matches how people search)
- Questions that deserve depth become full sections
- Questions that need brief answers go in the FAQ section

**PAA output:**

```
PEOPLE ALSO ASK

Full sections (answer as H2):
├── "{question 1}" -- high search signal
├── "{question 2}" -- aligns with content type
└── "{question 3}" -- competitive gap

FAQ entries (answer briefly):
├── "{question 4}"
├── "{question 5}"
├── "{question 6}"
└── "{question 7}"
```

---

## Gap Analysis

After reviewing competitors and PAA, identify:

1. **What is missing?** -- Questions unanswered, angles unexplored
2. **What is outdated?** -- Old information, deprecated methods
3. **What is generic?** -- Surface-level advice anyone could give
4. **What is your edge?** -- Unique data, experience, perspective (from positioning.md)

Your content should fill these gaps.

---

## Content Refresh SERP Comparison

When refreshing existing content, compare current SERP against the article:

```
CONTENT REFRESH ANALYSIS

Article: "{title}"
Published: {date}
Days since: {N}

SERP changes detected:

New competitors (not in original SERP):
├── {new URL 1} -- {what they cover that you do not}
└── {new URL 2} -- {what they cover that you do not}

New PAA questions:
├── "{new question 1}" -- not in your FAQ
└── "{new question 2}" -- not in your FAQ

Content gaps opened:
├── {topic/section competitors now cover}
├── {outdated stat or claim in your article}
└── {new angle that is gaining traction}

Recommended updates:
├── 1. Add section: "{new H2}"
│      Reason: {why}
│      Placement: after "{existing H2}"
├── 2. Update section: "{existing H2}"
│      Reason: {what changed}
│      Specific: {what to update}
├── 3. Add FAQ: "{new PAA question}"
│      Answer: {brief answer to add}
├── 4. Update stats: {specific claim}
│      Old: {old stat}
│      New: {updated stat}
└── 5. Update schema: add {N} new FAQ entries

Apply these updates? (y/n)
```
