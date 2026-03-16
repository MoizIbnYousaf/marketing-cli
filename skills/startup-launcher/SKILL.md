---
name: startup-launcher
description: "When the user wants to launch a product across multiple platforms, submit to launch directories, prepare launch assets, plan a multi-platform campaign, or needs launch day operational support. Activates on: 'submit to directories', 'launch on Product Hunt', 'submit to BetaList', 'multi-platform launch', 'launch campaign', 'directory submissions', 'startup launch playbook', 'AppSumo campaign', 'Hacker News launch', 'where should I launch', 'launch across platforms'. This is the operational launcher — it does the work. For high-level launch strategy and phased planning, see launch-strategy."
category: growth
tier: must-have
reads:
  - brand/voice-profile.md
  - brand/positioning.md
  - brand/audience.md
  - brand/competitors.md
writes:
  - marketing/launch/product-brief.md
  - marketing/launch/launch-tracker.md
triggers:
  - startup launcher
  - submit to directories
  - launch on Product Hunt
  - submit to BetaList
  - multi-platform launch
  - launch campaign
  - directory submissions
  - AppSumo campaign
  - Hacker News launch
  - where should I launch
  - launch across platforms
  - submit everywhere
  - platform submissions
metadata:
  version: 1.0.0
---

# Startup Launcher

You are a launch campaign manager. You assess products once, recommend platform sequences, generate all platform-specific assets, and guide users through submissions across 56 platforms. You operate as a 3-layer system that minimizes user cognitive load while maximizing launch effectiveness.

## On Activation

1. Check if `brand/` directory exists in the project root
2. If it exists, read `brand/voice-profile.md`, `brand/positioning.md`, `brand/audience.md`, and `brand/competitors.md` for context
3. Use brand context to pre-fill what you can — only ask for information not already covered
4. Check if `marketing/launch/product-brief.md` exists — if so, load it and skip the interview

---

## How This Works (3-Layer Architecture)

### Layer 1: Product Brief (One-Time Setup)
Check for existing `marketing/launch/product-brief.md` in user's workspace. If none exists, run the 5-question interview and generate the brief. All platform copy gets generated FROM this brief.

### Layer 2: Platform Intelligence (On-Demand Reference)
56 platform files in `references/platforms/` stay as reference. Load them when prepping a specific submission. User never sees or thinks about these files.

### Layer 3: Launch Tracker (Living File)
Maintain `marketing/launch/launch-tracker.md` in user's workspace. Track which platforms have been submitted to, status of each, copy used, next actions, and dates.

## Step 1: Brief Check & Product Assessment

First action: Does `marketing/launch/product-brief.md` exist? If not, ask these 5 questions:

| # | Question | Why It Matters |
|---|----------|---------------|
| 1 | What does it do? (one sentence) | Becomes the seed for all platform copy |
| 2 | Who is it for? (developers / founders / consumers / enterprise) | Filters which platforms match |
| 3 | What stage? (pre-launch / just launched / launched with traction) | Determines sequence order |
| 4 | Budget for paid placements? ($0 / under $150 / under $300+) | Filters paid vs free tiers |
| 5 | Open source? (yes / no) | Critical for platform classification |

Generate the brief using `references/templates/product-brief.md` and save it to `marketing/launch/product-brief.md`. The brief should include space for: product URL, logo path, screenshot paths, video URL, GitHub repo URL, pricing page URL, founder name/photo, OG image path.

## Step 2: Generate Universal Copy

From the brief, produce these copy blocks and save to the brief file or a companion file:

### Tagline Variants
- **60 char version:** For Product Hunt (`[Verb] [outcome] for [audience]`)
- **100 char version:** For most directories
- **Full sentence version:** For detailed listings

### Description Blocks
- **Short description:** 1-2 sentences for previews
- **Medium description:** 1 paragraph for directory pages
- **Long description:** 3-5 paragraphs with feature bullets for comprehensive listings

### Platform-Specific Content
- **Maker/founder story:** For first comments on PH/HN
- **Technical summary:** For dev-focused platforms (DevHunt, Hacker News)
- **Show HN format:** "Show HN: [Name] - [what it does in plain English]"

## Step 3: Platform Classification & Recommendation

Based on the brief, classify ALL 56 platforms into these categories:

### Immediate (Free, Fast Submission - Do Now)
Most launch directories and software directories with free tiers. Agent drafts everything, user just submits:
- **Launch Directories:** BetaList (free), Indie Hackers, Uneed (free), Fazier (free), TinyLaunch, Tiny Startups, SideProjectors, LaunchIgniter (free), PeerPush (free), DevHunt, TrustMRR, Startup Stash, Launching Next, Firsto, LaunchIt, Launch Your App, DesiFounder, Rank In Public, Launchboard, Aura++, TryLaunch, Selected, LaunchFast, Lab Startups, indie.deals
- **Software Directories:** SaaSHub, OpenAlternative, LibHunt, Toolfolio, SaaS Genius, There's an AI for that, AlternativeTo, SourceForge, Softonic, Crunchbase, HackerNoon, Devpost

### Scheduled (Weekly Cadences or Timing-Sensitive)
- **Product Hunt:** Daily reset 12:01 AM PST
- **Peerlist:** Weekly Monday launches
- **TinyLaunch:** Weekly windows
- **LaunchIgniter:** Weekly Monday launches

### Premium (Need Dedicated Prep and Strategy)
These get their own planning sessions:
- **Product Hunt:** (also in scheduled, but premium prep needed)
- **Hacker News:** Show HN strategy required
- **AppSumo:** Full campaign strategy needed
- **G2:** Enterprise sales focus required

### Revenue (Deal/LTD Platforms - Different Economics)
Revenue share models, need pricing strategy:
- **AppSumo, RocketHub, StackSocial, SaaS Mantra, SaaS Warrior, LTD Hunt, KEN Moo, Prime Club, SaaSZilla, SaaS Pirate, Product Canyon, Deal Mirror, Dealify**

### Skip (Doesn't Fit Based on Brief)
Explain WHY each is skipped (e.g., "OpenAlternative requires open source, your product is proprietary")

## Step 4: Platform Quick Reference Matrix

| Platform | Category | Cost | Best For | Traffic Potential | File |
|----------|----------|------|----------|-------------------|------|
| **LAUNCH DIRECTORIES (29)** |
| Product Hunt | Directory | Free | SaaS, consumer apps, visual products | 5K-25K visitors | `producthunt.md` |
| Hacker News | Directory | Free | Dev tools, OSS, technical products | 10K-30K visitors | `hackernews.md` |
| BetaList | Directory | $0/$99 | Pre-launch validation, waitlist building | 50-500 signups | `betalist.md` |
| Indie Hackers | Directory | Free | Bootstrapped SaaS, founder stories | High-intent, slow burn | `indiehackers.md` |
| Uneed | Directory | $0/$30 | Indie tools, SaaS | 200-2K visitors | `uneed.md` |
| Fazier | Directory | $0/$79 | Indie makers, founders | Low traffic, high SEO | `fazier.md` |
| MicroLaunch | Directory | $0/$49 | Side projects, MVPs | Moderate | `microlaunch.md` |
| Peerlist | Directory | Free | Dev tools, OSS, portfolios | Moderate, high quality | `peerlist.md` |
| TinyLaunch | Directory | $0/$39 | Indie makers, first launches | Low-moderate | `tinylaunch.md` |
| Tiny Startups | Directory | Free | Bootstrapped products | Newsletter: 20K subs | `tinystartups.md` |
| SideProjectors | Directory | Free | Side projects, showcases | 250K pageviews/mo | `sideprojectors.md` |
| LaunchIgniter | Directory | $0/$12 | SaaS, AI tools | 50-300 clicks | `launchigniter.md` |
| PeerPush | Directory | $0/paid | Builder tools, SaaS | 250K visitors/mo | `peerpush.md` |
| DevHunt | Directory | Free | Developer tools, OSS | Growing dev community | `devhunt.md` |
| TrustMRR | Directory | Free | SaaS, recurring revenue | Moderate | `trustmrr.md` |
| Startup Stash | Directory | Free | Startup resources, tools | Moderate | `startupstash.md` |
| Launching Next | Directory | Free | Early-stage startups | Moderate | `launchingnext.md` |
| Firsto | Directory | Free | New product launches | Moderate | `firsto.md` |
| LaunchIt | Directory | Free | Launch announcements | Moderate | `launchit.md` |
| Launch Your App | Directory | Free | Mobile app launches | Moderate | `launchyourapp.md` |
| DesiFounder | Directory | Free | Indian founder community | Moderate | `desifounder.md` |
| Rank In Public | Directory | Free | Public building, startups | Moderate | `rankinpublic.md` |
| Launchboard | Directory | Free | Launch discovery | Moderate | `launchboard.md` |
| Aura++ | Directory | Free | Creator tools, SaaS | Moderate | `auraplusplus.md` |
| TryLaunch | Directory | Free | Product trials, launches | Moderate | `trylaunch.md` |
| Selected | Directory | Free | Curated product launches | Moderate | `selected.md` |
| LaunchFast | Directory | Free | Quick launch submissions | Moderate | `launchfast.md` |
| Lab Startups | Directory | Free | Experimental projects | Moderate | `labstartups.md` |
| indie.deals | Directory | Free | Indie product deals | Moderate | `indiedeals.md` |
| **DEAL/LTD MARKETPLACES (13)** |
| AppSumo | Deal | Revenue share | SaaS, productivity tools | $40K-$400K campaigns | `appsumo.md` |
| RocketHub | Deal | Revenue share | Software deals | Moderate | `rockethub.md` |
| StackSocial | Deal | Revenue share | Tech products | High volume | `stacksocial.md` |
| SaaS Mantra | Deal | Revenue share | SaaS lifetime deals | Growing | `saasmantra.md` |
| SaaS Warrior | Deal | Revenue share | SaaS tools | Moderate | `saaswarrior.md` |
| LTD Hunt | Deal | Revenue share | Lifetime deals | Moderate | `ltdhunt.md` |
| KEN Moo | Deal | Revenue share | Software deals | Moderate | `kenmoo.md` |
| Prime Club | Deal | Revenue share | Premium deals | Moderate | `primeclub.md` |
| SaaSZilla | Deal | Revenue share | SaaS deals | Moderate | `saaszilla.md` |
| SaaS Pirate | Deal | Revenue share | SaaS lifetime deals | Moderate | `saaspirate.md` |
| Product Canyon | Deal | Revenue share | Product deals | Moderate | `productcanyon.md` |
| Deal Mirror | Deal | Revenue share | Software deals | Moderate | `dealmirror.md` |
| Dealify | Deal | Revenue share | Deal marketplace | Moderate | `dealify.md` |
| **SOFTWARE DIRECTORIES (14)** |
| SaaSHub | Directory | Free | SaaS discovery | High SEO value | `saashub.md` |
| G2 | Directory | Free | Enterprise software | High-intent buyers | `g2.md` |
| Capterra | Directory | Free | Business software | High commercial intent | `capterra.md` |
| OpenAlternative | Directory | Free | Open source alternatives | Developer audience | `openalternative.md` |
| LibHunt | Directory | Free | Libraries, frameworks | Developer tools | `libhunt.md` |
| Toolfolio | Directory | Free | Tool discovery | Moderate | `toolfolio.md` |
| SaaS Genius | Directory | Free | SaaS tools | Moderate | `saasgenius.md` |
| There's an AI for that | Directory | Free | AI tools | AI-focused audience | `theresanaiforthat.md` |
| AlternativeTo | Directory | Free | Software alternatives | High traffic | `alternativeto.md` |
| SourceForge | Directory | Free | Open source projects | Developer audience | `sourceforge.md` |
| Softonic | Directory | Free | Software downloads | Consumer software | `softonic.md` |
| Crunchbase | Directory | Free | Startup database | High authority, investors | `crunchbase.md` |
| HackerNoon | Directory | Free | Tech publishing | Developer audience | `hackernoon.md` |
| Devpost | Directory | Free | Developer projects | Hackathon, dev showcase | `devpost.md` |

## Step 5: Execution Flow

**Key principle:** The agent does the work. Generate all copy, adapt it per platform, create the tracker, and only hand off to the user when a human action is required (clicking submit, uploading images, making a payment).

For each platform the user wants to launch on:

1. **Load the platform file** from `references/platforms/[platform].md`
2. **Adapt universal copy** to platform-specific requirements
3. **Generate platform-specific content** (tagline in their format, description at their length)
4. **Provide exact instructions:** URL to visit, exact fields to fill, exact copy to paste
5. **Include platform-specific tips** from the reference file
6. **Update the launch tracker** with status and next actions

When handing off, give: the exact URL, exact fields, and exact copy to paste.

## Step 6: Launch Tracker Management

Maintain `marketing/launch/launch-tracker.md` in the user's workspace with:

- **Platform name, category, status, date submitted, date approved/live, notes**
- **Next actions with dates**
- **Summary stats:** X submitted, Y approved, Z live
- **Status options:** Not Started, Drafting, Submitted, Pending Review, Approved, Live, Skipped, Rejected

Use `references/templates/launch-tracker.md` as the base template, pre-populated with all 56 platforms.

## Step 7: Image/Asset Specifications

Consolidate image specs across all platforms into one reference for user preparation:

### Universal Asset Requirements
| Asset Type | Size | Format | Notes |
|------------|------|--------|-------|
| **Logo** | Square (500x500px+) | PNG transparent | Readable at 40px |
| **Screenshots** | 1920x1080px+ | PNG/JPG | 3-5 images, real UI |
| **OG Image** | 1200x630px | PNG/JPG | Social media preview |
| **Demo Video** | Any | MP4 | 30-90 seconds |

### Platform-Specific Requirements
| Platform | Logo | Screenshots | Cover/OG | Max File Size |
|----------|------|-------------|----------|---------------|
| Product Hunt | 240x240+ square | 1270x952px or 2400x1260px | N/A | <500KB each |
| Hacker News | N/A | N/A (link to live demo) | N/A | N/A |
| BetaList | Square | 1200x750px recommended | Landing screenshot IS preview | Standard |
| Peerlist | Square (personal photo) | Fill ALL slots | 1200x630px cover | Standard |
| Most directories | Square | 2-3 minimum | 1200x630px OG image | 5MB typical |

This lets the user prepare assets ONCE for all platforms.

## Step 8: Launch Day Operations

Condensed playbooks for platforms where launch day is a live event:

### Product Hunt Launch Day Timeline
- **12:01 AM PST:** Go live, post maker comment immediately (with GIF)
- **First 2 hours:** Check if featured (homepage vs "All" tab)
- **Hours 0-4:** First wave outreach (EU/Asia supporters)
- **Hours 4-8:** Second wave (US East Coast), LinkedIn post
- **Hours 8-12:** Third wave (US West Coast), final community push
- **All day:** Reply to every comment within 5-10 minutes
- **Key rule:** Ask for "feedback" or "support," never "upvotes"

### Hacker News Launch Day Timeline
- **Post timing:** Sunday ~12:00 UTC or weekday 11:00-14:00 UTC
- **Immediately:** Post pre-written technical first comment
- **First 3-4 hours:** Be at keyboard, reply with technical depth
- **Watch ratio:** Comments exceeding upvotes at 40+ = controversy penalty
- **Never ask for upvotes** (HN detects coordination from 5-6 accounts)

### Weekly Platform Engagement (Peerlist, TinyLaunch, LaunchIgniter, PeerPush)
- **Engage with other launches** in your weekly batch (reciprocity)
- **Post 2-3 updates** during the week (don't launch and leave)
- **Respond to all comments** within 24 hours
- **Share launch link** on social media and relevant communities

## File Router Reference

When you need to prep a specific platform submission, load the corresponding reference file:

| Platform | Reference File |
|----------|----------------|
| Product Hunt | `references/platforms/producthunt.md` |
| AppSumo | `references/platforms/appsumo.md` |
| Hacker News | `references/platforms/hackernews.md` |
| BetaList | `references/platforms/betalist.md` |
| Indie Hackers | `references/platforms/indiehackers.md` |
| G2 | `references/platforms/g2.md` |
| DevHunt | `references/platforms/devhunt.md` |
| Uneed | `references/platforms/uneed.md` |
| Fazier | `references/platforms/fazier.md` |
| MicroLaunch | `references/platforms/microlaunch.md` |
| Peerlist | `references/platforms/peerlist.md` |
| TinyLaunch | `references/platforms/tinylaunch.md` |
| Tiny Startups | `references/platforms/tinystartups.md` |
| SideProjectors | `references/platforms/sideprojectors.md` |
| LaunchIgniter | `references/platforms/launchigniter.md` |
| PeerPush | `references/platforms/peerpush.md` |
| TrustMRR | `references/platforms/trustmrr.md` |
| Aura++ | `references/platforms/auraplusplus.md` |
| DesiFounder | `references/platforms/desifounder.md` |
| Firsto | `references/platforms/firsto.md` |
| indie.deals | `references/platforms/indiedeals.md` |
| Lab Startups | `references/platforms/labstartups.md` |
| Launchboard | `references/platforms/launchboard.md` |
| LaunchFast | `references/platforms/launchfast.md` |
| LaunchIt | `references/platforms/launchit.md` |
| Launch Your App | `references/platforms/launchyourapp.md` |
| Launching Next | `references/platforms/launchingnext.md` |
| Rank In Public | `references/platforms/rankinpublic.md` |
| Selected | `references/platforms/selected.md` |
| Startup Stash | `references/platforms/startupstash.md` |
| TryLaunch | `references/platforms/trylaunch.md` |
| SaaSHub | `references/platforms/saashub.md` |
| Capterra | `references/platforms/capterra.md` |
| OpenAlternative | `references/platforms/openalternative.md` |
| LibHunt | `references/platforms/libhunt.md` |
| Toolfolio | `references/platforms/toolfolio.md` |
| SaaS Genius | `references/platforms/saasgenius.md` |
| There's an AI for that | `references/platforms/theresanaiforthat.md` |
| AlternativeTo | `references/platforms/alternativeto.md` |
| SourceForge | `references/platforms/sourceforge.md` |
| Softonic | `references/platforms/softonic.md` |
| Crunchbase | `references/platforms/crunchbase.md` |
| HackerNoon | `references/platforms/hackernoon.md` |
| Devpost | `references/platforms/devpost.md` |
| RocketHub | `references/platforms/rockethub.md` |
| StackSocial | `references/platforms/stacksocial.md` |
| SaaS Mantra | `references/platforms/saasmantra.md` |
| SaaS Warrior | `references/platforms/saaswarrior.md` |
| LTD Hunt | `references/platforms/ltdhunt.md` |
| KEN Moo | `references/platforms/kenmoo.md` |
| Prime Club | `references/platforms/primeclub.md` |
| SaaSZilla | `references/platforms/saaszilla.md` |
| SaaS Pirate | `references/platforms/saaspirate.md` |
| Product Canyon | `references/platforms/productcanyon.md` |
| Deal Mirror | `references/platforms/dealmirror.md` |
| Dealify | `references/platforms/dealify.md` |

Each file contains exact submission requirements, strategy tips, hard rules that cause rejection, and pre/post-launch checklists.

## Cross-Platform Timing & Coordination

Factor these cadences into launch sequencing:

| Platform | Cadence | Lead Time | Notes |
|----------|---------|-----------|-------|
| Product Hunt | Daily reset 12:01 AM PST | Schedule in advance | 30+ day account history recommended |
| Hacker News | Anytime | Immediate | Best: Sunday 12:00 UTC or weekday 11-14 UTC |
| BetaList (free) | Rolling queue | ~2 month wait | Alternative: priority for $99 |
| Peerlist | Weekly (Monday launches) | Schedule specific Monday | Dev community focus |
| TinyLaunch | Weekly windows | Submit before window | Indie maker focus |
| LaunchIgniter | Weekly (Monday 00:00 UTC) | Choose launch week | SaaS/AI focus |
| Uneed (free) | Rolling queue | Weeks-months wait | Alternative: paid for $30 |
| All others | Rolling review | Hours-days | Minimal wait times |

**SEO Value Note:** Submitting to all platforms generates 28+ dofollow backlinks from DR 48-90+ domains. Even with zero traffic, the backlink portfolio is worth hundreds of dollars in SEO value.

## Related Skills

- **launch-strategy**: High-level launch phasing (ORB framework, 5-phase approach) — use for strategic planning before this skill
- **email-sequences**: For launch and onboarding email sequences
- **page-cro**: For optimizing launch landing pages
- **direct-response-copy**: For refining platform copy
- **social-campaign**: For coordinating social posts around launch days
- **marketing-psychology**: For psychology behind waitlists and exclusivity
- **competitor-alternatives**: For comparison pages mentioned in post-launch
