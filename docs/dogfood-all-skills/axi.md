# /axi — tool routing for launch ops

## Domain decisions for this launch
| Need | AXI / path |
|---|---|
| GitHub release notes / CI | `npx -y gh-axi` |
| Browse competitor sites interactively | `npx -y chrome-devtools-axi` |
| Static README scrape | `firecrawl` / `exa-contents` (not browser AXI) |
| Open-ended "who else builds agent marketing tools" | `exa-search` |
| Marketing copy | `/cmo` (not `/axi`) |

## Prefer-AXI note
For PR/CI triage during launch week, use `gh-axi` over raw `gh` / GitHub MCP.
