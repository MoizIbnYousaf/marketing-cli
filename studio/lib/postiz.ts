// lib/postiz.ts
// AGPL-safe thin Postiz API client -- raw fetch only.
// NEVER import from @postiz/* -- AGPL-3.0 firewall.
// Shares the mktg CLI's client (src/core/publish/postiz/client.ts) -- one Postiz client, no drift.
// Auth: bare Authorization header (NO "Bearer " prefix) per
//   postiz apps/backend/src/services/auth/public.auth.middleware.ts:16-20

import {
  postizFetch,
  POSTIZ_DEFAULT_BASE,
  type PostizError,
  type PostizResult,
} from "../../src/core/publish/postiz";

// ─── Error types ──────────────────────────────────────────────────────────

export type { PostizError, PostizResult };

// ─── Domain types inferred from postiz-api-reference.md ──────────────────
// Source: ~/projects/mktgmono/marketing-cli/docs/integration/postiz-api-reference.md §1.1-1.2
// Upstream: apps/backend/src/public-api/routes/v1/public.integrations.controller.ts:176-195

export type PostizIntegration = {
  readonly id: string;           // DB primary key -- required for POST /posts
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

// CreatePostDto -- used internally by createDraft helper
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
        ? `Postiz rate limit (30 posts/hour per org) -- retry in ${e.retryAfterSeconds}s.`
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
 * Heartbeat check -- returns {connected: true} if the API key is valid.
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
