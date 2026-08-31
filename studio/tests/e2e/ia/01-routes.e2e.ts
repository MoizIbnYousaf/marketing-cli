// 01-routes.e2e.ts -- every App Router page renders against the real booted
// Next.js + Bun studio. The source-inventory assertion fails when a new
// page.tsx is added without extending this suite.
//
// Routes covered (canonical post-rename, per Lane 4 final ship output):
//   /                 redirect to /onboarding (empty brand/) or /dashboard
//   /onboarding       wizard (5 steps, localStorage-backed)
//   /dashboard        BrandWorkspace + 4 tabs (?tab=pulse|signals|publish|brand)
//   /brand            redirect to /dashboard?tab=brand
//   /settings         SettingsPanel (5 in-page sections)
//   /skills           SkillList from GET /api/skills
//   /skills/[name]    SkillDetail
//   /dev-test/primitives  real-render component matrix
//
// The brief asks for 3+ cases per surface. This file covers the "renders"
// case for every route + the "redirects correctly" case for the 2 alias
// routes + the "404" case for unknown paths.

import { test, expect } from "@playwright/test"
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  DASHBOARD,
  STUDIO,
  hideNextErrorOverlay,
  landingUrl,
  seedWorkspaceTab,
  waitForDashboardChrome,
} from "./_helpers"

test.describe.configure({ mode: "serial" })

const STUDIO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const APP_ROOT = join(STUDIO_ROOT, "app")
const PROJECT_ROOT_FILE = join(tmpdir(), "mktg-studio-e2e.project-root")
const EXPECTED_PAGE_FILES = [
  "app/(dashboard)/brand/page.tsx",
  "app/(dashboard)/dashboard/page.tsx",
  "app/(dashboard)/settings/page.tsx",
  "app/(dashboard)/skills/[name]/page.tsx",
  "app/(dashboard)/skills/page.tsx",
  "app/dev-test/primitives/page.tsx",
  "app/onboarding/page.tsx",
  "app/page.tsx",
] as const

function findPageFiles(root: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) found.push(...findPageFiles(path))
    if (entry.isFile() && entry.name === "page.tsx") {
      found.push(relative(STUDIO_ROOT, path).replaceAll("\\", "/"))
    }
  }
  return found.sort()
}

function e2eProjectRoot(): string {
  if (!existsSync(PROJECT_ROOT_FILE)) {
    throw new Error(`global setup did not write ${PROJECT_ROOT_FILE}`)
  }
  return readFileSync(PROJECT_ROOT_FILE, "utf8").trim()
}

test("1.0 every app/page.tsx has an explicit browser contract", () => {
  expect(findPageFiles(APP_ROOT)).toEqual([...EXPECTED_PAGE_FILES].sort())
})

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

test("1.2 / redirects to /dashboard when the voice profile is populated", async ({
  page,
}) => {
  const voiceProfile = join(e2eProjectRoot(), "brand", "voice-profile.md")
  const populatedProfile = [
    "# Voice profile",
    "",
    "## Personality",
    "Direct, practical, specific, confident, and grounded in verifiable evidence.",
    "",
    "## Vocabulary",
    "Use concrete product language and name the outcome before implementation detail.",
    "",
    "## Sentence patterns",
    "Lead with the conclusion. Follow with concise evidence and the next useful action.",
    "",
    "Avoid placeholders, vague superlatives, and claims that cannot be demonstrated.",
  ].join("\n")
  expect(populatedProfile.length).toBeGreaterThan(200)
  writeFileSync(voiceProfile, populatedProfile, "utf8")

  try {
    await page.goto(`${DASHBOARD}/`)
    await page.waitForURL(/\/dashboard\/?$/, { timeout: 10_000 })
    await waitForDashboardChrome(page)
    await expect(page.getByRole("heading", { name: /^pulse$/i })).toBeVisible()
  } finally {
    rmSync(voiceProfile, { force: true })
  }
})

test("1.3 /onboarding renders the wizard step 0", async ({ page }) => {
  await page.goto(`${DASHBOARD}/onboarding`)
  await expect(
    page.getByRole("heading", { name: /what'?s your project\?/i }),
  ).toBeVisible({ timeout: 10_000 })
})

test("1.4 /dashboard renders every workspace tab state", async ({ page }) => {
  await seedWorkspaceTab(page, "pulse")
  await page.goto(`${DASHBOARD}/dashboard`)
  await waitForDashboardChrome(page)
  await hideNextErrorOverlay(page)

  // Per workspace-tabs.tsx WORKSPACE_TABS: Pulse, Signals, Publish, Brand.
  // Desktop exposes these as an ARIA tablist; the mobile dock remains nav.
  for (const label of ["Pulse", "Signals", "Publish", "Brand"]) {
    await expect(
      page.getByRole("tab", { name: new RegExp(`^${label}`, "i") }),
    ).toBeVisible({ timeout: 10_000 })
  }

  for (const state of [
    { path: "/dashboard", heading: "Pulse" },
    { path: "/dashboard?tab=signals", heading: "Signals" },
    { path: "/dashboard?tab=publish", heading: "Publish" },
    { path: "/dashboard?tab=brand", heading: "Brand files" },
  ]) {
    await page.goto(`${DASHBOARD}${state.path}`)
    await expect(
      page.getByRole("heading", { name: new RegExp(`^${state.heading}$`, "i") }),
    ).toBeVisible({ timeout: 10_000 })
  }
})

test("1.4b /dashboard composes workflow and live activity side by side", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seedWorkspaceTab(page, "pulse")
  await page.goto(`${DASHBOARD}/dashboard`)
  await waitForDashboardChrome(page)

  const workspace = page.locator('[data-slot="tabs-content"][data-state="active"]')
  const activity = page.getByRole("complementary", {
    name: "/cmo activity feed",
  })

  await expect(page.locator("#dashboard-main")).toBeVisible()
  await expect(page.getByRole("region", { name: "Pulse" })).toBeVisible()
  await expect(workspace).toBeVisible()
  await expect(activity).toBeVisible()

  const workspaceBox = await workspace.boundingBox()
  const activityBox = await activity.boundingBox()
  expect(workspaceBox).not.toBeNull()
  expect(activityBox).not.toBeNull()
  expect(activityBox!.x).toBeGreaterThanOrEqual(
    workspaceBox!.x + workspaceBox!.width,
  )

  await page.getByRole("tab", { name: /^Signals/i }).click()
  await expect(page).toHaveURL(/[?&]tab=signals/)
  await expect(page.locator("#workspace-active-tab-title")).toHaveText("Signals")
  await expect(activity).toBeVisible()
})

test("1.5 /brand redirects to the complete brand editor page state", async ({ page }) => {
  await seedWorkspaceTab(page, "brand")
  await page.goto(`${DASHBOARD}/brand`)
  await page.waitForURL(/\/dashboard\?tab=brand(?:&|$)/, { timeout: 10_000 })
  const url = landingUrl(page)
  expect(url.pathname).toBe("/dashboard")
  expect(url.searchParams.get("tab")).toBe("brand")
  await expect(page.getByText("Brand docs", { exact: true })).toBeVisible()
  await expect(page.getByText("Pick a brand doc to edit", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: /voice profile/i })).toBeVisible()
  await expect(page.locator("aside li")).toHaveCount(10)
})

test("1.6 /settings renders the SettingsPanel header + sidebar", async ({ page }) => {
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

test("1.7 /skills renders the Skill Browser header with skill count", async ({
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

test("1.8 /skills/[name] renders a known skill detail (cmo)", async ({ page }) => {
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

test("1.9 /dev-test/primitives renders its real component matrix", async ({ page }) => {
  const response = await page.goto(`${DASHBOARD}/dev-test/primitives`)
  expect(response?.status()).toBe(200)
  await expect(page.getByTestId("harness-heading")).toHaveText(
    "Primitives variant matrix (Lane 6 E2E)",
  )
  for (const section of ["card", "skeleton", "button", "input", "textarea", "label", "tokens"]) {
    await expect(page.getByTestId(`section-${section}`)).toBeVisible()
  }
})

test("1.10 unknown segment returns 404 not-found", async ({ request }) => {
  // Next.js renders the global app/_not-found.tsx (or the framework's
  // default) for unknown segments; the response code is 404 even though
  // the body is HTML. Use request to assert the network code directly so
  // the test does not depend on framework copy.
  const res = await request.get(`${DASHBOARD}/this-route-does-not-exist`)
  expect(res.status()).toBe(404)
})

test("1.11 /api/health on the studio API responds 200", async ({ request }) => {
  // Sanity probe of the Bun server boot path that Lane 4 is downstream
  // of -- if /api/health is broken every other assertion in this file
  // would be a false positive.
  const res = await request.get(`${STUDIO}/api/health`)
  expect(res.status()).toBe(200)
  const body = (await res.json()) as { ok: boolean }
  expect(body.ok).toBe(true)
})
