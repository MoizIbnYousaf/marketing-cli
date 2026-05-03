# CMO Orchestration Playbooks

Named end-to-end recipes. When the builder asks for something big, pick the right playbook, announce the plan, run the chain, hand back at the defined stop.

**How to use:**
- If the builder's request matches a named trigger phrase, start the playbook.
- Announce the plan before step 1: *"Here's what I'll run: step 1 → step 2 → step 3. Ready?"*
- Pause between phases when a **Gate** is marked — the user approves the artifact before the next step.
- Every playbook ends with a **Stop** condition. Don't run past it.

---

## 1. Full Product Launch

**Trigger:** *"launch my product"*, *"zero to launch"*, *"plan and run my launch"*, *"new startup, what do I do"*.

**Use when:** fresh project, founder wants end-to-end. Allow 2-4 hours of compounding work.

**Steps:**

| # | Skill | Artifact produced | Gate? |
|---|---|---|---|
| 0 | `brainstorm` (skip if direction is clear) | direction summary | — |
| 1 | `brand-voice` | `brand/voice-profile.md` | ✓ |
| 2 | `audience-research` + `competitive-intel` (parallel via agents) | `brand/audience.md`, `brand/competitors.md` | ✓ |
| 3 | `landscape-scan` | `brand/landscape.md` (with Claims Blacklist) | ✓ |
| 4 | `positioning-angles` | `brand/positioning.md` | ✓ |
| 5 | `visual-style` → `brand-kit-playground` | `brand/creative-kit.md` + HTML preview | ✓ (visual approval) |
| 6 | `keyword-research` | `brand/keyword-plan.md` | — |
| 7 | `seo-content` ×2-3 articles (cornerstone content) | `marketing/content/*.md` | ✓ (per article) |
| 8 | `content-atomizer` on each article | `marketing/social/<slug>/*.md` | — |
| 9 | `launch-strategy` | `marketing/launch/plan.md` | ✓ |
| 10 | `startup-launcher` (brief + 56-platform tracker) | `marketing/launch/product-brief.md`, `launch-tracker.md` | ✓ |
| 11 | Schedule social: `typefully` for X/threads, `postiz` for everything else | drafts in platform UIs | — |
| 12 | Log the campaign: `mktg brand append-learning` | `brand/learnings.md` | — |

**Stop:** launch day executed, drafts scheduled, learnings captured. Hand back with "next moves" list (monitor competitors, run conversion audits, plan next content batch).

---

## 2. Content Engine

**Trigger:** *"I need a content system"*, *"publish weekly"*, *"keep the content flowing"*, *"content calendar setup"*.

**Use when:** brand foundation exists; user wants repeatable weekly output.

**Steps:**

| # | Skill | Artifact | Notes |
|---|---|---|---|
| 1 | `keyword-research` | `brand/keyword-plan.md` (fresh) | Refresh if older than 90 days. |
| 2 | `seo-content` (one cornerstone piece) | `marketing/content/<slug>.md` | User picks the topic from keyword-plan. |
| 3 | `content-atomizer` | `marketing/social/<slug>/{linkedin,twitter,reddit,...}-posts.md` | Platform-native, per-channel. |
| 4 | Distribution: `postiz` (LinkedIn/Reddit/Bluesky/Mastodon/Threads/IG/TikTok) + `typefully` (X) | drafts scheduled | Phase 5 of `social-campaign` picks the backend per post. |

**Stop:** one week's worth of content scheduled. Recommend scheduling a recurring run (`/loop` or weekly reminder).

---

## 3. Founder Voice Rebrand

**Trigger:** *"make this sound like me"*, *"extract my voice"*, *"my voice is all over the place"*, *"the brand voice doesn't match how I actually write"*.

**Use when:** founder has a real writing voice (podcast, essays, tweets) that the current `voice-profile.md` doesn't capture.

**Steps:**

| # | Skill | Artifact | Notes |
|---|---|---|---|
| 1 | `voice-extraction` | structured voice pattern analysis | Spawns 10 parallel sub-agents, reverse-engineers patterns from real content. |
| 2 | `brand-voice` (Extract mode) using extraction output | new `brand/voice-profile.md` | Overwrites the generic voice with the founder-calibrated one. |
| 3 | **Mass regen trigger** — if there's existing copy in `marketing/`, flag for rewrite: run `direct-response-copy --mode edit` on each landing page, `seo-content --mode edit` on each article, `content-atomizer` re-runs on source content | updated files | Per plan:rules/brand-file-map.md, voice changes cascade to every downstream copy skill. |

**Stop:** new `voice-profile.md` written + downstream rewrite plan surfaced. Don't auto-regenerate; the user decides which assets are worth rewriting.

---

## 4. Conversion Audit

**Trigger:** *"audit my landing page"*, *"traffic isn't converting"*, *"why is my signup flow leaking"*, *"fix my CRO"*.

**Steps:**

| # | Skill | When |
|---|---|---|
| 1 | `page-cro` | Audits hero, CTA, social proof, objections on one URL. Produces a scored report + prioritized fix list. |
| 2 | `conversion-flow-cro` | Only if problem spans a multi-step flow (signup → onboarding → paywall). |
| 3 | If copy is the issue → `direct-response-copy --mode edit` | Surgical rewrite of the flagged copy. |
| 4 | Capture what you learned → `mktg brand append-learning` | Feeds future routing. |

**Stop:** ranked fix list delivered; rewrite executed if copy was the blocker.

---

## 5. Retention Recovery

**Trigger:** *"people keep canceling"*, *"my churn is bad"*, *"reduce cancellations"*, *"win back lapsed users"*.

**Steps:**

| # | Skill | Artifact |
|---|---|---|
| 1 | `churn-prevention` | Cancel flow UX plan, dunning email sequence, win-back 90-day calendar. |
| 2 | `email-sequences` (build the dunning + win-back flows from step 1's plan) | Full email sequences with subjects + timing. |
| 3 | `send-email` (to wire the flow into Resend, if building inbound) | Transactional wiring. |

**Stop:** dunning + win-back flows drafted, wire-up instructions given. User approves before any live sends.

---

## 6. Visual Identity

**Trigger:** *"design my brand"*, *"I need a visual look"*, *"how should my brand look"*, *"set up image generation"*.

**Steps:**

| # | Skill | Artifact |
|---|---|---|
| 1 | `visual-style` | `brand/creative-kit.md` with palette, typography, image aesthetic. |
| 2 | `brand-kit-playground` (immediately after) | Interactive HTML preview — tweakable palette/type/logo, social card + OG image. |
| 3 | `creative` (when producing ad/social assets) | Multi-mode creative briefs per asset. |
| 4 | `image-gen` (for individual images) | Gemini-generated image via creative-kit style anchors. |

**Stop:** visual approval via `brand-kit-playground`. User copies refined tokens back, then unblocked for any future image work.

---

## 7. Video Content

**Trigger:** *"make a video"*, *"TikTok content"*, *"product demo video"*, *"turn slides into video"*.

**Steps (branching):**

| Ask shape | Skill chain |
|---|---|
| "Product demo / walkthrough" | `marketing-demo` → `video-content` (ffmpeg or Remotion) |
| "TikTok slideshow / social video" | `slideshow-script` → `paper-marketing` → `video-content` → (optional) `tiktok-slideshow` orchestrator bundles all three |
| "Pitch deck / HTML slides" | `frontend-slides` (terminal path — not a video pipeline) |
| "App Store screenshots" | `app-store-screenshots` (Next.js generator, NOT video) |

**Distribution:** any resulting video → `postiz` for TikTok/IG/YouTube/Threads; `typefully` for X.

**Stop:** video file exported + scheduled. Log to `brand/assets.md`.

---

## 8. Email Infrastructure

**Trigger:** *"set up my email system"*, *"I need inbound email for an agent"*, *"wire up Resend"*.

**Steps:**

| # | Skill | Artifact |
|---|---|---|
| 1 | `agent-email-inbox` (if building agent-triggered email) | secure inbox config, webhook tunneling plan, prompt-injection defenses. |
| 2 | `resend-inbound` (for receiving emails via Resend) | inbound domain setup + `email.received` webhook wiring. |
| 3 | `email-sequences` (for automated flows: welcome, nurture, launch, win-back) | full sequences with timing and A/B plan. |
| 4 | `send-email` (for one-off transactional sends) | Resend API calls for specific messages. |

**Stop:** infrastructure validated (test send + receive round-trip). Log credentials env vars (via `brand/stack.md`).

---

## 9. SEO Authority Build

**Trigger:** *"rank higher on Google"*, *"improve SEO"*, *"I want to show up in AI search"*, *"compete for [topic]"*.

**Steps:**

| # | Skill | Artifact |
|---|---|---|
| 1 | `keyword-research` | `brand/keyword-plan.md` with primary, secondary, long-tail terms + search intent notes. |
| 2 | `seo-content` (ongoing) | `marketing/content/*.md` — rankable, anti-AI-slop articles with schema. |
| 3 | `ai-seo` | Entity optimization, structured data, citation-worthy formatting for ChatGPT/Perplexity/Claude/Gemini/AI Overviews. |
| 4 | `competitor-alternatives` | `marketing/alternatives/<competitor>-vs-us.md` — high-intent comparison pages. |
| 5 | `seo-audit` (periodically) | Site architecture + schema markup audit. |

**Stop:** one cornerstone + one AI-SEO piece + one alternatives page shipped. Schedule re-runs quarterly.

---

## 10. Newsletter Launch

**Trigger:** *"start a newsletter"*, *"set up weekly email"*, *"I want subscribers"*.

**Steps:**

| # | Skill | Artifact |
|---|---|---|
| 1 | `audience-research` (refresh if stale) | `brand/audience.md` — who reads this newsletter. |
| 2 | `newsletter` | Newsletter strategy, template, cadence, growth playbook. |
| 3 | `lead-magnet` | Free resource that captures emails (ebook, template, toolkit). |
| 4 | `email-sequences` (welcome + nurture) | Automated onboarding for new subscribers. |
| 5 | Distribution: landing page via `direct-response-copy`; sign-up capture via `send-email` + `resend-inbound` for double opt-in. | Full signup funnel. |

**Stop:** newsletter #1 drafted, lead magnet live, welcome sequence scheduled. Hand back with growth tactics to run weekly.

---

## 11. Studio Launch

**When:** The user wants to see their marketing operation on a dashboard rather than (or in addition to) in the terminal.

**Goal:** `mktg init` → `mktg studio --open --intent cmo --session <id>` → tabs lit by live data within 60 seconds.

| Phase | Skill / command | Why |
|---|---|---|
| 0 | `mktg studio --dry-run --json --intent cmo --session <id>` | Preview. Resolves sibling `mktg-studio/bin/mktg-studio.ts`, `MKTG_STUDIO_BIN`, or PATH, confirms ports + exact CMO dashboard URL, and never spawns. |
| 1 | `mktg studio --open --intent cmo --session <id>` | Spawn server (port 3001) + dashboard (port 3000). Studio opens at `http://localhost:3000/dashboard?mode=cmo&session=<id>`. |
| 2 | Foundation research (if first run) | Spawn `mktg-brand-researcher`, `mktg-audience-researcher`, `mktg-competitive-scanner` in parallel per the standard first-run protocol. Each agent writes a brand file. |
| 3 | `POST /api/brand/refresh` after each agent | Tabs light up one by one as each brand file lands. User watches the dashboard populate in real time. |
| 4 | `POST /api/navigate {tab: "pulse"}` | Bring the user to Pulse for the "do this next" card once foundation is complete. |
| 5 | `POST /api/toast "Marketing brain ready"` | Confirmation. User now has a live dashboard + a populated brand. |

**Stop:** Dashboard rendering the current primary surfaces (Pulse, Signals, Publish, Brand, Settings) with real data, Activity panel streaming /cmo events, Pulse has a prioritized next-action card. Hand back with: "Open `http://localhost:3000` — your marketing department is live. Want me to run the first recommended action?"

See `rules/studio-integration.md` for the full POST contract.

---

## 12. Agent Team Coordination

**When:** A multi-agent workflow needs to spawn several sub-agents in parallel and synthesize their outputs — most often on first run (3 research agents) or a content batch (content-reviewer + seo-analyst on the same draft).

**Goal:** Parallelism without crossed wires, clean handoff from sub-agents back to /cmo, compounding written to `brand/learnings.md`.

| Phase | Action | Why |
|---|---|---|
| 0 | Plan the split | Identify which sub-agents run in parallel vs sequentially. Research agents (3) are parallel; review agents (content-reviewer, seo-analyst) run after content lands. |
| 1 | Spawn in ONE message | Use the Agent tool with N parallel `type: "tool_use"` blocks in a single message. Sequential spawns serialize — that defeats the purpose. |
| 2 | Wait on all | Do not proceed until every spawned agent returns. Partial results produce incoherent positioning. |
| 3 | Synthesize | /cmo reads each agent's output, resolves contradictions explicitly (not silently), writes the unified view. |
| 4 | `POST /api/activity/log` per agent | The Activity panel shows N rows — one per sub-agent — so the user can see the parallel work. |
| 5 | Record cross-agent learnings | If an agent surfaced an insight the others missed, append to `brand/learnings.md` with a `--learning` flag so future runs start ahead. |

**Sub-agent roster (current):**
- `mktg-brand-researcher` → `brand/voice-profile.md`
- `mktg-audience-researcher` → `brand/audience.md`
- `mktg-competitive-scanner` → `brand/competitors.md`
- `mktg-content-reviewer` → scores content draft, writes nothing
- `mktg-seo-analyst` → scores SEO content, writes nothing

**Stop:** All spawned agents returned, /cmo has synthesized the output into a single coherent action or artifact, learnings appended. See `rules/sub-agents.md` for the per-agent spawn contract.

---

## Playbook selection — quick reference

| Builder says… | Playbook |
|---|---|
| "launch", "zero to one", "ship my startup" | **Full Product Launch** |
| "content system", "publish weekly", "keep content flowing" | **Content Engine** |
| "my voice is off", "make it sound like me" | **Founder Voice Rebrand** |
| "audit my page", "improve conversion", "fix my funnel" | **Conversion Audit** |
| "reduce churn", "win back users" | **Retention Recovery** |
| "brand visuals", "design my look" | **Visual Identity** |
| "make a video", "TikTok" | **Video Content** |
| "email system", "inbound email", "Resend setup" | **Email Infrastructure** |
| "rank on Google", "AI search", "compete for [topic]" | **SEO Authority Build** |
| "start a newsletter", "subscribers" | **Newsletter Launch** |
| "show me the dashboard", "launch the studio", "visual mode" | **Studio Launch** |
| "spawn the research team", "parallel research", "do this across agents" | **Agent Team Coordination** |

**Never run a playbook silently.** Announce the plan, confirm, run, surface the artifact at each Gate, stop at the Stop condition.
