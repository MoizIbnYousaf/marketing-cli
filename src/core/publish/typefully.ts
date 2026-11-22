// mktg — Typefully publish adapter (API v2)
//
// Typefully retired API v1 on 15 June 2026. v2 differs in three ways that
// matter here:
//   - Auth is `Authorization: Bearer <key>` (v1 used an `X-API-KEY` header).
//   - Drafts live under a social set: POST /v2/social-sets/{id}/drafts.
//   - Content is per platform: { platforms: { x: { enabled, posts: [{ text }] } } }.
//
// The API creates DRAFTS unless `publish_at` is supplied, so results are
// reported as "draft-external" and never as "sent".

import { writeStdout } from "../output";
import { type AdapterResult, type AdapterResultItem, type PublishItem } from "./types";
import { finalizeAdapterResult, pushDryRunSkip } from "./adapters";

const DEFAULT_API_BASE = "https://api.typefully.com/v2";
const REQUEST_TIMEOUT_MS = 10_000;
/** Four newlines separate posts in a thread, the convention v1 content used. */
const THREAD_SEPARATOR = /\n{4,}/;
const DEFAULT_PLATFORMS: readonly string[] = ["x"];
const PASSTHROUGH_FIELDS: readonly string[] = ["publish_at", "draft_title"];
/** Platforms whose v2 body is `{ enabled, posts: [{ text }] }`. `x_article` has its own schema. */
const POST_PLATFORMS: ReadonlySet<string> = new Set(["x", "linkedin", "mastodon", "threads", "bluesky"]);

type Metadata = NonNullable<PublishItem["metadata"]>;

export const typefullyApiBase = (): string =>
  (process.env.TYPEFULLY_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");

const authHeaders = (apiKey: string): Record<string, string> => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
});

const firstString = (value: Metadata[string]): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const platformsFor = (metadata: Metadata): readonly string[] => {
  const raw = metadata.platforms;
  if (Array.isArray(raw) && raw.length > 0) return raw as readonly string[];
  if (typeof raw === "string" && raw.length > 0) {
    return raw.split(",").map((p) => p.trim()).filter(Boolean);
  }
  return DEFAULT_PLATFORMS;
};

/** Build the v2 draft body for one manifest item. */
export const buildTypefullyDraft = (item: PublishItem): Record<string, unknown> => {
  const metadata: Metadata = item.metadata ?? {};
  const posts = item.content
    .split(THREAD_SEPARATOR)
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .map((text) => ({ text }));
  const platforms: Record<string, unknown> = {};
  for (const platform of platformsFor(metadata)) {
    platforms[platform] = { enabled: true, posts };
  }
  const body: Record<string, unknown> = { platforms };
  for (const field of PASSTHROUGH_FIELDS) {
    const value = firstString(metadata[field]);
    if (value !== undefined) body[field] = value;
  }
  // `share` is a boolean in the API. Manifests are JSON, so it can arrive as
  // a real boolean as well as the string "true".
  const share: unknown = metadata.share;
  if (share === true || share === "true") body.share = true;
  return body;
};

type SocialSetResolution =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly detail: string };

/**
 * Pick the social set to post under: explicit item metadata first, then
 * TYPEFULLY_SOCIAL_SET_ID, then the account's only social set. With several
 * sets and no explicit choice we refuse rather than guess an account.
 */
const resolveSocialSet = async (apiKey: string, metadata: Metadata): Promise<SocialSetResolution> => {
  const explicit = firstString(metadata.social_set_id) ?? process.env.TYPEFULLY_SOCIAL_SET_ID;
  if (explicit) {
    return /^[A-Za-z0-9_-]+$/.test(explicit)
      ? { ok: true, id: explicit }
      : { ok: false, detail: "social_set_id must contain only letters, digits, '-' or '_'" };
  }
  const resp = await fetch(`${typefullyApiBase()}/social-sets`, {
    headers: authHeaders(apiKey),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!resp.ok) return { ok: false, detail: `Could not list social sets: HTTP ${resp.status}` };
  const payload = (await resp.json()) as { results?: readonly { id?: string | number }[] };
  const sets = payload.results ?? [];
  if (sets.length === 1 && sets[0]?.id !== undefined) return { ok: true, id: String(sets[0].id) };
  if (sets.length === 0) return { ok: false, detail: "No Typefully social sets found for this API key" };
  return {
    ok: false,
    detail: `Account has ${sets.length} social sets; set TYPEFULLY_SOCIAL_SET_ID or metadata.social_set_id`,
  };
};

/** Platforms in the item this adapter cannot build a body for, if any. */
export const unsupportedTypefullyPlatforms = (item: PublishItem): readonly string[] =>
  platformsFor(item.metadata ?? {}).filter((platform) => !POST_PLATFORMS.has(platform));

/** Describe what Typefully will do with the draft, without claiming a send. */
const successDetail = (item: PublishItem): string => {
  const publishAt = firstString((item.metadata ?? {}).publish_at);
  if (publishAt === undefined) return "Draft created on Typefully";
  if (publishAt === "now") return "Draft created on Typefully; publishing started (asynchronous, not yet confirmed)";
  if (publishAt === "next-free-slot") return "Draft created on Typefully; queued for the next free slot";
  return `Draft created on Typefully; scheduled for ${publishAt}`;
};

const failureDetail = async (resp: Response): Promise<string> => {
  const text = (await resp.text().catch(() => "")).trim().slice(0, 200);
  return text.length > 0 ? `HTTP ${resp.status}: ${text}` : `HTTP ${resp.status}`;
};

export const publishTypefully = async (
  items: PublishItem[],
  confirm: boolean,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const apiKey = process.env.TYPEFULLY_API_KEY;
  const results: AdapterResultItem[] = [];

  if (!apiKey) {
    return {
      adapter: "typefully", items: items.length, published: 0, failed: items.length,
      errors: ["TYPEFULLY_API_KEY not set"],
      results: items.map((_, i) => ({ item: i, status: "failed" as const, detail: "API key missing" })),
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (!confirm) {
      pushDryRunSkip(results, "typefully", i, `Would publish: ${item.content.slice(0, 80)}...`, ndjson);
      continue;
    }
    try {
      const unsupported = unsupportedTypefullyPlatforms(item);
      const socialSet = unsupported.length > 0
        ? { ok: false as const, detail: `Unsupported Typefully platform(s): ${unsupported.join(", ")}. Supported: ${Array.from(POST_PLATFORMS).join(", ")}` }
        : await resolveSocialSet(apiKey, item.metadata ?? {});
      if (!socialSet.ok) {
        results.push({ item: i, status: "failed", detail: socialSet.detail });
      } else {
        const resp = await fetch(`${typefullyApiBase()}/social-sets/${socialSet.id}/drafts`, {
          method: "POST",
          headers: authHeaders(apiKey),
          body: JSON.stringify(buildTypefullyDraft(item)),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        results.push(
          resp.ok
            ? { item: i, status: "draft-external", detail: successDetail(item) }
            : { item: i, status: "failed", detail: await failureDetail(resp) },
        );
      }
    } catch (e) {
      results.push({ item: i, status: "failed", detail: e instanceof Error ? e.message : "Unknown error" });
    }
    if (ndjson) writeStdout(JSON.stringify({ adapter: "typefully", item: i, status: results[results.length - 1]!.status }));
  }

  return finalizeAdapterResult("typefully", items, results);
};
