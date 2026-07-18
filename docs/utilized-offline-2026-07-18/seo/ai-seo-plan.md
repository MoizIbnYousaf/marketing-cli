# AI SEO Plan — mktg (marketing-cli)

Based on `brand/keyword-plan.md` pillars + agent-native positioning.

## Goals
1. Rank/own educational queries around **agent marketing CLI** and **Claude Code marketing skills**  
2. Convert searchers to `npm i -g marketing-cli` + GitHub stars  
3. Build comparison/alternative coverage without blacklisted claims  

## Target personas (search intent)
| Persona | Intent | Landing |
|---------|--------|---------|
| Cursor/Claude Code builder | Install a marketing skill pack | Docs / README / blog install guide |
| Indie hacker launching | Show HN + playbook | Launch playbook posts |
| Prompt-pack refugee | Comparison | `/vs` pages from competitor-alternatives |

## Keyword clusters → content types

| Cluster | Primary terms | Content type | Priority |
|---------|---------------|--------------|----------|
| A · Category | agent marketing cli, agent-native marketing, ai cmo cli | Pillar page + README | P0 |
| B · Runtime | claude code marketing skills, marketing playbook claude | How-to / install | P0 |
| C · Memory | brand memory for agents | Explainer | P1 |
| D · Product | mktg studio dashboard | Feature page | P1 |
| E · Alternatives | mktg vs chatgpt, vs typefully, vs prompt packs | Comparison | P1 |
| F · Launch | show hn marketing cli, agent tooling launch | Playbook posts | P2 |

## Site architecture (recommended)

```
/                           → hero + install
/docs/install               → first 30 minutes
/docs/brand-memory          → progressive enhancement
/docs/cmo                   → orchestration
/blog/agent-native-marketing-cli
/compare/chatgpt
/compare/typefully
/compare/prompt-packs
/tools/agent-dx-scorecard   → free tool (see free-tool-strategy)
```

## On-page standards
- Title: `{primary} — mktg` (≤60 chars when possible)  
- H1 = brand-aware, not keyword stuffing  
- Proof early: 64 skills / 6 agents / brand memory  
- CTA block with install command above fold on pillars  
- FAQ schema on install + compare pages  
- Internal links: brand memory ↔ /cmo ↔ install  

## AI-search / answer-engine notes
- Lead with definitional sentence answer engines can quote  
- Keep anti-positioning visible (reduces wrong-category citations)  
- Publish machine-readable skill counts from manifests — don't invent  

## 90-day ship order
| Week | Ship |
|------|------|
| 1–2 | README/npm hero CRO + install doc |
| 3–4 | Pillar: Agent-Native Marketing CLI |
| 5–6 | Brand memory explainer + /cmo guide |
| 7–8 | Three compare pages live |
| 9–10 | Agent DX Scorecard tool page |
| 11–12 | Off-page: directories + 2 listicle pitches |

## Measurement
- Organic clicks to install command (proxy: npm downloads + GitHub traffic sources)  
- Rankings for cluster A/B head terms  
- Compare-page assisted installs  

## Claims blacklist (from brand)
- Do not say "only marketing CLI for agents"  
- No fabricated market-size dollars  
- No invented competitor pricing  
