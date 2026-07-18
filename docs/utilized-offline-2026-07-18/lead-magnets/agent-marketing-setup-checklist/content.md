# Agent Marketing Setup Checklist (30 minutes)

Get your coding agent from "blank chat" to a marketing playbook with brand memory — without boiling the ocean.

**Who this is for:** Solo founders and agent builders on Claude Code, Cursor, or Codex.  
**Time:** ~30 minutes.  
**Outcome:** CLI installed, brand scaffolding started, one skill run end-to-end, learnings logged.

---

## Before you start (2 min)

- [ ] You have Node/npm available (or Bun if you already use it for other work)
- [ ] You know which agent runtime you use day-to-day (Claude Code / Cursor / Codex)
- [ ] You can create files in a real project repo (not a throwaway scratchpad)

**Success looks like:** `mktg` responds, `brand/` exists, and you have at least one real deliverable under `marketing/`.

---

## Block 1 — Install the playbook (5 min)

- [ ] Install the CLI globally:
  ```bash
  npm i -g marketing-cli
  ```
- [ ] Confirm the binary:
  ```bash
  mktg --help
  ```
- [ ] From your product repo, initialize skills, agents, and brand scaffolding:
  ```bash
  mktg init
  ```
- [ ] Run a health check (JSON is the agent contract):
  ```bash
  mktg doctor --json
  ```
- [ ] Skim doctor output for missing ecosystem tools — install only what you need this week (ffmpeg, gh, etc. can wait)

**Quick win:** If `mktg list --json` (or skill list) shows a full catalog, install worked. Do not customize skills yet.

---

## Block 2 — Write the minimum brand memory (10 min)

Skills work at zero context. Brand memory makes them sharper — never a gate. Still: ten minutes of truth beats ten hours of polish later.

### voice-profile.md (4 min)

- [ ] Personality: 3 bullets max (direct? playful? formal?)
- [ ] Vocabulary prefer / avoid lists (write words you never want in copy)
- [ ] Paste 2 example lines you would actually ship

### positioning.md (4 min)

- [ ] One-liner (who + what + proof)
- [ ] Category in plain language
- [ ] Anti-positioning: 3 things you are **not**
- [ ] Concrete differentiators: 3 falsifiable bullets (counts, commands, files — not adjectives)

### audience.md (2 min)

- [ ] Primary ICP in one sentence
- [ ] Top job-to-be-done in their words
- [ ] Where they hang out (2 watering holes)

**Skip for minute 30:** creative kit colors, full competitor matrix, keyword difficulty scores. Come back after first skill run.

---

## Block 3 — Prove the loop with one skill (10 min)

Pick **one** offline skill. Finish the files. Do not start three.

| If you need… | Run… | Expect files under… |
|---|---|---|
| A launch plan | `/launch-strategy` | `marketing/launch/` |
| An SEO article | `/seo-content` | `marketing/content/` |
| A checklist magnet | `/lead-magnet` | `marketing/lead-magnets/` |
| Brand health | `/document-review` | `marketing/document-review/` |

Checklist:

- [ ] Tell your agent the skill name and the output paths you want
- [ ] Require `--dry-run` mindset for any mutating CLI calls before the real write
- [ ] Open the written markdown — reject stubs (headings with no paragraphs)
- [ ] Fix voice only where it violates your avoid-list
- [ ] Optional human view: `mktg studio` if you want a dashboard on the same install

**Quick win criteria:** A stranger could follow the doc without asking you what the product is.

---

## Block 4 — Lock compounding (3 min)

- [ ] Append one row to `brand/learnings.md`: what the agent got wrong + what you will change in brand files
- [ ] Append any shipped asset path to `brand/assets.md` (date, type, path, skill)
- [ ] Commit `brand/` + `marketing/` together so memory and output travel as a pair
- [ ] Star or bookmark the repo you installed from so updates are findable: `MoizIbnYousaf/marketing-cli`

---

## 30-minute scoreboard

| Check | Pass? |
|---|---|
| `mktg` installed and `doctor` ran | ☐ |
| voice + positioning + audience have real sentences | ☐ |
| One full deliverable in `marketing/` | ☐ |
| One learning logged | ☐ |
| Commit (or patch) saved | ☐ |

**4–5 boxes:** you have an agent marketing setup.  
**0–2 boxes:** stop adding tools; finish Block 2 before any more skills.

---

## Common failure modes (and fixes)

| Failure | Why it hurts | Fix |
|---|---|---|
| Brand files still templates | Skills stay generic; some prereqs look "blocked" | Write ugly truthful drafts today |
| Five skills started, none finished | No proof, no learning | One skill to done |
| Editing brand files mid-skill randomly | Inconsistent voice across artifacts | Finish skill, then update brand, then re-run |
| Hype vocabulary slips in | Trust drops with builder audiences | Enforce avoid-list before publish |
| Skipping doctor | Missing CLIs surprise you mid-campaign | `mktg doctor --json` after every update |

---

## Next 30 minutes (later this week)

- [ ] Fill `competitors.md` with 3 named alternatives + where you win
- [ ] Draft `keyword-plan.md` primary terms (start with "agent marketing cli")
- [ ] Run `/document-review` and schedule owner skills for partial files
- [ ] Turn on a welcome email sequence for people who install or grab this checklist
- [ ] Practice one `/cmo` orchestration request instead of calling skills ad hoc

---

## Copy-paste starter brief for your agent

```text
Use mktg brand memory in brand/. Voice: direct, proof-first; avoid synergy/leverage/disrupt/10x/unlock growth/revolutionary.
Prefer: ship, compound, playbook, agent-native, dry-run, brand memory, orchestrate.
Run /document-review read-only on brand/, then run ONE skill to completion with real files under marketing/.
Do not modify brand/*.md unless I ask. Log learnings suggestions for me to paste.
```

---

Install one CLI. Your agent gets 64 skills, 6 research agents, and brand memory that compounds.

npm: `marketing-cli`  
GitHub: https://github.com/MoizIbnYousaf/marketing-cli
