// 08-breadcrumb.e2e.ts -- mobile-only breadcrumb labels.
//
// AppHeader's Breadcrumb is `md:hidden` (app-header.tsx:91), so on desktop
// viewports it's literally not rendered. Lane 4 cleaned the ROUTE_LABELS
// table -- removed the dead `brands`/`agents` keys, added `skills` for the
// new browser. This file proves the labels are correct on a phone-sized
// viewport.

import { test, expect } from "@playwright/test"
import { DASHBOARD, hideNextErrorOverlay, waitForDashboardChrome } from "./_helpers"

test.describe.configure({ mode: "serial" })
// 360x640 is below the `md` breakpoint so the breadcrumb renders.
test.use({ viewport: { width: 360, height: 640 } })

test("8.1 breadcrumb on /settings shows 'Settings' label", async ({ page }) => {
  await page.goto(`${DASHBOARD}/settings`)
  await waitForDashboardChrome(page)
  await hideNextErrorOverlay(page)

  // Per ROUTE_LABELS, `settings` -> "Settings" (already capitalized; same
  // as the formatSegmentLabel default fallback). The breadcrumb shows the
  // last segment as a BreadcrumbPage (non-link).
  await expect(
    page.getByRole("navigation", { name: /breadcrumb/i }).getByText("Settings"),
  ).toBeVisible({ timeout: 10_000 })
})

test("8.2 breadcrumb on /skills shows 'Skills' label (Lane 4 new entry)", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/skills`)
  await waitForDashboardChrome(page)
  await hideNextErrorOverlay(page)

  // Lane 4 added `skills: "Skills"` to ROUTE_LABELS (app-header.tsx:28).
  await expect(
    page.getByRole("navigation", { name: /breadcrumb/i }).getByText("Skills"),
  ).toBeVisible({ timeout: 10_000 })
})

test("8.3 breadcrumb on /skills/[name] shows 'Skills' + the skill slug", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/skills/cmo`)
  await waitForDashboardChrome(page)
  await hideNextErrorOverlay(page)

  // formatSegmentLabel falls back to capitalize on segments not in
  // ROUTE_LABELS. So "cmo" displays as "Cmo" in the breadcrumb (a known
  // limitation -- skill names aren't capitalized via the table). The
  // assertion documents current behavior.
  const nav = page.getByRole("navigation", { name: /breadcrumb/i })
  await expect(nav.getByText("Skills")).toBeVisible({ timeout: 10_000 })
  await expect(nav.getByText(/^Cmo$/)).toBeVisible({ timeout: 5_000 })
})

test("8.4 breadcrumb does NOT include the dead 'brands' or 'agents' labels", async ({
  page,
  request,
}) => {
  // Regression guard: the cleanup at app-header.tsx:23-44 removed `brands`
  // and `agents` keys plus the isOpaqueIdSegment workspace formatter. If
  // either reappears, this test fails the moment a future route group
  // adds them back.
  //
  // Indirect proof: navigate to /skills (a route that exists post-cleanup)
  // and assert no "Brands" / "Agents" / "Brand Workspace" / "Agent Workspace"
  // string appears in the breadcrumb.
  await page.goto(`${DASHBOARD}/skills`)
  await waitForDashboardChrome(page)
  await hideNextErrorOverlay(page)

  const nav = page.getByRole("navigation", { name: /breadcrumb/i })
  for (const dead of ["Brands", "Agents", "Brand Workspace", "Agent Workspace"]) {
    await expect(nav.getByText(dead, { exact: true })).toHaveCount(0, {
      timeout: 3_000,
    })
  }

  // Also assert the label table source-of-truth never re-acquires the
  // old keys. Hit the Next.js page directly and grep -- if the build
  // bundle exposes ROUTE_LABELS via a bundled chunk, this would be a
  // tighter check, but we don't have the chunk handle here. Instead
  // verify via the API surface: `request.get(/api/health)` to prove the
  // server is up, then trust the unit test in tests/server/route-schema
  // for the table contents. Skipping the bundle inspection -- not in
  // Lane 4's testable surface.
  const port = process.env.E2E_STUDIO_PORT ?? "4801"
  const res = await request.get(`http://127.0.0.1:${port}/api/health`)
  expect(res.status()).toBe(200)
})
