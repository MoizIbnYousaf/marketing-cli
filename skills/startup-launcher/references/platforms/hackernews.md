# Hacker News (Show HN)

## Quick Facts
| Metric | Value |
|--------|-------|
| URL | news.ycombinator.com |
| Monthly visits | ~15-20M |
| Backlink | High authority (DR 90+) |
| Cost | Free |
| Cadence | Anytime |
| Best timing | Sunday 12:00 UTC (best breakout rate: 11.75%) |
| Front page traffic | 10,000-30,000 visitors in 24 hours |

## Submission Requirements
- Title starting with "Show HN:" (factual, no marketing language, no caps/exclamation)
- Link to live, try-able product (not a signup page or landing page)
- First comment posted immediately after submission (your actual pitch)
- You must be the creator and present to discuss

## How to Submit
1. Have an active HN account with genuine comment history
2. Go to news.ycombinator.com/submit
3. Title: `Show HN: [Product Name] - [what it does in plain English]`
4. Link to live demo (no signup required to try)
5. Immediately post your first comment (technical details, backstory, limitations)

## Ranking Algorithm
```
Score = (P-1)^0.8 / ((T+2)^1.8) * penalty_factor
```
- Time decays faster than votes accumulate
- Show HN posts carry built-in 0.4 penalty (need ~2x upvotes vs regular posts)
- **Controversy penalty at 40+ comments:** If comments > upvotes, penalty = (votes/comments)^2 or ^3. Can drop #1 to invisible in minutes.
- Domain penalties on popular sites (medium.com, github.com, youtube.com)

## Title Formulas That Work
- `Show HN: [Name] - [plain description]` (most reliable)
- `Show HN: I built [product] to [solve problem]` (personal, higher engagement)
- No uppercase emphasis, no exclamation points, no superlatives (fastest, best, revolutionary)

## First Comment Template
```
Hi HN! [Name] here, been working on [Product] for [timeframe].

[One clear sentence: what it does.]

[The problem and why it's harder than it looks. Be specific.]

[How you built it. Stack, architecture, non-obvious decisions. 2-3 sentences minimum.]

[What's different. Technical specifics, not marketing comparisons.]

[Current status: beta/production, what's missing, what's next. Honesty builds trust.]

Happy to answer questions about how it works or what we got wrong.
```

## What the Audience Expects
- **Deeply technical.** They spot outdated libraries, reinvented wheels, fake benchmarks.
- **Cynical but fair.** "Why didn't you just use rsync?" is a compliment disguised as a challenge.
- **Transparency over polish.** Honest limitations > marketing claims.
- **Try-able demos.** No signup gate. No email wall. Let them use it immediately.
- **Transparent pricing.** "Contact for pricing" triggers negative comments.

## Hard Rules / Gotchas
- **Voting ring detection catches 5-6 coordinated votes.** Even linking to HN from a private Facebook group gets detected via referral patterns.
- Never ask anyone to upvote. Period.
- Don't coordinate friends to post supportive comments (community smells astroturfing).
- Account that only posts own content gets flagged as promotional.
- Reposting: OK if first post got little attention and it's been a year+. NOT OK if it had significant attention.

## The Second-Chance Pool
If your post doesn't gain traction but is genuinely good:
- Email hn@ycombinator.com requesting consideration
- Moderator may add to second-chance pool (quality posts get resurfaced)
- Documented success: KTool got 30 upvotes first try, emailed, reposted to 13 hours on front page, 11K visitors, 300+ signups

## Post-Launch
- Secondary sources add 30-100% more traffic over 3-7 days (Hacker Newsletter, RSS, Reddit cross-posts)
- Front page generates 150+ new backlinks
- 58-68% of HN users block analytics (actual traffic is 1.5-2x what GA reports)

## Infrastructure Checklist
- [ ] Caching configured on all major routes
- [ ] CDN enabled for static assets
- [ ] Homepage handles 300+ concurrent users
- [ ] Server response time < 200ms under load
- [ ] Images optimized (next-gen formats)
- [ ] Monitoring and error tracking active
- [ ] Know your hosting bandwidth limits

## Launch Checklist
- [ ] Title is factual, no marketing, starts with "Show HN:"
- [ ] First comment written and ready to paste immediately
- [ ] Live demo works without signup
- [ ] Pricing page is transparent
- [ ] 4+ hours blocked for comment engagement
- [ ] Checked /newest before posting (less competition = more discovery time)
- [ ] Targeting Sunday ~12:00 UTC or weekday 11:00-14:00 UTC
