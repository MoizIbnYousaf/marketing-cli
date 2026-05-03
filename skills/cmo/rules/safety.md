---
name: cmo-safety
description: |
  Safety rules for external actions, rate limiting, and tool usage.
  Prevents accidental publishing, data leaks, and SaaS dependency.
---

# Safety Rules

## External Actions

Any action that reaches the outside world requires `--dry-run` first.

### Posting to social media

```bash
# Always dry-run first
ply "Go to twitter.com and compose: {content}" --dry-run

# Only after user approves the preview
ply "Go to twitter.com and compose: {content}"
```

### Sending emails

```bash
# Always dry-run first
gws send --to user@example.com --subject "..." --body "..." --dry-run

# Only after user approves
gws send --to user@example.com --subject "..." --body "..."
```

### Publishing content

Never publish directly. Always:
1. Generate content to a file
2. Show the user the preview
3. Get explicit "publish" confirmation
4. Execute the publish action

## Rate Limiting

- Maximum 3 social posts per platform per session unless the user explicitly asks for more.
- Maximum 1 email blast per session. Always confirm recipient list.
- Maximum 10 pages in a single programmatic SEO batch. Review samples before scaling.

## Agentic Tools Only

Do not reference or depend on SaaS dashboard tools. The system uses CLI-native tools only:

| Need | Tool | Not This |
|------|------|----------|
| Send email | `gws` | Mailchimp, ConvertKit, HubSpot |
| Post to social | `ply`, `playwright-cli` | Buffer, Hootsuite, Later |
| Generate video | `remotion`, `ffmpeg` | Loom, Canva Video |
| Web research | Exa MCP (primary), `firecrawl` (scraping) | Ahrefs, SEMrush, Moz, Claude native WebSearch |
| Analytics | PostHog, GA4 API | Dashboard-only tools |

If a user mentions a SaaS tool they already use, that's fine — integrate with their existing stack. But never suggest or require a new SaaS signup.

## File Safety

- Never write outside the project directory. All paths must be relative to project root.
- Never read or write `.env` files in skill output. Reference `brand/stack.md` instead.
- Never include API keys, tokens, or credentials in generated content.
- All generated files go to `brand/`, `campaigns/`, or `marketing/` directories.

## Brand Data Privacy

- Brand voice profiles, audience data, and competitive intel are project-private.
- Never include brand data in external API calls unless the user explicitly requests it.
- When using web research tools, search for public information only.

## Content Safety

- Generated copy must not make false claims or unverifiable statistics.
- When using estimated data (no web research connected), prefix with `~` and note it is estimated.
- Never generate content that impersonates real people or brands.
- Flag potential legal issues (trademark, copyright) when they arise.
