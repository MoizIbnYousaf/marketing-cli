// 02-tab-compat.e2e.ts -- one-release `?tab=` compat redirects.
//
// Lane 4 renamed the URL ids: hq -> pulse, content -> signals. The legacy
// values still ship in app/(dashboard)/dashboard/page.tsx's
// TAB_COMPAT_REDIRECTS table for one release so external bookmarks and any
// tracked `tab=hq` analytics events keep resolving. This spec proves the
// table's behavior end-to-end on the real Next.js dev server (the redirect
// runs server-side via `redirect()`).
//
// Coverage matrix:
//   ?tab=hq            -> ?tab=pulse  (URL canonicalizes to "no tab" since
//                                      the workspace strips ?tab=pulse)
//   ?tab=content       -> ?tab=signals
//   ?tab=trends        -> ?tab=signals
//   ?tab=audience      -> no ?tab=    (collapses into Pulse)
//   ?tab=opportunities -> no ?tab=    (collapses into Pulse)
//   ?tab=garbage       -> no redirect; client-side normalizeTab defaults
//                         to "pulse" without rewriting the URL
//   ?tab=pulse         -> identity (canonical form, no redirect)
//   ?tab=signals       -> identity
//
// Per-release checklist: when the next release deletes the compat table,
// these tests should be flipped to assert the redirects no longer fire.

import { test, expect } from "@playwright/test"
import { DASHBOARD, hideNextErrorOverlay, landingUrl, seedWorkspaceTab } from "./_helpers"

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  // Seed pulse so the workspace renders at all -- without seed, the
  // post-rename store version (v2) gets created on first read and we
  // sidestep the legacy-payload code path entirely. Seeding pulse keeps
  // the page focused on the URL behavior, not the localStorage migration.
  await seedWorkspaceTab(page, "pulse")
})

test("2.1 ?tab=hq server-redirects to /dashboard (canonical no-tab Pulse)", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/dashboard?tab=hq`)
  // The workspace strips `?tab=pulse` to its canonical form (`/dashboard`
  // alone) -- see brand-workspace.tsx updateUrlState, line ~117. Either
  // form is correct for "Pulse"; we accept both.
  const url = landingUrl(page)
  expect(url.pathname).toBe("/dashboard")
  const tab = url.searchParams.get("tab")
  expect(tab === null || tab === "pulse").toBe(true)
  await hideNextErrorOverlay(page)
  // Confirm the rendered tab IS Pulse by checking the workspace tab strip
  // shows Pulse as active. WorkspaceTabs renders aria-selected? No -- it
  // just toggles classes. Use the screen-reader-only h1 (PageTitle srOnly)
  // which reads "Pulse" when the route is on Pulse.
  await expect(
    page.locator("#workspace-active-tab-title", { hasText: /^pulse$/i }),
  ).toBeAttached({ timeout: 10_000 })
})

test("2.2 ?tab=content server-redirects to ?tab=signals", async ({ page }) => {
  await page.goto(`${DASHBOARD}/dashboard?tab=content`)
  await page.waitForURL(/\?tab=signals(?:&|$)/, { timeout: 10_000 })
  const url = landingUrl(page)
  expect(url.searchParams.get("tab")).toBe("signals")
  // The compat redirect also strips `mode=` per dashboard/page.tsx; the
  // input URL had no `mode`, but the assertion remains useful when
  // composed with 2.3.
  expect(url.searchParams.get("mode")).toBeNull()
})

test("2.3 ?tab=trends&mode=radar redirects to ?tab=signals AND drops mode", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/dashboard?tab=trends&mode=radar`)
  await page.waitForURL(/\?tab=signals(?:&|$)/, { timeout: 10_000 })
  const url = landingUrl(page)
  expect(url.searchParams.get("tab")).toBe("signals")
  // dashboard/page.tsx:nextParams.delete("mode") in the redirect block;
  // proves the mode= query param does not leak through the redirect.
  expect(url.searchParams.get("mode")).toBeNull()
})

test("2.4 ?tab=audience redirects to /dashboard with no tab", async ({ page }) => {
  await page.goto(`${DASHBOARD}/dashboard?tab=audience`)
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 10_000 })
  const url = landingUrl(page)
  expect(url.pathname).toBe("/dashboard")
  expect(url.searchParams.get("tab")).toBeNull()
})

test("2.5 ?tab=opportunities redirects to /dashboard with no tab", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/dashboard?tab=opportunities`)
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 10_000 })
  const url = landingUrl(page)
  expect(url.pathname).toBe("/dashboard")
  expect(url.searchParams.get("tab")).toBeNull()
})

test("2.6 ?tab=garbage falls through to client-side defensive guard", async ({
  page,
}) => {
  // Server-side TAB_COMPAT_REDIRECTS only covers the named legacy values;
  // anything else is left for normalizeTab() at brand-workspace.tsx:49.
  // The defensive guard returns "pulse" without touching the URL, so the
  // garbage value remains visible in the address bar.
  await page.goto(`${DASHBOARD}/dashboard?tab=garbage`)
  await hideNextErrorOverlay(page)
  // URL unchanged.
  expect(landingUrl(page).searchParams.get("tab")).toBe("garbage")
  // But the rendered tab is Pulse.
  await expect(
    page.locator("#workspace-active-tab-title", { hasText: /^pulse$/i }),
  ).toBeAttached({ timeout: 10_000 })
})

test("2.7 ?tab=pulse renders Pulse without firing a redirect", async ({ page }) => {
  await page.goto(`${DASHBOARD}/dashboard?tab=pulse`)
  await hideNextErrorOverlay(page)
  // Canonical form: tab=pulse stays as-is; the workspace MAY internally
  // rewrite it to no-tab, but no server-side redirect runs.
  const url = landingUrl(page)
  expect(url.pathname).toBe("/dashboard")
  await expect(
    page.locator("#workspace-active-tab-title", { hasText: /^pulse$/i }),
  ).toBeAttached({ timeout: 10_000 })
})

test("2.8 ?tab=signals renders Signals canonical form", async ({ page }) => {
  await page.goto(`${DASHBOARD}/dashboard?tab=signals`)
  await hideNextErrorOverlay(page)
  expect(landingUrl(page).searchParams.get("tab")).toBe("signals")
  await expect(
    page.locator("#workspace-active-tab-title", { hasText: /^signals$/i }),
  ).toBeAttached({ timeout: 10_000 })
})

test("2.9 server.ts /api/navigate normalizes legacy tab payloads", async ({
  request,
}) => {
  // Mirrors the route-schema unit test but proves the running Bun server
  // is the same code path. /api/navigate?dryRun=true echoes the normalized
  // tab without firing the broadcast.
  const port = process.env.E2E_STUDIO_PORT ?? "4801"
  const cases = [
    { input: "hq", expected: "pulse" },
    { input: "content", expected: "signals" },
    { input: "trends", expected: "signals" },
    { input: "pulse", expected: "pulse" },
    { input: "signals", expected: "signals" },
  ]
  for (const c of cases) {
    const res = await request.post(`http://127.0.0.1:${port}/api/navigate?dryRun=true`, {
      headers: { "content-type": "application/json" },
      data: { tab: c.input },
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { ok: boolean; data: { tab: string } }
    expect(body.ok).toBe(true)
    expect(body.data.tab).toBe(c.expected)
  }
})
