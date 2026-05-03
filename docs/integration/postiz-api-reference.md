# Postiz API Reference — Raw-Fetch Adapter Spec

**Phase:** A (design artifact)
**Owner:** API reviewer
**For:** the Phase B implementer of `src/commands/publish.ts::publishPostiz`
**Plan:** internal implementation plan (v2 — revision history at top of file)
**See also:** `docs/integration/phase0-API reviewer-api-redteam.md` (Phase 0 red-team, findings cited throughout)
**Upstream pin:** postiz-app `v2.21.6` (released 2026-04-12)
**Audience:** zero ambiguity. Every TypeScript block is copy-ready. Phase B does not re-derive.

---

## 0. Scope

This document specifies **exactly** what the `publishPostiz` adapter must
do at the HTTP layer — no more, no less. It does **not** cover the mktg
side of things (`item.metadata` shape, CLI flags, dashboards, skill
triggers) — those live in `src/commands/publish.ts` (postiz adapter).

v1 is **draft-only** for post state. Media attachments are supported through
Postiz's public upload endpoints and then attached to the draft body.
`type: 'schedule'` and `type: 'now'` are explicitly out of scope and are
captured in §9 for v2.

The adapter never links `@postiz/node`. That package is AGPL-3.0 and
adding it to `package.json` in any capacity is a hard prohibition (§8).

---

## 1. Endpoints We Use

The adapter calls **two endpoints in v1** and has pre-designed stubs for
**two more** that become live in v2. Every claim below cites postiz-app
`main` via `raw.githubusercontent.com` with file:line — verified on
2026-04-15 during Phase 0 (§3.1 of the red-team) and still valid at
`v2.21.6`.

### 1.1 `GET /public/v1/integrations` — v1, REQUIRED

Resolves agent-friendly platform names (`"linkedin"`, `"bluesky"`, …) to
postiz's DB primary-key `id`s.

| Property | Value |
|---|---|
| Full URL | `${POSTIZ_API_BASE}/public/v1/integrations` |
| Method | `GET` |
| Request headers | `Authorization: ${POSTIZ_API_KEY}` (bare — no Bearer) |
| Request body | *(none)* |
| Response (200) | `Integration[]` (see type below) |
| Status codes we handle | `200`, `401`, `5xx`, network error |
| Source | `apps/backend/src/public-api/routes/v1/public.integrations.controller.ts:176-195` — https://raw.githubusercontent.com/gitroomhq/postiz-app/main/apps/backend/src/public-api/routes/v1/public.integrations.controller.ts |

```ts
type Integration = {
  id: string;                           // postiz DB PK — required for POST /posts
  name: string;                         // display name
  identifier: string;                   // provider key: "linkedin", "bluesky", "reddit", "mastodon", "threads", "x", …
  picture: string;                      // URL
  disabled: boolean;                    // true ⇒ reauth needed; adapter must refuse to post to disabled integrations
  profile: string;                      // handle / username
  customer?: { id: string; name: string };
};

type ListIntegrationsResponse = Integration[];
```

### 1.2 `POST /public/v1/posts` — v1, REQUIRED

Creates a (v1: draft-only) post. The `ValidateIf((o) => o.type !== 'draft')`
at `create.post.dto.ts:60` is what unlocks draft-only v1 — it skips the
per-provider `AllProvidersSettings` discriminated-union validation.

| Property | Value |
|---|---|
| Full URL | `${POSTIZ_API_BASE}/public/v1/posts` |
| Method | `POST` |
| Request headers | `Authorization: ${POSTIZ_API_KEY}`, `Content-Type: application/json` |
| Request body | `CreatePostDto` (see §4) |
| Response (200/201) | postiz internal post record(s) — `PostsService.createPost` shape. Adapter does **not** dereference fields; it only uses the response to mark "sent" in the idempotency file. |
| Status codes we handle | `200`/`201`, `400`, `401`, `403`, `429`, `5xx`, network error |
| Rate-limited | **Yes — 30 requests/hour per organization** (only this route is throttled) |
| Source (controller) | `public.integrations.controller.ts:137-151` — same URL as §1.1 |
| Source (DTO) | `libraries/nestjs-libraries/src/dtos/posts/create.post.dto.ts` — https://raw.githubusercontent.com/gitroomhq/postiz-app/main/libraries/nestjs-libraries/src/dtos/posts/create.post.dto.ts |
| Source (rate limit) | `apps/backend/src/app.module.ts:35-50` + `libraries/nestjs-libraries/src/throttler/throttler.provider.ts:7-14` |

The response body is deliberately untyped on the mktg side — postiz returns
DB records with evolving shape. The adapter validates only `res.ok`; on
success it treats the response opaquely.

### 1.3 `POST /public/v1/upload` — v1, OPTIONAL

Uploads a local image/video attachment. The returned media record is attached
to `CreatePostDto.posts[i].value[j].image`.

| Property | Value |
|---|---|
| Full URL | `${POSTIZ_API_BASE}/public/v1/upload` |
| Method | `POST` |
| Request headers | `Authorization: ${POSTIZ_API_KEY}` (no `Content-Type` — the runtime sets `multipart/form-data` boundary) |
| Request body | `FormData` with single field `file`; MIME must be in `{image/jpeg, image/png, image/gif, image/webp, image/avif, image/bmp, image/tiff, video/mp4}` |
| Response (200) | `{ id, path, name, ... }` — `MediaService.saveFile` record. `id` is used as `MediaDto.id` in `CreatePostDto.posts[i].value[j].image`. |
| Status codes we handle | `200`, `400` (unsupported MIME), `401`, `5xx`, network error |
| Source | `public.integrations.controller.ts:71-82` |

### 1.3b `POST /public/v1/upload-from-url` — v1, OPTIONAL

Uploads a public URL through Postiz's own SSRF-safe fetch path. The request
body is `{ "url": "https://..." }`; the response is the same media record
shape as `/upload`.

### 1.4 `GET /public/v1/find-slot/:id` — v1 NOT USED, v2 stub

Returns the next free datetime for scheduled posts. Irrelevant for draft
type, needed when `type: 'schedule'` lands in v2.

| Property | Value |
|---|---|
| Full URL | `${POSTIZ_API_BASE}/public/v1/find-slot/${integrationId}` |
| Method | `GET` |
| Request headers | `Authorization: ${POSTIZ_API_KEY}` |
| Request body | *(none)* |
| Response (200) | `{ date: string }` — ISO 8601 |
| Status codes we handle | `200`, `401`, `5xx`, network error |
| Source | `public.integrations.controller.ts:119-125` |

### 1.5 Endpoints we do NOT call

Every other `/public/v1/*` route (`/upload-from-url`, `/posts/:id`,
`/is-connected`, `/social/:integration`, `/notifications`, `/generate-video`,
`/video/function`, `/integrations/:id` DELETE, `/integration-settings/:id`,
`/posts/:id/missing`, `/posts/:id/status` PUT, `/posts/:id/release-id` PUT,
`/analytics/:integration`, `/analytics/post/:postId`,
`/integration-trigger/:id`) is out of scope for v1 and out of scope for
this document. §9 lists which ones v2 might touch.

---

## 2. Raw-Fetch Helper (`postizFetch`)

Zero dependencies. Native `fetch` only. Drop this directly into
`src/commands/publish.ts` alongside `publishPostiz`. Target: ~60 LOC
including typed errors. Uses the project's existing exit-code conventions
(`ExitCode = 3` for dependency/auth/network, see `src/types.ts:14-21`).

```ts
// ─── Postiz raw-fetch helper (AGPL firewall — NEVER import @postiz/node) ───
// See: docs/integration/postiz-api-reference.md §2
// The adapter calls this for every postiz API round-trip.

const POSTIZ_DEFAULT_BASE = "https://api.postiz.com";

// Structured error returned by postizFetch on failure.
// Maps cleanly to CommandResult error envelope (see §6).
export type PostizError =
  | { kind: "auth-missing" }
  | { kind: "auth-invalid"; msg: string }
  | { kind: "subscription-required"; msg: string }
  | { kind: "rate-limited"; retryAfterSeconds: number | null; msg: string }
  | { kind: "bad-request"; msg: string; status: number }
  | { kind: "server-error"; status: number; msg: string }
  | { kind: "network"; detail: string };

export type PostizResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: PostizError; status: number | null };

type PostizFetchInit = {
  method: "GET" | "POST" | "DELETE" | "PUT";
  headers?: Record<string, string>;
  // JSON body OR a pre-built FormData (upload). Adapter never passes both.
  body?: Record<string, unknown> | FormData;
};

export const postizFetch = async <T>(path: string, init: PostizFetchInit): Promise<PostizResult<T>> => {
  const apiKey = process.env.POSTIZ_API_KEY;
  const base = process.env.POSTIZ_API_BASE ?? POSTIZ_DEFAULT_BASE;

  if (!apiKey) {
    return { ok: false, error: { kind: "auth-missing" }, status: null };
  }

  // Bare Authorization header — postiz middleware at public.auth.middleware.ts:16-20
  // reads `req.headers.authorization` directly. No "Bearer " prefix.
  const headers: Record<string, string> = {
    ...(init.headers ?? {}),
    Authorization: apiKey,
  };

  let body: string | FormData | undefined;
  if (init.body instanceof FormData) {
    body = init.body;
    // Do NOT set Content-Type — runtime sets multipart boundary.
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { method: init.method, headers, body });
  } catch (e) {
    return {
      ok: false,
      error: { kind: "network", detail: e instanceof Error ? e.message : String(e) },
      status: null,
    };
  }

  // Success path — treat 2xx as JSON (every postiz v1 endpoint returns JSON).
  if (res.ok) {
    const data = (await res.json().catch(() => ({}))) as T;
    return { ok: true, data, status: res.status };
  }

  // Error path — postiz returns flat {msg: string}. Parse defensively.
  const errBody = (await res.json().catch(() => ({}))) as { msg?: unknown };
  const msg = typeof errBody.msg === "string" ? errBody.msg : `HTTP ${res.status}`;

  if (res.status === 401) {
    if (msg === "No subscription found") {
      return { ok: false, error: { kind: "subscription-required", msg }, status: 401 };
    }
    return { ok: false, error: { kind: "auth-invalid", msg }, status: 401 };
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get("retry-after");
    const retryAfterSeconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : null;
    return { ok: false, error: { kind: "rate-limited", retryAfterSeconds, msg }, status: 429 };
  }

  if (res.status >= 400 && res.status < 500) {
    return { ok: false, error: { kind: "bad-request", msg, status: res.status }, status: res.status };
  }

  return { ok: false, error: { kind: "server-error", status: res.status, msg }, status: res.status };
};
```

**Contract invariants the implementer must uphold:**

1. `POSTIZ_API_BASE` default is `https://api.postiz.com` — matches the SDK's
   hardcoded default at `apps/sdk/src/index.ts:18`. Users self-hosting pass
   their own.
2. `POSTIZ_API_KEY` missing → return `auth-missing` without making a
   network call. The adapter must not hit the network for a config error.
3. The auth header is **bare**. Any PR that writes `Bearer ${apiKey}` fails
   code review.
4. No automatic retries inside `postizFetch`. Retry logic belongs to
   `publishPostiz` (per-item), and only for 429 + specific 5xx — never for
   auth errors or 400s.
5. `postizFetch` is synchronous-on-error: returns typed errors, never
   throws. Throws only indicate programmer error (e.g., passing both
   `body` and something else), never network/API errors.

---

## 3. Two-Step Publish Flow

`publishPostiz` is a pure two-pass function. Pseudocode below is
implementation-ready — variable names match what Phase B will use.

```ts
// ─── publishPostiz — the draft-only v1 pipeline ───
// Mirrors shape of publishTypefully at publish.ts:71-120 (template only —
// HTTP differs). Input/output match AdapterResult at publish.ts:52-59.

type PublishPostizInput = {
  campaign: string;                         // from publish manifest.name
  items: readonly PublishItem[];            // item.metadata.providers[] is the key field
  confirm: boolean;                         // false ⇒ dry-run
  cwd: string;                              // for sent-marker state file
  ndjson: boolean;                          // stream progress line per item
};

const publishPostiz = async (inp: PublishPostizInput): Promise<AdapterResult> => {
  const results: AdapterResult["results"][number][] = [];
  let published = 0;
  let failed = 0;

  // ── Step 0: load the sent-marker state (§5) ──
  const markerPath = join(inp.cwd, ".mktg", "publish", `${inp.campaign}-postiz.json`);
  const marker = await loadSentMarker(markerPath);  // see §5

  // ── Step 1: resolve integrations ──
  const listRes = await postizFetch<ListIntegrationsResponse>("/public/v1/integrations", { method: "GET" });
  if (!listRes.ok) {
    // All items fail with the same error — no network waste on dead auth/rate-limit/net.
    return buildFailAll(inp, results, listRes.error);
  }

  // Build an identifier → id map. Skip disabled integrations; the adapter
  // refuses to post to disabled channels and surfaces a clean error.
  const identifierToId = new Map<string, string>();
  for (const int of listRes.data) {
    if (!int.disabled) identifierToId.set(int.identifier, int.id);
  }

  // ── Step 2: per-item publish ──
  for (let i = 0; i < inp.items.length; i++) {
    const item = inp.items[i]!;

    // Validation: item.metadata.providers must exist and be non-empty.
    const providers = item.metadata?.providers;
    if (!Array.isArray(providers) || providers.length === 0) {
      results.push({
        item: i,
        status: "failed",
        detail: "Missing item.metadata.providers[] — add at least one platform name (e.g., \"linkedin\")",
      });
      failed++;
      continue;
    }

    // Map every requested provider to an integration id.
    const resolved: Array<{ provider: string; id: string }> = [];
    const unconnected: string[] = [];
    for (const provider of providers) {
      const id = identifierToId.get(provider);
      if (id) resolved.push({ provider, id });
      else unconnected.push(provider);
    }

    if (unconnected.length > 0) {
      const connected = Array.from(identifierToId.keys()).sort();
      results.push({
        item: i,
        status: "failed",
        detail: `Unconnected provider(s): ${unconnected.join(", ")}. Connected: ${connected.join(", ") || "(none)"}. Connect in the postiz UI first.`,
      });
      failed++;
      continue;
    }

    // Dry-run short-circuit — no network call, no state mutation.
    if (!inp.confirm) {
      results.push({ item: i, status: "skipped", detail: `[dry-run] would draft to: ${providers.join(", ")}` });
      continue;
    }

    // Idempotency check (§5): skip if this content has already been sent.
    const key = sentMarkerKey(inp.campaign, item.content, resolved.map((r) => r.id));
    if (marker.sent[key]) {
      results.push({ item: i, status: "skipped", detail: "already-sent (sent-marker hit)" });
      continue;
    }

    // Build the payload (§4).
    const body = buildCreatePostDraft(item.content, resolved);

    // Publish.
    const postRes = await postizFetch<unknown>("/public/v1/posts", { method: "POST", body });
    if (!postRes.ok) {
      results.push({ item: i, status: "failed", detail: mapPostizError(postRes.error) });  // §6
      failed++;

      // Hard-stop on rate-limit or subscription-required — no point pushing more.
      if (postRes.error.kind === "rate-limited" || postRes.error.kind === "subscription-required") {
        for (let j = i + 1; j < inp.items.length; j++) {
          results.push({ item: j, status: "skipped", detail: `Skipped — prior item failed with ${postRes.error.kind}` });
        }
        break;
      }
      continue;
    }

    // Success — record in sent-marker and emit ndjson if requested.
    marker.sent[key] = { postedAt: new Date().toISOString(), providers: providers.slice() };
    if (inp.ndjson) writeStderr(JSON.stringify({ type: "postiz-published", data: { item: i, providers } }));
    results.push({ item: i, status: "published", detail: `draft → ${providers.join(", ")}` });
    published++;
  }

  // Write sent-marker back (best-effort — never crash the adapter).
  await persistSentMarker(markerPath, marker).catch(() => { /* see §5.4 */ });

  return {
    adapter: "postiz",
    items: inp.items.length,
    published,
    failed,
    errors: results.filter((r) => r.status === "failed").map((r) => r.detail),
    results,
  };
};
```

`buildFailAll` is a helper that converts a single adapter-wide error
(auth-missing, rate-limited on the `/integrations` call, network error)
into one `AdapterResult` with every item marked `failed`. Implementer
writes that inline.

---

## 4. `CreatePostDto` Mapping

The mktg-facing `item.metadata` shape is intentionally narrower than
postiz's DTO. The adapter builds the full DTO from mktg inputs plus fixed
defaults (`type: "draft"`, `shortLink: false`, empty `tags`, empty `image`).

### 4.1 Input (mktg side)

```ts
type PublishItemMetadataForPostiz = {
  providers: readonly string[];   // required, non-empty, postiz identifiers: "linkedin","bluesky",...
  // v2: schedule?: "now" | ISO8601; perProviderSettings?: Record<string,unknown>;
};

// The PublishItem shape lives in src/types.ts and is already defined.
// Relevant fields for postiz:
//   item.content: string        (the copy to publish)
//   item.metadata: { providers: [...], ... }
```

### 4.2 Output (postiz DTO)

```ts
const buildCreatePostDraft = (
  content: string,
  resolved: ReadonlyArray<{ provider: string; id: string }>,
): CreatePostDto => ({
  type: "draft",                            // v1 — skips AllProvidersSettings via ValidateIf
  shortLink: false,                         // required by DTO — always false in v1 (no link-shortener integration)
  date: new Date().toISOString(),           // required — ISO 8601, immediate
  tags: [],                                 // required array; empty is valid
  posts: resolved.map(({ id }) => ({
    integration: { id },
    value: [
      {
        content,                            // ValidContent validator runs; see §4.3
        image: [],                          // v1 = no attachments; v2 adds upload flow
        // id, delay — omitted (both optional per PostContent)
      },
    ],
    // group, settings, type — all omitted for draft
  })),
});

// CreatePostDto — mirrored 1:1 from postiz source
// Source: libraries/nestjs-libraries/src/dtos/posts/create.post.dto.ts
type CreatePostDto = {
  type: "draft" | "schedule" | "now" | "update";
  order?: string;
  shortLink: boolean;
  inter?: number;
  date: string;                             // ISO 8601
  tags: Array<{ value: string; label: string }>;
  posts: Array<{
    type?: string;
    integration: { id: string };
    value: Array<{
      content: string;
      id?: string;
      delay?: number;
      image: Array<{ id: string; path?: string; [k: string]: unknown }>;   // MediaDto
    }>;
    group?: string;
    settings?: Record<string, unknown>;     // required UNLESS type === 'draft'
  }>;
};
```

### 4.3 `ValidContent` validator caveats

Per `create.post.dto.ts:26`, `PostContent.content` passes through
`@gitroom/helpers/utils/valid.images::ValidContent`. The adapter treats it
as an opaque string and lets postiz 400 back any invalid payloads.
Phase-C.4 test must verify a known-invalid content (e.g., empty string
after trim) round-trips as a 400 with a sensible `msg`, and the adapter
maps it to the `mapPostizError` path in §6.

### 4.4 What we deliberately do NOT emit

| Field | Why omitted in v1 |
|---|---|
| `posts[i].settings` | `ValidateIf(type !== 'draft')` at `create.post.dto.ts:60` — not required for drafts. Avoids the per-provider discriminated-union minefield. |
| `posts[i].value[j].image` (populated) | Requires `POST /public/v1/upload` round-trip first. v2. |
| `posts[i].value[j].id`, `delay` | Both optional; not relevant for draft creation. |
| `posts[i].group`, `posts[i].type` | Optional; draft doesn't need grouping. |
| Top-level `order`, `inter` | Both optional and scheduling-related. |
| `tags` (populated) | Not surfaced in mktg v1 — empty array is valid. |

---

## 5. Idempotency Design

Postiz has **no idempotency key** and **no webhooks** (confirmed in Phase
0 §3.6). Retries create duplicates unless the adapter dedupes locally.

The state file is `<cwd>/.mktg/publish/<campaign>-postiz.json`. One file
per campaign per catalog.

### 5.1 Schema

```ts
type PostizSentMarker = {
  version: 1;
  campaign: string;
  catalog: "postiz";
  sent: Record<string /* hashKey */, PostizSentEntry>;
};

type PostizSentEntry = {
  postedAt: string;                         // ISO 8601
  providers: readonly string[];             // the mktg-side identifiers used (redundant, helps humans audit the file)
};
```

Canonical example:

```json
{
  "version": 1,
  "campaign": "q2-launch",
  "catalog": "postiz",
  "sent": {
    "a3f1...c4": { "postedAt": "2026-04-15T14:22:03.001Z", "providers": ["linkedin", "bluesky"] },
    "b87e...09": { "postedAt": "2026-04-15T14:22:05.442Z", "providers": ["reddit"] }
  }
}
```

### 5.2 Hash key formula (stable across runs)

```ts
import { createHash } from "node:crypto";

// The hash key is deterministic: same campaign + same content + same
// resolved integration-id set ⇒ same key ⇒ dedupe kicks in.
// - `content` must be the exact string we send, not a summary.
// - integration ids are sorted so provider ordering ["linkedin","bluesky"] and
//   ["bluesky","linkedin"] collapse to one key.
// - Double-delimited so no provider id can smuggle "|" into the previous field.
const sentMarkerKey = (campaign: string, content: string, integrationIds: readonly string[]): string => {
  const ids = [...integrationIds].sort().join("|");
  const buf = `${campaign}||${content}||${ids}`;
  return createHash("sha256").update(buf).digest("hex");
};
```

**Why not include timestamp in the key?** The sent-marker's job is to
dedupe retries, not to deduplicate genuinely-new scheduled sends of the
same content. A user who deliberately re-posts the same copy on purpose
can delete the marker entry (or the whole file) before re-running.

**Why not include provider *identifiers* (names) instead of ids?** Provider
identifiers are stable in postiz ("linkedin"), but the adapter could
conceivably resolve them to different ids across postiz instances (local
vs hosted). Using the resolved id pins the key to the exact channel row —
if the user disconnects LinkedIn and reconnects it, the id changes and
the dedupe no longer hits. That's the correct behavior: it's a genuinely
new channel.

### 5.3 Write-after-success semantics

- The marker is loaded once at the start of `publishPostiz` (before the
  `/integrations` call).
- Each successful `POST /posts` mutates the in-memory `marker.sent` map.
- At end of run, `persistSentMarker` writes the whole file atomically
  (write-to-temp + `rename`) — standard Node practice, no extra deps.
- A failed write is logged via `writeStderr` and **does not** fail the
  adapter; the user's posts already landed in postiz.
- Dry-run (`confirm === false`) never mutates the marker.

### 5.4 Corruption handling

If `loadSentMarker` fails to parse the file (malformed JSON, wrong shape,
truncated file), it MUST:

1. Log a warning via `writeStderr(JSON.stringify({ type: "postiz-sent-marker-corrupt", path, detail }))`.
2. Rename the bad file to `<campaign>-postiz.corrupt.<ISO>.json` (debug
   evidence — do not delete).
3. Return a fresh empty marker: `{ version: 1, campaign, catalog: "postiz", sent: {} }`.
4. **Never crash the adapter.** The cost of a re-send is usually benign
   (postiz drafts are a human-in-the-loop surface); crashing the
   publisher is worse.

Reference implementation:

```ts
const loadSentMarker = async (path: string): Promise<PostizSentMarker> => {
  const empty = (): PostizSentMarker => ({ version: 1, campaign: extractCampaignFromPath(path), catalog: "postiz", sent: {} });
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return empty();
    const raw = await file.text();
    const parsed = JSON.parse(raw) as unknown;
    if (!isPostizSentMarker(parsed)) {
      await archiveCorrupt(path);
      writeStderr(JSON.stringify({ type: "postiz-sent-marker-corrupt", path, detail: "shape mismatch" }));
      return empty();
    }
    return parsed;
  } catch (e) {
    await archiveCorrupt(path).catch(() => {});
    writeStderr(JSON.stringify({ type: "postiz-sent-marker-corrupt", path, detail: e instanceof Error ? e.message : String(e) }));
    return empty();
  }
};
```

The shape guard `isPostizSentMarker` is a straightforward `typeof`
chain — spec'd in `tests/integration/postiz-idempotency.test.ts`
assertions rather than here.

---

## 6. Error Envelope Mapping

The adapter owns the translation from `PostizError` (§2) to the mktg
`CommandResult` error envelope. The mapping function `mapPostizError`
returns a **single-line detail string** suitable for the
`AdapterResult.results[i].detail` field; a higher-level call site may
lift it into the full error envelope.

```ts
const mapPostizError = (e: PostizError): string => {
  switch (e.kind) {
    case "auth-missing":
      return "POSTIZ_API_KEY is not set. Run: mktg catalog info postiz";
    case "auth-invalid":
      return `Invalid POSTIZ_API_KEY (${e.msg}). Verify the key in the postiz UI → Settings → API.`;
    case "subscription-required":
      return `Hosted postiz requires an active subscription (${e.msg}). Upgrade at https://postiz.com/pricing, or self-host (mktg catalog info postiz).`;
    case "rate-limited":
      return e.retryAfterSeconds !== null
        ? `Postiz rate limit (30 posts/hour per org) — retry in ${e.retryAfterSeconds}s. On self-host, raise API_LIMIT env var.`
        : "Postiz rate limit (30 posts/hour per org). Retry later or raise API_LIMIT on self-host.";
    case "bad-request":
      return `Postiz rejected request (HTTP ${e.status}): ${e.msg}. Check CreatePostDto body shape — see docs/integration/postiz-api-reference.md §4.`;
    case "server-error":
      return `Postiz server error (HTTP ${e.status}): ${e.msg}. Retry; if persistent, check postiz health at POSTIZ_API_BASE.`;
    case "network":
      return `Network error contacting postiz: ${e.detail}. Verify POSTIZ_API_BASE and connectivity.`;
  }
};
```

### Full `CommandResult` envelope (when the adapter fails the whole call)

When every item fails because of an adapter-wide condition (e.g., initial
`/integrations` call failed), the adapter should not invoke
`mapPostizError` per-item and instead return one error on the
`publish.ts` command path. The `buildFailAll` helper maps to this
envelope via `err()` (`src/types.ts:44-54`):

| `PostizError.kind` | mktg `code` | `exitCode` | `suggestions[]` leader |
|---|---|---|---|
| `auth-missing` | `POSTIZ_AUTH_MISSING` | 3 | `"Set POSTIZ_API_KEY in your environment."` |
| `auth-invalid` | `POSTIZ_AUTH_INVALID` | 3 | `"Verify the POSTIZ_API_KEY value — see postiz Settings → API."` |
| `subscription-required` | `POSTIZ_SUBSCRIPTION_REQUIRED` | 3 | `"Active postiz subscription required on hosted instances."` |
| `rate-limited` | `POSTIZ_RATE_LIMITED` | 5 | `"30 posts/hour rate limit hit. Retry after Retry-After or raise API_LIMIT on self-host."` |
| `bad-request` | `POSTIZ_BAD_REQUEST` | 2 | `"Postiz rejected the CreatePostDto body. Check §4 of the API reference."` |
| `server-error` | `POSTIZ_SERVER_ERROR` | 5 | `"Postiz server returned 5xx. Retry; check postiz health dashboard."` |
| `network` | `POSTIZ_NETWORK_ERROR` | 5 | `"Network failed contacting POSTIZ_API_BASE."` |

Exit codes are chosen to match existing conventions:
- `3` = dependency/auth missing (existing adapters also use 3 for
  `TYPEFULLY_API_KEY` missing — one-stop UX for missing-env errors)
- `5` = network error (existing convention from `src/types.ts:14-21`)
- `2` = invalid args (the adapter's DTO build violated postiz's schema — that's our bug)

**`fix` field convention.** Every error envelope must include `suggestions`
with at least one entry, and for transient errors (`network`, `server-error`,
`rate-limited`) a second entry pointing at `mktg catalog info postiz`.

---

## 7. Rate-Limit Handling

Postiz throttles only `POST /public/v1/posts` — 30 requests/hour per
organization, storage in Redis (`ThrottlerModule` at `app.module.ts:35-50`,
gated by `ThrottlerBehindProxyGuard` at
`libraries/nestjs-libraries/src/throttler/throttler.provider.ts:7-14`).
Self-host raises the limit with `API_LIMIT`; hosted is stuck at 30.

### 7.1 Detection

`postizFetch` already surfaces 429 as `{ kind: "rate-limited",
retryAfterSeconds: number | null, msg: string }`. The `Retry-After`
header may be seconds (integer) or an HTTP-date (per RFC 7231 §7.1.3);
the helper only parses the integer form. Non-integer values
(`"Wed, 21 Oct 2015 07:28:00 GMT"`) degrade to `null` — the caller
still knows it's rate-limited, just not how long to wait.

### 7.2 Policy inside `publishPostiz`

- **No automatic retry** on 429. Exponential-backoff inside a CLI
  invocation blocks the user's terminal; that's poor agent DX.
- **Hard-stop the campaign** at the first 429. Mark the current item
  `failed`, mark every subsequent item `skipped` with detail
  `"Skipped — prior item failed with rate-limited"`. Matches the break
  statement in §3.
- **Surface the error structurally** so upstream retry logic (e.g., a
  rescheduled `/cmo` follow-up) can parse it:
  - `AdapterResult.results[i].status = "failed"`
  - `AdapterResult.results[i].detail` = the human string from
    `mapPostizError`
  - `AdapterResult.errors[]` accumulates each detail

### 7.3 Skill guidance (for the `postiz` SKILL.md `On Activation`)

The skill should query the user's posting budget before composing large
campaigns:

> The postiz public API allows 30 posts/hour per organization on hosted
> instances. Self-host defaults to 30 too but is configurable via
> `API_LIMIT`. If your campaign has more items than budget, batch across
> multiple runs spaced at least an hour apart, or split by campaign name
> to use separate sent-marker files.

That prose belongs in skill reviewer's `skills/postiz/SKILL.md` draft — flagging
here so they can lift it verbatim.

### 7.4 Tests required

`tests/integration/postiz-adapter.test.ts` must include:

- 429 with numeric `Retry-After` → `rate-limited` error, `retryAfterSeconds`
  set, subsequent items `skipped`.
- 429 without `Retry-After` → `rate-limited` with `retryAfterSeconds:
  null`, adapter still hard-stops.
- 429 with HTTP-date `Retry-After` → `retryAfterSeconds: null`, same
  hard-stop behavior.

All against a local test HTTP server returning the real postiz 429 shape
(`{ msg: "Too many requests" }` and `Retry-After: 60`) — no mocks.

---

## 8. License Firewall Assertion

Non-negotiable invariant: `@postiz/node` never appears in any
`package.json` deps field. Enforced by a structural test.

### 8.1 Exact test (drop into `tests/integration/postiz-adapter.test.ts`)

```ts
import { describe, test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

describe("License firewall — @postiz/node is AGPL-3.0 and must never be linked", () => {
  test("package.json has no @postiz/node in any deps section", async () => {
    const repoRoot = import.meta.dir.replace("/tests/integration", "");
    const raw = await readFile(join(repoRoot, "package.json"), "utf-8");
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };

    for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const) {
      const deps = pkg[section] ?? {};
      expect(deps["@postiz/node"]).toBeUndefined();
      // Also guard against the rare gitroomhq/* publication under a
      // different scope — every package with "postiz" in its name is
      // AGPL today.
      for (const key of Object.keys(deps)) {
        expect(key).not.toMatch(/@?postiz/i);
      }
    }
  });

  test("no source file imports from @postiz/node", async () => {
    // Belt-and-suspenders: even if someone pastes the SDK source into the
    // tree, the adapter code path must only use raw fetch.
    const { Glob } = Bun;
    const glob = new Glob("src/**/*.ts");
    const repoRoot = import.meta.dir.replace("/tests/integration", "");
    for await (const file of glob.scan({ cwd: repoRoot })) {
      const text = await readFile(join(repoRoot, file), "utf-8");
      expect(text, `${file} must not import @postiz/node`).not.toMatch(/from\s+["']@postiz\/node["']/);
      expect(text, `${file} must not require @postiz/node`).not.toMatch(/require\(["']@postiz\/node["']\)/);
    }
  });
});
```

Both tests are O(1) or O(n-source-files) — cheap to run on every
`bun test`. They guard against two failure modes: someone adding the dep
by accident during `bun add`, and someone vendoring the SDK source
manually.

### 8.2 CI guard (already covered by plan §B exit gate)

Phase B exit gate row `@postiz/node absent` runs
`grep -r "@postiz/node" package.json` (plan v2 line 265). The two tests
above subsume the grep check but are kept as additional defense.

---

## 9. Open Follow-ups

Captured here so they don't get lost between Phase B and whatever Phase
D looks like.

### 9.1 v2 — `type: 'schedule'` and `type: 'now'`

Unblocks:
- `GET /public/v1/find-slot/:id` stub from §1.4
- Per-provider `AllProvidersSettings` discriminated union (blocker #3
  from my Phase 0 red-team)

Design cost: one API call per scheduled item (find-slot before POST), plus
a `perProviderSettings` mktg metadata field that's either (a) provided by
the caller verbatim (passthrough) or (b) fetched from
`GET /public/v1/integration-settings/:id` and merged with defaults per
provider. (a) is safer initially; (b) is the long-term win.

### 9.2 Image attachments

Unblocks: `POST /public/v1/upload` stub from §1.3.

Mktg-side, this plugs into `item.metadata.attachments?: Array<{ path:
string }>`. Adapter does: for each attachment, read the local file, POST
to `/upload`, collect the returned `MediaDto.id`, inject into
`posts[j].value[k].image`. Security: `item.metadata.attachments[].path`
must pass `sandboxPath` (under project cwd only) and the MIME must be in
the allow-list at `public.integrations.controller.ts:40-48`.

### 9.3 Post-publish status polling (webhooks alternative)

Postiz has no outbound webhooks on the public API. For Phase C.4's "did
the post actually land?" verification, the adapter would need to either:

- Poll `GET /public/v1/posts/:id` (v2 stub, handler at `public.controller.ts:L50` but returning a different DB shape) until a terminal status emerges.
- Poll `GET /public/v1/posts/:id/missing` (handler `public.integrations.controller.ts:307-312`) to detect a stuck draft awaiting content.

Neither is needed for v1 draft-only — the human operator verifies in the
postiz UI. For v2 `type: 'now'`, polling is mandatory.

### 9.4 Analytics route

`GET /public/v1/analytics/post/:postId?date=…` (`public.integrations.controller.ts:340-347`)
returns per-post analytics. Out of scope for v1 and v2; would live in a
separate `mktg analytics` command or as a dashboard tile. Capture the
shape opportunistically during Phase B spot-checks.

### 9.5 Idempotency key upstream

File an upstream issue against `gitroomhq/postiz-app` requesting an
optional `Idempotency-Key` header on `POST /public/v1/posts`. If it
lands, the adapter can drop the sent-marker file entirely. Low priority —
the sent-marker is small (~KB per campaign) and well-scoped.

---

## Appendix — Cross-references

| Topic | Where |
|---|---|
| Full route enumeration (21 endpoints) | Phase 0 red-team §3.1 |
| Original AGPL evidence (npm view, tarball) | Phase 0 red-team §2.1 |
| Self-host Docker footprint analysis | Phase 0 red-team §4.1 |
| `CatalogEntry` revised shape | `src/types.ts` (CatalogEntry / CatalogsManifest) |
| `publishPostiz` signature + error bubbling to `CommandResult` | `src/commands/publish.ts` (postiz adapter) |
| Trigger collision table | skill reviewer Phase 0 red-team §4 |
| 7-axis DX mitigation matrix | architecture reviewer Phase 0 red-team §5 |

_End of Phase A reference. No source files modified. Every claim
reproducible from `raw.githubusercontent.com/gitroomhq/postiz-app/main/…`
at the line numbers cited above._
