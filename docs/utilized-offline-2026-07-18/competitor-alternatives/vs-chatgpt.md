# mktg vs ChatGPT (for marketing work)

Honest comparison for builders choosing how to run marketing with AI.

## Short answer
ChatGPT (and similar chat UIs) are excellent scratchpads. **mktg** is an installable playbook with persistent brand memory, versioned skills, and agent DX — designed to run inside coding agents like Claude Code / Cursor.

Use ChatGPT for exploration. Use mktg when you want marketing work to compound in-repo.

---

## Where ChatGPT wins

| Strength | Why it matters |
|----------|----------------|
| Zero install | Open browser, start typing |
| Broad general knowledge | Great for brainstorming unfamiliar topics |
| Multimodal / plugins ecosystem | Images, browsing variants depending on plan |
| Non-technical friendly | No CLI required |
| Fast one-off copy | "Rewrite this email" in 20 seconds |

If you need a single paragraph once and never again, ChatGPT is enough.

---

## Where mktg wins

| Strength | Why it matters |
|----------|----------------|
| Persistent `brand/` memory | Voice, audience, positioning survive the session |
| 64 versioned skills | Manifest-backed playbooks, not ephemeral prompts |
| `/cmo` orchestration | Routes work; parallel research agents write foundation files |
| Runs where you build | Skills install into coding-agent skill dirs |
| Dry-run + JSON + `--fields` | Agent-safe mutations and context discipline |
| Local Studio | Human review surface in the same npm package |
| Progressive enhancement | Works at L0; memory sharpens later — never gates |

---

## Side-by-side

| Dimension | ChatGPT | mktg |
|-----------|---------|------|
| Memory model | Chat / custom GPTs (vendor-side) | Repo files under `brand/` |
| Distribution of "skills" | Prompts you paste | `mktg init` / manifest install |
| Orchestration | You manually chain chats | `/cmo` routes |
| Testability | Informal | Agent DX axes in CI |
| Social scheduling | Plus third-party | Adapters/catalogs (BYO) |
| Price | Subscription to OpenAI | CLI free/OSS |

---

## Migration path
1. Export any useful GPT instructions into `brand/voice-profile.md` + positioning notes.  
2. `npm i -g marketing-cli && mktg init`  
3. Run `/cmo` foundation.  
4. Keep ChatGPT for wild-card brainstorms; run repeatable playbooks through mktg.

## Anti-hype
mktg does not "beat ChatGPT at everything." It beats **session amnesia** for marketing ops in agent-native workflows.
