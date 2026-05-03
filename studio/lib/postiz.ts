// lib/postiz.ts
// AGPL-safe thin Postiz API client — raw fetch only.
// NEVER import from @postiz/* — AGPL-3.0 firewall.
// Mirrors mktg CLI's postizFetch at ~/projects/mktgmono/marketing-cli/src/commands/publish.ts:263
// Auth: bare Authorization header (NO "Bearer " prefix) per
//   postiz apps/backend/src/services/auth/public.auth.middleware.ts:16-20

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

// ─── Error types ──────────────────────────────────────────────────────────

export type PostizError =
  | { readonly kind: "auth-missing" }
  | { readonly kind: "auth-invalid"; readonly msg: string }
  | { readonly kind: "subscription-required"; readonly msg: string }
  | { readonly kind: "rate-limited"; readonly retryAfterSeconds: number | null; readonly msg: string }
  | { readonly kind: "bad-request"; readonly status: number; readonly msg: string }
  | { readonly kind: "server-error"; readonly status: number; readonly msg: string }
  | { readonly kind: "network"; readonly detail: string };

export type PostizResult<T> =
  | { readonly ok: true; readonly data: T; readonly status: number }
  | { readonly ok: false; readonly error: PostizError; readonly status: number | null };

// ─── Domain types inferred from postiz-api-reference.md ──────────────────
// Source: ~/projects/mktgmono/marketing-cli/docs/integration/postiz-api-reference.md §1.1-1.2
// Upstream: apps/backend/src/public-api/routes/v1/public.integrations.controller.ts:176-195

export type PostizIntegration = {
  readonly id: string;           // DB primary key — required for POST /posts
  readonly identifier: string;   // provider key: "linkedin", "bluesky", "reddit", "mastodon", "threads", "x", …
  readonly name: string;         // display name
  readonly picture: string;      // URL
  readonly disabled: boolean;    // true ⇒ reauth needed; never post to disabled integrations
  readonly profile: string;      // handle / username
  readonly customer?: { readonly id: string; readonly name: string } | null;
};

export type PostizPost = {
  readonly id: string;
  readonly type: "draft" | "schedule" | "now" | "update";
  readonly date: string;         // ISO 8601
  readonly shortLink: boolean;
  readonly status?: string;
  readonly posts?: readonly {
    readonly integration: { readonly id: string; readonly identifier: string };
    readonly value: readonly { readonly content: string }[];
  }[];
};

export type PostizDiagnostics = {
  readonly configured: boolean;
  readonly base: string;
  readonly checks: readonly {
    readonly name: "api-key" | "connected" | "integrations";
    readonly status: "pass" | "fail" | "warn";
    readonly detail: string;
  }[];
  readonly providers: readonly PostizIntegration[];
};

type PostizPostsEnvelope = {
  readonly posts: readonly PostizPost[];
};

// CreatePostDto — used internally by createDraft helper
// Source: libraries/nestjs-libraries/src/dtos/posts/create.post.dto.ts
export type CreatePostDto = {
  readonly type: "draft" | "schedule" | "now" | "update";
  readonly shortLink: boolean;
  readonly date: string;
  readonly tags: readonly { readonly value: string; readonly label: string }[];
  readonly posts: readonly {
    readonly integration: { readonly id: string };
    readonly value: readonly { readonly content: string; readonly image: readonly unknown[] }[];
  }[];
};

// ─── Core fetch helper ────────────────────────────────────────────────────

type PostizFetchInit = {
  readonly method: "GET" | "POST" | "DELETE" | "PUT";
  readonly headers?: Record<string, string>;
  readonly body?: Record<string, unknown> | FormData;
};

/**
 * Raw fetch helper for all Postiz API calls.
 * Mirrors mktg CLI's postizFetch exactly.
 * Timeout: 15s via AbortSignal.timeout.
 * Auth: bare Authorization: <key> (NO "Bearer " prefix).
 * Base URL: POSTIZ_API_BASE env var, defaults to https://api.postiz.com.
 */
export async function postizFetch<T>(
  path: string,
  init: PostizFetchInit,
): Promise<PostizResult<T>> {
  const apiKey = process.env.POSTIZ_API_KEY;
  const base = process.env.POSTIZ_API_BASE ?? POSTIZ_DEFAULT_BASE;

  if (!apiKey) {
    return { ok: false, error: { kind: "auth-missing" }, status: null };
  }

  const headers: Record<string, string> = {
    ...(init.headers ?? {}),
    Authorization: apiKey, // bare — NO "Bearer " prefix
  };

  let body: string | FormData | undefined;
  if (init.body instanceof FormData) {
    body = init.body;
    // Do NOT set Content-Type — runtime sets multipart/form-data boundary automatically
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
      const retryAfterSeconds =
        retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : null;
      return {
        ok: false,
        error: { kind: "rate-limited", retryAfterSeconds, msg },
        status: 429,
      };
    }

    if (res.status >= 400 && res.status < 500) {
      return {
        ok: false,
        error: { kind: "bad-request", msg, status: res.status },
        status: res.status,
      };
    }

    return {
      ok: false,
      error: { kind: "server-error", status: res.status, msg },
      status: res.status,
    };
  }

  return {
    ok: false,
    error: { kind: "network", detail: lastNetworkError instanceof Error ? lastNetworkError.message : String(lastNetworkError ?? "Unknown network error") },
    status: null,
  };
}

// ─── Error to human-readable string ──────────────────────────────────────

/**
 * Maps a PostizError to a human-readable detail string for display or logging.
 */
export function mapPostizError(e: PostizError): string {
  switch (e.kind) {
    case "auth-missing":
      return "POSTIZ_API_KEY is not set. Add it to .env.local or the settings panel.";
    case "auth-invalid":
      return `Invalid POSTIZ_API_KEY (${e.msg}). Verify the key in Postiz UI → Settings → API.`;
    case "subscription-required":
      return `Hosted Postiz requires an active subscription (${e.msg}). Upgrade at https://postiz.com/pricing or self-host.`;
    case "rate-limited":
      return e.retryAfterSeconds !== null
        ? `Postiz rate limit (30 posts/hour per org) — retry in ${e.retryAfterSeconds}s.`
        : "Postiz rate limit (30 posts/hour per org). Retry later.";
    case "bad-request":
      return `Postiz rejected request (HTTP ${e.status}): ${e.msg}.`;
    case "server-error":
      return `Postiz server error (HTTP ${e.status}): ${e.msg}. Retry; if persistent, check POSTIZ_API_BASE.`;
    case "network":
      return `Network error contacting Postiz: ${e.detail}. Verify POSTIZ_API_BASE and connectivity.`;
  }
}

// ─── Public helpers ───────────────────────────────────────────────────────

/**
 * GET /public/v1/integrations
 * Lists connected provider integrations (linkedin, bluesky, reddit, etc.).
 * Source: public.integrations.controller.ts:176-195
 */
export function listIntegrations(): Promise<PostizResult<PostizIntegration[]>> {
  return postizFetch<PostizIntegration[]>("/public/v1/integrations", { method: "GET" });
}

/**
 * GET /public/v1/posts?startDate=<ISO>&endDate=<ISO>
 * Returns scheduled and published posts in the given date range.
 */
export function getScheduledPosts(
  startDate: string,
  endDate: string,
): Promise<PostizResult<PostizPost[]>> {
  const params = new URLSearchParams({ startDate, endDate });
  return postizFetch<PostizPost[] | PostizPostsEnvelope>(
    `/public/v1/posts?${params.toString()}`,
    { method: "GET" },
  ).then((result) => {
    if (!result.ok) {
      return result;
    }

    const posts = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data.posts)
        ? [...result.data.posts]
        : [];

    return {
      ok: true as const,
      data: posts,
      status: result.status,
    };
  });
}

/**
 * GET /public/v1/is-connected
 * Heartbeat check — returns {connected: true} if the API key is valid.
 */
export function isConnected(): Promise<PostizResult<{ connected: boolean }>> {
  return postizFetch<{ connected: boolean }>("/public/v1/is-connected", { method: "GET" });
}

export async function diagnosePostiz(): Promise<PostizDiagnostics> {
  const base = process.env.POSTIZ_API_BASE ?? POSTIZ_DEFAULT_BASE;
  const checks: PostizDiagnostics["checks"][number][] = [];

  if (!process.env.POSTIZ_API_KEY) {
    return {
      configured: false,
      base,
      providers: [],
      checks: [
        {
          name: "api-key",
          status: "fail",
          detail: "POSTIZ_API_KEY is not set.",
        },
      ],
    };
  }

  checks.push({ name: "api-key", status: "pass", detail: "POSTIZ_API_KEY is set." });

  const connected = await isConnected();
  if (!connected.ok) {
    return {
      configured: false,
      base,
      providers: [],
      checks: [
        ...checks,
        { name: "connected", status: "fail", detail: mapPostizError(connected.error) },
      ],
    };
  }

  checks.push({
    name: "connected",
    status: connected.data.connected ? "pass" : "warn",
    detail: connected.data.connected ? "Postiz API accepted the key." : "Postiz responded but did not report an active connection.",
  });

  const integrations = await listIntegrations();
  if (!integrations.ok) {
    return {
      configured: false,
      base,
      providers: [],
      checks: [
        ...checks,
        { name: "integrations", status: "fail", detail: mapPostizError(integrations.error) },
      ],
    };
  }

  const activeProviders = integrations.data.filter((provider) => !provider.disabled);
  checks.push({
    name: "integrations",
    status: activeProviders.length > 0 ? "pass" : "warn",
    detail: activeProviders.length > 0
      ? `${activeProviders.length} active Postiz provider${activeProviders.length === 1 ? "" : "s"} connected.`
      : "Postiz is reachable, but no active providers are connected yet.",
  });

  return {
    configured: checks.every((check) => check.status !== "fail"),
    base,
    providers: integrations.data,
    checks,
  };
}

/**
 * POST /public/v1/posts
 * Creates a draft post. Rate-limited to 30 POST /posts per hour per org.
 * Source: public.integrations.controller.ts:137-151
 */
export function createPost(dto: CreatePostDto): Promise<PostizResult<unknown>> {
  return postizFetch<unknown>("/public/v1/posts", { method: "POST", body: dto as unknown as Record<string, unknown> });
}

/**
 * Builds a draft CreatePostDto for multiple provider integrations.
 * Helper to avoid repeating the DTO shape everywhere in the studio.
 */
export function buildDraftDto(
  content: string,
  integrationIds: string[],
): CreatePostDto {
  return {
    type: "draft",
    shortLink: false,
    date: new Date().toISOString(),
    tags: [],
    posts: integrationIds.map((id) => ({
      integration: { id },
      value: [{ content, image: [] }],
    })),
  };
}
