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
