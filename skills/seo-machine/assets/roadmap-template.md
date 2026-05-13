# {{PRODUCT_NAME}} SEO Machine — Roadmap

> **Canonical document.** This file is the single source of truth for the multi-phase SEO machine run. Every worktree/agent picking up SEO work on this project reads this file first.

---

## How to use this document

**Fresh agent or new worktree?** Do this:

1. Read this entire `docs/seo-machine.md` file.
2. Read the **Reference Data**, **Conventions**, and **Keyword Research Appendix** sections ONCE — they're shared facts every phase depends on. Don't re-research.
3. Find the next pending phase in the **Phase Status Tracker**.
4. Read the phase section. It is fully self-contained.
5. Execute. Verify against the per-phase verification gate.
6. **In the same commit as the work,** flip the tracker row to `completed` and append the PR number after it merges.
7. Open the PR. Stop. Hand off.

**Don't modify** Reference Data, Conventions, Keyword Appendix, or Phases without explicit user instruction — they are stable contracts.

**You may freshly query Ahrefs** if you need data not pre-baked into your phase (current pricing, recent SERP shifts). Ahrefs project_id is in `.seo/config.json`.

---

## Phase Status Tracker

| # | Phase | Pattern | Status | PR |
|---|---|---|---|---|
| 0 | Technical foundations | Setup | pending | – |
{{TRACKER_ROWS}}

**Conventions:**
- `pending` → `in_progress` (when worktree starts) → `completed` (in same commit as PR)
- PR column: `branch \`name\` (PR TBD)` then update to `#NNN` after `gh pr create`
- If a phase is abandoned, status = `skipped` with one-line reason

---

## Reference Data (read once per agent)

### 1. Site facts

- **Domain:** {{DOMAIN}}
- **Ahrefs project_id:** {{AHREFS_PROJECT_ID}}  (from `.seo/config.json`)
- **Domain Rating:** {{DR}}  (as of {{DR_DATE}}) — caps KD targets at ≤{{DR_CAP}} while DR is still climbing
- **Stack:** {{STACK}}
- **Brand accent color:** {{ACCENT}}
- **Hero font / body font:** {{FONTS}}
- **Marketing pages root:** {{MARKETING_ROOT}}

### 2. Existing programmatic surface (DO NOT DUPLICATE)

{{EXISTING_PROGRAMMATIC_TABLE}}

### 3. Critical files

| File | What lives there |
|---|---|
{{CRITICAL_FILES_TABLE}}

### 4. Data shapes

See `~/.claude/skills/seo-machine/references/patterns/<pattern>.md` for full TypeScript interface per pattern. Stack-specific serialization in `references/stacks/<stack>.md`.

### 5. Conventions

**URL slugs:** lowercase, hyphenated, never underscored.

**Honesty section is non-negotiable** on every `/alternatives/[brand]` page. 3-4 honest tradeoffs admitting where the competitor wins. Brand signal + Google quality signal.

**Plural-form capture (Pattern A):** Every alt page's first H2 must read "Best [Brand] alternatives in {{YEAR}}". Plural keyword is 2-3× volume of singular.

**Internal-link minimums per page:**
- `/alternatives/*` → ≥2 sibling alts + ≥1 feature + ≥1 tool
- `/for/*` → ≥2 features + ≥2 tools + ≥1 sibling `/for/`
- `/compare/*` → both alts + ≥1 `/for/` + `/pricing`
- `/playbooks/*` → ≥3 features + ≥2 tools + ≥2 `/for/` + ≥1 alt
- Every page reachable from ≥2 other pages

**Word counts:**
- `/alternatives/*`: ≥600 words
- `/for/*`: ≥800
- `/compare/*`: ≥700
- `/playbooks/*`: ≥2,500

**Schema:** `BreadcrumbList` (auto), `FAQPage` (where FAQ section), `SoftwareApplication`/`Article` (page-type-dependent).

---

## Keyword Research Appendix

All numbers from Ahrefs (or manual sources). Re-query if a phase is executed >90 days from now.

### A.1 — `/alternatives/[brand]` candidates

{{ALTERNATIVES_RESEARCH_TABLE}}

### A.2 — `/for/[use-case]` candidates

{{USE_CASE_RESEARCH_TABLE}}

### A.3 — `/for/[audience]` candidates

{{AUDIENCE_RESEARCH_TABLE}}

### A.4 — `/compare/[a-vs-b]` candidates

{{COMPARE_RESEARCH_TABLE}}

### A.5 — `/playbooks/[topic]` candidates

{{PLAYBOOK_RESEARCH_TABLE}}

### A.6 — Striking-distance (positions 5-20 in GSC)

{{STRIKING_DISTANCE_TABLE}}

### A.7 — Already-saturated head terms (avoid)

{{SATURATED_TABLE}}

### A.8 — Out of scope (intentionally excluded)

{{OUT_OF_SCOPE}}

---

## Phases

> Each phase is a single deployable PR. Pre-bake everything needed; re-query Ahrefs only for fresh competitor pricing/features at execution time. Mark `in_progress` when you start, `completed` (with PR link) when merged.

### Phase 0 — Technical foundations

**Why:** the day-0 crawl shapes how Google understands the site for months. Fix these before shipping any content.

**Scope:** see `~/.claude/skills/seo-machine/references/technical-audit.md` for the full audit recipe. Common Phase 0 tasks:

1. Generate/verify sitemap.xml
2. Verify robots.txt allows crawling and references sitemap
3. Add unique title + description to existing pages
4. Build schema helper for the stack (`SoftwareApplication`, `FAQPage`, `BreadcrumbList`, `Article` factories)
5. Submit sitemap to Google Search Console + Bing Webmaster Tools

**Files modified:** auto-populate from audit findings.

**Verification:**
- [ ] `python ~/.claude/skills/seo-machine/scripts/tech_audit.py --domain {{DOMAIN}}` returns 0 critical findings
- [ ] Sitemap submitted in GSC (manual check)

{{ADDITIONAL_PHASES}}

---

## Off-page checklist

See `~/.claude/skills/seo-machine/references/off-page.md` for full strategy. Track submission status here:

### Directory submissions (starter stack)

- [ ] Product Hunt — scheduled launch
- [ ] G2 — submitted product page
- [ ] Capterra
- [ ] SaaSHub
- [ ] AlternativeTo — list as alternative to: {{COMPETITORS}}
- [ ] Indie Hackers
- [ ] Crunchbase

### Listicle outreach targets

See `.seo/backlink-targets.json` for the Ahrefs-researched target list.

### Founder link trades

(populate as opportunities surface)

---

## Glossary

- **DR** — Ahrefs Domain Rating, 0-100 score of backlink authority
- **KD** — Ahrefs Keyword Difficulty, 0-100 score of ranking difficulty for a keyword
- **TP** — Traffic Potential, Ahrefs' estimate of total clicks the top-ranking page captures across all related keywords
- **Striking distance** — pages currently ranking position 5-20 in GSC, one push from page 1
- **Pattern A/B/C/D/E** — the five page patterns this skill bundles (alternatives, use-case, audience, compare, playbook)
