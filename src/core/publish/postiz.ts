// mktg — Postiz raw-fetch adapter (AGPL firewall — NEVER import @postiz/node)
// Spec: docs/integration/postiz-api-reference.md

import { basename, extname, join } from "node:path";
import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { validatePathInput } from "../errors";
import { validatePublicUrl } from "../url-validation";
import { writeStdout } from "../output";
import { listNativePublishProviders } from "../native-publish";
import { type AdapterResult, type PublishItem } from "./types";

const POSTIZ_DEFAULT_BASE = "https://api.postiz.com";

const postizBaseCandidates = (rawBase: string): readonly string[] => {
  const base = rawBase.replace(/\/+$/, "");
  const candidates = [base];

  try {
    const url = new URL(base);
    const path = url.pathname.replace(/\/+$/, "");
    if (url.hostname !== "api.postiz.com" && path !== "/api" && !path.endsWith("/api")) {
      url.pathname = `${path}/api`.replace(/\/{2,}/g, "/");
      candidates.push(url.toString().replace(/\/+$/, ""));
    }
  } catch {
    // Keep invalid URL handling in fetch; this helper only adds self-host fallbacks.
  }

  return [...new Set(candidates)];
};

// Full Integration shape from GET /public/v1/integrations
// Source: apps/backend/src/public-api/routes/v1/public.integrations.controller.ts:176-195
export type PostizIntegration = {
  readonly id: string;
  readonly identifier: string;
  readonly name: string;
  readonly picture: string;
  readonly disabled: boolean;
  readonly profile: string;
  readonly customer?: { readonly id: string; readonly name: string } | null;
};

type PostizError =
  | { readonly kind: "auth-missing" }
  | { readonly kind: "auth-invalid"; readonly msg: string }
  | { readonly kind: "subscription-required"; readonly msg: string }
  | { readonly kind: "rate-limited"; readonly retryAfterSeconds: number | null; readonly msg: string }
  | { readonly kind: "bad-request"; readonly msg: string; readonly status: number }
  | { readonly kind: "server-error"; readonly status: number; readonly msg: string }
  | { readonly kind: "network"; readonly detail: string };

type PostizResult<T> =
  | { readonly ok: true; readonly data: T; readonly status: number }
  | { readonly ok: false; readonly error: PostizError; readonly status: number | null };

type PostizFetchInit = {
  readonly method: "GET" | "POST" | "DELETE" | "PUT";
  readonly headers?: Record<string, string>;
  readonly body?: Record<string, unknown> | FormData;
};

export type PostizDiagnosticsResult = {
  readonly adapter: "postiz";
  readonly configured: boolean;
  readonly base: string;
  readonly checks: readonly { readonly name: "api-key" | "connected" | "integrations"; readonly status: "pass" | "fail" | "warn"; readonly detail: string }[];
  readonly providers: readonly PostizIntegration[];
};

// Spec §6.4 (O1). List connected postiz integrations for skill activation use.
export type ListIntegrationsResult = {
  readonly adapter: "postiz" | "mktg-native";
  readonly integrations: readonly PostizIntegration[];
};

// Spec §2. Zero dependencies — native fetch only. Returns typed errors, never throws.
// Auth header is bare: Authorization: <key> (no "Bearer" prefix) per
// apps/backend/src/services/auth/public.auth.middleware.ts:16-20.
export const postizFetch = async <T>(path: string, init: PostizFetchInit): Promise<PostizResult<T>> => {
  const apiKey = process.env.POSTIZ_API_KEY;
  const base = process.env.POSTIZ_API_BASE ?? POSTIZ_DEFAULT_BASE;

  if (!apiKey) {
    return { ok: false, error: { kind: "auth-missing" }, status: null };
  }

  const headers: Record<string, string> = {
    ...(init.headers ?? {}),
    Authorization: apiKey,
  };

  let body: string | FormData | undefined;
  if (init.body instanceof FormData) {
    body = init.body;
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers["Content-Type"] = "application/json";
  }

  let lastNetworkError: unknown;
  const candidates = postizBaseCandidates(base);

  for (const [index, candidate] of candidates.entries()) {
    const isLast = index === candidates.length - 1;
    let res: Response;
    try {
      const fetchInit: RequestInit = {
        method: init.method,
        headers,
        signal: AbortSignal.timeout(15000),
        ...(body !== undefined ? { body } : {}),
      };
      res = await fetch(`${candidate}${path}`, fetchInit);
    } catch (e) {
      lastNetworkError = e;
      if (!isLast) continue;
      return {
        ok: false,
        error: { kind: "network", detail: e instanceof Error ? e.message : String(e) },
        status: null,
      };
    }

    if (res.ok) {
      try {
        const data = (await res.json()) as T;
        return { ok: true, data, status: res.status };
      } catch {
        if (!isLast) continue;
        return {
          ok: false,
          error: { kind: "bad-request", msg: "Invalid JSON response from Postiz", status: res.status },
          status: res.status,
        };
      }
    }

    if (res.status === 404 && !isLast) continue;

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
  }

  return {
    ok: false,
    error: { kind: "network", detail: lastNetworkError instanceof Error ? lastNetworkError.message : String(lastNetworkError ?? "Unknown network error") },
    status: null,
  };
};

// Spec §6. Maps PostizError to a human-readable detail string for AdapterResult.
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

// ─── Sent-marker idempotency (spec §5) ───

type PostizSentEntry = { readonly postedAt: string; readonly providers: readonly string[] };
export type PostizSentMarker = {
  readonly version: 1;
  readonly campaign: string;
  readonly catalog: "postiz";
  readonly sent: Record<string, PostizSentEntry>;
};

// Spec §5.2. Stable hash across runs: campaign + content + sorted(integration_ids).
// Double-delimiter prevents field smuggling via "||" in content.
export const sentMarkerKey = (campaign: string, content: string, integrationIds: readonly string[]): string => {
  const ids = [...integrationIds].sort().join("|");
  const buf = `${campaign}||${content}||${ids}`;
  return createHash("sha256").update(buf).digest("hex");
};

const emptySentMarker = (campaign: string): PostizSentMarker => ({
  version: 1,
  campaign,
  catalog: "postiz",
  sent: {},
});

const isPostizSentMarker = (v: unknown): v is PostizSentMarker => {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  if (m.version !== 1) return false;
  if (typeof m.campaign !== "string") return false;
  if (m.catalog !== "postiz") return false;
  if (!m.sent || typeof m.sent !== "object" || Array.isArray(m.sent)) return false;
  for (const entry of Object.values(m.sent as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") return false;
    const e = entry as Record<string, unknown>;
    if (typeof e.postedAt !== "string") return false;
    if (!Array.isArray(e.providers) || !e.providers.every((p) => typeof p === "string")) return false;
  }
  return true;
};

const archiveCorrupt = async (path: string): Promise<void> => {
  const iso = new Date().toISOString().replace(/:/g, "-");
  const corruptPath = path.replace(/\.json$/, `.corrupt.${iso}.json`);
  try { await rename(path, corruptPath); } catch { /* best-effort */ }
};

export const loadSentMarker = async (path: string, campaign: string): Promise<PostizSentMarker> => {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return emptySentMarker(campaign);
    const raw = await file.text();
    const parsed = JSON.parse(raw) as unknown;
    if (!isPostizSentMarker(parsed)) {
      await archiveCorrupt(path);
      writeStdout(JSON.stringify({ type: "postiz-sent-marker-corrupt", path, detail: "shape mismatch" }));
      return emptySentMarker(campaign);
    }
    // If campaign doesn't match the on-disk file, start fresh (prevents cross-campaign replay).
    if (parsed.campaign !== campaign) return emptySentMarker(campaign);
    return parsed;
  } catch (e) {
    await archiveCorrupt(path);
    writeStdout(JSON.stringify({ type: "postiz-sent-marker-corrupt", path, detail: e instanceof Error ? e.message : String(e) }));
    return emptySentMarker(campaign);
  }
};

export const persistSentMarker = async (path: string, marker: PostizSentMarker): Promise<void> => {
  await mkdir(join(path, ".."), { recursive: true });
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(marker, null, 2));
  await rename(tmp, path);
};

// ─── CreatePostDto builder (spec §4) ───

type CreatePostDto = {
  readonly type: "draft" | "schedule" | "now" | "update";
  readonly shortLink: boolean;
  readonly date: string;
  readonly tags: readonly { readonly value: string; readonly label: string }[];
  readonly posts: readonly {
    readonly integration: { readonly id: string };
    readonly value: readonly { readonly content: string; readonly image: readonly PostizMedia[] }[];
  }[];
};

type PostizMedia = {
  readonly id: string;
  readonly path: string;
  readonly alt?: string;
  readonly thumbnail?: string;
};

const buildCreatePostDraft = (
  content: string,
  resolved: readonly { readonly provider: string; readonly id: string }[],
  media: readonly PostizMedia[] = [],
): CreatePostDto => ({
  type: "draft",
  shortLink: false,
  date: new Date().toISOString(),
  tags: [],
  posts: resolved.map(({ id }) => ({
    integration: { id },
    value: [{ content, image: media }],
  })),
});

const imageMimeFromExtension = (filePath: string): string => {
  switch (extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".avif":
      return "image/avif";
    case ".bmp":
      return "image/bmp";
    case ".tif":
    case ".tiff":
      return "image/tiff";
    case ".mp4":
      return "video/mp4";
    case ".jpg":
    case ".jpeg":
    default:
      return "image/jpeg";
  }
};

const isPostizMedia = (value: unknown): value is PostizMedia => {
  if (!value || typeof value !== "object") return false;
  const media = value as Record<string, unknown>;
  return typeof media.id === "string" && typeof media.path === "string";
};

// Defensively read item.metadata.providers across current-narrow and
// future-wide types. Validates at runtime so the adapter works regardless
// of the PublishItem.metadata type promotion in src/types.ts.
const extractProviders = (item: PublishItem): { ok: true; providers: readonly string[] } | { ok: false; detail: string } => {
  const meta = (item as { metadata?: Record<string, unknown> }).metadata;
  if (!meta || typeof meta !== "object") {
    return { ok: false, detail: "Missing item.metadata.providers[] — add at least one postiz identifier (e.g., \"linkedin\", \"bluesky\")" };
  }
  const providers = (meta as Record<string, unknown>).providers;
  if (!Array.isArray(providers) || providers.length === 0) {
    return { ok: false, detail: "Missing item.metadata.providers[] — add at least one postiz identifier (e.g., \"linkedin\", \"bluesky\")" };
  }
  if (!providers.every((p) => typeof p === "string")) {
    return { ok: false, detail: "item.metadata.providers[] must contain only strings (postiz identifiers)" };
  }
  return { ok: true, providers: providers as readonly string[] };
};

const metadataStrings = (metadata: Readonly<Record<string, unknown>> | undefined, pluralKey: string, singularKey: string): readonly string[] => {
  const plural = metadata?.[pluralKey];
  if (Array.isArray(plural)) {
    return plural.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim());
  }
  const singular = metadata?.[singularKey];
  if (typeof singular === "string" && singular.trim().length > 0) return [singular.trim()];
  return [];
};

const extractMediaInputs = (item: PublishItem): { readonly paths: readonly string[]; readonly urls: readonly string[] } => {
  const metadata = item.metadata;
  return {
    paths: metadataStrings(metadata, "mediaPaths", "mediaPath"),
    urls: metadataStrings(metadata, "mediaUrls", "mediaUrl"),
  };
};

const uploadPostizMediaPath = async (cwd: string, rawPath: string): Promise<PostizResult<PostizMedia>> => {
  const pathCheck = validatePathInput(cwd, rawPath);
  if (!pathCheck.ok) {
    return { ok: false, error: { kind: "bad-request", msg: pathCheck.message, status: 400 }, status: 400 };
  }

  const filePath = join(cwd, rawPath);
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    return { ok: false, error: { kind: "bad-request", msg: `Media file not found: ${rawPath}`, status: 400 }, status: 400 };
  }

  const form = new FormData();
  const blob = new Blob([await file.arrayBuffer()], { type: imageMimeFromExtension(filePath) });
  form.append("file", blob, basename(filePath));
  const result = await postizFetch<unknown>("/public/v1/upload", { method: "POST", body: form });
  if (!result.ok) return result;
  if (!isPostizMedia(result.data)) {
    return { ok: false, error: { kind: "bad-request", msg: "Postiz upload returned an invalid media object", status: result.status }, status: result.status };
  }
  return { ok: true, data: result.data, status: result.status };
};

const uploadPostizMediaUrl = async (rawUrl: string): Promise<PostizResult<PostizMedia>> => {
  const valid = validatePublicUrl(rawUrl);
  if (!valid.ok) {
    return { ok: false, error: { kind: "bad-request", msg: valid.message, status: 400 }, status: 400 };
  }

  const result = await postizFetch<unknown>("/public/v1/upload-from-url", {
    method: "POST",
    body: { url: valid.url },
  });
  if (!result.ok) return result;
  if (!isPostizMedia(result.data)) {
    return { ok: false, error: { kind: "bad-request", msg: "Postiz upload-from-url returned an invalid media object", status: result.status }, status: result.status };
  }
  return { ok: true, data: result.data, status: result.status };
};

const uploadPostizMedia = async (
  item: PublishItem,
  cwd: string,
): Promise<{ ok: true; media: readonly PostizMedia[] } | { ok: false; detail: string; hardStop: boolean }> => {
  const inputs = extractMediaInputs(item);
  const media: PostizMedia[] = [];

  for (const path of inputs.paths) {
    const result = await uploadPostizMediaPath(cwd, path);
    if (!result.ok) {
      return {
        ok: false,
        detail: `Media upload failed for ${path}: ${mapPostizError(result.error)}`,
        hardStop: ["auth-missing", "auth-invalid", "subscription-required", "rate-limited"].includes(result.error.kind),
      };
    }
    media.push(result.data);
  }

  for (const url of inputs.urls) {
    const result = await uploadPostizMediaUrl(url);
    if (!result.ok) {
      return {
        ok: false,
        detail: `Media upload failed for ${url}: ${mapPostizError(result.error)}`,
        hardStop: ["auth-missing", "auth-invalid", "subscription-required", "rate-limited"].includes(result.error.kind),
      };
    }
    media.push(result.data);
  }

  return { ok: true, media };
};

// Spec §3. Two-step flow: resolve via GET /integrations → POST /posts per item.
type PublishPostizInput = {
  readonly campaign: string;
  readonly items: readonly PublishItem[];
  readonly confirm: boolean;
  readonly cwd: string;
  readonly ndjson: boolean;
};

export const publishPostiz = async (inp: PublishPostizInput): Promise<AdapterResult> => {
  const results: AdapterResult["results"][number][] = [];
  const buildFailAll = (detail: string): AdapterResult => ({
    adapter: "postiz",
    items: inp.items.length,
    published: 0,
    failed: inp.items.length,
    errors: Array(inp.items.length).fill(detail),
    results: inp.items.map((_, i) => ({ item: i, status: "failed" as const, detail })),
  });

  const markerPath = join(inp.cwd, ".mktg", "publish", `${inp.campaign}-postiz.json`);
  const marker = await loadSentMarker(markerPath, inp.campaign);

  const listRes = await postizFetch<readonly PostizIntegration[]>("/public/v1/integrations", { method: "GET" });
  if (!listRes.ok) {
    return buildFailAll(mapPostizError(listRes.error));
  }

  const identifierToId = new Map<string, string>();
  for (const int of listRes.data) {
    if (!int.disabled) identifierToId.set(int.identifier, int.id);
  }

  let published = 0;
  let failed = 0;
  let hardStop = false;

  for (let i = 0; i < inp.items.length; i++) {
    if (hardStop) {
      results.push({ item: i, status: "skipped", detail: "Skipped — prior item failed with hard-stop error" });
      continue;
    }
    const item = inp.items[i]!;

    const extracted = extractProviders(item);
    if (!extracted.ok) {
      results.push({ item: i, status: "failed", detail: extracted.detail });
      failed++;
      continue;
    }
    const providers = extracted.providers;

    const resolved: { provider: string; id: string }[] = [];
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

    if (!inp.confirm) {
      const mediaInputs = extractMediaInputs(item);
      const mediaDetail = mediaInputs.paths.length + mediaInputs.urls.length > 0
        ? ` with ${mediaInputs.paths.length + mediaInputs.urls.length} media upload(s)`
        : "";
      results.push({ item: i, status: "skipped", detail: `[dry-run] would draft to: ${providers.join(", ")}${mediaDetail}` });
      if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "skipped" }));
      continue;
    }

    const key = sentMarkerKey(inp.campaign, item.content, resolved.map((r) => r.id));
    if (marker.sent[key]) {
      results.push({ item: i, status: "skipped", detail: "already-sent (sent-marker hit)" });
      if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "skipped", reason: "already-sent" }));
      continue;
    }

    const uploaded = await uploadPostizMedia(item, inp.cwd);
    if (!uploaded.ok) {
      results.push({ item: i, status: "failed", detail: uploaded.detail });
      failed++;
      if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "failed", detail: uploaded.detail }));
      if (uploaded.hardStop) hardStop = true;
      continue;
    }

    const body = buildCreatePostDraft(item.content, resolved, uploaded.media) as unknown as Record<string, unknown>;
    const postRes = await postizFetch<unknown>("/public/v1/posts", { method: "POST", body });
    if (!postRes.ok) {
      const detail = mapPostizError(postRes.error);
      results.push({ item: i, status: "failed", detail });
      failed++;
      if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "failed", detail }));
      if (postRes.error.kind === "rate-limited" || postRes.error.kind === "subscription-required" || postRes.error.kind === "auth-missing" || postRes.error.kind === "auth-invalid") {
        hardStop = true;
      }
      continue;
    }

    marker.sent[key] = { postedAt: new Date().toISOString(), providers: [...providers] };
    if (inp.ndjson) writeStdout(JSON.stringify({ adapter: "postiz", item: i, status: "draft-external", providers }));
    // The v1 postiz adapter only creates drafts (buildCreatePostDraft) —
    // postiz itself owns any later scheduling/sending.
    results.push({ item: i, status: "draft-external", detail: `draft on postiz → ${providers.join(", ")}` });
    published++;
  }

  // Best-effort persist — never crash if disk write fails.
  await persistSentMarker(markerPath, marker).catch((e) => {
    writeStdout(JSON.stringify({ type: "postiz-sent-marker-write-failed", path: markerPath, detail: e instanceof Error ? e.message : String(e) }));
  });

  return {
    adapter: "postiz",
    items: inp.items.length,
    published,
    failed,
    errors: results.filter((r) => r.status === "failed").map((r) => r.detail),
    results,
  };
};

export const listPostizIntegrations = async (): Promise<
  { ok: true; data: ListIntegrationsResult } | { ok: false; detail: string; exitCode: 3 | 5 | 2 }
> => {
  const res = await postizFetch<readonly PostizIntegration[]>("/public/v1/integrations", { method: "GET" });
  if (!res.ok) {
    const detail = mapPostizError(res.error);
    const exitCode: 3 | 5 | 2 =
      res.error.kind === "auth-missing" || res.error.kind === "auth-invalid" || res.error.kind === "subscription-required"
        ? 3
        : res.error.kind === "rate-limited" || res.error.kind === "network" || res.error.kind === "server-error"
          ? 5
          : 2;
    return { ok: false, detail, exitCode };
  }
  return { ok: true, data: { adapter: "postiz", integrations: res.data } };
};

export const diagnosePostiz = async (): Promise<PostizDiagnosticsResult> => {
  const base = process.env.POSTIZ_API_BASE ?? POSTIZ_DEFAULT_BASE;
  const checks: PostizDiagnosticsResult["checks"][number][] = [];

  if (!process.env.POSTIZ_API_KEY) {
    return {
      adapter: "postiz",
      configured: false,
      base,
      providers: [],
      checks: [{ name: "api-key", status: "fail", detail: "POSTIZ_API_KEY is not set." }],
    };
  }

  checks.push({ name: "api-key", status: "pass", detail: "POSTIZ_API_KEY is set." });

  const connected = await postizFetch<{ connected: boolean }>("/public/v1/is-connected", { method: "GET" });
  if (!connected.ok) {
    return {
      adapter: "postiz",
      configured: false,
      base,
      providers: [],
      checks: [...checks, { name: "connected", status: "fail", detail: mapPostizError(connected.error) }],
    };
  }
  checks.push({
    name: "connected",
    status: connected.data.connected ? "pass" : "warn",
    detail: connected.data.connected ? "Postiz API accepted the key." : "Postiz responded but did not report an active connection.",
  });

  const integrations = await postizFetch<readonly PostizIntegration[]>("/public/v1/integrations", { method: "GET" });
  if (!integrations.ok) {
    return {
      adapter: "postiz",
      configured: false,
      base,
      providers: [],
      checks: [...checks, { name: "integrations", status: "fail", detail: mapPostizError(integrations.error) }],
    };
  }

  const active = integrations.data.filter((provider) => !provider.disabled);
  checks.push({
    name: "integrations",
    status: active.length > 0 ? "pass" : "warn",
    detail: active.length > 0
      ? `${active.length} active Postiz provider${active.length === 1 ? "" : "s"} connected.`
      : "Postiz is reachable, but no active providers are connected yet.",
  });

  return {
    adapter: "postiz",
    configured: checks.every((check) => check.status !== "fail"),
    base,
    checks,
    providers: integrations.data,
  };
};

export const listNativeIntegrations = async (
  cwd: string,
): Promise<{ ok: true; data: ListIntegrationsResult }> => {
  const integrations = await listNativePublishProviders(cwd);
  return {
    ok: true,
    data: {
      adapter: "mktg-native",
      integrations: integrations.map((integration) => ({
        id: integration.id,
        identifier: integration.identifier,
        name: integration.name,
        picture: integration.picture,
        disabled: integration.disabled,
        profile: integration.profile,
      })),
    },
  };
};
