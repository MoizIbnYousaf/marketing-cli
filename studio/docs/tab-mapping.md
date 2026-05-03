# Dashboard Surface to mktg Mapping

The Studio navigation contract is now small by design. Every visible surface
must answer one of three questions: what happened, what matters, what should I
do next?

## Pulse

Pulse is the default landing surface.

| Element | mktg source |
|---|---|
| Brand health | `mktg status --json` and `brand/*.md` freshness |
| What changed | Brand file watcher + SQLite activity |
| Social highlights | Signal and publish summaries normalized by the server |
| Audience summary | `brand/audience.md` when populated |
| What to do next | `mktg plan next --json` plus `/api/opportunities/push` rows |

Former Audience and Opportunities surfaces now live here. Do not add them back
as primary tabs unless they become independently useful again.

## Content

Content is the standalone creative library. It shows the images, assets, and
draft campaigns /cmo has produced so the user can inspect the work before it
moves into Publish.

| Element | mktg source |
|---|---|
| Asset inventory | `brand/assets.md` normalized by Studio |
| Generated images | Asset paths referenced by `brand/assets.md` and native publish drafts |
| Draft campaigns | `mktg publish --native-list-posts --json` |
| Provider context | Native draft provider identifiers from the publish backend |

Route to Content with:

```json
{"tab":"content"}
```

## Publish

Publish is the action surface for distribution.

| Element | mktg source |
|---|---|
| Adapter list | `mktg publish --list-adapters --json` |
| Native account | `mktg publish --native-account --json` |
| Native providers | `mktg publish --adapter mktg-native --list-integrations --json` |
| Native queue/history | `mktg publish --native-list-posts --json` |
| Postiz providers | `mktg publish --adapter postiz --list-integrations --json` |
| Publish history | SQLite `publish_log` |

Initial native providers: `x`, `tiktok`, `instagram`, `reddit`, `linkedin`.

## Brand

Brand is the source-of-truth memory surface.

| Element | mktg source |
|---|---|
| File list | `brand/*.md` |
| Read file | `GET /api/brand/read?file=<name>` |
| Write file | `POST /api/brand/write` |
| External write note | `POST /api/brand/note` |
| Regenerate file | `POST /api/brand/regenerate` |
| Asset board | `brand/assets.md` normalized by Studio |

## Activity Panel

The Activity panel replaces the old chat slot. It is a live log of what
`/cmo` does from Claude Code.

| Event | Source |
|---|---|
| Skill run | `POST /api/activity/log` |
| Brand write | `POST /api/activity/log` and `POST /api/brand/note` |
| Publish | `POST /api/activity/log` or publish-completed SSE |
| Navigation | `POST /api/navigate` |
| Toast | `POST /api/toast` |

The user still talks to `/cmo` in Claude Code. Studio reflects that work; it
does not host a chat engine.
