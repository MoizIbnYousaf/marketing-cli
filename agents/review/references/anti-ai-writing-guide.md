# The Universal Anti-AI Writing Guide

AI writing has a smell. You can't always name it, but you know it when you read it. A paragraph that's perfectly grammatical, hits all the right points, says absolutely nothing a human would say that way. It's the uncanny valley of prose: technically correct, emotionally vacant, structurally identical to everything else the model has ever produced.

This guide is the pattern library underneath that smell. Every rule here is voice-agnostic. It applies whether you're writing technical blog posts, marketing copy, essays, emails, or fiction. Your voice is your own. These are the tells that give away the machine regardless of voice.

The diagnostic question that catches everything: **does this sound like a person thinking out loud, or a machine summarizing?**

Everything below is a specific pattern underneath that question.

---

## 1. Sentence architecture

AI writes in medium. Medium-length sentences, medium complexity, medium variation. The result is a drone: 15-25 words per sentence, paragraph after paragraph, with no rhythm.

Human writing is bimodal. Short punchy anchors ("That's it." "This broke." "Four words.") sitting next to long compound sentences that walk through reasoning across 40 or 50 words. The contrast is the rhythm. AI doesn't produce contrast because contrast requires intent.

**The tells:**
- Uniform sentence length across a paragraph (count the words, they'll cluster around 18-22)
- Three long sentences in a row with no short anchor to break them
- Every paragraph roughly the same length (4-5 sentences, each medium)
- No single-sentence paragraphs anywhere in the piece

**The fixes:**
- After two long sentences, drop a short one. "That's the trap." "It doesn't."
- Use single-sentence paragraphs to punctuate key moments
- Vary paragraph length: some 1 sentence, some 6
- End sections with a short sentence that closes the door

---

## 2. Sentence openers

AI front-loads. It buries the verb behind hedges, qualifiers, and setup clauses. "In an increasingly complex environment, the challenge of managing..." A human says "Managing is hard." The verb arrives on word two.

**The tells:**
- Sentences that start with "In the..." / "With the..." / "As the..." / "Given the..."
- The subject doesn't appear until word 8 or later
- Participial openers: "Leveraging the power of..." / "Building on this foundation..."
- "It is [adjective] to note that..." (the subject is buried behind an impersonal construction)

**The fixes:**
- Subject acts first. "UTF-7 is dead." "This broke in production." "I ran the experiment."
- State the point, then elaborate. Never build toward a conclusion the reader has to wait for
- Reserve front-loaded qualifiers only for concessions: "Unlike five years ago, progress is now limited by..."
- If the verb doesn't arrive in the first 6 words, rewrite

---

## 3. The "not X, but Y" construction

This is AI's single favorite rhetorical move. It appears in virtually every piece of AI-generated long-form content. The pattern scaffolds contrast through negation before stating the actual point.

**The tells:**
- "It's not just X, it's Y"
- "Not X, but Y"
- "It's not about X, it's about Y"
- "Not because X, but because Y"
- "The problem isn't X. It's Y."
- "This isn't X. It's Y."
- Consecutive negative parallelisms (two or more of these in a row)

**Why AI does this:** The model learned that contrast creates emphasis. The "not X" creates a straw man that the "but Y" can knock down. It's a rhetorical move that works once. AI uses it six times per article.

**The fixes:**
- State Y directly. If Y is strong enough, it doesn't need X as a setup
- "Y, not X" (reverse the order, much more natural)
- Delete the negative half entirely and just say what you mean
- One per piece maximum, and only when the contrast genuinely surprises

---

## 4. Em dash overuse

LLMs use em dashes at roughly 3-5x the rate of human writers. It's the single most statistically reliable tell at the character level. The em dash becomes a crutch for loose thinking: instead of choosing the right punctuation (colon, comma, parenthetical, period), the model reaches for the em dash because it can connect almost anything to almost anything.

**The fixes:**
- Colon: when hinging a claim onto its evidence ("The risk is clear: fixation.")
- Comma: for light subordination
- Parenthetical: for an aside or thinking-out-loud moment ("(More accurately, the switch events.)")
- Period and new sentence: when the ideas are actually separate
- Recast the sentence entirely so no connector is needed

---

## 5. The vocabulary fingerprint

Certain words appear in AI output at rates so disproportionate to human writing that they function as signatures. The word "delve" is the most famous, but there are dozens.

**Tier 1 (almost always AI):**
- delve, delved, delving
- tapestry (metaphorical)
- leverage (as verb), utilize, harness, unlock, unleash, empower
- navigate (the complexities / the landscape)
- foster (community, innovation, growth)
- underscore, illuminate
- embark (on a journey)
- elevate, amplify, optimize
- reimagine, reimagined
- bespoke
- spearhead, revolutionize

**Tier 2 (AI when clustered, fine in isolation):**
- pivotal, crucial, vital, significant, noteworthy
- groundbreaking, cutting-edge, revolutionary, transformative
- robust (systems, frameworks, solutions)
- seamless (integration, experience)
- comprehensive, meticulous
- nuanced, multifaceted
- vibrant, intricate

**Tier 3 (unnecessary formality):**
- utilize -> use
- plethora / myriad -> many
- commence -> start
- facilitate -> help
- optimal -> best
- prior to -> before
- subsequently -> then
- whilst / amongst -> while / among
- endeavor -> try
- determine -> figure out
- remediate -> fix

**Filler words AI inserts:**
- "just" (as emphasis, not temporal: "It's just amazing" vs "I just arrived")
- "actually" (as emphasis, not contradictory: "It's actually quite good" vs "Actually, that's wrong")
- "really" (as intensifier with no information: "This is really important")

**The fix:** Plain verbs. "Use" not "utilize." "Try" not "endeavor." "Fix" not "remediate." If a word sounds like it belongs in a corporate deck, replace it with the word you'd use talking to a friend.

---

## 6. Stock openers and frames

AI reaches for the same opening frames because they appeared thousands of times in its training data. They're content-free: they say nothing specific about the topic and could precede literally any article.

**Kill on sight:**
- "In today's fast-paced world..."
- "In the ever-evolving landscape of [X]..."
- "In the realm of [X]..."
- "In a world where..." / "In an era where..."
- "With the rise of..."
- "As [trend] continues to..."
- "Let's dive in" / "Let's break it down" / "Let's delve into"
- "At its core, [X] is [Y]"
- "It is important/worth noting that [X]"
- "Join us as we..."
- "When it comes to [X]..."
- "The [adjective] world of [X]"
- "Now more than ever..."
- "Here's why" / "Here's why it matters"
- "Here's the thing:"

**The fix:** Start with a concrete fact, a specific number, a scene, a proper noun, or a claim someone could disagree with. The first sentence should be impossible to write without knowing the topic. If you could paste it in front of any article and it would still make sense, delete it.

---

## 7. Stock conclusions

AI conclusions recap. They summarize what was already said, add a vague forward-looking statement, and land on something no one could disagree with. This is the written equivalent of a meeting that could have been an email.

**Kill on sight:**
- "In conclusion..." / "In summary..." / "To summarize..."
- "One thing is clear..."
- "At the end of the day..."
- "The bottom line is..."
- "Moving forward..."
- "As we've seen..."
- Long final paragraphs that repeat the three main points
- "It cannot be overstated..."

**The fix:** End on your strongest point, not a summary of all points. The last sentence should close a door: short, punchy, forward-looking. "Timer on. Fly the rounds." Not "In conclusion, by implementing these three strategies, you can significantly improve your multi-agent workflow experience."

---

## 8. Exhausted metaphors

AI reaches for the same metaphors because they appeared most frequently in its training data paired with explanatory contexts. They're dead on arrival.

**Kill on sight:**
- "A tapestry of..."
- "A treasure trove of..."
- "A double-edged sword"
- "Tip of the iceberg"
- "Cornerstone of..."
- "Navigating uncharted waters"
- "Embark on a journey"
- "A beacon of hope/light"
- "Standing at a crossroads"
- "A catalyst for change"
- "Blueprint for success"
- "Symphony/mosaic/melting pot of..."
- "The landscape of..."
- "A deep dive into..."
- "Plays a vital role"
- "Serves as a testament to..."

**The fix:** Either describe the thing concretely (no metaphor needed) or find a metaphor from your own experience. Physical tools, childhood, cooking, sports you actually play, jobs you actually worked. The metaphor should make the reader think "I've never heard it described that way but that's exactly right."

---

## 9. Structural symmetry

AI produces symmetrical structures because symmetry is a low-risk default. Every section the same length. Every bullet starting with a bold word and colon. Every paragraph 4 sentences. The result reads like a template filled in three different ways.

**The tells:**
- Every bullet point starts with "**Bold label:** description"
- Sections are suspiciously equal in length (all 3 paragraphs, all roughly 100 words)
- Paragraph lengths cluster around the same word count
- Lists where every item has the same grammatical structure and similar length
- Headers that follow the same syntactic pattern ("The Power of X," "The Power of Y," "The Power of Z")

**The fixes:**
- Break symmetry deliberately. One section can be 2 paragraphs, the next 5
- Vary list item lengths (one item is 4 words, the next is 20)
- Interrupt a pattern with an aside, an example, a contradiction, or a single-sentence paragraph
- Headers don't need to match ("Scan design" next to "What this actually looks like" next to "The skill underneath the skill")

---

## 10. Formal transitions

Human writers connect ideas with "and," "but," "so," "though," "yet," and sometimes just a line break. AI connects ideas with academic transitions that signal the relationship between paragraphs as if the reader can't figure it out.

**The tells:**
- Paragraph openers: "Moreover," "Furthermore," "Additionally," "Consequently," "Indeed,"
- "It is worth noting that..."
- "Notably," "Significantly," "Essentially," "Ultimately,"
- "Not only...but also"
- "Whether...or"

**The fix:** Delete the transition word. Read the paragraph without it. If the connection is still clear (it almost always is), leave it deleted. If it genuinely needs a connector, use "and," "but," or "so."

---

## 11. Hedging out of politeness

AI hedges constantly because hedging was reinforced during safety training. The result is prose that refuses to commit to anything. Every claim comes with an escape hatch.

**The tells:**
- "It's important to note that..."
- "Generally speaking..."
- "It can be argued that..."
- "In most instances..." / "In many cases..."
- "To some extent..."
- "It's worth considering..."
- "One might say..."
- "Perhaps" and "maybe" used to soften claims rather than express genuine uncertainty

**The fix:** Assert the position. If you're uncertain, say "I don't know" as a flat fact and move on. Hedge only when you have specific data that warrants it ("At 60% accuracy, it's close enough to matter"). Never hedge out of social politeness.

---

## 12. False enthusiasm

AI was trained to be helpful. Helpful sounds enthusiastic. The result is a voice that performs excitement about everything equally, which reads as excitement about nothing.

**Kill on sight:**
- "Absolutely!" / "Certainly!" / "Definitely!"
- "Great question!"
- "I'd be happy to help with that!"
- "That's a fascinating/exciting/interesting topic!"
- "Wow, what a great idea!"
- Exclamation marks on statements that aren't exclamatory

**The fix:** Start with substance. If the thing is genuinely exciting, the content will show it. Performed enthusiasm is the written equivalent of a fake laugh.

---

## 13. Vague authority

AI invents authority because it can't cite specific sources from memory. The result is claims that sound researched but aren't.

**The tells:**
- "Studies show that [X]" (no study named)
- "Experts agree that [X]" (no expert named)
- "Research indicates [X]" (no research cited)
- "According to recent reports, [X]" (no report linked)
- "It's widely known that..."
- "As many have noted..."

**The fix:** Name the study, the expert, the report. Include the date and the specific finding. If you can't name it, either find the actual source or delete the claim. "The FAA Instrument Flying Handbook names three scan failure modes" is specific. "Studies show that scanning patterns matter" is not.

---

## 14. The "No X. No Y. Just Z" pattern

A three-beat structure where the first two beats negate and the third affirms. AI loves this because it's punchy and it works once. It stops working when every third paragraph does it.

**Examples:**
- "No meetings. No busywork. Just results."
- "No fluff. No filler. Just signal."
- "No guessing. No hoping. Just data."

**Also the staccato triad variant:**
- "Documents become templates. Macros scale intelligence. Knowledge propagates."
- "Faster iteration. Better outcomes. Real impact."

**The fix:** State the benefit directly without the negation scaffold. Expand at least one element into a full sentence. If you find yourself writing three parallel fragments in a row, you're in AI territory. Break the pattern.

---

## 15. Moralizing vs. stating consequences

AI moralizes. It tells you what you *should* do, what's *important*, what *matters*. Human writers state consequences and let the reader draw the moral.

**AI version:** "It's crucial that developers take the time to properly manage their context across agents. Failing to do so can lead to serious productivity losses."

**Human version:** "Skip this step and by 4pm you won't remember what any of your agents are doing."

**The fix:** Replace "should" with "if/then." Replace "it's important to" with what happens when you don't. State the consequence. The reader can figure out the moral.

---

## 16. Emotional flatness

AI distributes emotion evenly. Every paragraph has the same temperature. There's no build, no surprise, no moment where the writer's actual feelings break through the analysis. The result is prose that's warm everywhere and therefore warm nowhere.

**The fix:** Ration emotion. One genuinely warm sentence in a dry analytical section hits ten times harder than warmth spread evenly across every paragraph. One flat expression of frustration ("This error message is useless.") is more effective than three sentences explaining why you're frustrated.

The pattern: default to dry and analytical. When a moment of genuine feeling appears, it stands out because it's rare.

---

## 17. Smoothness as a tell

This is the meta-pattern that contains all the others. AI writing is smooth. Everything connects. Every transition flows. Every paragraph builds on the last. Nothing catches.

Human writing has friction. It changes direction. It includes an aside that doesn't quite fit. It states something bluntly where a smoother writer would qualify. It ends a section abruptly. It leaves a tension unresolved.

**The diagnostic:** Read your piece and ask: "If nothing catches, something is wrong." If every sentence flows perfectly into the next, if every paragraph is exactly the right length, if the whole thing reads like butter, it reads like AI.

**The fix:** Let friction remain. Don't smooth everything into a tidy package. Leave the rough edge where the reader can feel the writer thinking. The roughness is the proof that a human was here.

---

## The Revision Checklist

Run this against any piece before publishing:

- [ ] Does this sound like a person thinking out loud, or a machine summarizing?
- [ ] Is the writing too smooth? (If nothing catches, something is wrong.)
- [ ] Are there concrete specifics? Numbers, names, dates, data?
- [ ] Does the verb arrive fast, or is it buried behind qualifiers?
- [ ] Count the em dashes. How many are there? (The answer should make you uncomfortable.)
- [ ] Search for "not X, but Y" constructions. How many? (More than one is a pattern.)
- [ ] Does the ending summarize or close the door?
- [ ] Would you actually say this out loud to someone you respect?
- [ ] Is there at least one moment of genuine friction, surprise, or roughness?
- [ ] Search for the Tier 1 vocabulary list. Any hits?
- [ ] Are transitions doing work, or just signaling relationships the reader already sees?
- [ ] Does any sentence sound like it's trying to sound profound?
- [ ] Is emotion rationed or spread evenly?
- [ ] Could the opening paragraph be pasted in front of any article and still make sense?
