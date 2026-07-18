# AXI Catalog

Synced from [axi.md](https://axi.md) / [`catalog.yaml`](https://github.com/kunchenguid/axi/blob/main/catalog.yaml) at skill snapshot time.
To add an AXI upstream: follow [CONTRIBUTING.md](https://github.com/kunchenguid/axi/blob/main/CONTRIBUTING.md).

## Official (AXI project)

| AXI | Domain | Repo | Agent run |
|---|---|---|---|
| `gh-axi` | GitHub | [kunchenguid/gh-axi](https://github.com/kunchenguid/gh-axi) | `npx -y gh-axi` (requires `gh auth login`) |
| `chrome-devtools-axi` | Browser automation | [kunchenguid/chrome-devtools-axi](https://github.com/kunchenguid/chrome-devtools-axi) | `npx -y chrome-devtools-axi` |
| `lavish-axi` | Human review | [kunchenguid/lavish-axi](https://github.com/kunchenguid/lavish-axi) | `npx skills add kunchenguid/lavish-axi` |
| `quota-axi` | Quota / usage | [kunchenguid/quota-axi](https://github.com/kunchenguid/quota-axi) | `npx skills add kunchenguid/quota-axi` |

Skill install (recommended by upstream for gh / chrome):

```sh
npx skills add kunchenguid/gh-axi --skill gh-axi -g
npx skills add kunchenguid/chrome-devtools-axi --skill chrome-devtools-axi -g
```

Ambient hooks (opt-in, after global install):

```sh
npm i -g gh-axi && gh-axi setup hooks
npm i -g chrome-devtools-axi && chrome-devtools-axi setup hooks
# Restart the agent session after hooks install.
```

## Community

| AXI | Author | Domain | Repo |
|---|---|---|---|
| `jj-axi` | aivv73 | Version control | [aivv73/jj-axi](https://github.com/aivv73/jj-axi) |
| `npm-axi` | SSBrouhard | npm | [SSBrouhard/npm-axi](https://github.com/SSBrouhard/npm-axi) |
| `sqlite-axi` | SSBrouhard | SQLite | [SSBrouhard/sqlite-axi](https://github.com/SSBrouhard/sqlite-axi) |
| `slack-axi` | Jarvus Innovations | Slack | [JarvusInnovations/slack-axi](https://github.com/JarvusInnovations/slack-axi) |
| `gws-axi` | Jarvus Innovations | Google Workspace | [JarvusInnovations/gws-axi](https://github.com/JarvusInnovations/gws-axi) |
| `harvest-axi` | Jarvus Innovations | Time tracking | [JarvusInnovations/harvest-axi](https://github.com/JarvusInnovations/harvest-axi) |
| `specops` | Jarvus Innovations | Spec-driven dev | [JarvusInnovations/specops](https://github.com/JarvusInnovations/specops) |
| `gitsheets-axi` | Jarvus Innovations | Git-backed data | [gitsheets-axi package](https://github.com/JarvusInnovations/gitsheets/tree/main/packages/gitsheets-axi) |
| `metabase-axi` | Jarvus Innovations | Analytics / BI | [JarvusInnovations/metabase-axi](https://github.com/JarvusInnovations/metabase-axi) |
| `otter-axi` | Jarvus Innovations | Meetings | [JarvusInnovations/otter-axi](https://github.com/JarvusInnovations/otter-axi) |
| `notion-axi` | maximebrmd | Notion | [maximebrmd/notion-axi](https://github.com/maximebrmd/notion-axi) |
| `clickup-axi` | JanSuthacheeva | ClickUp | [JanSuthacheeva/clickup-axi](https://github.com/JanSuthacheeva/clickup-axi) |
| `databricks-axi` | p33ves | Databricks | [p33ves/databricks-axi](https://github.com/p33ves/databricks-axi) |
| `aws-axi` | thatdudealso | AWS | [thatdudealso/aws-axi](https://github.com/thatdudealso/aws-axi) |
| `docker-axi` | thatdudealso | Docker | [thatdudealso/docker-axi](https://github.com/thatdudealso/docker-axi) |
| `dynamodb-axi` | thatdudealso | DynamoDB | [thatdudealso/dynamodb-axi](https://github.com/thatdudealso/dynamodb-axi) |
| `pg-axi` | thatdudealso | PostgreSQL | [thatdudealso/pg-axi](https://github.com/thatdudealso/pg-axi) |
| `mongodb-axi` | thatdudealso | MongoDB | [thatdudealso/mongodb-axi](https://github.com/thatdudealso/mongodb-axi) |
| `elasticsearch-axi` | thatdudealso | Elasticsearch | [thatdudealso/elasticsearch-axi](https://github.com/thatdudealso/elasticsearch-axi) |
| `kubernetes-axi` | thatdudealso | Kubernetes | [thatdudealso/kubernetes-axi](https://github.com/thatdudealso/kubernetes-axi) |
| `redis-axi` | thatdudealso | Redis | [thatdudealso/redis-axi](https://github.com/thatdudealso/redis-axi) |
| `celery-axi` | thatdudealso | Celery | [thatdudealso/celery-axi](https://github.com/thatdudealso/celery-axi) |

## Routing notes for /axi

1. Official AXIs are the default for GitHub + browser.
2. Community AXIs: check the repo README for `npx`/`skills add` entrypoints — patterns match official ones when they ship as AXI SDK CLIs.
3. `specops` demonstrates an AXI **embedded in a skill** (not only as a global npm binary) — useful when packaging internal tools.
4. Marketing distribution / brand / SEO stays on `/cmo` even if a community AXI overlaps a channel (e.g. Slack).
