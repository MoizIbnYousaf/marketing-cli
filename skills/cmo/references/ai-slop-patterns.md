# AI Slop Pattern Reference

Patterns that appear disproportionately in LLM-generated text vs human writing. /cmo applies this as a quality gate after ANY content skill produces output — social posts, landing pages, emails, SEO articles, ad copy, lead magnets. This list is not exhaustive; develop pattern recognition over time.

## Structural Patterns

| Pattern | Example | Frequency in LLM | Fix |
|---------|---------|------------------|-----|
| Em dash overuse | "skills — the core unit" | 5-10x human baseline | Semicolon, comma, or recast |
| Triple anaphora | "No X. No Y. No Z." | Very common in lists | Max once per batch; comma-join rest |
| Dramatic two-sentence | "X didn't exist. Now it does." | Classic LLM reveal | Combine or recast |
| "It's not X, it's Y" | "It's not a tool, it's infrastructure" | Top-5 LLM frame | Recast entirely |
| Colon-then-list | "Three things:\n- A\n- B\n- C" | Every LLM list starts this way | Vary: inline, narrative, or skip the setup |

## Transition/Filler Patterns

| Pattern | Example | Fix |
|---------|---------|-----|
| "Here's why" | "Here's why it matters:" | Delete; lead with the reason |
| "Here's the thing" | "Here's the thing about skills:" | Delete; state the thing |
| "Let me explain" | "Let me explain why this matters" | Just explain it |
| "Think about it" | "Think about it this way" | Delete; present the frame directly |
| "The reality is" | "The reality is most skills fail" | "Most skills fail" |
| "In other words" | "In other words, it's broken" | "It's broken" |

## Vocabulary Tells

| Word/Phrase | Why It's a Tell | Human Alternative |
|-------------|----------------|-------------------|
| "landscape" (non-geographic) | LLMs love "the competitive landscape" | "market", "space", or just name the competitors |
| "delve" | Statistically rare in human writing, common in LLM | "look at", "dig into", or just do it |
| "tapestry" | LLM metaphor filler | Delete the metaphor |
| "nuanced" | LLM hedge word | Be specific about what's complex |
| "multifaceted" | Same as nuanced | Name the facets |
| "it's worth noting" | LLM throat-clearing | Just note it |
| "at the end of the day" | Cliche LLMs lean on | Delete or state the conclusion |

## Batch-Level Patterns

These are only visible when reading all posts together:

| Pattern | Example | Fix |
|---------|---------|-----|
| Same opening structure | All posts start with "[Noun] [verb]." | Vary: question, fragment, number, quote, command |
| Same closing structure | All posts end with a one-line kicker | Vary: some end mid-thought, some with links |
| Uniform length | All posts ~200 chars | Mix: some 80 chars, some 280 |
| Identical rhythm | All use short-medium-short pattern | Some should be one long thought; some should be 3 words |
| Repeated anaphora | 4 out of 10 posts use "No X. No Y. No Z." | Max 1 per batch |

## How to Audit

1. Read all posts in sequence, not individually
2. Read them aloud (even mentally); AI text has a "flatness" when spoken
3. Check for any pattern appearing more than twice in the batch
4. Compare against the person's real published posts
5. If in doubt, it's probably AI; rewrite it
