# AXI Benchmark Snapshot

Source: [axi.md](https://axi.md) / [kunchenguid/axi](https://github.com/kunchenguid/axi).
Agent model in published runs: Claude Sonnet 4.6 (harness accepts `--model`; other models not published).

## Browser automation (490 runs)

14 tasks × 7 conditions × 5 repeats. Backend for MCP conditions: `chrome-devtools-mcp`.

| Condition | Success | Avg Cost | Avg Duration | Avg Turns |
|---|---|---|---|---|
| **chrome-devtools-axi** | **100%** | **$0.074** | **21.5s** | **4.5** |
| dev-browser | 99% | $0.078 | 28.6s | 4.9 |
| agent-browser | 99% | $0.088 | 24.6s | 4.8 |
| chrome-devtools-mcp-compressed | 100% | $0.091 | 29.7s | 7.6 |
| chrome-devtools-mcp-search | 99% | $0.096 | 29.4s | 7.5 |
| chrome-devtools-mcp | 99% | $0.100 | 26.0s | 6.2 |
| chrome-devtools-mcp-code | 100% | $0.120 | 36.2s | 6.4 |

Mechanisms: specialized extractors (`tables --url`), combined ops (`open`, `fill --submit`, `click --query`), pipe filtering, TOON metadata.

## GitHub (425 runs)

17 tasks × 5 conditions × 5 repeats.

| Condition | Success | Avg Cost | Avg Duration | Avg Turns |
|---|---|---|---|---|
| **gh-axi** | **100%** | **$0.050** | **15.7s** | **3** |
| gh (raw CLI) | 86% | $0.054 | 17.4s | 3 |
| GitHub MCP + Code Mode | 84% | $0.101 | 43.4s | 7 |
| GitHub MCP + ToolSearch | 82% | $0.147 | 41.1s | 8 |
| GitHub MCP (eager) | 87% | $0.148 | 34.2s | 6 |

Complex tasks widen the gap (e.g. `ci_failure_investigation`: AXI ~$0.065 vs MCP ~$0.758).

## Caveats (from upstream)

- Public sites / read-mostly tasks in the browser suite
- Single published agent model
- LLM judge for success
- Principles are domain-general; evaluation focuses on browser + GitHub

Use these numbers when explaining routing choices to humans — don't invent stats.
