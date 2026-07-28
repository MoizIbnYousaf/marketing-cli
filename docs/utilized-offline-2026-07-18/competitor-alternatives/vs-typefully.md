# mktg vs Typefully

Honest comparison. Different jobs — occasional overlap in "I need LinkedIn/X posts."

## Short answer
**Typefully** is a strong social composition + scheduling tool.  
**mktg** is an agent-native marketing playbook (skills, brand memory, orchestration). Schedulers — including Typefully — can sit beside mktg as distribution adapters, not as replacements.

---

## Where Typefully wins

| Strength | Why it matters |
|----------|----------------|
| Delightful editor for X/LinkedIn | Built for draft → schedule → analyze |
| Team queues & approval flows | Human social teams live here |
| Native scheduling / calendar | Posts actually go out on time |
| Platform-specific previews | What-you-see matters for social |
| Mature social analytics | Feedback loop on posts |

If your only problem is "queue tweets with a nice UI," use Typefully.

---

## Where mktg wins

| Strength | Why it matters |
|----------|----------------|
| Full playbook beyond social | SEO briefs, launch kits, pricing notes, CRO audits… |
| Brand memory in-repo | Consistent voice across *all* artifacts, not just posts |
| Agent-first execution | Coding agents run skills with dry-run/JSON |
| Atomization from long-form | Content → platform-native packs under `marketing/social/` |
| Local Studio + CLI | Review + automate without renting another SaaS brain |
| Progressive enhancement | Write before every integration is configured |

---

## Side-by-side

| Dimension | Typefully | mktg |
|-----------|-----------|------|
| Category | Social scheduling / drafting SaaS | Agent marketing infrastructure |
| Primary user | Social/content operator | Builder + coding agent |
| Brand system | In-app | `brand/*.md` files |
| SEO / launch / pricing docs | Not the core job | First-class skills |
| Posting | Native | Via catalogs/adapters / manual paste |
| Open source CLI | No | Yes (`marketing-cli`) |

---

## Recommended pairing
1. Use mktg `/cmo` + content-atomizer to produce platform-native drafts.  
2. Paste or pipe into Typefully (or Postiz catalog) for scheduling.  
3. Keep `brand/voice-profile.md` as source of truth — don't fork voice into five SaaS bios.

## Anti-positioning reminder
We do **not** claim mktg replaces Typefully's scheduler UX. We claim Typefully does not replace an agent-runnable playbook.
