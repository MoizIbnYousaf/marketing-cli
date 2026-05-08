// 03-palette.e2e.ts -- Command Palette navigation coverage.
//
// The palette (palette.tsx) is the single richest nav surface in the studio.
// Lane 4 added Skills to its NAV_ITEMS and stripped the broken
// `?panel=demo` navigation from the "Seed demo data" action. The provider
// (palette-provider.tsx:31-37) listens on `(meta|ctrl) + k` to toggle.
//
// Coverage (more than 3 per surface):
//   3.1  ⌘K opens the palette and shows all 6 nav entries
//   3.2  Click "Pulse" navigates to /dashboard
//   3.3  Click "Signals" navigates to /dashboard?tab=signals
//   3.4  Click "Skills" navigates to /skills (Lane 4 new surface)
//   3.5  Click "Settings" navigates to /settings
//   3.6  Type filter narrows the list (cmdk shouldFilter behavior)
//   3.7  Esc closes the palette
//   3.8  "Seed demo data" item does NOT navigate to ?panel=demo (regression
//        guard for the ghost route my fix-plan flagged)

import { test, expect } from "@playwright/test"
import {
  DASHBOARD,
  hideNextErrorOverlay,
  openPalette,
  seedWorkspaceTab,
  waitForDashboardChrome,
} from "./_helpers"

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  await seedWorkspaceTab(page, "pulse")
  await page.goto(`${DASHBOARD}/dashboard`)
  await waitForDashboardChrome(page)
  await hideNextErrorOverlay(page)
})

test("3.1 Cmd+K opens the palette and shows all 6 nav entries", async ({ page }) => {
  await openPalette(page)
  // The palette renders a Command (cmdk) input as the focus target.
  await expect(
    page.locator("input[placeholder*='Search skills' i]"),
  ).toBeVisible({ timeout: 5_000 })

  // Per palette.tsx NAV_ITEMS: Pulse, Signals, Publish, Brand, Skills, Settings.
  // cmdk renders each item with a visible label inside a Command.Item.
  for (const label of ["Pulse", "Signals", "Publish", "Brand", "Skills", "Settings"]) {
    await expect(
      page.locator(`[cmdk-item]`).filter({ hasText: new RegExp(`^${label}$`, "i") }),
    ).toBeVisible({ timeout: 5_000 })
  }
})

test("3.2 click Pulse in palette navigates to /dashboard", async ({ page }) => {
  await openPalette(page)
  await page
    .locator(`[cmdk-item]`)
    .filter({ hasText: /^Pulse$/ })
    .click()
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 10_000 })
  expect(new URL(page.url()).pathname).toBe("/dashboard")
})

test("3.3 click Signals in palette navigates to /dashboard?tab=signals", async ({
  page,
}) => {
  await openPalette(page)
  await page
    .locator(`[cmdk-item]`)
    .filter({ hasText: /^Signals$/ })
    .click()
  await page.waitForURL(/\/dashboard\?tab=signals(?:&|$)/, { timeout: 10_000 })
  expect(new URL(page.url()).searchParams.get("tab")).toBe("signals")
})

test("3.4 click Skills in palette navigates to /skills (Lane 4 new surface)", async ({
  page,
}) => {
  await openPalette(page)
  await page
    .locator(`[cmdk-item]`)
    .filter({ hasText: /^Skills$/ })
    .first()
    .click()
  await page.waitForURL(/\/skills(?:\?|$)/, { timeout: 10_000 })
  expect(new URL(page.url()).pathname).toBe("/skills")
})

test("3.5 click Settings in palette navigates to /settings", async ({ page }) => {
  await openPalette(page)
  await page
    .locator(`[cmdk-item]`)
    .filter({ hasText: /^Settings$/ })
    .first()
    .click()
  await page.waitForURL(/\/settings(?:\?|$)/, { timeout: 10_000 })
  expect(new URL(page.url()).pathname).toBe("/settings")
})

test("3.6 typing 'publish' filters the palette list", async ({ page }) => {
  await openPalette(page)
  const input = page.locator("input[placeholder*='Search skills' i]")
  await input.fill("publish")
  // After filtering, "Publish" remains visible; "Pulse" should be gone
  // (cmdk shouldFilter is on -- palette.tsx:151).
  await expect(
    page.locator(`[cmdk-item]`).filter({ hasText: /^Publish$/ }),
  ).toBeVisible({ timeout: 5_000 })
  await expect(
    page.locator(`[cmdk-item]`).filter({ hasText: /^Pulse$/ }),
  ).toHaveCount(0, { timeout: 5_000 })
})

test("3.7 Esc closes the palette", async ({ page }) => {
  await openPalette(page)
  await expect(
    page.locator("input[placeholder*='Search skills' i]"),
  ).toBeVisible({ timeout: 5_000 })
  await page.keyboard.press("Escape")
  await expect(
    page.locator("input[placeholder*='Search skills' i]"),
  ).not.toBeVisible({ timeout: 5_000 })
})

test("3.8 'Seed demo data' does NOT navigate to /settings?panel=demo", async ({
  page,
}) => {
  // Pre-Lane-4 the action did `router.push("/settings?panel=demo")` against
  // a panel id that did not exist. Lane 4 stripped the navigate and replaced
  // it with a clipboard-copy + sonner toast. This test guards the regression.
  await openPalette(page)
  // Need to click the action item by its visible text fragment. Action
  // items are inside the "Actions" group (palette.tsx:251-330).
  await page
    .locator(`[cmdk-item]`)
    .filter({ hasText: /Seed demo data/i })
    .click()
  // After click, palette closes (palette.tsx:301 calls onClose()), and the
  // URL stays on /dashboard -- no navigation. Wait briefly to give any
  // stray navigate attempt time to manifest.
  await page.waitForTimeout(1000)
  const url = new URL(page.url())
  expect(url.pathname).toBe("/dashboard")
  expect(url.searchParams.get("panel")).toBeNull()
})
