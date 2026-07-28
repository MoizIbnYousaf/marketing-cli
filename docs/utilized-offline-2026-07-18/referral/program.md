# Referral Program Design — OSS CLI (mktg)

## Goal
Grow **qualified installs** among Claude Code / Cursor builders — not empty email signups. Optimize for stars that convert, shares that include the install command, and contributions that improve the playbook.

## Principle
For an OSS CLI, cash kickbacks feel weird and attract spam. Prefer **status, swag, and contributor leverage** that compound the public good.

## Program shape (v1 — practical)

### Track A — Amplify (no account required)

| Action | Proof | Reward |
|--------|-------|--------|
| Star the GitHub repo | Public star | Listed in monthly "thanks" issue; eligibility for sticker drops |
| Share a genuine install story (X / LI / IH / HN) with `npm i -g marketing-cli` | Link + date | Sticker pack + "Launch Week Amplifier" mention |
| Publish a before/after (`brand/` empty → foundation filled) | Gist or blog | Limited enamel pin + feature in newsletter |

**Rules:** No fake screenshots. No "synergy" spam threads. Mods can disqualify.

### Track B — Contribute (highest leverage)

| Action | Proof | Reward |
|--------|-------|--------|
| Land a merged skill (SKILL.md + manifest + tests as required) | PR merged | Swag + `CONTRIBUTORS.md` + skill attribution in manifest |
| Fix Agent DX / docs bug | PR merged | Swag; priority review on next PR |
| Upstream-mirror maintenance (`check-upstream`) | PR merged | Same as bugfix |

### Track C — Classroom / community (optional later)

Workshops or Discord/Slack office hours: refer 5 builders who complete `mktg init` + first `/cmo` → facilitator gets a bundle of stickers for attendees.

## What we explicitly skip (v1)

- Cash / crypto bounties for installs (bot magnets)  
- "Refer 10 friends for Pro forever" before Pro exists  
- Dark-pattern invite walls inside the CLI  
- Scraping emails from GitHub stars  

## Attribution (lightweight)

| Channel | Mechanism |
|---------|-----------|
| npm | README badge + utm on docs links |
| GitHub | Referral issue template: "I shared → link" |
| Newsletter | Unique reply codes (`installed`, share URL) |
| Future paid | Stripe promo codes for amplifiers (only when paid exists) |

CLI itself should **not** phone home for referral credit in v1. Keep trust.

## Swag ladder

1. Sticker — any verified amplify story  
2. Pin — published case write-up  
3. Tee — merged skill or ≥3 meaningful PRs  
4. "Playbook maintainer" credit — sustained upstream/docs work  

Budget: start with a small sticker run; print more only after demand is real.

## Stars vs shares vs contributors

| Lever | Use when | Caveat |
|-------|----------|--------|
| **Stars** | Social proof on README | Vanity alone ≠ installs; always pair with install CTA |
| **Shares** | Launch weeks | Demand native platform posts (use atomizer pack) |
| **Contributors** | Moat + quality | Best ROI long-term; invest review time |

**v1 priority order:** Contributors > Shares > Stars.

## 30-day pilot

1. Open a GitHub Discussion: "Amplifier + Contributor rewards"  
2. Pin criteria from this doc  
3. Fulfill stickers twice a month  
4. Measure: referral Discussion posts, `mktg`-related HN/LI links, merged PRs — not vanity dashboards  

## Copy snippet for README

> **Amplifier program:** Share a real install story or merge a skill → stickers and credit. Details in `marketing/referral/program.md`. No spam, no bots, no pay-for-installs.
