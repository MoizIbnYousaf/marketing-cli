# Brand File → Dependent Skills (Reverse Index)

When a `brand/*.md` file changes, some downstream skills become stale and should re-run. This map answers: **"I just updated `<file>` — what's now out of date?"**

/cmo reads this on every "update brand" request and proactively flags regen candidates.

---

## `brand/voice-profile.md` — HIGH impact

Changing voice invalidates tone on every copy and distribution asset ever produced.

**Skills that must re-run (if the asset is still in use):**

| Skill | What regenerates |
|---|---|
| `direct-response-copy` | Landing pages, sales copy, cold emails, headlines. |
| `seo-content` | All published articles (at minimum edit passes). |
| `lead-magnet` | Lead magnet prose, landing page, follow-up sequence. |
| `newsletter` | Template + recent issues. |
| `email-sequences` | Welcome, nurture, launch, win-back flows. |
| `content-atomizer` | Any `marketing/social/` output. |
| `social-campaign` | Phase 2 voice calibration re-runs. |
| `typefully` / `postiz` drafts | Re-review scheduled posts. |
| `creative` | Ad copy variants. |
| `marketing-demo` narration / `slideshow-script` / `video-content` scripts | Voice-calibrated scripts. |
| `startup-launcher` | Platform copy + tagline variants. |

**Routing rule:** when voice changes, surface a rewrite plan before auto-running anything. The user picks which assets are worth the rewrite.

---

## `brand/audience.md` — HIGH impact

Targeting changes mean every copy decision needs re-calibration.

**Skills affected:**

| Skill | Why |
|---|---|
| `direct-response-copy` | "For whom" framing shifts. |
| `seo-content` | Search intent + watering-hole calibration. |
| `lead-magnet` | Asset type (ebook vs calculator) depends on audience. |
| `email-sequences` | Segment splits and pacing. |
| `newsletter` | Topic calendar pivot. |
| `content-atomizer` | Platform priority shifts (watering holes). |
| `positioning-angles` | Re-run — positioning is always relative to audience. |
| `social-campaign` | Platform mix re-planned. |
| `pricing-strategy` | Willingness-to-pay changes. |
| `free-tool-strategy` | Tool utility hinges on audience pain. |
| `conversion-flow-cro` | Flow friction depends on audience sophistication. |

---

## `brand/positioning.md` — HIGH impact

Positioning drives landing pages, launch copy, and competitive framing.

**Skills affected:**

| Skill | Why |
|---|---|
| `direct-response-copy` | Landing page hero, value prop, differentiation. |
| `page-cro` | "Why us" rewrite. |
| `launch-strategy` | Angle selection. |
| `startup-launcher` | All 56 platform taglines + descriptions. |
| `competitor-alternatives` | "vs." framing. |
| `newsletter` | Editorial angle. |
| `slideshow-script` | Narrative frameworks (AIDA/PAS/BAB) depend on angle. |
| `creative` | Ad variant themes. |
| `brand-kit-playground` | Voice preview text. |

---

## `brand/competitors.md` — MEDIUM impact

**Skills affected:**

| Skill | Why |
|---|---|
| `competitor-alternatives` | Full regen — this IS the input. |
| `competitive-intel` | Refresh baseline. |
| `landscape-scan` | Re-ground market snapshot. |
| `positioning-angles` | Gaps shift. |
| `direct-response-copy` | Objection handling updates. |
| `seo-content` | Comparison content + "alternatives to" keywords. |
| `mktg compete scan` | Watchlist sync. |

---

## `brand/landscape.md` — HIGH impact (Claims Blacklist)

Landscape drives the **Claims Blacklist** — any claim not grounded in current landscape data is off-limits.

**Skills affected (ALL content-producing):**

| Skill | Why |
|---|---|
| `direct-response-copy` | Claims Blacklist enforcement on every headline. |
| `seo-content` | Market claims gated. |
| `newsletter` | Editorial claims gated. |
| `lead-magnet` | Proof claims gated. |
| `content-atomizer` | Platform posts inherit Blacklist. |
| `social-campaign` | Phase 0 reads Blacklist. |
| `launch-strategy` | Market-size/category claims gated. |
| `startup-launcher` | Platform copy Blacklist-checked. |
| `competitor-alternatives` | Comparison claims Blacklist-checked. |
| `ai-seo` | Citation-worthy claims must be Blacklist-safe. |

**Freshness critical:** landscape is usable for 14 days. Stale landscape = stale Blacklist = risk of unfounded claims shipping.

---

## `brand/keyword-plan.md` — MEDIUM impact

**Skills affected:**

| Skill | Why |
|---|---|
| `seo-content` | Primary/secondary/long-tail targeting. |
| `ai-seo` | Entity optimization vocabulary. |
| `competitor-alternatives` | Comparison keyword selection. |
| `seo-audit` | URL structure + schema recommendations. |
| `free-tool-strategy` | Tool naming + SEO anchor. |

---

## `brand/creative-kit.md` — MEDIUM impact (visual only)

**Skills affected:**

| Skill | Why |
|---|---|
| `creative` | Visual briefs use the kit. |
| `image-gen` | Style anchors. |
| `visual-style` | Source file — regenerate if deliberate. |
| `brand-kit-playground` | Preview reflects the kit. |
| `paper-marketing` | Design system for designer agents. |
| `slideshow-script` | Visual styling of generated slides. |
| `video-content` | Color palette, typography for Remotion compositions. |
| `app-store-screenshots` | Visual identity on app store pages. |
| `frontend-slides` | Slide visual theme. |

---

## `brand/stack.md` — LOW impact (integration alerts)

**Skills affected:**

| Skill | Why |
|---|---|
| `email-sequences` | ESP choice (Resend, Mailchimp, etc.) |
| `send-email` | API wiring points. |
| `typefully` | Social set IDs, connected accounts. |
| `postiz` | Connected integrations baseline. |
| `newsletter` | Platform selection (ConvertKit, Beehiiv, Substack). |
| `agent-email-inbox` / `resend-inbound` | Domain + webhook config. |

---

## `brand/assets.md` — Append-only (no regen trigger)

Logs created assets (content, images, videos, scheduled posts). `/cmo` reads this to avoid duplicating work — if an asset exists, don't silently overwrite.

---

## `brand/learnings.md` — Append-only (informs routing)

Logs what worked, what didn't, what's been tried. `/cmo` reads this to:
- Avoid re-running a failed experiment.
- Compound insights across sessions.
- Pick the next move based on past outcomes.

Never regenerates any skill — but every post-skill reflection should append an entry via `mktg brand append-learning --input '{...}'`.

---

## Cascade severity summary

| File | Severity | When it changes, /cmo should… |
|---|---|---|
| `voice-profile.md` | 🔴 HIGH | Offer a rewrite plan for every downstream copy/distribution asset. |
| `audience.md` | 🔴 HIGH | Offer re-calibration for copy, distribution, pricing. |
| `positioning.md` | 🔴 HIGH | Re-run landing page + launch copy. |
| `landscape.md` | 🔴 HIGH | Warn: Claims Blacklist changed — every piece of content needs re-check. |
| `competitors.md` | 🟡 MEDIUM | Refresh comparison/alternatives pages, competitive intel. |
| `keyword-plan.md` | 🟡 MEDIUM | Flag SEO content + AI SEO for refresh. |
| `creative-kit.md` | 🟡 MEDIUM | Visual skills inherit automatically; flag published visual assets. |
| `stack.md` | 🟢 LOW | Integration alerts only. |
| `assets.md` | — | No regen; avoids duplication. |
| `learnings.md` | — | No regen; informs future routing. |

**Rule of thumb:** when a HIGH file changes, /cmo surfaces a rewrite plan **before** accepting any downstream request. Don't produce new copy on top of stale inputs.
