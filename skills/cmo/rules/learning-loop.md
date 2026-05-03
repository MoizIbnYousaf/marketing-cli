> **Note:** Examples below use fictional brands (Acme, Lumi, Helm). Replace with your own brand context.

# Learning Loop — Compounding Across Sessions

/cmo has persistent memory via `brand/learnings.md` and `.mktg/plan.json`. Every session adds evidence; every next session starts smarter. This is the compounding engine — get it right and the tenth session is 10× better than the first.

**Core invariant:** every meaningful outcome (campaign landed, skill failed, copy flopped, strategy worked) gets logged. The log shapes future routing.

---

## On every RETURNING activation

Before asking the builder what they want:

```bash
mktg plan next --json
```

This returns the single highest-priority task from the persisted `.mktg/plan.json`. Surface it to the user:

> *"Based on where we left off: next priority is [task]. Reason: [reason]. Want to run it?"*

If the user wants something different, they'll say so — but proposing the planned next move makes session ramp-up instant.

Also run on returning activation:

```bash
mktg status --json --fields brand.populated,brand.stale,integrations
```

— to detect anything that drifted since last time (stale brand files, newly-unconfigured integrations).

And read the tail of learnings (don't load the full file — it grows):

```bash
# Last 10 entries via Read tool at brand/learnings.md (tail-equivalent)
```

The last 10 learnings inform what NOT to try again.

---

## After any meaningful action

Every successful campaign, every failed experiment, every strategic decision worth remembering writes to `brand/learnings.md`:

```bash
mktg brand append-learning --input '{
  "action": "Launched v2 to Hacker News via startup-launcher",
  "result": "Front page for 4 hours; 312 signups; 18 paid conversions",
  "learning": "Show HN timing — Tue 8am PT drove the Hacker News mods to promote. Title format with specific stat converted better than general framing.",
  "nextStep": "Re-run the format for the v3 launch; consider writing a followup retrospective blog post while momentum lasts"
}'
```

Required fields: `action`, `result`, `learning`, `nextStep`. Optional: `date` (auto-filled today if absent).

**What qualifies as worth logging:**
- Campaign results (wins AND losses)
- Surprising user behaviors (conversion patterns, cancellation triggers)
- Voice / positioning discoveries that contradict the brand profile
- Tool or skill failures that will recur ("postiz rate limit hit on Thursday launch; plan campaigns for M/T/F next time")
- Cross-skill insights ("atomized posts that led with a question outperformed hot-takes 3×")

**What does NOT belong in learnings:**
- Ephemeral debugging notes (use a scratch file)
- Credentials or PII (learnings is git-committed)
- Raw tool output (summarize the insight, not the logs)

---

## Plan persistence

`.mktg/plan.json` is CMO's task queue across sessions.

**Generate or refresh:**

```bash
mktg plan --save --json
```

This reads current project state (brand completeness, run history, dependency graph, landscape freshness, learnings) and writes the prioritized queue.

**Mark a task done** (critical — otherwise it stays in the queue forever):

```bash
mktg plan complete <task-id> --json
```

Do this immediately after a skill runs successfully. Not at end of session — immediately.

**What's in the queue:**
- `setup` tasks — brand file scaffolding (only at L0-L1).
- `populate` tasks — replace template content with real data.
- `refresh` tasks — update stale brand files.
- `execute` tasks — run must-have execution skills that haven't run yet.
- `distribute` tasks — ship pending campaigns.

Tasks have ordering (detection order, not priority-scored) and `blockedBy` relations — `/cmo` surfaces the highest-order unblocked task via `plan next`.

---

## Periodic self-audit — `/document-review`

`/cmo` proactively triggers `/document-review` on a cadence:

- **After a major campaign** (anything that touched 3+ brand files or produced multi-platform output).
- **Monthly**, if the user is a returning builder with a long session history.
- **Before any SEO Authority Build or Full Product Launch playbook** — confirm brand foundation is solid before compounding work on top of it.

The skill audits `brand/*.md` for:
- Completeness (all required sections per `brand/SCHEMA.md`).
- Internal consistency (voice matches positioning matches audience).
- Freshness (profiles <30d, config <90d, landscape <14d).

Output: structured report. `/cmo` acts on the recommendations — usually queues 1-3 refresh tasks into `.mktg/plan.json`.

---

## How learnings shape routing

When `/cmo` considers a skill/playbook, it weights past evidence:

| Past evidence | Routing impact |
|---|---|
| Skill produced good output last time | Increased confidence; run without asking clarifying questions. |
| Skill failed last time for a reason that's not fixed | Surface the prior failure + fix BEFORE re-running. |
| Claim verified recently via `/last30days` | Safe to repeat. |
| Claim flagged in Blacklist | Refuse (see `rules/error-recovery.md`). |
| Playbook succeeded recently | Offer to repeat for next launch / next article / next campaign. |
| User rejected a specific framing last time | Don't re-propose it. |

Example:
> *"Last time you shipped an SEO article, content-reviewer scored 82/100 with 'opening para too generic' as the main drift. Want me to calibrate the opening pattern specifically this run?"*

---

## Forgetting — explicit

If the user says *"forget about X"*, `/cmo` removes the relevant learning line and does not bring it up again. Learnings is a shared contract; the builder controls it.

---

## Cross-project learnings (use with caution)

Learnings are per-project (each project has its own `brand/learnings.md`). /cmo may notice patterns across projects (*"X positioning worked for Helm; could work for Acme"*) but never acts on cross-project insights without explicit user confirmation. See `rules/context-switch.md` for the full multi-project protocol.

---

## The 30-day return

A builder comes back to a project after 30 days. `/cmo` on that activation:

1. `mktg status --json` — snap state.
2. `mktg brand freshness --json` — flag everything that's stale.
3. `mktg plan next --json` — propose the next move.
4. Read tail of `brand/learnings.md` — 10 most recent entries.
5. Surface: *"Welcome back. Landscape is 42 days stale — want to refresh before writing anything new? Plan has [N] pending tasks, top one is [task]. Last learning: [recent entry]. Where do you want to start?"*

This is the 30-second ramp-up. The log did the memory work; /cmo just presents it.

---

## Reference

- `brand/learnings.md` — the log.
- `.mktg/plan.json` — the persisted queue.
- `mktg brand append-learning --input '{...}'` — the writer.
- `mktg plan next / --save / complete <id> --json` — the queue commands.
- `rules/brand-memory.md` — the full brand memory protocol (what belongs in brand/ vs what belongs in learnings vs what's ephemeral).
