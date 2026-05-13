# Off-Page Strategy (Backlinks + Distribution)

On-page work (everything in the pattern references) only gets you so far. Without inbound links from other domains, even a perfect page caps out around DR + 20 in achievable KD targets. The off-page work expands that ceiling.

This skill does **not** submit links anywhere on the user's behalf. It generates a prioritized checklist and a researched target list — the user (or the user's marketing team) does the outreach.

## The starter stack (universal)

Every new SaaS/app site should be in these by week 4. Most are free; all are worth a one-time submission.

### Directories (just submit and check off)

- **Product Hunt** — single biggest launch-day backlink + traffic source
- **G2** — high-DR, becomes a destination for "[brand] reviews" searches
- **Capterra / GetApp / Software Advice** (Gartner Digital Markets — same submission flow)
- **SaaSHub**
- **AlternativeTo** — DR 80+, list yourself as an alternative to your top 5 competitors
- **Betalist** (if pre-launch or recently launched)
- **Indie Hackers** — products section
- **TopAlternatives.com / SimilarSiteSearch / Slant.co** — niche but useful
- **Crunchbase** — even free profile gets DR pass-through

### Community surfaces (selective)

- **Reddit** — niche subreddits ONLY. Find them via Ahrefs site-explorer on `reddit.com` for your keywords. Engage genuinely; never just post a link.
- **Slack/Discord communities** — for your audience. Join 3-5, contribute for 2 weeks before mentioning the product.
- **Hacker News** — for technical products. Show HN posts can drive enormous traffic spikes; require a real launch story.

### Founder outreach (the slow-burn channel)

- **Founder link trades** with complementary (non-competitive) products. Reach out to 5-10 founders of products your audience also uses. Offer mutual blog mentions, "tools we love" pages, or guest posts.
- **Guest posts on DR 30+ blogs** in your niche. Find them via Recipe F (competitor referring-domains). Pitch 1-2 strong posts per month.

## Recipe F — researched target list

Use Ahrefs MCP to surface high-value link opportunities your competitors already have.

For each top-3 competitor:

```
mcp__ahrefs__site-explorer-referring-domains
target: <competitor-domain>
where: domain_rating >= 30 AND traffic_dofollow >= 100
order_by: domain_rating:desc
limit: 100
```

Then for each candidate domain, filter manually into buckets:

| Bucket | Signal |
|---|---|
| **Directory candidates** | Site name matches "[category] directory", "best of [category]", "[category] tools", "alternatives to [tool]" |
| **Listicle candidates** | Blog posts titled "Top X [category] in YYYY" — pitch yourself for inclusion |
| **Guest-post candidates** | Looks like a blog (`*.com/blog/...` URLs), DR 30+, posts on your niche |
| **Skip** | PR wires, paid networks, irrelevant niches, sites that link to *everyone* in the space |

Save to `.seo/backlink-targets.json` as:

```json
{
  "generated_at": "2026-MM-DD",
  "directories": [
    { "domain": "g2.com", "dr": 88, "url_to_submit": "https://www.g2.com/products/new", "competitor_uses": ["hootsuite", "buffer"] }
  ],
  "listicles": [
    { "domain": "thedigitalprojectmanager.com", "dr": 65, "url": "https://...", "topic": "Best Twitter monitoring tools", "competitor_listed": "hootsuite" }
  ],
  "guest_posts": [
    { "domain": "indiehackers.com/blog", "dr": 81, "topic_fit": "founder-led marketing" }
  ]
}
```

## Off-page phase template

Add 2-4 off-page phases near the end of the tracker:

```markdown
### Phase N — Directory submissions (starter stack)

**Why:** baseline backlinks from high-DR directories. Cap at 2-3 hours of submission work.

**Scope:**

- [ ] Product Hunt — schedule launch (separate launch-strategy work)
- [ ] G2 — submit product page
- [ ] Capterra — submit product page
- [ ] SaaSHub
- [ ] AlternativeTo — list as alternative to: hootsuite, buffer, sprout-social, agorapulse, later
- [ ] Indie Hackers — claim product page
- [ ] Crunchbase — basic profile

**Files modified:** none — this is external work. Track status in `.seo/off-page-status.md`.
```

```markdown
### Phase N+1 — Listicle outreach (top 10 targets)

**Why:** "Top X [category]" listicles already rank for our target keywords. Getting added is faster than displacing them.

**Targets (from .seo/backlink-targets.json):**

1. example.com/best-twitter-monitoring-tools (DR 65)
2. example.com/top-social-listening-tools-2026 (DR 72)
3. ...

**Action:**
- [ ] For each, find the author via the byline or about page
- [ ] Send a personalized note: short pitch + screenshot proof of value + link to demo
- [ ] Track reply status in `.seo/off-page-status.md`

**Verification:** 3+ listicles update to include the product within 60 days.
```

## What this skill explicitly does NOT do

- **Auto-submit anything.** Submission flows often need real human review (G2 needs a screenshot + URL + verification email; Product Hunt needs a launch coordinator).
- **Generate outreach emails.** Use the `cold-email` skill for that.
- **Track ongoing referring-domain growth.** That's a weekly checking-in task the user owns; the skill just provides the initial target list.

## Honest caveats

Off-page work is slower and more uncertain than on-page work. A great alternatives page ranks within 30-90 days. A great backlink campaign might produce 3 useful links in the first month, 10 in three months. **Don't gate the on-page sprint on off-page progress.** Ship pages; queue outreach in parallel.
