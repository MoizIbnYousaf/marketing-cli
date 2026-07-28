# Launch Plan: marketing-cli (mktg) — Small-Medium npm/GitHub Launch

## Overview
- **Launch type:** New product (public npm + GitHub) — small-medium intensity
- **Target window:** 7 days (compress classic multi-week ORB into one focused sprint)
- **Audience size:** Early / near-zero owned list; discovery via GitHub, X, HN, LinkedIn
- **Primary goal:** Installs + stars + first 50 people who run `mktg init` and keep brand memory
- **Secondary goal:** Capture emails via Agent Marketing Setup Checklist lead magnet
- **Success bar (day 7):** ≥500 npm downloads (week), ≥150 GitHub stars delta, ≥30 checklist opt-ins, ≥10 people who complete brand scaffold beyond templates

## Positioning
- **One-line value prop:** mktg is the agent-native marketing playbook — one CLI install gives your coding agent 64 skills, 6 research agents, and brand memory that compounds across sessions.
- **Launch angle:** Coding agents finally have a marketing OS — installable skills with manifests, tests, and persistent `brand/` memory — not another prompt pack.
- **Target audience:** Solo founders and agent builders on Claude Code / Cursor / Codex who are tired of re-explaining brand voice every session.
- **Awareness level:** Problem-aware → solution-curious ("my agent forgets the brand" / "I need marketing skills my agent can actually run").

### Messaging guardrails
- Prefer: ship, compound, playbook, agent-native, dry-run, brand memory, orchestrate
- Avoid: synergy, leverage, disrupt, 10x, unlock growth, revolutionary
- Do not claim "only marketing CLI for agents" (blacklist)
- Do not claim we replace a full enterprise marketing team

### Key lines (rotate, don't spam)
1. Install one CLI. Your agent gets 64 skills, 6 research agents, and brand memory that compounds.
2. CLI for the agent. Studio for the human.
3. Skills work at zero context. Brand memory makes them sharper — never a gate.

---

## Channel Strategy (ORB)

### Owned Channels
Channels you control. Thin today — treat every launch touch as list + repo compounding.

| Channel | Asset / action | Owner | When |
|---|---|---|---|
| GitHub README | Install proof, skill counts, GIF/banner, clear `npm i -g marketing-cli && mktg init` | You | Day −1 freeze; Day 0 pin |
| `marketing/campaigns/mktg-launch/landing.md` | Direct-response page copy (ship on site or gist if needed) | You | Day −1 |
| Lead magnet | Agent Marketing Setup Checklist → email capture | You | Day 0–1 |
| Welcome sequence | 5-email onboarding for installers | You | Day 0 live |
| npm package page | Description + keywords + homepage link | You | Day −1 |
| Studio (`mktg studio`) | Optional human dashboard demo clip | You | Day 2–3 |

**Owned tactics**
- Every CTA points to one install path + one proof path (star repo OR grab checklist).
- UTM convention: `utm_source={channel}&utm_medium={post|ad|email}&utm_campaign=mktg_launch_7d`
- Append learnings daily to `brand/learnings.md` after each publish (append-only).

### Rented Channels
Platforms that rent you distribution; algorithm owns reach.

| Channel | Format | Cadence | Notes |
|---|---|---|---|
| X / Twitter | 3–5 posts + 1 thread | Daily peak at launch; 1–2/day after | Lead with install + brand memory; attach demo GIF |
| LinkedIn | 2 long posts + 1 carousel idea | Day 0, Day 2, Day 5 | Founder-operator framing; no LinkedIn-speak |
| Paid boost (optional) | Small X/LinkedIn boost on best organic post | Day 2–4 | Only if organic post earns ≥1% eng; use ads.md variants |
| npm / GitHub Explore | Listing polish, topics, keywords | Day −1 | Topics: `cli`, `marketing`, `agents`, `claude-code`, `cursor` |

**Rented tactics**
- Hook with a concrete pain: "Your agent forgets the brand every session."
- Proof before adjectives: 64 skills, 6 agents, `--dry-run`, Agent DX 21/21.
- Pin the Day 0 X post; reply to every serious question with a command, not a pitch.

### Borrowed Channels
Other people's audiences. Highest leverage for small-medium launches.

| Target | Ask | Timing | Fallback |
|---|---|---|---|
| Hacker News — Show HN | `Show HN: mktg – agent-native marketing playbook CLI` | Day 0 morning US | If buried, try Ask HN follow-up Day 4 with lesson learned |
| Claude Code / Cursor Discords & Slacks | Soft share: "installable marketing skills + brand/" | Day 0–2 | Respect rules; no dump |
| Indie hacker newsletters / AI builder newsletters | Short pitch + install one-liner | Outreach Day −2; publish Day 1–3 | Offer exclusive tip for subscribers |
| Friendly builders (5–10) | Ask for star + honest try of `mktg init` | Day −1 DM | Provide paste-ready share blurb |
| Adjacent tool threads (AXI, Exa, skill repos) | Comment with useful distinction, link once | Opportunistic Days 1–5 | Never hijack; add value first |

**Borrowed pitch (email/DM, ~80 words)**
> Shipping mktg — an agent-native marketing playbook CLI. One install gives coding agents 64 skills, 6 research agents, and persistent brand memory under `brand/`. Skills work at zero context; memory sharpens them. Looking for builders on Claude Code/Cursor who'd try `npm i -g marketing-cli && mktg init` and tell me where it breaks. Happy to send a 30-min setup checklist if useful.

---

## 7-Day Timeline

### Day −1 (Prep — freeze assets)
- [ ] README, npm description, topics locked
- [ ] Landing copy live (campaign)
- [ ] Lead magnet + thank-you + 3 follow-ups queued
- [ ] Welcome emails 01–05 ready
- [ ] Ads variants drafted (use only if boosting)
- [ ] Show HN title + first comment drafted
- [ ] Demo GIF/video path confirmed (existing assets in `brand/assets/`)
- [ ] Analytics: npm downloads, GitHub stars, checklist form, UTM sheet

### Day 0 — Launch day
**Morning**
1. Publish Show HN + maker comment (install + what it is + what it is not)
2. Ship X thread + LinkedIn post #1
3. DM warm builders with share blurb
4. Pin README + GitHub social preview

**Afternoon**
5. Reply to HN/X/LinkedIn in first 4 hours (compound replies > new posts)
6. Soft share in 1–2 communities (rules-safe)
7. Log early feedback in `brand/learnings.md`

### Day 1 — Proof and depth
- Publish SEO article: "Agent Marketing CLI" pillar (`marketing/content/agent-marketing-cli/article.md`)
- Open checklist lead magnet CTA everywhere
- Second X post: walkthrough of `mktg init` → brand files → `/cmo`
- Fix any install friction found on Day 0 (docs only unless critical bug)

### Day 2 — Human surface + Studio
- LinkedIn post #2: "CLI for the agent. Studio for the human."
- Short Studio screen recording or GIF
- Newsletter outreach follow-ups
- Optional: small boost on best Day 0 post

### Day 3 — Differentiation day
- Content atom: brand memory vs prompt packs (thread or short post)
- Competitor-honest post using claims blacklist
- Engage HN stragglers / related threads
- Email welcome sequence should be catching Day 0–1 installers

### Day 4 — Midweek check + stall decision
- Review metrics vs success bar (see Metrics)
- If stalling → activate Stall Plan (below)
- If healthy → Ask HN / second-wave borrowed outreach with lesson learned
- Checklist email #2 for magnet leads

### Day 5 — Social proof roundup
- Quote early user feedback (with permission) or publish dogfood results (64/64 skills install)
- LinkedIn post #3 or carousel outline
- Reminder CTA: install + star + checklist

### Day 6 — Consolidation
- Update README FAQ from real questions
- Publish one "first 30 minutes" tip from checklist
- Quiet day for replies and support

### Day 7 — Close the sprint
- Metrics report → `brand/learnings.md`
- Decide next skill runs (SEO machine, more content atoms, paid experiments)
- Thank early adopters publicly once
- Archive campaign notes under `marketing/campaigns/mktg-launch/`

---

## Metrics

| Metric | Day 3 pulse | Day 7 target | Where measured |
|---|---|---|---|
| npm downloads (7d) | ≥150 | ≥500 | npm |
| GitHub stars (delta) | ≥60 | ≥150 | GitHub |
| README → install clicks (approx) | rising | — | referrer / anecdote |
| Checklist opt-ins | ≥10 | ≥30 | form / ESP |
| Welcome email open rate | — | ≥45% | ESP |
| Welcome email click (install docs / studio) | — | ≥12% | ESP |
| Qualitative: "ran mktg init" replies | ≥5 | ≥15 | HN/X/DMs |
| Critical install bugs | 0 open | 0 open | issues |

**North-star for this sprint:** people who install *and* fill brand memory past templates (learning from 2026-07-18 dogfood).

### UTM examples
- `?utm_source=twitter&utm_medium=organic&utm_campaign=mktg_launch_7d`
- `?utm_source=hn&utm_medium=show&utm_campaign=mktg_launch_7d`
- `?utm_source=linkedin&utm_medium=organic&utm_campaign=mktg_launch_7d`
- `?utm_source=checklist&utm_medium=leadmagnet&utm_campaign=mktg_launch_7d`

---

## Stall Plan

Trigger any **two** of these by end of Day 3:
- npm downloads < 100
- stars delta < 40
- checklist opt-ins < 5
- HN on page 2+ with <10 points and dying comments
- Zero "I installed" replies

### Stall responses (pick 2–3, don't spray)

1. **Sharpen the hook** — Retest posts using ads.md variants; lead with "agent forgets brand" not feature list.
2. **Borrow harder** — Personal DM 10 builders with the 80-word pitch + offer to hop on a 15-min install debug.
3. **Ship a public dogfood log** — Post the 64/64 install result + what broke (templates blocking prereqs) — honesty converts builders.
4. **HN recovery** — Day 4 Ask HN: "What's working for marketing with coding agents?" — answer with mktg only if asked; earn the mention.
5. **Compress CTA** — Single landing: install command + checklist. Kill secondary CTAs for 48h.
6. **Pause paid** — Do not boost underperforming creative; rewrite first.
7. **Support theater** — Same-day issue responses; pin a troubleshooting comment under launch posts.

### Kill criteria (end Day 7)
If downloads < 100 **and** stars delta < 30 **and** zero qualitative installs: stop paid/outreach spray; run `/document-review` + deepen brand files; schedule a second launch after positioning proof improves. Do not "push harder" with the same message.

---

## Pre-flight Checklist (compressed)

- [ ] Positioning one-liner + anti-positioning reviewed
- [ ] Voice: no banned hype words in any Day 0 copy
- [ ] Install path tested on clean machine: `npm i -g marketing-cli && mktg init`
- [ ] `mktg doctor --json` known-good locally
- [ ] Lead magnet + thank-you + follow-ups ready
- [ ] Welcome sequence ready
- [ ] Show HN first comment ready (what / why / how / not)
- [ ] Demo media paths valid
- [ ] Stall plan owner assigned (you)

---

## Roles
Solo-founder launch: you own all ORB lanes. Timebox: 90 minutes morning distribution, 60 minutes afternoon replies, 30 minutes evening metrics/learnings.

## Related deliverables
- Landing: `marketing/campaigns/mktg-launch/landing.md`
- Ads: `marketing/campaigns/mktg-launch/ads.md`
- SEO: `marketing/content/agent-marketing-cli/article.md`
- Lead magnet: `marketing/lead-magnets/agent-marketing-setup-checklist/`
- Welcome emails: `marketing/emails/welcome/`
