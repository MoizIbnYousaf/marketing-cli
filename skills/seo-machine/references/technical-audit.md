# Technical Foundations Audit (Phase 0)

Always Phase 0. Always. Day-0 crawl shapes how Google understands the site for months — fixing technical foundations later is harder than getting them right the first time.

Four checks: **sitemap**, **robots.txt**, **meta tag uniqueness**, **schema markup**. Run them in order.

Use `scripts/tech_audit.py` for the deterministic parts. The script outputs a JSON report you can read and translate into Phase 0 tasks for the roadmap.

## Check 1 — sitemap.xml

**Goal:** every indexable URL appears in a valid sitemap, with reasonable lastmod, submitted to GSC.

Run:

```bash
# Local sitemap exists?
find . -name 'sitemap*.xml*' -not -path './node_modules/*' -not -path './.git/*' | head

# Production sitemap reachable?
curl -sI https://<domain>/sitemap.xml | head -1
curl -s https://<domain>/sitemap.xml | xmllint --noout - && echo "Valid XML"
```

If using Ahrefs MCP:
```
mcp__ahrefs__site-audit-issues
filter: category=indexing AND severity=high
```

Findings to convert into Phase 0 tasks:

| Finding | Phase 0 task |
|---|---|
| No sitemap at all | Generate sitemap (stack-specific path: `app/views/tools/sitemap.xml.erb` for Rails, `app/sitemap.ts` for Next.js, `@astrojs/sitemap` for Astro) |
| Sitemap exists but missing key URLs | Patch the sitemap generator to include them |
| `lastmod` dates in the future | Bump to today — future dates are a crawler red flag |
| `lastmod` dates stale (>180 days) on actively-updated pages | Tie `lastmod` to a build constant that bumps per deploy |
| Sitemap not referenced in `robots.txt` | Add `Sitemap: https://<domain>/sitemap.xml` to robots.txt |
| Sitemap not submitted to GSC | Add a checklist item in the off-page section |

## Check 2 — robots.txt + canonicals

```bash
# robots.txt exists and allows /?
curl -s https://<domain>/robots.txt

# Spot-check canonical tags on existing marketing pages
curl -s https://<domain>/ | grep -E 'rel="canonical"' | head
```

If using Ahrefs MCP:
```
mcp__ahrefs__site-audit-issues
filter: category=crawlability OR category=canonical
```

Common failures:

- **`User-agent: * Disallow: /`** in robots.txt (often from production-template defaults). Fix immediately.
- **Marketing routes blocked by accident.** Things like `/marketing/*` being in robots disallow because of a templating leftover.
- **Missing canonical tags** on pages that have query-param variants (sort, filter, pagination). Add canonical to the param-stripped URL.
- **Conflicting canonicals** — page points its canonical to a different URL, but that other URL doesn't canonical-point back consistently. Fix one direction.
- **Trailing-slash inconsistency.** `/alternatives/hootsuite` vs `/alternatives/hootsuite/` — pick one, redirect the other, canonical to the chosen one.

## Check 3 — meta tag uniqueness + length

For each page in the existing sitemap, fetch and extract `<title>` + `<meta name="description">`. Cross-reference.

```bash
# Get all URLs from sitemap
curl -s https://<domain>/sitemap.xml | grep -oE '<loc>[^<]+' | sed 's/<loc>//' > /tmp/urls.txt

# Fetch each and capture title + meta description
while read url; do
  echo "=== $url ==="
  curl -s "$url" | grep -E '<title>|name="description"' | head -2
done < /tmp/urls.txt > /tmp/meta-audit.txt
```

If using Ahrefs MCP:
```
mcp__ahrefs__site-audit-issues
filter: category=content AND (issue=duplicate_title OR issue=duplicate_description OR issue=title_too_long OR issue=description_too_long)
```

Failures to fix in Phase 0:

- **Duplicate titles across pages.** Each indexable URL needs a unique title.
- **Duplicate descriptions.** Same rule. CMS-default descriptions are a common offender.
- **Title >60 chars.** Get truncated in SERPs.
- **Description >155 chars.** Same.
- **Missing description.** Google auto-generates one; usually worse than what you'd write.
- **Multiple H1 tags on a single page.** Should be exactly 1.

## Check 4 — schema markup

Spot-check what JSON-LD currently exists on existing marketing pages:

```bash
curl -s https://<domain>/ | grep -oE 'application/ld\+json"[^<]*</script' | head
```

Common findings:
- No JSON-LD anywhere → add `SoftwareApplication` to the homepage as table-stakes
- Only `BreadcrumbList` → fine for nav but missing the page-type schemas
- Schemas exist but invalid (wrong `@type`, missing required fields) — validate via https://validator.schema.org/

Per-page-type schema requirements this skill enforces from Phase 1 onward:

| Page type | Required schemas |
|---|---|
| Homepage | `SoftwareApplication` (or `Product`), `Organization` |
| `/alternatives/[slug]` | `SoftwareApplication`, `BreadcrumbList`, `FAQPage` |
| `/for/[slug]` | `SoftwareApplication`, `BreadcrumbList`, `FAQPage` |
| `/compare/[slug]` | `BreadcrumbList`, `FAQPage` |
| `/playbooks/[slug]` | `Article`, `BreadcrumbList` |
| `/blog/[slug]` | `Article`, `BreadcrumbList` |
| `/tools/[slug]` | `SoftwareApplication` or `WebApplication`, `BreadcrumbList` |

If the user's stack doesn't already have a schema helper, Phase 0 builds one before any pattern phase runs. A helper saves rewriting the same JSON-LD boilerplate 30 times.

## Reporting findings

After running all four checks, write a Phase 0 entry to the roadmap that looks like:

```markdown
### Phase 0 — Technical foundations

**Why:** the day-0 crawl shapes Google's understanding of the site for months. Fix these before shipping content.

**Scope:**

1. Generate sitemap.xml at `<stack-appropriate-path>` (currently missing)
2. Add `Sitemap: https://<domain>/sitemap.xml` to robots.txt
3. Fix 3 duplicate `<title>` tags on `/`, `/pricing`, `/about`
4. Build `meta_tags_helper` with `add_software_application_schema` and `faqpage_jsonld` (or stack-equivalent)
5. Add `SoftwareApplication` JSON-LD to homepage
6. Submit sitemap to Google Search Console + Bing Webmaster Tools

**Files modified:**
- (auto-populate based on stack)

**Verification:**
- [ ] curl sitemap.xml returns 200 + valid XML
- [ ] robots.txt does not disallow marketing routes
- [ ] No duplicate titles in sitemap-listed URLs
- [ ] Schema validator returns 0 errors on homepage
- [ ] Sitemap submitted in GSC (manual; check off when done)
```

## What NOT to include in Phase 0

Don't try to fix Core Web Vitals or page speed in Phase 0. Those are real issues but they're not foundational; they're optimization. Run a Lighthouse audit in a separate phase after the foundations are right. Otherwise Phase 0 sprawls into a month-long performance pass.
