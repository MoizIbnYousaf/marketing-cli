# Progressive Enhancement Ladder

/cmo's capability depends on how populated `brand/` is. Brand memory enhances; it never gates. But be honest about what's possible at each rung — running SEO content at L0 produces generic slop; running it at L4 produces converting, grounded content.

**Always check the ladder first.** Run `mktg status --json --fields brand.populated,brand.missing,brand.stale` to know where you stand. Announce the level to the builder: *"You're at L2 — I can route to X, Y, Z. A and B need another brand file first. Want me to run it now?"*

---

## L0 — Zero context (`mktg init` just ran; all `brand/*.md` templates)

**What's populated:** nothing real. Templates only.

**What /cmo can route to cleanly:**

| Skill | Reason |
|---|---|
| `brainstorm` | No brand needed — it's the explorer. |
| `brand-voice` | Foundation skill. Its job IS to populate voice-profile.md. |
| `voice-extraction` | Standalone — reverse-engineers voice from external content. |
| `audience-research` | Foundation. Populates audience.md. |
| `competitive-intel` | Foundation. Populates competitors.md. |
| `landscape-scan` | Foundation. Populates landscape.md. |
| `positioning-angles` | Needs voice + audience; queue it once those land. |
| `mktg-x` | Utility — reads external X content. |
| `firecrawl` | Utility — scrapes external content. |
| `summarize` | Utility — compresses pasted text. |
| `create-skill` | Meta — adds new skills to the playbook. |

**What /cmo cannot do well:**
- Write converting copy (no voice, no audience, no positioning).
- Route to any distribution (no content to distribute).
- Run any playbook except **Full Product Launch** from scratch.

**Response quality:** *"I can help, but first let me build the foundation. Here's the 4-agent parallel research I'll kick off: brand-voice, audience-research, competitive-intel, landscape-scan. This gives us voice + audience + competitive context + market grounding. It's a 10-minute investment that makes everything else 10× better."*

**Playbooks unlocked:** **Full Product Launch** (starts here by design).

---

## L1 — Voice only (`brand/voice-profile.md` real)

**What's populated:** voice-profile.md with real patterns.

**What /cmo adds from L0:**

| Skill | Reason |
|---|---|
| `direct-response-copy` | Can write copy in-voice now. Still generic targeting. |
| `seo-content` | Same — voiced but audience/keyword-agnostic. |
| `content-atomizer` | Can rewrite content in-voice across platforms. |
| `creative` | Can generate copy variants in-voice. |
| `newsletter` | Can draft in-voice. Topic selection is still guesswork. |
| `lead-magnet` | Draft only — audience targeting is missing. |

**What's still gated:**
- `positioning-angles` (needs audience too)
- `page-cro` / `conversion-flow-cro` (needs positioning for "why us" framing)
- `launch-strategy` / `startup-launcher` (needs positioning)
- `competitor-alternatives` (needs competitors.md)

**Response quality:** *"Voice is locked in. Copy will sound like you. But I'm writing blind on who we're talking to — let me run /audience-research (5 min) so the next draft converts."*

**Playbooks unlocked:** partial — Founder Voice Rebrand can finalize step 2; Content Engine can draft if user specifies topic manually.

---

## L2 — Voice + audience (`audience.md` real)

**What /cmo adds:**

| Skill | Reason |
|---|---|
| `positioning-angles` | Has both required inputs. Can run. |
| `pricing-strategy` | Has audience context for willingness-to-pay. |
| `email-sequences` | Audience-targeted flows now possible. |
| `lead-magnet` (full) | Targeted resource. |
| `social-campaign` (without landscape grounding) | Can plan calendar; still no market-claim enforcement. |
| `keyword-research` | Better with audience context. |

**What's still gated:**
- Any skill that needs competitive context (`competitor-alternatives`, full `launch-strategy`).
- Claims-grounded content (no `landscape.md` + Claims Blacklist yet).

**Response quality:** *"Voice + audience are in. I can target now. But I don't know who you're competing against — let me run /competitive-intel (parallel to your next ask, 5 min) so I don't accidentally position us against ourselves."*

**Playbooks unlocked:** Newsletter Launch, Conversion Audit (if the page exists), Visual Identity.

---

## L3 — Voice + audience + competitors + landscape + positioning

**What's populated:** 5 of 10 brand files — the full research foundation.

**What /cmo adds:**

| Skill | Reason |
|---|---|
| `launch-strategy` | All required inputs. |
| `startup-launcher` | Full brief auto-fills from brand/. |
| `competitor-alternatives` | Has competitors + positioning. |
| `free-tool-strategy` | Has audience + positioning for distribution plan. |
| `seo-audit` | Has content context. |
| `landscape-scan` refresh becomes meaningful | baseline exists to diff against. |

**What's still gated (minor):**
- Visual skills work but without `creative-kit.md` produce generic styling.
- `keyword-plan.md` may or may not be run yet — SEO Authority Build needs it.

**Response quality:** *"Foundation is complete. Claims Blacklist is active (from landscape.md) — I'll enforce it on every piece of copy. Ready to run any playbook."*

**Playbooks unlocked:** all except those requiring visual identity (Visual Identity, Video Content) or SEO-specific (SEO Authority Build requires keyword-plan first).

---

## L4 — All 10 brand files current within freshness windows

**What's populated:** `voice-profile.md`, `positioning.md`, `audience.md`, `competitors.md`, `landscape.md`, `keyword-plan.md`, `creative-kit.md`, `stack.md`, `assets.md` (append-only), `learnings.md` (append-only) — all real, none stale.

**What /cmo adds from L3:**

| Skill | Reason |
|---|---|
| `image-gen` | Has `creative-kit.md` style anchors. |
| `visual-style` → `brand-kit-playground` | Full loop. |
| `paper-marketing` | Has the design system to spawn designer agents. |
| `slideshow-script` + `video-content` + `tiktok-slideshow` | Full video pipeline. |
| `ai-seo` | Has keyword-plan + positioning for entity optimization. |
| `frontend-slides` | Brand-consistent pitch decks. |
| `app-store-screenshots` | Brand visuals in place. |
| `email-sequences` with full stack awareness | Knows which ESP (`stack.md`) + audience segments. |
| `typefully` + `postiz` routing | Full per-platform calibration. |
| `mktg compete scan` | Landscape baseline to diff competitor changes against. |
| `mktg plan next` | Has enough state to pick the single highest-priority task. |

**Response quality:** *"You're at L4 — full CMO mode. I'll route with confidence. If it's a named playbook, I'll run it. If it's an ad-hoc ask, I'll pick the 1-2 best skills and execute."*

**Playbooks unlocked:** all 10. Can compound work across multiple playbooks in one session.

---

## Level detection at activation

Run at On Activation (see main SKILL.md):

```bash
mktg status --json --fields brand.populated,brand.missing,brand.stale
```

Map the result:

| State | Level |
|---|---|
| `brand.populated.length === 0` OR all files are templates | L0 |
| only `voice-profile.md` real | L1 |
| `voice-profile.md` + `audience.md` real | L2 |
| + `competitors.md` + `landscape.md` (fresh ≤ 14 days) + `positioning.md` | L3 |
| All 10 files populated AND within freshness (30d profiles, 90d config, append-only never stale) | L4 |

**When landscape.md is stale (>14 days):** downgrade to "L3 but not L4 for content routing" — warn the user before running any copy skill.

**When any profile file (voice/positioning/audience/competitors/landscape) is stale (>30 days):** downgrade one level. Offer to refresh before routing.

---

## What "route with confidence" means

At L3/L4, /cmo doesn't ask "what do you want to do" — it suggests. At L0-L2, /cmo explicitly names the missing input before running anything that needs it. The ladder is a contract: the builder knows what they'll get back at each level, and /cmo is honest about the quality ceiling.

---

## Ecosystem readiness — the orthogonal axis (E0–E4)

Brand completeness (L0–L4 above) governs *content quality*. Ecosystem completeness (E0–E4 below) governs *what surfaces the builder can touch*. The two axes are independent — a project can be L4/E0 (brand-rich, CLI-only) or L1/E3 (brand-light, studio+native publish wired). /cmo routes across both.

Detect ecosystem level at activation with a single `mktg doctor --json` — it returns studio reachability, integration status, and sibling presence.

### E0 — CLI only

**State:** `mktg` installed, `brand/` may or may not exist, no studio, no native providers, no postiz, no other integrations.

**Surfaces /cmo can drive:** the mktg CLI itself + Claude Code terminal. Full read-and-write on `brand/`. All content skills work locally.

**What /cmo cannot:** show a dashboard, post to social, trigger live signal collection.

**Response:** *"You're CLI-only right now. I can write and save everything locally. Want me to help set up Studio or native publish providers when you're ready?"*

### E1 — CLI + brand bootstrapped

**State:** E0 + `brand/` has real files (L1 or higher on the brand axis).

**What this unlocks:** every content skill now has at least voice grounding. Nothing new on the ecosystem axis — this rung exists to acknowledge that a CLI-only project CAN still produce meaningful output if the brand axis is funded.

**Response:** *"Brand is in. I can write in-voice without any studio or postiz. Content goes to files in `brand/assets.md` or wherever you route it."*

### E2 — Studio attached

**State:** E1 + `mktg studio` running, `GET $STUDIO/api/health` returns 200 (`STUDIO` is the API base printed by the launcher, default `http://localhost:3001`).

**What /cmo adds:** the five studio verbs from `rules/studio-integration.md` — activity, navigate, toast, brand-refresh, schema-fetch. Every skill run now mirrors to the Activity panel. Brand file writes trigger SWR invalidation. Tab switches are programmatic.

**What's still gated:** external network posting requires Postiz, Typefully, or a browser profile. Native publish can still store the local queue/history.

**Response:** *"Studio is live. You'll see every skill run land on the Activity panel. Open `http://localhost:3000` to watch — I'll surface toasts when something interesting ships."*

### E3 — Studio + native publish connected

**State:** E2 + at least one native provider exists from `mktg publish --adapter mktg-native --list-integrations --json`.

**What /cmo adds:** local queue/history for the initial native rollout: X, TikTok, Instagram, Reddit, and LinkedIn. Campaign orchestration can now write platform-native posts into the workspace backend and show them in Studio.

**What's still gated:** actual external network posting still requires Postiz, Typefully, or browser automation. Cross-sibling workflows require E4.

**Response:** *"Native publish is wired — I can queue X, TikTok, Instagram, Reddit, and LinkedIn content into this workspace. If you want it pushed to the real networks, I'll route through Postiz, Typefully, or browser automation and tell you exactly which path is active."*

### E4 — Full ecosystem

**State:** E3 + a multi-repo marketing workspace. marketing-cli (the CLI), mktg-studio (the dashboard), and the marketing site each have their own `brand/` and their own git history.

**What /cmo adds:** cross-sibling awareness per `rules/monorepo.md`. Can reason about mktg-site content strategy vs mktg-studio positioning vs marketing-cli docs, knowing each is a distinct brand but shares an overarching ecosystem identity. Can route audit work across siblings (F-chain tasks), can coordinate launch copy (C-chain) that references all four surfaces coherently.

**What's still gated:** nothing on the ecosystem axis. At E4, /cmo operates the full marketing department.

**Response:** *"Full ecosystem is live — CLI, studio, and site. If I need to cross-reference, I'll use `--cwd` explicitly and announce the sibling. Your launch copy can reference any of them; I'll keep voices distinct."*

### Two-axis routing in practice

A project at L4/E0 — full brand, no studio/postiz — gets polished copy shipped to files. Perfectly fine for a pre-launch stealth product.

A project at L1/E3 — thin brand, full ecosystem — gets distribution-ready posts with voice-grounding but weak targeting. /cmo should recommend investing in the brand axis before scaling distribution, because E3 amplifies L1's weaknesses.

The sweet spot for production use is L3+/E2+ — enough brand grounding for claims-aware copy, enough ecosystem for the builder to see and distribute what /cmo produces.
