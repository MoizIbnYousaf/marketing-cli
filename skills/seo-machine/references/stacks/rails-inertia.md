# Stack adapter — Rails + Inertia + React

This adapter mirrors the reference implementation from the repo this skill was built against. It's the most opinionated adapter because it's been pressure-tested over 49 phases.

## Conventions to use

- **Routes:** dispatch-by-slug. `get 'alternatives/:slug', to: 'marketing#alternatives_show'` — one controller action serves many pages from a single hash.
- **Data lives on the controller** as a frozen Ruby hash constant (e.g. `MarketingController::ALTERNATIVES`). Slug → payload. **No database tables for marketing copy** unless the user already has a CMS pattern.
- **Components in `app/frontend/components/`**, named `[Pattern]Layout.tsx`. One layout per pattern.
- **Page wrappers in `app/frontend/pages/[Pattern]/Show.tsx`** — thin wrappers that hydrate the layout from props.
- **Sitemap** in `app/views/tools/sitemap.xml.erb` (or wherever the sitemap lives) — loop over each pattern's hash and emit `<url>` entries.
- **SSR enabled** for marketing controllers via `inertia_config ssr_enabled: true` if the app's main controller has SSR disabled. **Marketing pages MUST be SSR or full-HTML so search and AI crawlers see content.**

## Adding a new alternative (Pattern A) — concrete steps

1. **Append to `MarketingController::ALTERNATIVES`** — add an entry with the slug as the key. Reference the existing `'hootsuite'` entry as the gold-standard structure.
2. **Append to one cluster in `MarketingController::ALTERNATIVES_CLUSTERS`** — without this, the new alt won't appear on `/alternatives` directory page.
3. **Internal-link updates:**
   - In ≥2 sibling alt entries' copy, add a reference to the new alt
   - In `MarketingLayout.tsx`'s "Compare" footer block, swap in the new alt if it's high-priority (replace a lower-volume entry)
4. **Smoke test:** `bin/rails test test/controllers/alternatives_smoke_test.rb` enforces 1:1 coverage between `ALTERNATIVES` and `ALTERNATIVES_CLUSTERS`.
5. **Sitemap auto-updates** — `app/views/tools/sitemap.xml.erb` loops `ALTERNATIVES.each_key`.
6. **Bump `ToolsController::SITEMAP_LASTMOD`** to today's date.

## Adding a new use-case/audience (Pattern B/C) — concrete steps

1. **Append to `MarketingController::USE_CASES`** — slug → `ForData` hash
2. **Internal-link updates:**
   - In ≥1 sibling `/for/*` entry's `related.siblings`, add the new slug
   - In ≥2 `/features/*` entries' related-links, add the new `/for/*`
3. **Sitemap auto-updates**

## Adding a new comparison (Pattern D) — concrete steps

1. **Append to `MarketingController::COMPARISONS`** with alphabetical slug
2. **Internal-link updates:**
   - In `MarketingController::ALTERNATIVES['a']` and `['b']` entries, add a "compare to [b]" link
   - In one relevant `/for/*` entry (the use-case both compete in), add a related-link to the new compare
3. **Sitemap auto-updates**

## Adding a new playbook (Pattern E) — concrete steps

1. **Append to `MarketingController::PLAYBOOKS`** with metadata
2. **Create `app/frontend/pages/Playbooks/[PascalCaseSlug].tsx`** — clone `B2bSocialMediaStrategy.tsx` and rewrite the body
3. **Internal-link updates:**
   - In ≥2 sibling playbooks' `related` arrays, add the new one
   - In `/playbooks` index, ensure auto-discovery works (it should via the hash)
4. **Sitemap auto-updates**

## Meta tags + schema

Use the existing helper pattern. If `meta_tags_helper.rb` exists:

```ruby
set_meta_tags(
  title: data[:meta_title],
  description: data[:meta_description],
  canonical: alternatives_show_url(slug: slug),
  open_graph: { type: 'website', image: og_image_for(slug) }
)
add_software_application_schema  # before_action sets this for marketing controllers
faqpage_jsonld(data[:faqs]) if data[:faqs].present?
```

If the helper doesn't exist yet, this is **Phase 0** work — build the helper before any pattern phase.

## File-write checklist for any phase

Before declaring a phase complete:

- [ ] Hash entry added (`ALTERNATIVES`, `USE_CASES`, `COMPARISONS`, or `PLAYBOOKS`)
- [ ] Cluster appended (alternatives only)
- [ ] Sibling page references added (≥2 spots)
- [ ] `SITEMAP_LASTMOD` bumped to today
- [ ] `test/controllers/*_smoke_test.rb` passes if present
- [ ] `bundle exec rubocop -a` clean
- [ ] Local server check: visit the URL, view-source confirms full SSR HTML (not just a React shell)
- [ ] `docs/seo-machine.md` tracker row updated in the same commit

## SSR sanity check (every phase)

After adding a page, visit it locally and run `curl -s http://localhost:3000/<url> | grep -c "<h1"`. If the result is 0, SSR is broken for that route — check:

1. Controller has `inertia_config ssr_enabled: true`
2. `puma.rb` includes `plugin :inertia_ssr`
3. `public/vite-ssr/ssr.js` was built (`bundle exec rails assets:precompile` in dev creates this)
4. Browser-only code (`window`, `document`) at module-init is wrapped in `if (!import.meta.env.SSR)`

A page that renders client-side but blanks in `curl` won't be indexed correctly.

## When this adapter doesn't fit perfectly

If the project is Rails but NOT Inertia (e.g. Rails + Hotwire/Turbo + ERB), most of this still applies — the difference is:

- Skip the React component step
- Build ERB partials in `app/views/marketing/alternatives/show.html.erb` instead
- Use `content_tag` helpers or partials for the comparison table

Switch to `rails-erb.md` for that flow.
