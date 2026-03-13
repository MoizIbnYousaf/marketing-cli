# User Testing

**What belongs here:** Testing surface details, resource costs, validation approach.

---

## Validation Surface

- **Primary surface:** Browser (localhost:3200)
- **Tool:** agent-browser v0.17.1 (installed at ~/.factory/bin/agent-browser)
- **Alternative:** Playwright v1.58.2 (available via npx)
- **Setup required:** Start Next.js dev server on port 3200 before testing

### How to Start the Dev Server
```bash
cd /Users/moizibnyousaf/projects/mktg/website
PORT=3200 bun run dev
```
Wait for healthcheck: `curl -sf http://localhost:3200`

### What to Test
- All sections render in correct order
- Interactive elements: nav links, terminal tabs, copy-to-clipboard, CTA buttons
- Responsive: test at 375px, 768px, 1024px viewports
- Scroll behavior: anchor links, sticky nav, section animations
- Accessibility: keyboard nav, focus states, reduced motion

## Validation Concurrency

- **Machine:** 64 GB RAM, 20 CPU cores
- **Available headroom:** ~25.6 GB RAM available
- **70% budget:** ~17.9 GB
- **Per agent-browser instance:** ~300 MB (lightweight static site)
- **Dev server cost:** ~200 MB
- **Max concurrent validators: 5**
- **Rationale:** 5 instances × 300 MB = 1.5 GB + 200 MB dev server = 1.7 GB total, well within 17.9 GB budget. CPU is not the bottleneck with 20 cores.

## Flow Validator Guidance: browser

- **Surface:** `http://localhost:3200`
- **Isolation boundary:** Each validator must use its own dedicated browser session and stay inside that session for the full run. For this milestone, use mission-scoped session IDs like `0f916ecfbd72__u1`, `0f916ecfbd72__u2`, etc.
- **Shared-state rules:** The site is a static single-page website, so validators may run concurrently against the same dev server. Do not change source files, restart the server, or rely on another validator's scroll position, tab state, or mobile menu state.
- **Scope discipline:** Only verify the assertion IDs assigned to your flow. Do not treat content-and-polish placeholders (`#skills`, `#testimonials`, `#install`) as failures unless an assigned assertion explicitly targets them.
- **Evidence expectations:** Save screenshots and any extracted DOM/CSS measurements under the assigned evidence directory. Record concrete selectors, computed styles, viewport sizes, and observed behavior in the flow report.
- **Cleanup:** Close the assigned browser session before finishing so no mission sessions are left running.

### Tooling Notes

- When validating CSS scroll lock in the mobile nav, prefer real wheel input over programmatic `scroll down` helpers. On this site, programmatic scroll commands can bypass `body { overflow: hidden; }`, while mouse-wheel input preserved the real user-visible lock state.
- If `agent-browser` request capture returns no entries for the local static page, use the browser Performance API (`performance.getEntriesByType(...)`) as fallback network evidence for document and asset loads.
