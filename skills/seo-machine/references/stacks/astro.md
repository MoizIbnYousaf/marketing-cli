# Stack adapter — Astro

Astro is the cleanest fit for this skill: static-first, content-collections built-in, fast crawl performance, trivially indexable.

## Conventions to use

- **Content collections** for each pattern. Define schemas in `src/content/config.ts`.
- **Dynamic routes** via `src/pages/[pattern]/[slug].astro` with `getStaticPaths` from the collection.
- **Layouts** in `src/layouts/<Pattern>Layout.astro` — shared structure.
- **Sitemap** via `@astrojs/sitemap` integration (or hand-rolled `src/pages/sitemap.xml.ts`).
- **Schema/meta** in each layout's `<head>` via slot data.

## Content collection setup

`src/content/config.ts`:

```typescript
import { defineCollection, z } from 'astro:content'

const alternatives = defineCollection({
  type: 'data',
  schema: z.object({
    competitor_name: z.string(),
    hero_eyebrow: z.string(),
    hero_h1: z.string(),
    hero_lede: z.string(),
    table_h2: z.string(),
    table_lede: z.string(),
    comparison_rows: z.array(z.object({ /* ... */ })),
    switch_reasons: z.array(z.object({ /* ... */ })),
    honesty_rows: z.array(z.object({ feature: z.string(), body: z.string() })),
    faqs: z.array(z.object({ question: z.string(), answer: z.string() })),
    // ...
  }),
})

const useCases   = defineCollection({ type: 'data', schema: /* ForData */ })
const comparisons = defineCollection({ type: 'data', schema: /* ComparisonData */ })
const playbooks  = defineCollection({ type: 'content', schema: /* metadata only; body in MDX */ })

export const collections = { alternatives, useCases, comparisons, playbooks }
```

Each entry lives in `src/content/alternatives/<slug>.json` (or `.yaml`). Schema enforces shape.

## Pattern A — `src/pages/alternatives/[slug].astro`

```astro
---
import { getCollection } from 'astro:content'
import AlternativeLayout from '@/layouts/AlternativeLayout.astro'

export async function getStaticPaths() {
  const entries = await getCollection('alternatives')
  return entries.map(entry => ({ params: { slug: entry.id }, props: { data: entry.data } }))
}

const { data } = Astro.props
---
<AlternativeLayout data={data} />
```

The layout handles `<head>` (title, description, canonical, OG, JSON-LD) and renders the body.

## Pattern E — playbooks in MDX

Astro's content collections support MDX natively. Put each playbook in `src/content/playbooks/<slug>.mdx` with frontmatter:

```mdx
---
title: "B2B social media strategy: a 2,500-word playbook"
slug: "b2b-social-media-strategy"
date_published: 2026-01-15
read_time_min: 18
related: [...]
---

import PlaybookLayout from '@/layouts/PlaybookLayout.astro'
import VignetteCard from '@/components/VignetteCard.astro'

# Section 1

Body content here, freely interleaving MDX components.

<VignetteCard scenario="..." surprise="..." lesson="..." />

# Section 2
...
```

Renders via `src/pages/playbooks/[slug].astro` with `getCollection('playbooks')`.

## Sitemap

Use the `@astrojs/sitemap` integration. It auto-discovers all pages including dynamic routes.

```javascript
// astro.config.mjs
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://example.com',
  integrations: [sitemap({
    filter: (page) => !page.includes('/admin'),
    lastmod: new Date('2026-MM-DD'),  // bump on phase merges, or use file mtime
  })],
})
```

## JSON-LD pattern in layouts

```astro
---
const { data } = Astro.props
const faqSchema = data.faqs && {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: data.faqs.map(f => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
}
---
<html>
  <head>
    <title>{data.meta_title}</title>
    <meta name="description" content={data.meta_description}>
    <link rel="canonical" href={canonical}>
    {faqSchema && <script type="application/ld+json" set:html={JSON.stringify(faqSchema)} />}
  </head>
  <!-- body -->
</html>
```

## File-write checklist for any phase

- [ ] Data file added at `src/content/<pattern>/<slug>.json` (or MDX for playbooks)
- [ ] Schema validates (`npm run astro check` or build)
- [ ] Sibling page references updated (≥2 spots in other content files)
- [ ] Sitemap rebuilds (automatic if using `@astrojs/sitemap`)
- [ ] `npm run build` succeeds and emits the new page to `dist/`
- [ ] Verify HTML output: `grep -c '<h1' dist/alternatives/<slug>/index.html` — must be >0
- [ ] `docs/seo-machine.md` tracker row updated in same commit

## Astro-specific advantages

- **Zero JS by default.** Marketing pages ship pure HTML/CSS — fastest possible LCP, best Core Web Vitals.
- **Content collections enforce schema** — typos in data files fail the build.
- **MDX is first-class** — playbooks can use React/Vue/Svelte components inline without bundle overhead.

## Astro-specific gotchas

- **Don't use client-side React for marketing copy.** Use Astro components or framework components with `client:visible` only for interactive widgets, never for static text.
- **`getStaticPaths` runs at build time.** Adding a new entry requires a rebuild + redeploy. Plan to deploy on every phase merge.
- **`Astro.glob` is deprecated in v4+** — use content collections.
