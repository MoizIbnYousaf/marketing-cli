// mktg publish — Distribution pipeline with pluggable platform adapters
// Takes a campaign directory with publish.json manifest, pushes to platforms.
// --dry-run validates, --confirm executes. NDJSON streaming for progress.

import { basename, extname, join } from "node:path";
import { createHash } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { ok, err, type CommandHandler, type CommandSchema, type PublishPostType } from "../types";
import { rejectControlChars, validatePathInput, parseJsonInput } from "../core/errors";
import { validatePublicUrl } from "../core/url-validation";
import { isTTY, writeStderr, bold, dim, green, yellow, red } from "../core/output";
import {
  appendNativePublishPost,
  getNativePublishAccountSummary,
  listNativePublishPosts,
  listNativePublishProviders,
  resolveNativePublishTargets,
  upsertNativePublishProvider,
  type NativePublishProviderInput,
} from "../core/native-publish";

export const schema: CommandSchema = {
  name: "publish",
  description: "Distribution pipeline — push content to platforms via pluggable adapters",
  positional: { name: "path", description: "Campaign directory or publish.json path", required: false },
  flags: [
    { name: "--confirm", type: "boolean", required: false, description: "Execute publishing (without this, publish is dry-run by default)" },
    { name: "--adapter", type: "string", required: false, description: "Run only a specific adapter (mktg-native, postiz, typefully, resend, file)" },
    { name: "--ndjson", type: "boolean", required: false, description: "Stream progress as NDJSON lines" },
    { name: "--list-adapters", type: "boolean", required: false, description: "List available adapters with env var requirements and configured status" },
    { name: "--list-integrations", type: "boolean", required: false, description: "For adapters backed by a provider registry (mktg-native, postiz), list connected providers. Returns NOT_IMPLEMENTED for adapters without one." },
    { name: "--diagnose", type: "boolean", required: false, description: "Run adapter connection diagnostics. Currently supports --adapter postiz." },
    { name: "--native-account", type: "boolean", required: false, description: "Show or auto-provision the local mktg-native workspace account and API key" },
    { name: "--native-upsert-provider", type: "boolean", required: false, description: "Create or update a local mktg-native provider using --input JSON" },
    { name: "--native-list-posts", type: "boolean", required: false, description: "List locally stored mktg-native posts in queue/history order" },
  ],
  output: {
    campaign: "string — campaign name from manifest",
    adapters: "AdapterResult[] — per-adapter publish results",
    totalItems: "number — total content items processed",
    published: "number — items successfully published",
    failed: "number — items that failed",
    dryRun: "boolean — true if this was a validation-only run",
  },
  examples: [
    { args: "mktg publish campaigns/launch/", description: "Validate launch campaign (dry-run)" },
    { args: "mktg publish campaigns/launch/ --confirm", description: "Execute publishing" },
    { args: "mktg publish --native-account --json", description: "Show the local mktg-native workspace account" },
    { args: "mktg publish --native-upsert-provider --input '{\"identifier\":\"linkedin\",\"name\":\"Acme LinkedIn\",\"profile\":\"acme\"}' --json", description: "Connect a local native provider" },
    { args: "mktg publish --adapter mktg-native --confirm", description: "Publish into the local mktg-native backend" },
    { args: "mktg publish --adapter postiz --confirm", description: "Publish only to Postiz" },
    { args: "mktg publish --adapter typefully --confirm", description: "Publish only to Typefully for X/threads specialist flows" },
    { args: "mktg publish campaigns/launch/ --ndjson", description: "Stream progress as NDJSON" },
    { args: "mktg publish --list-adapters --json", description: "List available adapters and their configured status" },
  ],
  vocabulary: ["publish", "distribute", "push", "ship", "deploy content"],
};

// Publish manifest schema
type PublishItem = {
  readonly type: "social" | "email" | "file";
  readonly adapter: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
};

type PublishManifest = {
  readonly name: string;
  readonly version?: number;
  readonly items: readonly PublishItem[];
};

type AdapterResult = {
  readonly adapter: string;
  readonly items: number;
  readonly published: number;
  readonly failed: number;
  readonly errors: readonly string[];
  readonly results: readonly { readonly item: number; readonly status: "published" | "failed" | "skipped"; readonly detail: string; readonly postType?: PublishPostType }[];
};

type NativeAccountResult = Awaited<ReturnType<typeof getNativePublishAccountSummary>>;
type NativeListPostsResult = { readonly adapter: "mktg-native"; readonly posts: Awaited<ReturnType<typeof listNativePublishPosts>> };
type NativeUpsertProviderResult = { readonly adapter: "mktg-native"; readonly provider: Awaited<ReturnType<typeof upsertNativePublishProvider>> };
type PostizDiagnosticsResult = {
  readonly adapter: "postiz";
  readonly configured: boolean;
  readonly base: string;
  readonly checks: readonly { readonly name: "api-key" | "connected" | "integrations"; readonly status: "pass" | "fail" | "warn"; readonly detail: string }[];
  readonly providers: readonly PostizIntegration[];
};

type PublishResult = {
  readonly campaign: string;
  readonly adapters: readonly AdapterResult[];
  readonly totalItems: number;
  readonly published: number;
  readonly failed: number;
  readonly dryRun: boolean;
};

// Adapter: Typefully (requires TYPEFULLY_API_KEY)
const publishTypefully = async (
  items: PublishItem[],
  confirm: boolean,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const apiKey = process.env.TYPEFULLY_API_KEY;
  const results: AdapterResult["results"][number][] = [];

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
      results.push({ item: i, status: "skipped", detail: `Would publish: ${item.content.slice(0, 80)}...` });
      if (ndjson) writeStderr(JSON.stringify({ adapter: "typefully", item: i, status: "skipped" }));
      continue;
    }
    try {
      const resp = await fetch("https://api.typefully.com/v1/drafts/", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ content: item.content, ...item.metadata }),
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        results.push({ item: i, status: "published", detail: "Draft created" });
      } else {
        results.push({ item: i, status: "failed", detail: `HTTP ${resp.status}` });
      }
    } catch (e) {
      results.push({ item: i, status: "failed", detail: e instanceof Error ? e.message : "Unknown error" });
    }
    if (ndjson) writeStderr(JSON.stringify({ adapter: "typefully", item: i, status: results[results.length - 1]!.status }));
  }

  return {
    adapter: "typefully",
    items: items.length,
    published: results.filter(r => r.status === "published").length,
    failed: results.filter(r => r.status === "failed").length,
    errors: results.filter(r => r.status === "failed").map(r => r.detail),
    results,
  };
};

// Adapter: Resend (requires RESEND_API_KEY)
const publishResend = async (
  items: PublishItem[],
  confirm: boolean,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const apiKey = process.env.RESEND_API_KEY;
  const results: AdapterResult["results"][number][] = [];

  if (!apiKey) {
    return {
      adapter: "resend", items: items.length, published: 0, failed: items.length,
      errors: ["RESEND_API_KEY not set"],
      results: items.map((_, i) => ({ item: i, status: "failed" as const, detail: "API key missing" })),
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (!confirm) {
      results.push({ item: i, status: "skipped", detail: `Would send: ${item.content.slice(0, 80)}...` });
      if (ndjson) writeStderr(JSON.stringify({ adapter: "resend", item: i, status: "skipped" }));
      continue;
    }
    try {
      const metadata = item.metadata ?? {};
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: metadata.from ?? "noreply@example.com",
          to: metadata.to ?? "",
          subject: metadata.subject ?? "Published via mktg",
          html: item.content,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        results.push({ item: i, status: "published", detail: "Email sent" });
      } else {
        results.push({ item: i, status: "failed", detail: `HTTP ${resp.status}` });
      }
    } catch (e) {
      results.push({ item: i, status: "failed", detail: e instanceof Error ? e.message : "Unknown error" });
    }
    if (ndjson) writeStderr(JSON.stringify({ adapter: "resend", item: i, status: results[results.length - 1]!.status }));
  }

  return {
    adapter: "resend",
    items: items.length,
    published: results.filter(r => r.status === "published").length,
    failed: results.filter(r => r.status === "failed").length,
    errors: results.filter(r => r.status === "failed").map(r => r.detail),
    results,
  };
};

// Adapter: File (writes to output directory — always available)
const publishFile = async (
  items: PublishItem[],
  confirm: boolean,
  cwd: string,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const results: AdapterResult["results"][number][] = [];
  const outDir = join(cwd, ".mktg", "published");

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const metadataFilename = item.metadata?.filename;
    const rawFilename = typeof metadataFilename === "string" ? metadataFilename : `item-${i}.txt`;
    // Sanitize filename — strip path separators and traversal to prevent writes outside outDir
    const filename = rawFilename.replace(/[/\\]/g, "_").replace(/\.\./g, "_");
    if (!confirm) {
      results.push({ item: i, status: "skipped", detail: `Would write: ${filename}` });
      if (ndjson) writeStderr(JSON.stringify({ adapter: "file", item: i, status: "skipped" }));
      continue;
    }
    try {
      const { mkdir: mkdirFs } = await import("node:fs/promises");
      await mkdirFs(outDir, { recursive: true });
      await Bun.write(join(outDir, filename), item.content);
      results.push({ item: i, status: "published", detail: `Written to ${filename}` });
    } catch (e) {
      results.push({ item: i, status: "failed", detail: e instanceof Error ? e.message : "Unknown error" });
    }
    if (ndjson) writeStderr(JSON.stringify({ adapter: "file", item: i, status: results[results.length - 1]!.status }));
  }

  return {
    adapter: "file",
    items: items.length,
    published: results.filter(r => r.status === "published").length,
    failed: results.filter(r => r.status === "failed").length,
    errors: results.filter(r => r.status === "failed").map(r => r.detail),
    results,
  };
};

const publishNative = async (
  items: PublishItem[],
  confirm: boolean,
  cwd: string,
  ndjson: boolean,
  campaign: string,
): Promise<AdapterResult> => {
  const results: AdapterResult["results"][number][] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const targetResolution = await resolveNativePublishTargets(
      cwd,
      item.metadata as Readonly<Record<string, unknown>> | undefined,
    );
    if (!targetResolution.ok) {
      results.push({ item: i, status: "failed", detail: targetResolution.detail });
      if (ndjson) writeStderr(JSON.stringify({ adapter: "mktg-native", item: i, status: "failed", detail: targetResolution.detail }));
      continue;
    }

    if (!confirm) {
      results.push({
        item: i,
        status: "skipped",
        detail: `[dry-run] would write ${item.metadata?.postType ?? "draft"} to native backend → ${targetResolution.targets.map((target) => target.identifier).join(", ")}`,
        postType: (item.metadata?.postType as PublishPostType | undefined) ?? "draft",
      });
      if (ndjson) writeStderr(JSON.stringify({ adapter: "mktg-native", item: i, status: "skipped" }));
      continue;
    }

    const metadata = item.metadata as Readonly<Record<string, unknown>> | undefined;
    const stored = await appendNativePublishPost(cwd, {
      campaign,
      content: item.content,
      ...(metadata ? { metadata } : {}),
      targets: targetResolution.targets,
    });
    const detail = `${stored.status} → ${targetResolution.targets.map((target) => target.identifier).join(", ")}`;
    results.push({ item: i, status: "published", detail, postType: stored.type });
    if (ndjson) writeStderr(JSON.stringify({ adapter: "mktg-native", item: i, status: "published", detail }));
  }

  return {
    adapter: "mktg-native",
    items: items.length,
    published: results.filter((result) => result.status === "published").length,
    failed: results.filter((result) => result.status === "failed").length,
    errors: results.filter((result) => result.status === "failed").map((result) => result.detail),
    results,
  };
};

// ─── Postiz raw-fetch adapter (AGPL firewall — NEVER import @postiz/node) ───
// Spec: docs/integration/postiz-api-reference.md

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
type PostizIntegration = {
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
type PostizSentMarker = {
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
      writeStderr(JSON.stringify({ type: "postiz-sent-marker-corrupt", path, detail: "shape mismatch" }));
      return emptySentMarker(campaign);
    }
    // If campaign doesn't match the on-disk file, start fresh (prevents cross-campaign replay).
    if (parsed.campaign !== campaign) return emptySentMarker(campaign);
    return parsed;
  } catch (e) {
    await archiveCorrupt(path);
    writeStderr(JSON.stringify({ type: "postiz-sent-marker-corrupt", path, detail: e instanceof Error ? e.message : String(e) }));
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

const publishPostiz = async (inp: PublishPostizInput): Promise<AdapterResult> => {
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
      if (inp.ndjson) writeStderr(JSON.stringify({ adapter: "postiz", item: i, status: "skipped" }));
      continue;
    }

    const key = sentMarkerKey(inp.campaign, item.content, resolved.map((r) => r.id));
    if (marker.sent[key]) {
      results.push({ item: i, status: "skipped", detail: "already-sent (sent-marker hit)" });
      if (inp.ndjson) writeStderr(JSON.stringify({ adapter: "postiz", item: i, status: "skipped", reason: "already-sent" }));
      continue;
    }

    const uploaded = await uploadPostizMedia(item, inp.cwd);
    if (!uploaded.ok) {
      results.push({ item: i, status: "failed", detail: uploaded.detail });
      failed++;
      if (inp.ndjson) writeStderr(JSON.stringify({ adapter: "postiz", item: i, status: "failed", detail: uploaded.detail }));
      if (uploaded.hardStop) hardStop = true;
      continue;
    }

    const body = buildCreatePostDraft(item.content, resolved, uploaded.media) as unknown as Record<string, unknown>;
    const postRes = await postizFetch<unknown>("/public/v1/posts", { method: "POST", body });
    if (!postRes.ok) {
      const detail = mapPostizError(postRes.error);
      results.push({ item: i, status: "failed", detail });
      failed++;
      if (inp.ndjson) writeStderr(JSON.stringify({ adapter: "postiz", item: i, status: "failed", detail }));
      if (postRes.error.kind === "rate-limited" || postRes.error.kind === "subscription-required" || postRes.error.kind === "auth-missing" || postRes.error.kind === "auth-invalid") {
        hardStop = true;
      }
      continue;
    }

    marker.sent[key] = { postedAt: new Date().toISOString(), providers: [...providers] };
    if (inp.ndjson) writeStderr(JSON.stringify({ adapter: "postiz", item: i, status: "published", providers }));
    results.push({ item: i, status: "published", detail: `draft → ${providers.join(", ")}` });
    published++;
  }

  // Best-effort persist — never crash if disk write fails.
  await persistSentMarker(markerPath, marker).catch((e) => {
    writeStderr(JSON.stringify({ type: "postiz-sent-marker-write-failed", path: markerPath, detail: e instanceof Error ? e.message : String(e) }));
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

// Spec §6.4 (O1). List connected postiz integrations for skill activation use.
export type ListIntegrationsResult = {
  readonly adapter: "postiz" | "mktg-native";
  readonly integrations: readonly PostizIntegration[];
};

const listPostizIntegrations = async (): Promise<
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

const diagnosePostiz = async (): Promise<PostizDiagnosticsResult> => {
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

const listNativeIntegrations = async (
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

// ─── Built-in adapter registry ───
// Built-in publish adapters — catalog-independent. Catalogs cannot
// claim these names in capabilities.publish_adapters without a load-time
// collision error from core/catalogs.ts (see plan v2 §Layer 1).
// Postiz is excluded — it is registered via the postiz catalog entry.
export const BUILTIN_PUBLISH_ADAPTERS = ["mktg-native", "typefully", "resend", "file"] as const;

const PRESENTATION_ADAPTER_ORDER = ["mktg-native", "postiz", "typefully", "resend", "file"] as const;

const ADAPTERS: Record<string, (items: PublishItem[], confirm: boolean, cwd: string, ndjson: boolean, campaign: string) => Promise<AdapterResult>> = {
  "mktg-native": (items, confirm, cwd, ndjson, campaign) => publishNative(items, confirm, cwd, ndjson, campaign),
  postiz: (items, confirm, cwd, ndjson, campaign) => publishPostiz({ items, confirm, cwd, ndjson, campaign }),
  typefully: (items, confirm, _cwd, ndjson, _campaign) => publishTypefully(items, confirm, ndjson),
  resend: (items, confirm, _cwd, ndjson, _campaign) => publishResend(items, confirm, ndjson),
  file: (items, confirm, cwd, ndjson, _campaign) => publishFile(items, confirm, cwd, ndjson),
};

// Adapter env var registry — single source of truth for adapter metadata
const ADAPTER_ENV_VARS: Record<string, string | null> = {
  "mktg-native": null,
  typefully: "TYPEFULLY_API_KEY",
  resend: "RESEND_API_KEY",
  file: null,
  postiz: "POSTIZ_API_KEY",
};

type AdapterListResult = { readonly adapters: readonly { readonly name: string; readonly envVar: string | null; readonly configured: boolean }[] };

export const handler: CommandHandler<
  PublishResult | AdapterListResult | ListIntegrationsResult | NativeAccountResult | NativeListPostsResult | NativeUpsertProviderResult | PostizDiagnosticsResult
> = async (args, flags) => {
  const confirm = args.includes("--confirm");
  const ndjson = args.includes("--ndjson");
  const isDryRun = flags.dryRun || !confirm;

  if (args.includes("--native-account")) {
    return ok(await getNativePublishAccountSummary(flags.cwd));
  }

  if (args.includes("--native-list-posts")) {
    return ok({ adapter: "mktg-native", posts: await listNativePublishPosts(flags.cwd) });
  }

  if (args.includes("--native-upsert-provider")) {
    if (!flags.jsonInput) {
      return err(
        "INVALID_ARGS",
        "--native-upsert-provider requires --input JSON",
        [
          "Example: mktg publish --native-upsert-provider --input '{\"identifier\":\"linkedin\",\"name\":\"Acme LinkedIn\",\"profile\":\"acme\"}' --json",
        ],
        2,
      );
    }
    const parsed = parseJsonInput<NativePublishProviderInput>(flags.jsonInput);
    if (!parsed.ok) {
      return err("INVALID_ARGS", parsed.message, ["Pass a valid JSON object for the native provider input"], 2);
    }
    try {
      const provider = await upsertNativePublishProvider(flags.cwd, parsed.data);
      return ok({ adapter: "mktg-native", provider });
    } catch (error) {
      return err(
        "INVALID_ARGS",
        error instanceof Error ? error.message : String(error),
        ["identifier must be lowercase and profile/name must be free of control characters"],
        2,
      );
    }
  }

  // --list-adapters: return available adapters with env var and configured status
  if (args.includes("--list-adapters")) {
    const adapters = PRESENTATION_ADAPTER_ORDER.map(name => {
      const envVar = ADAPTER_ENV_VARS[name] ?? null;
      const configured = envVar === null ? true : !!process.env[envVar];
      return { name, envVar, configured };
    });
    return ok({ adapters });
  }

  // Parse --adapter filter (must happen before positional extraction)
  let adapterFilter: string | undefined;
  const flagValues = new Set<number>(); // indices of flag values to skip
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--adapter" && args[i + 1]) { adapterFilter = args[i + 1]; flagValues.add(i + 1); break; }
    if (args[i]?.startsWith("--adapter=")) { adapterFilter = args[i]!.slice(10); break; }
  }

  // --list-integrations: adapter-scoped live query. Only postiz implements it today.
  if (args.includes("--diagnose")) {
    if (adapterFilter && adapterFilter !== "postiz") {
      return err(
        "NOT_IMPLEMENTED",
        "--diagnose currently supports only --adapter postiz",
        ["Try: mktg publish --adapter postiz --diagnose --json"],
        6,
      );
    }
    return ok(await diagnosePostiz());
  }

  // --list-integrations: adapter-scoped live query. Only postiz implements it today.
  if (args.includes("--list-integrations")) {
    if (!adapterFilter) {
      return err("INVALID_ARGS", "--list-integrations requires --adapter <name>", [
        "Try: mktg publish --adapter mktg-native --list-integrations --json",
        "Or:  mktg publish --adapter postiz --list-integrations --json",
      ], 2);
    }
    if (adapterFilter === "mktg-native") {
      return ok((await listNativeIntegrations(flags.cwd)).data);
    }
    if (adapterFilter !== "postiz") {
      return err(
        "NOT_IMPLEMENTED",
        `Adapter '${adapterFilter}' does not expose integrations.`,
        [
          "This flag is only supported by adapters that back their own provider registry.",
          "Try --adapter mktg-native or --adapter postiz.",
        ],
        6,
      );
    }
    const res = await listPostizIntegrations();
    if (!res.ok) {
      const suggestions = [
        "Verify POSTIZ_API_KEY and POSTIZ_API_BASE (defaults to https://api.postiz.com)",
        "Run: mktg catalog info postiz --json",
      ];
      const code =
        res.exitCode === 3 ? "POSTIZ_AUTH" :
        res.exitCode === 5 ? "POSTIZ_NETWORK" :
        "POSTIZ_BAD_REQUEST";
      return err(code, res.detail, suggestions, res.exitCode);
    }
    return ok(res.data);
  }

  const positionalArgs = args.filter((a, i) => !a.startsWith("--") && !flagValues.has(i));

  // Find publish.json
  const campaignPath = positionalArgs[0] ?? ".";
  const pathCheck = validatePathInput(flags.cwd, campaignPath);
  if (!pathCheck.ok) return err("INVALID_ARGS", pathCheck.message, [], 2);

  const manifestPath = campaignPath.endsWith("publish.json")
    ? join(flags.cwd, campaignPath)
    : join(flags.cwd, campaignPath, "publish.json");

  // Check if manifest exists; if not, check --input for inline JSON
  const manifestFile = Bun.file(manifestPath);
  let manifest: PublishManifest;

  if (await manifestFile.exists()) {
    try {
      manifest = await manifestFile.json() as PublishManifest;
    } catch {
      return err("INVALID_ARGS", "publish.json is not valid JSON", [`Check ${manifestPath}`], 2);
    }
  } else if (flags.jsonInput) {
    const parsed = parseJsonInput<PublishManifest>(flags.jsonInput);
    if (!parsed.ok) return err("INVALID_ARGS", parsed.message, [], 2);
    manifest = parsed.data;
  } else {
    return err("NOT_FOUND", "No publish.json found", [
      `Create ${manifestPath} with {name, items: [{type, adapter, content}]}`,
      "Or pass inline: mktg publish --input '{...}'",
    ], 1);
  }

  if (!manifest.items || !Array.isArray(manifest.items) || manifest.items.length === 0) {
    return err("INVALID_ARGS", "publish.json has no items", ["Add items: [{type, adapter, content}]"], 2);
  }

  // Validate items (only those matching adapter filter if set)
  for (const item of manifest.items) {
    if (adapterFilter && item.adapter !== adapterFilter) continue;
    const cc = rejectControlChars(item.content, "item content");
    if (!cc.ok) return err("INVALID_ARGS", cc.message, [], 2);
    if (!ADAPTERS[item.adapter]) {
      return err("INVALID_ARGS", `Unknown adapter '${item.adapter}'`, [`Available: ${PRESENTATION_ADAPTER_ORDER.join(", ")}`], 2);
    }
  }

  // Group items by adapter
  const grouped = new Map<string, PublishItem[]>();
  for (const item of manifest.items) {
    const adapter = item.adapter;
    if (adapterFilter && adapter !== adapterFilter) continue;
    const existing = grouped.get(adapter) ?? [];
    existing.push(item);
    grouped.set(adapter, existing);
  }

  // Run adapters
  const campaignName = manifest.name ?? "unnamed";
  const adapterResults: AdapterResult[] = [];
  for (const [adapter, items] of grouped) {
    const fn = ADAPTERS[adapter];
    if (!fn) continue;
    const result = await fn(items, confirm && !flags.dryRun, flags.cwd, ndjson, campaignName);
    adapterResults.push(result);
  }

  const totalItems = adapterResults.reduce((sum, r) => sum + r.items, 0);
  const published = adapterResults.reduce((sum, r) => sum + r.published, 0);
  const failed = adapterResults.reduce((sum, r) => sum + r.failed, 0);

  const result: PublishResult = {
    campaign: manifest.name ?? "unnamed",
    adapters: adapterResults,
    totalItems,
    published,
    failed,
    dryRun: isDryRun,
  };

  // TTY display
  if (isTTY() && !flags.json && !ndjson) {
    writeStderr("");
    writeStderr(`  ${bold("mktg publish")} ${dim(`— ${manifest.name ?? "unnamed"}`)}`);
    writeStderr(`  ${isDryRun ? yellow("DRY RUN") : green("LIVE")} ${dim(`(${totalItems} items)`)}`);
    writeStderr("");
    for (const ar of adapterResults) {
      const icon = ar.failed > 0 ? red("x") : ar.published > 0 ? green("✓") : yellow("~");
      writeStderr(`  ${icon} ${bold(ar.adapter)} — ${ar.published} published, ${ar.failed} failed, ${ar.items - ar.published - ar.failed} skipped`);
      for (const e of ar.errors.slice(0, 3)) {
        writeStderr(`    ${red("!")} ${e}`);
      }
    }
    if (isDryRun) {
      writeStderr("");
      writeStderr(dim("  Add --confirm to execute publishing"));
    }
    writeStderr("");
  }

  return ok(result);
};
