# Brand Voice Profile

> **For mktg itself.** This is the project's own voice — terse, anti-corporate, builder-talk. Skills, READMEs, CHANGELOGs, command help text, and error messages all read this way. When `mktg` ships voice-aware copy (e.g., `/cmo` rendering output), it leans on this file unless overridden by a project-local `brand/voice-profile.md`.

## Voice DNA

- **Tone:** Direct and opinionated. Builder-to-builder, not vendor-to-customer. Confident without bragging.
- **Personality:** A senior engineer who has shipped a lot, knows the trade-offs, and tells you the real answer instead of the polite one.
- **Vocabulary:** Plain English. Domain words (skill, agent, brand memory, --json, exit code) are fine. Marketing jargon is not. "Agent-native" is the only term of art the brand owns.
- **Reading level:** Conversational. Short sentences. One idea per line. Someone half-tired at 11pm should still get it.

## Do / Don't

| Do | Don't |
|----|-------|
| Lead with the verb. "Run X. It returns Y." | Open with throat-clearing ("In today's fast-paced world…"). |
| Name the trade-off explicitly. "This is fast but not portable." | Promise everything. "Seamlessly scales to any workload." |
| Use specific numbers. "50 skills, 5 agents, 2,599 tests." | Use weasel adjectives. "Comprehensive, robust, best-in-class." |
| Show exit codes, JSON, file paths. | Vague claims ("works great"). |
| Acknowledge limits. "Not a chat UI. Not a hosted service." | Pretend the product does things it doesn't. |
| Talk like a person. Contractions. Em dashes. | Talk like a brochure. Buzzword-stacked sentences. |

### Words to avoid

`seamlessly`, `elevate`, `leverage`, `synergy`, `cutting-edge`, `next-generation`, `revolutionary`, `empower`, `delight`, `supercharge`, `harness`, `unlock`, `transform`, `world-class`, `best-in-class`, `comprehensive`, `robust`, `crucial`, `delve`, `in today's fast-paced world`, `at the end of the day`, `look no further`, `take it to the next level`.

## Examples

- **Good — README hook:**
  > "Install one CLI. Your agent gets 50 marketing skills, 5 research/review agents, and persistent brand memory."
- **Bad — same idea, AI-slop voice:**
  > "Unlock the full potential of your AI workflows with our cutting-edge marketing platform that seamlessly empowers agents to deliver world-class results."

- **Good — error message:**
  > "POSTIZ_API_KEY is not set. Set it in your shell or run `mktg doctor --fix` for guided setup."
- **Bad — same error, wrong voice:**
  > "It looks like there might be an issue with your configuration. Please ensure that the appropriate credentials are properly configured to enable the seamless operation of this feature."

- **Good — CHANGELOG entry:**
  > "Native publish queue for X, TikTok, Instagram, Reddit, LinkedIn. Local agent-first state under `.mktg/native-publish/`. Replaces the old in-memory adapter."
- **Bad:**
  > "We're thrilled to introduce a transformative new publishing experience that revolutionizes how creators connect with audiences across all major social platforms."

## Voice across surfaces

| Surface | What it sounds like |
|---|---|
| README hook | One line. The promise + a hard number. |
| CHANGELOG entries | Past tense, action-first. "Added X. Fixed Y. Removed Z." |
| Command `--help` | Imperative + concrete. "Run a marketing skill. Returns CommandResult JSON." |
| Error messages | What broke + what to do next. Never blame the user. |
| Skill descriptions | Plain-language, agent-native trigger phrases. "Use this skill when the user mentions X." |
| `/cmo` orchestration | Suggest a path, name the trade-off, ask one good question if the path is unclear. |

## When in doubt

Read it out loud. If a human would feel weird saying it to another human in a coffee chat, rewrite it.
