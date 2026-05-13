# Quality Bars (Verification Gates)

Every page-shipping phase ends with a quality check. If it fails, fix it before declaring the phase complete. Don't ship under-spec work — it underperforms in rankings and you'll have to come back to fix it anyway.

## The four checks

| Check | Tool | Per pattern |
|---|---|---|
| Word count | `scripts/word_count.py` | A ≥600, B/C ≥800, D ≥700, E ≥2,500 |
| Internal-link minimums | `scripts/link_audit.py` | See per-pattern minimums below |
| Schema markup | Manual JSON-LD check (or `scripts/tech_audit.py`) | See per-pattern schema requirements |
| Honesty section (alts only) | Manual visual check | Pattern A only — 3-4 rows |

## Internal-link minimums (per pattern)

The skill enforces these via `scripts/link_audit.py`.

### Pattern A — `/alternatives/[slug]`

- **Outbound from this page:** ≥2 sibling `/alternatives/*`, ≥1 `/features/*`, ≥1 `/tools/*` (or stack-equivalent)
- **Inbound to this page:** ≥2 existing pages must link here. Common spots: homepage, sibling alts, related feature pages.

### Pattern B/C — `/for/[slug]`

- **Outbound:** ≥2 `/features/*`, ≥2 `/tools/*`, ≥1 sibling `/for/*`
- **Inbound:** ≥2 existing pages

### Pattern D — `/compare/[slug]`

- **Outbound:** `/alternatives/[a]`, `/alternatives/[b]`, ≥1 relevant `/for/*`, `/pricing`
- **Inbound:** both `/alternatives/[a]` and `/alternatives/[b]` link here

### Pattern E — `/playbooks/[slug]`

- **Outbound (in body, not sidebar):** ≥3 `/features/*`, ≥2 `/tools/*`, ≥2 `/for/*`, ≥1 `/alternatives/*`
- **Inbound:** ≥2 existing pages (commonly other playbooks + a related `/for/*`)

## Universal rule

**Every page must be reachable from ≥2 other pages.** No orphans. Check via:

```bash
# Find pages that nobody links to (orphans)
python scripts/link_audit.py --orphan-check
```

## Schema requirements (per pattern)

| Pattern | Required JSON-LD |
|---|---|
| Homepage | `SoftwareApplication` (or `Product`), `Organization` |
| `/alternatives/[slug]` | `SoftwareApplication`, `BreadcrumbList`, `FAQPage` |
| `/for/[slug]` | `SoftwareApplication`, `BreadcrumbList`, `FAQPage` |
| `/compare/[slug]` | `BreadcrumbList`, `FAQPage` |
| `/playbooks/[slug]` | `Article`, `BreadcrumbList` |
| `/tools/[slug]` | `SoftwareApplication` or `WebApplication`, `BreadcrumbList` |

Validate at https://validator.schema.org/ on the rendered URL. The skill can curl-and-check via `scripts/tech_audit.py --schema <url>`.

## Meta tag requirements (every page)

- Unique `<title>`, 30-60 chars
- Unique `<meta name="description">`, 100-155 chars
- `<link rel="canonical">` set to the absolute URL (no query params, no trailing slash if your convention is slashless)
- `<meta property="og:type">`, `og:title`, `og:description`, `og:image`, `og:url`
- `<meta name="twitter:card">` (`summary_large_image` is standard)
- Exactly one `<h1>` per page

## Honesty section (Pattern A only)

Verify presence visually. The section must have:

- An eyebrow + H2 labelling it (e.g. "Honest tradeoffs" / "Where [competitor] still wins")
- 3-4 rows, each with a feature/dimension and a 30+ word body
- Concrete: each row references a specific feature, not a vague "they're more polished"
- Honest: each row should be a real strength of the competitor, not a fake weakness in you

If the honesty section is missing or thin, the phase fails the quality gate. Rewrite before shipping.

## Verification gate flow

When a phase's page work is done:

1. Run `python scripts/word_count.py <stack-output-path>` — must be ≥ pattern minimum
2. Run `python scripts/link_audit.py --slug <slug> --pattern <a|b|c|d|e>` — must pass
3. If applicable, run `python scripts/tech_audit.py --schema <url>` — must validate
4. Manually verify honesty section (Pattern A)
5. Visit URL in browser, view-source, confirm:
   - Full SSR HTML (search engines see content)
   - Title + description + canonical present
   - JSON-LD blocks render
6. **Only after all pass:** update tracker row to `completed` and write the phase summary

A failing gate is information, not blame. Often it surfaces:
- A thin section that needed more depth
- A missing internal link (easy to forget)
- A schema helper that didn't fire (existing helper has a bug)

Fix the root cause; don't paper over it.
