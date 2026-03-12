# YAML Frontmatter Schema for Marketing Learnings

## Required Fields

- **project** (string): Project name (e.g., "CEO App", "Halaali", "HalalScreen", "SkillCreator")
- **date** (string): ISO 8601 date (YYYY-MM-DD)
- **learning_type** (enum): One of [campaign_result, ab_test_result, launch_outcome, content_insight, audience_discovery, channel_finding, strategy_learning, seo_finding]
- **channel** (enum): One of [email, social_organic, social_paid, seo, content_marketing, referral, partnerships, direct, paid_search, community]
- **content_format** (enum): One of [email_sequence, single_email, blog_post, landing_page, social_post, video, lead_magnet, newsletter, webinar, case_study, comparison_page, free_tool]
- **metrics** (array): 1-5 specific measurable outcomes (include numbers and comparisons)
- **impact** (enum): One of [breakthrough, significant, incremental, negative]

## Optional Fields

- **audience_segment** (string): Which audience segment this applies to
- **tags** (array): Searchable keywords (lowercase, hyphen-separated), max 8 items
- **related_projects** (array): Other projects this learning applies to

## Enum Definitions

### learning_type

| Value | When to use |
|-------|------------|
| `campaign_result` | Email campaign, ad campaign, launch campaign — any coordinated marketing push with measurable results |
| `ab_test_result` | Controlled test comparing two or more variants |
| `launch_outcome` | Product launch, feature launch, or major release results |
| `content_insight` | Learning about what content resonates, formats that work, topics that engage |
| `audience_discovery` | New understanding about who your audience is, what they want, how they behave |
| `channel_finding` | Learning about which channels work, platform-specific behaviors, distribution insights |
| `strategy_learning` | Higher-level strategic insight — pricing, positioning, competitive, go-to-market |
| `seo_finding` | Search-specific learning — keyword performance, ranking factors, technical SEO |

### channel

| Value | Description |
|-------|------------|
| `email` | Email campaigns, sequences, newsletters |
| `social_organic` | Organic social media (Twitter/X, LinkedIn, Instagram, TikTok, etc.) |
| `social_paid` | Paid social ads (Meta Ads, Twitter Ads, LinkedIn Ads, etc.) |
| `seo` | Organic search traffic |
| `content_marketing` | Blog, podcast, video content that drives awareness |
| `referral` | Word-of-mouth, referral programs, affiliate |
| `partnerships` | Co-marketing, integrations, joint ventures |
| `direct` | Direct outreach, cold email, DMs |
| `paid_search` | Google Ads, Bing Ads, search advertising |
| `community` | Forums, Discord, Slack communities, Reddit |

### content_format

| Value | Description |
|-------|------------|
| `email_sequence` | Multi-email drip or welcome sequence |
| `single_email` | One-off email blast or announcement |
| `blog_post` | Long-form article or blog content |
| `landing_page` | Dedicated conversion page |
| `social_post` | Individual social media post |
| `video` | Video content (YouTube, TikTok, Loom, etc.) |
| `lead_magnet` | Free resource offered in exchange for email |
| `newsletter` | Regular newsletter edition |
| `webinar` | Live or recorded presentation |
| `case_study` | Customer story or success study |
| `comparison_page` | Competitor comparison or alternative page |
| `free_tool` | Free tool or calculator for lead generation |

### impact

| Value | Description |
|-------|------------|
| `breakthrough` | Changes how we do marketing — 2x+ improvement or paradigm shift |
| `significant` | Meaningful improvement worth repeating — 20-100% improvement |
| `incremental` | Small optimization worth noting — 5-20% improvement |
| `negative` | Something that failed or hurt performance — equally valuable to document |

## Validation Rules

1. All required fields must be present
2. Enum fields must match allowed values exactly (case-sensitive)
3. metrics must be YAML array with 1-5 items
4. date must match YYYY-MM-DD format
5. tags should be lowercase, hyphen-separated
6. metrics should include specific numbers, not vague descriptions

## Category Mapping

Based on `learning_type`, documentation is filed in:

- **campaign_result** → `docs/learnings/campaign-results/`
- **ab_test_result** → `docs/learnings/ab-tests/`
- **launch_outcome** → `docs/learnings/launch-outcomes/`
- **content_insight** → `docs/learnings/content-insights/`
- **audience_discovery** → `docs/learnings/audience-discoveries/`
- **channel_finding** → `docs/learnings/channel-findings/`
- **strategy_learning** → `docs/learnings/strategy-learnings/`
- **seo_finding** → `docs/learnings/seo-findings/`

## Example

```yaml
---
project: CEO App
date: 2026-03-12
learning_type: campaign_result
channel: email
content_format: email_sequence
metrics:
  - "62% open rate (vs 28% industry average)"
  - "12% CTR across 5 emails"
  - "340 trial signups in first week"
audience_segment: solo founders
impact: breakthrough
tags: [email, welcome-sequence, personalization, subject-lines]
---
```
