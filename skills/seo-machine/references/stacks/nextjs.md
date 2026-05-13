# Stack adapter — Next.js (App Router)

For Next.js 13+ with the `app/` directory. For Pages Router, see `nextjs-pages.md`.

## Conventions to use

- **Routes:** file-based via `app/[pattern]/[slug]/page.tsx`. Use `generateStaticParams` for build-time generation.
- **Data:** TypeScript constants in `src/data/seo/<pattern>.ts`, exported as typed records keyed by slug.
- **Components:** shared layouts in `src/components/marketing/<Pattern>Layout.tsx`.
- **Metadata:** Next's `generateMetadata` per route to emit dynamic titles/descriptions/OG.
- **Sitemap:** `app/sitemap.ts` exporting a function that returns all URLs.
- **Schema:** JSON-LD via `<Script type="application/ld+json">` in each page component.

## Pattern A — `/alternatives/[slug]/page.tsx`

```
src/
├── data/seo/alternatives.ts        # AlternativeData by slug
├── components/marketing/
│   └── AlternativeLayout.tsx       # shared layout
└── app/(marketing)/alternatives/
    ├── page.tsx                    # /alternatives directory
    └── [slug]/
        └── page.tsx                # /alternatives/[slug]
```

The `[slug]/page.tsx` exports:

- `generateStaticParams()` → returns `Object.keys(ALTERNATIVES).map(slug => ({ slug }))`
- `generateMetadata({ params })` → returns `{ title, description, openGraph, alternates: { canonical } }`
- Default export → React component reading `ALTERNATIVES[params.slug]`, rendering `<AlternativeLayout />`, including `<Script>` for JSON-LD

## Pattern B/C — `/for/[slug]/page.tsx`

Same shape as Pattern A but for `USE_CASES` data and `ForLayout`.

## Pattern D — `/compare/[slug]/page.tsx`

Same shape, `COMPARISONS` data, `ComparisonLayout`.

## Pattern E — `/playbooks/[slug]/page.tsx`

Different from A-D — playbooks are long-form components rather than data-driven.

Option 1 (recommended for ≤20 playbooks): one file per playbook, `app/playbooks/[slug]/page.tsx` is a switch / dynamic import based on slug. Each playbook is its own component in `src/content/playbooks/<slug>.tsx`.

Option 2 (for many playbooks): MDX in `src/content/playbooks/<slug>.mdx`, rendered via `next-mdx-remote` or `@next/mdx`. The MDX files can use the `PlaybookLayout` component with frontmatter.

## Sitemap (`app/sitemap.ts`)

```typescript
import { MetadataRoute } from 'next'
import { ALTERNATIVES } from '@/data/seo/alternatives'
import { USE_CASES } from '@/data/seo/use-cases'
import { COMPARISONS } from '@/data/seo/comparisons'
import { PLAYBOOKS } from '@/data/seo/playbooks'

const SITE = 'https://example.com'
const lastModified = new Date('2026-MM-DD')  // bump on every phase merge

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []
  for (const slug of Object.keys(ALTERNATIVES))   entries.push({ url: `${SITE}/alternatives/${slug}`, lastModified, changeFrequency: 'monthly', priority: 0.8 })
  for (const slug of Object.keys(USE_CASES))      entries.push({ url: `${SITE}/for/${slug}`,         lastModified, changeFrequency: 'monthly', priority: 0.8 })
  for (const slug of Object.keys(COMPARISONS))    entries.push({ url: `${SITE}/compare/${slug}`,     lastModified, changeFrequency: 'monthly', priority: 0.7 })
  for (const slug of Object.keys(PLAYBOOKS))      entries.push({ url: `${SITE}/playbooks/${slug}`,   lastModified, changeFrequency: 'monthly', priority: 0.7 })
  return entries
}
```

## Per-page JSON-LD pattern

```tsx
<Script
  id="ld-faqpage"
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: data.faqs.map(f => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    }),
  }}
/>
```

Render in the page component, not the layout. One JSON-LD `<Script>` per schema type.

## File-write checklist for any phase

- [ ] Data entry added to `src/data/seo/<pattern>.ts`
- [ ] `generateStaticParams` will pick it up (no manual route registration needed)
- [ ] Sibling page references updated (≥2 spots in other data files)
- [ ] Sitemap `lastModified` constant bumped
- [ ] `next build` succeeds and includes the new route in the build manifest
- [ ] Local SSR check: `curl -s http://localhost:3000/<url> | grep '<h1'` — H1 must be in the response
- [ ] `docs/seo-sprint.md` tracker row updated in same commit

## App Router gotchas

- **Server components by default** — good for SEO (full HTML in response). Only opt into `"use client"` for islands of interactivity.
- **Metadata is per-route, not per-layout.** Each `page.tsx` must export `generateMetadata` (or static `metadata`).
- **Canonical URLs need explicit setting** via `metadata.alternates.canonical`. Next does NOT auto-emit canonical tags.
- **OG images** — co-locate `opengraph-image.tsx` next to the page if you want dynamic OG via Next's image generation. Otherwise reference a static image URL in `openGraph.images`.
