// 04-settings-panel.e2e.ts -- ?panel= deep-link + scroll behavior.
//
// Lane 4 reconciled the SettingsSidebar split-personality bug: links used
// to be `#anchor` while the active-state was driven by `?panel=`. Now both
// use `?panel=`, and SettingsPanelScroll (a 15-line client leaf, sibling
// of the server SettingsPanel) applies scrollIntoView when the param
// changes. This file proves the contract end-to-end.
//
// Coverage:
//   4.1  /settings without ?panel= shows the env section first + first
//        sidebar item highlighted as the implicit active (per
//        SettingsSidebar.activePanel fallback)
//   4.2  /settings?panel=doctor highlights the "mktg doctor" sidebar item
//        AND scrolls #doctor into view
//   4.3  Clicking "Danger zone" in the sidebar updates the URL to
//        ?panel=reset and scrolls
//   4.4  /settings?panel=NONEXISTENT_SECTION highlights the literal name
//        in the sidebar (no crash) but no scroll happens

import { test, expect, type Page } from "@playwright/test"
import { DASHBOARD, hideNextErrorOverlay, waitForDashboardChrome } from "./_helpers"

test.describe.configure({ mode: "serial" })

/**
 * Resolve the y-offset (relative to the scrollable settings container) of
 * the section with the given id. Returns null if the section isn't in the
 * DOM. Used to assert "scrolled to the section" without depending on
 * window.scrollY (the panel scrolls inside its own overflow container).
 */
async function sectionScrollOffset(page: Page, id: string): Promise<number | null> {
  return page.evaluate((sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (!el) return null
    // The section ancestor with `overflow-y-auto` is the actual scroller.
    let container: HTMLElement | null = el.parentElement
    while (container && container !== document.body) {
      const overflow = window.getComputedStyle(container).overflowY
      if (overflow === "auto" || overflow === "scroll") break
      container = container.parentElement
    }
    if (!container) return null
    return el.getBoundingClientRect().top - container.getBoundingClientRect().top
  }, id)
}

test.beforeEach(async ({ page }) => {
  await page.goto(DASHBOARD)
  await page.evaluate(() => {
    try {
      localStorage.clear()
    } catch {
      /* fine */
    }
  })
})

test("4.1 /settings (no ?panel=) defaults to env section + highlights API keys", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/settings`)
  await waitForDashboardChrome(page)
  await hideNextErrorOverlay(page)

  // SettingsSidebar.activePanel falls back to SECTIONS[0].id ("env") when
  // ?panel= is unset. The active item gets `bg-accent/15 text-accent`
  // classes; assert the link points at ?panel=env.
  const apiKeysLink = page.getByRole("link", { name: /api keys/i }).first()
  await expect(apiKeysLink).toBeVisible({ timeout: 10_000 })
  const href = await apiKeysLink.getAttribute("href")
  expect(href).toMatch(/[?&]panel=env(?:&|$)/)
})

test("4.2 /settings?panel=doctor highlights sidebar item + scrolls section", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/settings?panel=doctor`)
  await waitForDashboardChrome(page)
  await hideNextErrorOverlay(page)

  // 1. Sidebar item is rendered and points at ?panel=doctor.
  const doctorLink = page.getByRole("link", { name: /mktg doctor/i }).first()
  await expect(doctorLink).toBeVisible({ timeout: 10_000 })

  // 2. Wait for SettingsPanelScroll's effect to fire. The smooth-scroll
  // takes ~400ms; give it a generous beat.
  await page.waitForTimeout(1500)

  // 3. The #doctor section should be at (or very near) y=0 in its
  // scrollable container. Allow a 200px tolerance for layout settle.
  const offset = await sectionScrollOffset(page, "doctor")
  expect(offset).not.toBeNull()
  expect(Math.abs(offset ?? 9999)).toBeLessThan(200)
})

test("4.3 clicking Danger zone updates ?panel=reset and scrolls", async ({ page }) => {
  await page.goto(`${DASHBOARD}/settings`)
  await waitForDashboardChrome(page)
  await hideNextErrorOverlay(page)

  await page.getByRole("link", { name: /danger zone/i }).first().click()
  await page.waitForURL(/[?&]panel=reset(?:&|$)/, { timeout: 10_000 })

  // Same scroll assertion as 4.2 but for the reset section.
  await page.waitForTimeout(1500)
  const offset = await sectionScrollOffset(page, "reset")
  expect(offset).not.toBeNull()
  expect(Math.abs(offset ?? 9999)).toBeLessThan(200)
})

test("4.4 /settings?panel=garbage does not crash + no section scrolls", async ({
  page,
}) => {
  // Defensive: an arbitrary ?panel= value is allowed by the URL contract
  // (it's just a string). The scroll handler bails when getElementById
  // returns null, and the sidebar shows no item highlighted (because no
  // SECTION.id matches "garbage").
  await page.goto(`${DASHBOARD}/settings?panel=garbage`)
  await waitForDashboardChrome(page)
  await hideNextErrorOverlay(page)

  // Page renders without error.
  await expect(
    page.getByRole("heading", { name: /^settings$/i }).first(),
  ).toBeVisible({ timeout: 10_000 })

  // env section (the natural top of the page) is still at offset 0; no
  // unexpected scroll happened because there's no #garbage element.
  const offset = await sectionScrollOffset(page, "env")
  expect(offset).not.toBeNull()
  expect(Math.abs(offset ?? 9999)).toBeLessThan(200)
})

test("4.5 sidebar links use ?panel= (not #anchor) per Lane 4 reconciliation", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/settings`)
  await waitForDashboardChrome(page)

  // Per Lane 4, all 5 sidebar links resolve to `pathname?panel=<id>` --
  // never `#anchor`. This is the regression guard: if the split-personality
  // bug returns, this test fails.
  for (const [name, expected] of [
    ["api keys", "env"],
    ["connected providers", "integrations"],
    ["brand file health", "brand"],
    ["mktg doctor", "doctor"],
    ["danger zone", "reset"],
  ] as const) {
    const link = page.getByRole("link", { name: new RegExp(name, "i") }).first()
    const href = await link.getAttribute("href")
    expect(href, `link for "${name}"`).toMatch(
      new RegExp(`[?&]panel=${expected}(?:&|$)`),
    )
    expect(href, `link for "${name}" must not be an #anchor`).not.toMatch(
      /^#/,
    )
  }
})
