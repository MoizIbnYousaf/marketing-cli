---
name: mktg-x-endpoints
description: |
  Which X/Twitter GraphQL endpoints mktg-x uses, how query-ID rotation works,
  and why we use the X web GraphQL API instead of Twitter API v2.
---

# X GraphQL Endpoints

mktg-x hits **X's web GraphQL API** — the same endpoints that the x.com web app uses. Not Twitter API v2 (`api.twitter.com`), not the public v1.1, not HTML scraping.

## Base URL

```
https://x.com/i/api/graphql/<queryId>/<OperationName>
```

All requests are GET (reads) or POST (mutations) with:
- `Authorization: Bearer <public-web-app-token>` (hard-coded, same token every browser uses)
- `x-csrf-token: <ct0>` (from `MKTG_X_CT0` env var)
- `Cookie: auth_token=<token>; ct0=<ct0>`
- `variables` and `features` as URL-encoded JSON query params (GET) or JSON body (POST)

## Operations used by mktg-x

| Operation | Method | What it does | Used by |
|---|---|---|---|
| `TweetDetail` | GET | Fetch a single tweet with full thread context | `getTweet`, `getThread`, `getReplies` |
| `UserArticlesTweets` | GET | Fetch a user's long-form articles timeline (fallback when `TweetDetail.article.plain_text` is empty) | `fetchUserArticlePlainText` (article extraction) |
| `Bookmarks` | GET | Fetch the authenticated user's bookmarks (paginated) | `getBookmarks`, `getAllBookmarks` |
| `UserTweets` | GET | Fetch a user's tweet timeline (paginated) | `getUserTweetsPaged` |
| `UserByScreenName` | GET | Resolve `@handle` → numeric user ID | `getUserIdByUsername` |
| `CreateBookmark` | POST | Add a tweet to bookmarks | `bookmark` |
| `DeleteBookmark` | POST | Remove a tweet from bookmarks | `unbookmark` |

## Why web GraphQL, not Twitter API v2?

1. **No developer account required.** Twitter API v2 requires a developer account, app registration, and OAuth. The GraphQL API uses session cookies — if you're logged into x.com, you have credentials.
2. **No rate-limit tiers or paid plans.** API v2 has free/basic/pro tiers with strict monthly tweet caps. The GraphQL API has per-endpoint rate limits but no monthly quota.
3. **No cost per request.** API v2's free tier allows 1,500 tweets/month for reading. The GraphQL API has no such cap.
4. **Full content access.** API v2 free tier doesn't include full-archive search, bookmark access, or article content. The GraphQL API provides everything the web app can see.

**Tradeoff:** the GraphQL API is undocumented and Twitter can change it at any time. See "Query-ID Rotation" below.

## Feature flags

Every GraphQL request requires a `features` JSON object in the query params. These are boolean feature flags that Twitter's server uses to toggle response shape. **If any required flag is missing, the response may be silently incomplete.**

Feature flag dictionaries are maintained in `twitter-client-features.ts`. There are separate builders for:
- Tweet detail features (`buildTweetDetailFeatures`)
- Bookmark features (`buildBookmarksFeatures`)
- Article features (`buildArticleFeatures`)
- Article field toggles (`buildArticleFieldToggles`)

## Query-ID rotation

Twitter rotates GraphQL operation query IDs roughly weekly. The `<queryId>` in the URL changes, but the `<OperationName>` stays the same.

**How mktg-x handles this:**

1. First attempt uses baked-in query IDs from `query-ids.json`
2. On 404 response, `runtime-query-ids.ts` triggers:
   - Fetches Twitter's main JS bundles from 4 discovery URLs
   - Parses `operationName` / `queryId` pairs from the bundle source
   - Caches the discovered query IDs to `~/.config/mktg-x/query-ids-cache.json` (overridable via `MKTG_X_QUERY_IDS_CACHE`) so repeated calls within a session don't re-fetch the bundle
3. Retries the request with the refreshed query ID
4. If runtime discovery also fails, falls back to the baked-in IDs (which will 404 again — at this point it's a real failure)

**Brittleness:** if Twitter moves its bundle URLs, the discovery mechanism breaks. This is the single biggest maintenance risk in mktg-x. Monitor for 404 spikes.

## Rate limits

Twitter's GraphQL API has per-endpoint rate limits (not documented publicly). Observed limits:

- `TweetDetail`: ~150 requests / 15 min window
- `Bookmarks`: ~500 requests / 15 min window
- `UserTweets`: ~50 requests / 15 min window
- `UserByScreenName`: ~95 requests / 15 min window

**mktg-x enforces a minimum 500ms delay between consecutive API calls** to avoid triggering 429s. For paginated operations (bookmarks, user timeline, threaded replies), this means bulk reads are intentionally slow.

On 429, the error response includes a `retry_after` value. mktg-x reports this in the error shape but does not auto-retry — the agent decides whether to wait.

## Auth flow summary

```
MKTG_X_AUTH_TOKEN (or TWITTER_AUTH_TOKEN / AUTH_TOKEN with MKTG_X_ENABLE_LEGACY_ENV=1)
  → Cookie: auth_token=<value>

MKTG_X_CT0 (or TWITTER_CT0 / CT0 with MKTG_X_ENABLE_LEGACY_ENV=1)
  → Cookie: ct0=<value>
  → Header: x-csrf-token: <value>

Hard-coded public Bearer token
  → Header: Authorization: Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D...
```

The public Bearer token is **not a secret** — it's the same token embedded in x.com's JavaScript, used by every browser. The session cookies (`auth_token` + `ct0`) are the real credentials.
