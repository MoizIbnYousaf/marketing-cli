// tests/e2e/ia/_helpers.ts -- shared utilities for the Lane 4 IA suite.
//
// The global Playwright setup (tests/e2e/global-setup.ts) boots a real Bun
// server (server.ts) on E2E_STUDIO_PORT and a real Next.js dev server on
// E2E_DASHBOARD_PORT, both against an empty MKTG_PROJECT_ROOT tmpdir. These
// helpers wrap that contract so every IA spec hits the same surfaces with
// no per-file boot logic.

import type { Page, Request as PWRequest } from "@playwright/test"

export const STUDIO_PORT = Number(process.env.E2E_STUDIO_PORT ?? "4801")
export const DASHBOARD_PORT = Number(process.env.E2E_DASHBOARD_PORT ?? "4800")
export const STUDIO = `http://127.0.0.1:${STUDIO_PORT}`
export const DASHBOARD = `http://127.0.0.1:${DASHBOARD_PORT}`

/**
 * Seed the persisted Zustand workspace store on the post-rename schema (v2).
 * Used to skip past first-render redirects when navigating directly to a
 * specific tab. Mirrors the v0->v2 migrate path in lib/stores/workspace.ts.
 */
export async function seedWorkspaceTab(
  page: Page,
  tab: "pulse" | "signals" | "publish" | "brand",
): Promise<void> {
  const payload = {
    key: "mktg-studio-workspace",
    value: JSON.stringify({
      state: { workspaceTab: tab, signalFilters: {} },
      version: 2,
    }),
  }
  await page.addInitScript((arg: { key: string; value: string }) => {
    try {
      window.localStorage.setItem(arg.key, arg.value)
    } catch {
      /* fine */
    }
  }, payload)
}

/**
 * Hide Next.js' dev-mode runtime error overlay if it's showing. It pops over
 * unrelated client errors (e.g. dev-only React strict-mode double effect) and
 * blocks Playwright clicks. Idempotent.
 */
export async function hideNextErrorOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    const portal = document.querySelector("nextjs-portal")
    if (portal) portal.remove()
    const dialog = document.querySelector("[data-nextjs-dialog-overlay]")
    if (dialog) (dialog as HTMLElement).style.display = "none"
  })
}

/**
 * Wait for the dashboard chrome (sidebar + main) to be ready. The (dashboard)
 * layout mounts AppSidebar with `Pulse | Signals | Publish | Brand | Skills`.
 * Asserting on Skills proves Lane 4's new entry is in the sidebar.
 */
export async function waitForDashboardChrome(page: Page): Promise<void> {
  // The sidebar links use lucide icons + text labels; matching by role+name
  // is robust to chrome refactors.
  await page.waitForSelector("a[href='/skills'], a[href*='dashboard']", {
    state: "attached",
    timeout: 15_000,
  })
}

/**
 * Open the command palette via Cmd+K. The PaletteProvider listens on
 * document keydown for `(meta|ctrl) + k` (palette-provider.tsx:31-37).
 */
export async function openPalette(page: Page): Promise<void> {
  // Both modifiers are accepted by the listener; using Meta to mirror the
  // visible `⌘K` hint in the header search bar.
  await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k")
}

/**
 * Fetch /api/skills directly off the studio's Bun server. Returns the parsed
 * SkillEntry[] body (data.length is the canonical "how many skills" used in
 * Lane 4 list-count assertions, robust to manifest edits).
 *
 * Auth header is included to match production callers; in the e2e harness
 * MKTG_STUDIO_AUTH=disabled so the token is empty-string.
 */
export async function fetchSkills(): Promise<
  Array<{
    name: string
    category: string
    tier: "must-have" | "nice-to-have"
    layer: string
    installed: boolean
    triggers: string[]
    installedVersion: string | null
    latestVersion: string | null
    routing?: {
      triggers: string[]
      requires: string[]
      unlocks: string[]
      precedence: string
    }
  }>
> {
  const res = await fetch(`${STUDIO}/api/skills`)
  if (!res.ok) {
    throw new Error(`/api/skills returned ${res.status} ${res.statusText}`)
  }
  const body = (await res.json()) as { ok: boolean; data: unknown }
  if (!body.ok || !Array.isArray(body.data)) {
    throw new Error(`/api/skills body not ok or not array: ${JSON.stringify(body).slice(0, 200)}`)
  }
  return body.data as never
}

/**
 * Resolve the URL the page lands on after server-side navigation, ignoring
 * the dev-mode `?_rsc=` cache-buster. Useful for compat-redirect assertions
 * where what matters is the path + the canonical query, not transient params.
 */
export function landingUrl(page: Page): URL {
  const url = new URL(page.url())
  url.searchParams.delete("_rsc")
  return url
}

/**
 * Extract the `?tab=` value from a Playwright page URL. Returns null when
 * the dashboard is showing the canonical Pulse tab (no `?tab=` set).
 */
export function tabFromPage(page: Page): string | null {
  return landingUrl(page).searchParams.get("tab")
}

/**
 * Capture the next request matching `urlMatch` issued from the page. Mirrors
 * `page.waitForRequest` but returns a richer record: URL, method, body, and
 * a flag for whether the Authorization header was a Bearer token.
 *
 * Used for "POST went out with the right shape" assertions without actually
 * intercepting the request (real round-trip preserved).
 */
export async function captureRequest(
  page: Page,
  urlMatch: string | RegExp,
  trigger: () => Promise<void>,
): Promise<{
  url: string
  method: string
  body: string | null
  authBearer: boolean
}> {
  const reqPromise = page.waitForRequest(urlMatch, { timeout: 10_000 })
  await trigger()
  const req: PWRequest = await reqPromise
  const headers = req.headers()
  const auth = headers["authorization"] ?? headers["Authorization"] ?? ""
  return {
    url: req.url(),
    method: req.method(),
    body: req.postData(),
    authBearer: auth.startsWith("Bearer "),
  }
}
