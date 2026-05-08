// 01-routes.e2e.ts -- every route in the Lane 4 sitemap renders against the
// real booted Next.js + Bun studio.
//
// Routes covered (canonical post-rename, per Lane 4 final ship output):
//   /                 redirect to /onboarding (empty brand/) or /dashboard
//   /onboarding       wizard (5 steps, localStorage-backed)
//   /dashboard        BrandWorkspace + 4 tabs (?tab=pulse|signals|publish|brand)
//   /brand            redirect to /dashboard?tab=brand
//   /settings         SettingsPanel (5 in-page sections)
//   /skills           NEW: SkillList from GET /api/skills
//   /skills/[name]    NEW: SkillDetail
//
// The brief asks for 3+ cases per surface. This file covers the "renders"
// case for every route + the "redirects correctly" case for the 2 alias
// routes + the "404" case for unknown paths.

import { test, expect } from "@playwright/test"
import {
  DASHBOARD,
  STUDIO,
  hideNextErrorOverlay,
  landingUrl,
  seedWorkspaceTab,
  waitForDashboardChrome,
} from "./_helpers"

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  // Empty MKTG_PROJECT_ROOT in global-setup means brand/voice-profile.md
  // never exists -- root `/` always redirects to /onboarding. Clear any
  // wizard state from prior tests so the redirect isn't bypassed.
  await page.goto(DASHBOARD)
  await page.evaluate(() => {
    try {
      localStorage.clear()
    } catch {
      /* fine */
    }
  })
})

test("1.1 / redirects to /onboarding when brand/voice-profile.md is missing", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/`)
  await page.waitForURL(/\/onboarding\/?$/, { timeout: 10_000 })
  expect(page.url()).toMatch(/\/onboarding\/?$/)
  await expect(
    page.getByRole("heading", { name: /what'?s your project\?/i }),
  ).toBeVisible({ timeout: 10_000 })
})

test("1.2 /onboarding renders the wizard step 0", async ({ page }) => {
  await page.goto(`${DASHBOARD}/onboarding`)
  await expect(
    page.getByRole("heading", { name: /what'?s your project\?/i }),
  ).toBeVisible({ timeout: 10_000 })
})

test("1.3 /dashboard renders BrandWorkspace with 4-tab strip", async ({ page }) => {
  await seedWorkspaceTab(page, "pulse")
  await page.goto(`${DASHBOARD}/dashboard`)
  await waitForDashboardChrome(page)
  await hideNextErrorOverlay(page)

  // Per workspace-tabs.tsx WORKSPACE_TABS: Pulse, Signals, Publish, Brand.
  // The strip uses <button> elements with the visible labels; targeting
  // the first match each so the assertion survives mobile-dock duplication.
  for (const label of ["Pulse", "Signals", "Publish", "Brand"]) {
    await expect(
      page.getByRole("button", { name: new RegExp(`^${label}`, "i") }).first(),
    ).toBeVisible({ timeout: 10_000 })
  }
})

test("1.4 /brand server-redirects to /dashboard?tab=brand", async ({ page }) => {
  await seedWorkspaceTab(page, "brand")
  await page.goto(`${DASHBOARD}/brand`)
  await page.waitForURL(/\/dashboard\?tab=brand(?:&|$)/, { timeout: 10_000 })
  const url = landingUrl(page)
  expect(url.pathname).toBe("/dashboard")
  expect(url.searchParams.get("tab")).toBe("brand")
})

test("1.5 /settings renders the SettingsPanel header + sidebar", async ({ page }) => {
  await page.goto(`${DASHBOARD}/settings`)
  await waitForDashboardChrome(page)
  await expect(
    page.getByRole("heading", { name: /^settings$/i }).first(),
  ).toBeVisible({ timeout: 10_000 })
  // SettingsSidebar lists 5 sections; each renders as a Link.
  for (const section of [
    "API keys",
    "Connected providers",
    "Brand file health",
    "mktg doctor",
    "Danger zone",
  ]) {
    await expect(
      page.getByRole("link", { name: new RegExp(section, "i") }).first(),
    ).toBeVisible({ timeout: 5_000 })
  }
})

test("1.6 /skills renders the Skill Browser header with skill count", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/skills`)
  await waitForDashboardChrome(page)
  await expect(page.getByRole("heading", { name: /^skills$/i })).toBeVisible({
    timeout: 10_000,
  })
  // The header subtitle is "<N> skills in the playbook -- <M> installed".
  // Match the literal "in the playbook" so the regex isn't fooled by other
  // copy on the page.
  await expect(
    page.getByText(/skills in the playbook/i),
  ).toBeVisible({ timeout: 10_000 })
})

test("1.7 /skills/[name] renders a known skill detail (cmo)", async ({ page }) => {
  await page.goto(`${DASHBOARD}/skills/cmo`)
  await waitForDashboardChrome(page)
  // SkillDetail renders the skill name in a font-mono h1.
  await expect(page.getByRole("heading", { name: "cmo" })).toBeVisible({
    timeout: 10_000,
  })
  // Triggers section heading is always rendered (manifest entries have
  // at least one trigger).
  await expect(page.getByRole("heading", { name: /^triggers$/i })).toBeVisible({
    timeout: 5_000,
  })
})

test("1.8 unknown segment returns 404 not-found", async ({ page }) => {
  // Next.js renders the global app/_not-found.tsx (or the framework's
  // default) for unknown segments; the response code is 404 even though
  // the body is HTML. Use request to assert the network code directly so
  // the test does not depend on framework copy.
  const res = await page.goto(`${DASHBOARD}/this-route-does-not-exist`)
  expect(res?.status()).toBe(404)
})

test("1.9 /api/health on the studio API responds 200", async ({ request }) => {
  // Sanity probe of the Bun server boot path that Lane 4 is downstream
  // of -- if /api/health is broken every other assertion in this file
  // would be a false positive.
  const res = await request.get(`${STUDIO}/api/health`)
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { ok: boolean }
  expect(body.ok).toBe(true)
})
