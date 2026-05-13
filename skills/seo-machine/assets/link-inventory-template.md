# {{PRODUCT_NAME}} — Internal Link Inventory

> Pre-populated list of every URL the SEO machine run can link to. Each pattern phase MUST pick links from this inventory and MUST update this file when it ships a new page.

## Existing pages (link targets)

### Homepage + core marketing

| Slug | URL | Title (anchor-text candidate) | Used by patterns |
|---|---|---|---|
| `/` | {{HOMEPAGE_URL}} | {{HOMEPAGE_TITLE}} | All |
| `/pricing` | {{PRICING_URL}} | Pricing | D (compare), E (playbooks) |
| `/about` | {{ABOUT_URL}} | About | (occasional) |

### Features

| Slug | URL | Title | Linked by |
|---|---|---|---|
{{FEATURES_INVENTORY}}

### Tools (free utilities)

| Slug | URL | Title | Linked by |
|---|---|---|---|
{{TOOLS_INVENTORY}}

### Blog posts

| Slug | URL | Title | Topic | Linked by |
|---|---|---|---|---|
{{BLOG_INVENTORY}}

---

## SEO-sprint-generated pages (linked OUT to siblings + IN from elsewhere)

### `/alternatives/[slug]`

| Slug | Ships in phase | URL | Inbound links from | Outbound links to |
|---|---|---|---|---|
{{ALTERNATIVES_TABLE}}

### `/for/[slug]`

| Slug | Ships in phase | URL | Inbound links from | Outbound links to |
|---|---|---|---|---|
{{FOR_TABLE}}

### `/compare/[slug]`

| Slug | Ships in phase | URL | Inbound links from | Outbound links to |
|---|---|---|---|---|
{{COMPARE_TABLE}}

### `/playbooks/[slug]`

| Slug | Ships in phase | URL | Inbound links from | Outbound links to |
|---|---|---|---|---|
{{PLAYBOOKS_TABLE}}

---

## Anchor-text variations (avoid repetition)

When linking to the same destination from multiple pages, vary the anchor text. Repeating "click here" or the page's exact title harms diversity signals.

Example acceptable variations for `/features/twitter-monitoring`:
- "monitor Twitter mentions"
- "real-time Twitter monitoring"
- "Twitter mention tracking"
- "our Twitter monitoring tool"
- "ReplySocial's Twitter watch feature"

When you ship a new page, append 4-5 anchor variations to this section so future phases can rotate them.
