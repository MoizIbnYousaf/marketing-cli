// mktg — Typefully publish adapter (API v2)
//
// Typefully retired API v1 on 15 June 2026. v2 differs in three ways that
// matter here:
//   - Auth is `Authorization: Bearer <key>` (v1 used an `X-API-KEY` header).
//   - Drafts live under a social set: POST /v2/social-sets/{id}/drafts.
//   - Content is per platform: { platforms: { x: { enabled, posts: [{ text }] } } }.
//
// The API creates DRAFTS unless `publish_at` is supplied. With `publish_at`
// ("now", "next-free-slot" or an ISO 8601 time) the same request publishes or
// schedules the post. The reported status comes from Typefully's answer, not
// from the request: "scheduled", "publishing" or "published" is a send
// ("sent"), "draft" is "draft-external", and an answer that does not confirm
// either (no draft id, no recognised status for a publish_at request) fails
// the item with "not confirmed — check Typefully before re-sending".

import { writeStdout } from "../output";
import { type AdapterResult, type AdapterResultItem, type PublishItem, allFailedCounts } from "./types";
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

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?$/;

/** The publish_at the request will carry, or undefined for a plain draft. */
const requestedPublishAt = (item: PublishItem): string | undefined => firstString((item.metadata ?? {}).publish_at);

/**
 * Checks that need no request: why the item cannot be sent, or null. They run
 * in the dry run too, so a preview fails the items a confirmed run would.
 */
const planProblem = (item: PublishItem): string | null => {
  const unsupported = unsupportedTypefullyPlatforms(item);
  if (unsupported.length > 0) {
    return `Unsupported Typefully platform(s): ${unsupported.join(", ")}. Supported: ${Array.from(POST_PLATFORMS).join(", ")}`;
  }
  const metadata: Metadata = item.metadata ?? {};
  const explicit = firstString(metadata.social_set_id) ?? process.env.TYPEFULLY_SOCIAL_SET_ID;
  if (explicit && !/^[A-Za-z0-9_-]+$/.test(explicit)) return "social_set_id must contain only letters, digits, '-' or '_'";
  const publishAt: unknown = metadata.publish_at;
  if (publishAt === undefined || publishAt === null || publishAt === "") return null;
  const valid = typeof publishAt === "string" &&
    (publishAt === "now" || publishAt === "next-free-slot" || (ISO_TIME.test(publishAt) && !Number.isNaN(Date.parse(publishAt))));
  return valid ? null : `metadata.publish_at must be "now", "next-free-slot" or an ISO 8601 time (got ${JSON.stringify(publishAt)})`;
};

type DraftAnswer = { readonly id?: unknown; readonly status?: unknown; readonly scheduled_date?: unknown };

/** A 2xx answer that confirms a draft: an object with an id. Anything else is not a confirmation. */
const readAnswer = async (resp: Response): Promise<{ ok: true; answer: DraftAnswer } | { ok: false; detail: string }> => {
  const text = await resp.text().catch(() => "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, detail: `Invalid JSON response from Typefully (HTTP ${resp.status}); the draft is not confirmed — check Typefully before re-sending` };
  }
  const answer = parsed as DraftAnswer | null;
  if (!answer || typeof answer !== "object" || Array.isArray(answer) || answer.id === undefined || answer.id === null) {
    return { ok: false, detail: `Typefully answered HTTP ${resp.status} without a draft id; the draft is not confirmed — check Typefully before re-sending` };
  }
  return { ok: true, answer };
};

/** Report what Typefully says it did, not what was asked. */
const outcome = (item: PublishItem, answer: DraftAnswer): Pick<AdapterResultItem, "status" | "detail"> => {
  const id = String(answer.id);
  const requested = requestedPublishAt(item);
  const state = typeof answer.status === "string" ? answer.status : undefined;
  if (state === "published") return { status: "sent", detail: `Published on Typefully (draft ${id})` };
  if (state === "publishing") return { status: "sent", detail: `Typefully accepted it and is publishing it now (draft ${id}); publishing is asynchronous` };
  if (state === "scheduled") {
    const when = typeof answer.scheduled_date === "string" ? answer.scheduled_date : requested === "next-free-slot" ? "the next free slot" : requested;
    return { status: "sent", detail: `Scheduled on Typefully for ${when ?? "a time Typefully chose"} (draft ${id})` };
  }
  if (state === "error") return { status: "failed", detail: `Typefully reported status "error" for draft ${id} — check it in Typefully before re-sending` };
  if (requested === undefined) return { status: "draft-external", detail: `Draft created on Typefully (not scheduled, not sent; draft ${id})` };
  if (state === "draft") {
    return {
      status: "draft-external",
      detail: `Draft ${id} created on Typefully but NOT scheduled (Typefully answered status "draft" although publish_at ${requested} was asked for). Schedule it in Typefully; re-sending creates another draft`,
    };
  }
  return {
    status: "failed",
    detail: `Typefully created draft ${id} but its answer does not say it was scheduled or published (status ${state ?? "missing"}), so publish_at ${requested} is not confirmed — check Typefully before re-sending`,
  };
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
  const line = (i: number): void => {
    const r = results[results.length - 1]!;
    if (ndjson) writeStdout(JSON.stringify({ adapter: "typefully", item: i, status: r.status, ...(r.status === "failed" ? { detail: r.detail } : {}) }));
  };

  if (!apiKey) {
    for (let i = 0; i < items.length; i++) {
      results.push({ item: i, status: "failed", detail: "API key missing" });
      line(i);
    }
    return { adapter: "typefully", items: items.length, ...allFailedCounts(items.length), errors: ["TYPEFULLY_API_KEY not set"], results };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const problem = planProblem(item);
    if (problem !== null) {
      results.push({ item: i, status: "failed", detail: problem });
      line(i);
      continue;
    }
    if (!confirm) {
      pushDryRunSkip(results, "typefully", i, `Would publish: ${item.content.slice(0, 80)}...`, ndjson);
      continue;
    }
    try {
      const socialSet = await resolveSocialSet(apiKey, item.metadata ?? {});
      if (!socialSet.ok) {
        results.push({ item: i, status: "failed", detail: socialSet.detail });
      } else {
        const resp = await fetch(`${typefullyApiBase()}/social-sets/${socialSet.id}/drafts`, {
          method: "POST",
          headers: authHeaders(apiKey),
          body: JSON.stringify(buildTypefullyDraft(item)),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (!resp.ok) {
          results.push({ item: i, status: "failed", detail: await failureDetail(resp) });
        } else {
          const read = await readAnswer(resp);
          results.push(read.ok ? { item: i, ...outcome(item, read.answer) } : { item: i, status: "failed", detail: read.detail });
        }
      }
    } catch (e) {
      results.push({ item: i, status: "failed", detail: e instanceof Error ? e.message : "Unknown error" });
    }
    line(i);
  }

  return finalizeAdapterResult("typefully", items, results);
};
