# Stack Detection

Goal: pick the right adapter reference file before generating any pages.

## Signal table

Run from the repo root. First match wins; if none match, fall back to `markdown-fallback.md`.

| Signal | Adapter |
|---|---|
| `Gemfile` contains `inertia_rails` | `rails-inertia.md` |
| `Gemfile` contains `rails` (no inertia) | `rails-erb.md` (or `markdown-fallback.md` if not present) |
| `package.json` has `next` in deps + `app/` directory present | `nextjs.md` (App Router) |
| `package.json` has `next` in deps + `pages/` directory present | `nextjs-pages.md` (or `nextjs.md` with a Pages-router note) |
| `astro.config.*` exists | `astro.md` |
| `package.json` has `@remix-run/*` | `remix.md` (or `markdown-fallback.md`) |
| `nuxt.config.*` exists | `nuxt.md` (or `markdown-fallback.md`) |
| `svelte.config.*` exists + SvelteKit deps | `sveltekit.md` (or `markdown-fallback.md`) |
| `_config.yml` (Jekyll) | `markdown-fallback.md` with Jekyll frontmatter notes |
| `config.toml` + Hugo signals | `markdown-fallback.md` with Hugo frontmatter notes |
| `gatsby-config.*` | `markdown-fallback.md` (Gatsby's prog-page API works with markdown) |
| None of the above | `markdown-fallback.md` |

## What to capture once detected

Add to `.seo/config.json`:

```json
{
  "stack": "nextjs-app-router",
  "language": "tsx",
  "marketing_route_prefix": "src/app",
  "marketing_layout": "src/app/(marketing)/layout.tsx",
  "components_dir": "src/components/marketing",
  "data_dir": "src/data/seo",
  "sitemap_path": "src/app/sitemap.ts",
  "robots_path": "public/robots.txt",
  "tailwind_config": "tailwind.config.ts",
  "ahrefs_project_id": null,
  "roadmap_path": "docs/seo-machine.md"
}
```

This config is read by every phase. If a value is null, the phase asks once and persists.

## Ambiguity resolution

When two adapters could match (e.g. Next.js with both `app/` AND `pages/` directories, common during migrations), ask the user via `AskUserQuestion`:

- "I see both `app/` and `pages/` directories. Which is the active marketing surface?"

Never assume. Use the answer to pick the adapter and write it to `.seo/config.json`.

## Marketing-pages-in-app vs marketing-pages-in-separate-repo

Both are valid. Ask if there's ambiguity:

- **In-app marketing** (this skill's reference repo): marketing controller/pages live alongside the product. `/alternatives/*` is served by the same Rails app as the product dashboard.
- **Separate marketing site**: a different repo (`marketing.example.com`) shipped to a different host (Vercel, Netlify, Cloudflare Pages). Often a static-site generator.

For separate marketing sites, this skill should be run *from the marketing-site repo*, not from the product app repo. Confirm if there's any doubt.
