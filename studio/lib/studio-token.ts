// lib/studio-token.ts -- client-side bearer-token bootstrap for the dashboard.
//
// Lane 1 / Wave A. The launcher (bin/mktg-studio.ts) opens the dashboard at
// `?token=<hex>` on first nav. This helper:
//   1. Reads the token from the URL on first load.
//   2. Persists it in localStorage under `mktgStudioToken`.
//   3. Strips the token from the URL via `history.replaceState`.
//   4. Returns the cached token to fetch / EventSource callers.
//
// All client code that talks to /api/* must route through `getStudioToken()`
// or `withStudioToken()` so the bearer travels with every request.

const STORAGE_KEY = "mktgStudioToken";

let cached: string | null | undefined;

function readFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const tok = params.get("token");
    if (!tok) return null;
    // Strip from URL so the token does not survive in history / bookmarks.
    params.delete("token");
    const remaining = params.toString();
    const next = window.location.pathname
      + (remaining ? `?${remaining}` : "")
      + window.location.hash;
    window.history.replaceState({}, "", next);
    return tok;
  } catch {
    return null;
  }
}

function readFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeToStorage(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Private mode or quota: surface as unauthenticated. The user retries.
  }
}

/** Returns the persisted token, bootstrapping from `?token=` on first call. */
export function getStudioToken(): string | null {
  if (cached !== undefined) return cached;
  const fromUrl = readFromUrl();
  if (fromUrl) {
    writeToStorage(fromUrl);
    cached = fromUrl;
    return fromUrl;
  }
  const fromStorage = readFromStorage();
  cached = fromStorage;
  return fromStorage;
}

/** Append `?token=` to a URL for EventSource (cannot set headers from JS). */
export function withStudioToken(url: string): string {
  const token = getStudioToken();
  if (!token) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

/** Return Authorization header object, or empty if no token is known. */
export function studioAuthHeaders(): Record<string, string> {
  const token = getStudioToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Drop the cached token (test / re-auth flow). */
export function clearStudioToken(): void {
  cached = null;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignored
    }
  }
}
