# Environment

**What belongs here:** Required env vars, external dependencies, setup notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## Runtime
- Node v25.6.0
- Bun 1.3.8
- macOS (darwin 25.3.0)
- 64 GB RAM, 20 CPU cores

## Project Structure
- mktg CLI source: `/Users/moizibnyousaf/projects/mktg/src/`
- Website: `/Users/moizibnyousaf/projects/mktg/website/` (Next.js app)
- Website is a SEPARATE project within the mktg monorepo — has its own package.json, tsconfig, etc.
- Do NOT modify anything outside `website/` directory

## External Dependencies
- None. Fully static site, no database, no API, no external services.
- Deployment target: Vercel (static export)

## Known Gotchas
- Root `.gitignore` ignores `bun.lock` globally, so nested Bun project lockfiles like `website/bun.lock` remain untracked unless the ignore rules change.
- Canonical product copy in root metadata/docs currently says `39 skills`; some website copy and prerecorded demo content still reference `35`, so future website edits should cross-check root docs until there is a single shared source of truth.
