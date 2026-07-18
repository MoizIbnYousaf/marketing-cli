# Churn Prevention Playbook — Future Paid Tier (Studio / Hosted)

**Status:** Spec for when a paid Studio/hosted tier exists. OSS CLI remains free; this applies only to paid seats.  
**Ethics:** No dark patterns. No hidden cancel. No guilt traps. No fake "limited time" scare copy.

---

## Health score signals

Compute a simple **Workspace Health** (0–100) weekly. Use for proactive help — not for locking features.

| Signal | Healthy | At-risk | Weight |
|--------|---------|---------|--------|
| Last Studio login | ≤14 days | ≥30 days | High |
| Brand freshness (non-template files updated) | ≤30 days profiles | Stale >60 days | High |
| Skill / artifact activity (`marketing/` writes or Studio exports) | ≥1 / 14 days | 0 / 45 days | Medium |
| Failed catalog/auth checks (doctor) | 0 recurring | Same error ≥3 sessions | Medium |
| Seat utilization (invited but never joined) | <20% idle seats | >50% idle | Medium |
| Support tickets open | 0–1 | ≥2 unanswered | High |
| Payment failures | None | Any dunning state | Critical |

**Bands:** 70–100 nurture · 40–69 intervene (human or email) · <40 save offer + listen.

Never hide the cancel button based on health score.

---

## Cancel flow copy (ethical)

### Step 1 — Confirm intent
**Headline:** Cancel paid Studio sync?  
**Body:** Your local CLI, skills, and `brand/` files stay yours. Canceling stops hosted sync and team Studio features at period end.  

[Keep plan] [Continue to cancel]

### Step 2 — Reason (optional, skippable)
**Label:** Optional — what should we improve?  
Options: Too expensive · Don't need sync · Missing feature · Bugs · Switching tools · Other  
**Note:** Skip is always available. No forced essay.

### Step 3 — Honest save (one offer max)
Only if reason ∈ {expensive, don't need sync} **and** health <70:  
**Copy:** "We can switch you to monthly pause for one cycle (no charge) while you keep read-only sync history. Or cancel now — no hoops."  
[Pause one cycle] [Cancel now]

No multi-page labyrinth. No "talk to sales to cancel."

### Step 4 — Confirmation
**Subject/UI:** Cancellation scheduled  
**Body:** Access continues until {date}. Export: [Download brand + artifacts]. Re-subscribe anytime from billing. Thanks for trying paid Studio — the open CLI remains free: `npm i -g marketing-cli`.

---

## Dunning emails (5) — payment recovery

Tone: clear, respectful, zero threat inflation.

| # | When | Subject | Body outline |
|---|------|---------|--------------|
| 1 | Day 0 fail | Payment didn't go through | What failed · update link · no service cut today · CLI unaffected |
| 2 | Day 3 | Reminder: update billing | Same issue · one-click update · what paid features pause if unresolved |
| 3 | Day 7 | Paid Studio sync will pause soon | Exact pause date · update or cancel · export link |
| 4 | Day 10 | Sync paused — data retained | What paused vs what still works locally · update to resume · retention window stated truthfully |
| 5 | Day 14 | Final billing notice | Last chance to update before paid workspace closes · retention/export · unsubscribe from dunning (still allow billing portal) |

**Rules:** State dates accurately. Never claim dunning is from a "bank security hold." Never re-enable charges without explicit update.

---

## Win-back emails (4)

Send only to canceled paid users who opted into product email (or transactional-adjacent product tips). Respect unsubscribes.

| # | When after cancel | Subject | Outline |
|---|-------------------|---------|---------|
| 1 | Day 7 | Your playbook still runs locally | Remind OSS path · `mktg doctor` · no pitch pressure · one link to changelog |
| 2 | Day 21 | What we shipped since you left | 3 concrete fixes/features · especially cancel-reason tagged · soft "reactivate sync" |
| 3 | Day 45 | Brand memory compounds offline too | Mini play: refresh `voice-profile.md` · invite reply with blocker |
| 4 | Day 90 | Revisit paid Studio? | Honest GBB: what's paid vs free · single CTA · "or stay on OSS forever — that's fine" |

**Forbidden:** Fake urgency, fake scarcity seats, "we miss you" guilt paragraphs longer than one line, dark-pattern re-opt-in.

---

## In-product interventions (pre-cancel)

| Trigger | Action |
|---------|--------|
| Health 40–69 | In-app tip: run foundation `/cmo` or refresh stale brand file |
| Idle seat | Email owner once: remove seat or invite nudge |
| Recurring doctor auth fail | Link to catalog setup docs |
| Value moment | After first successful sync week: short "here's what compounded" digest |

---

## Metrics

- Involuntary churn (payment) vs voluntary  
- Cancel-step drop-off (should be low friction — high completion of cancel is OK)  
- Win-back reactivation rate  
- Support CSAT after cancel  
- % cancels citing "couldn't find cancel" → must stay ~0  

## North star
Paid is optional convenience. Churn prevention = help them get value or leave cleanly — never trap them.
