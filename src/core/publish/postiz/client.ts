// mktg — Postiz raw-fetch client (AGPL firewall — NEVER import @postiz/node)
// Spec: docs/integration/postiz-api-reference.md

import {
  type PostizError,
  type PostizFetchInit,
  type PostizResult,
} from "./types";

export const POSTIZ_DEFAULT_BASE = "https://api.postiz.com";

export const postizBaseCandidates = (rawBase: string): readonly string[] => {
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
    error: {
      kind: "network",
      detail: lastNetworkError instanceof Error ? lastNetworkError.message : String(lastNetworkError ?? "Unknown network error"),
    },
    status: null,
  };
};

// Spec §6. Maps PostizError to a human-readable detail string for AdapterResult.
export const mapPostizError = (e: PostizError): string => {
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
