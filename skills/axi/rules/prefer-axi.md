# Prefer AXI — Decision Tree

The question is not "MCP vs CLI". It is **which interface is agent-ergonomic**. AXI is a principled CLI design that, on the published benches, leads both raw CLI and MCP on success, cost, duration, and turns.

## Decision tree

```
Is this a marketing / brand / content / publish request?
  YES → hand off to /cmo (do not invent an AXI path)
  NO  ↓

Does an AXI exist for this domain? (see catalog.md)
  YES → use that AXI via npx -y (or PATH binary)
  NO  ↓

Is the task "fetch a known URL" / open-ended web search?
  known URL → firecrawl or exa-contents (not browser AXI)
  open search → exa-search / Exa MCP
  else ↓

Is there a raw CLI the agent already knows well AND no AXI?
  YES → use raw CLI; note the ergonomics gap; offer to scaffold an AXI
  NO  ↓

Is there only an MCP server?
  Prefer MCP-compressor / Code Mode only if no AXI and no good CLI
  Otherwise: propose building an AXI wrapper (principles.md + build.md)
```

## When AXI wins (published evidence)

| Domain | AXI | vs raw CLI | vs MCP |
|---|---|---|---|
| Browser (490 runs) | `chrome-devtools-axi` | Lower cost/turns than agent-browser | ~57% fewer input tokens vs eager MCP |
| GitHub (425 runs) | `gh-axi` | 100% vs 86% success | ~66% cheaper than GitHub MCP |

Details: [benchmarks.md](benchmarks.md).

## mktg-specific forks

| Need | Prefer | Avoid |
|---|---|---|
| GitHub release notes for a launch | `gh-axi` (then `/cmo` for copy) | GitHub MCP schemas in-context |
| Competitor page scrape (URL known) | `firecrawl` | Browser AXI |
| Live SERP / company discovery | `exa-search` / company-research | Browser AXI |
| Logged-in social posting | `/cmo` publish adapters / browser profiles | Ad-hoc chrome-devtools-axi posting |
| Local Studio dashboard | `mktg studio` | Treating Studio as an AXI |

## Anti-default: eager MCP

MCP reliability is real — but schema overhead compounds every turn. If an AXI wraps the same backend (chrome-devtools-mcp, `gh`), **route to the AXI**. Keep MCP for domains with no AXI and no decent CLI.
