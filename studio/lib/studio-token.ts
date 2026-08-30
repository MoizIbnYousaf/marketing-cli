// Browser authentication is an HttpOnly, same-site session cookie established
// by SWRProvider. Dashboard JavaScript never reads or persists the bearer.

/** Remove credentials left by pre-cookie Studio releases without reading them. */
export function removeLegacyBrowserCredentials(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("mktgStudioToken");
  } catch {
    // Restricted storage is already non-persistent.
  }
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("token")) return;
    url.searchParams.delete("token");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Bootstrap still establishes the secure cookie if URL cleanup is blocked.
  }
}

/** Browser fetch sends the same-origin session cookie automatically. */
export function studioAuthHeaders(): Record<string, string> {
  return {};
}

/** JSON POST with bearer auth: canonical helper for dashboard mutations. */
export async function studioJsonPost(
  url: string,
  body?: unknown,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...studioAuthHeaders(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
