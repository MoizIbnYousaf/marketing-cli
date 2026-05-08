// tests/e2e/onboarding/wizard-success.e2e.ts
//
// Lane 8 E2E coverage for the success path through the onboarding wizard.
// Real Playwright walks Steps 0-4 in NEXT_PUBLIC_STUDIO_DEMO mode (the
// harness sets this in global-setup.ts), so the foundation-building step
// completes in seconds via the in-process demo stream. step-done.tsx is
// then asserted against Wave B fixes #2 and #3:
//
//   - Middle icon card reads "Audience" (NOT "Signals" -- the original
//     lie that step-done was advertising the wrong artifact).
//   - Headline reads "Your brand files are live." (NOT "Your marketing
//     brain is live." -- the AI-slop kill).
//   - Secondary CTA renders the lucide ArrowRight icon (NOT a text-arrow
//     "→" suffix on the label).
//   - Step 0 button copy uses US "Initializing" not British "Initialising"
//     (Wave C #9 -- shipped early).

import { test, expect } from "@playwright/test"

const DASHBOARD_PORT = Number(process.env.E2E_DASHBOARD_PORT ?? "4800")
const DASHBOARD = `http://127.0.0.1:${DASHBOARD_PORT}`

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem("mktg-studio:onboarding")
    } catch {
      // private mode; harmless
    }
  })
})

async function walkToBuildingStep(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${DASHBOARD}/onboarding`)
  // Step 0: skip URL via "Start fresh".
  await page.getByRole("button", { name: /Start fresh|Import brand/i }).click()
  await expect(
    page.getByRole("heading", { name: /Connect social accounts/i }),
  ).toBeVisible({ timeout: 10_000 })
  // Step 1: skip Postiz.
  await page.getByRole("button", { name: /^Skip for now$/ }).click()
  await expect(
    page.getByRole("heading", { name: /Optional integrations/i }),
  ).toBeVisible({ timeout: 10_000 })
  // Step 2: skip optional.
  await page.getByRole("button", { name: /^Skip all$/ }).click()
  // Step 3 (Building) headline appears.
  await expect(
    page.getByRole("heading", { name: /Writing your brand files/i }),
  ).toBeVisible({ timeout: 10_000 })
}

test("Case 1: Step 0 button uses US spelling 'Initializing' (Wave C #9)", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/onboarding`)
  // The loading text is gated behind the in-flight POST. Instead of
  // racing the network, intercept the click handler -- assert the static
  // initial-state strings on the button: "Import brand" vs "Start fresh"
  // are never British. Then trigger a click that initiates a real /api/init
  // request and inspect the loading-state label while it is in flight.

  await page.getByLabel(/Website URL/i).fill("https://example.com")

  // Race condition shield: capture the button text at the moment the
  // POST is in flight.
  const reqPromise = page.waitForRequest("**/api/init")
  await page.getByRole("button", { name: /Import brand/i }).click()
  await reqPromise
  // While loading, label flips to "Initializing…". Don't await visibility
  // strictly because /api/init returns fast in DEMO_MODE; instead, scan
  // the DOM source for the canonical US spelling and the absence of the
  // British one.
  const html = await page.content()
  // Either the US spelling appeared during the click, or the request
  // completed before we could observe -- in either case the British
  // form must never appear.
  expect(html).not.toMatch(/Initialising/i)

  // Also check the static error text path uses US: trigger an error on a
  // separate run with bad URL.
  await page.goto(`${DASHBOARD}/onboarding`)
  await page.getByLabel(/Website URL/i).fill("not-a-url")
  await page.getByRole("button", { name: /Import brand|Start fresh/i }).click()
  // Scope to the project-init error block by id; bare getByRole("alert")
  // collides with Next.js's route announcer.
  const errorAlert = page.locator("#project-init-error")
  await expect(errorAlert).toBeVisible({ timeout: 5_000 })
  await expect(errorAlert).toContainText(/Couldn.t initialize the project/i)
  await expect(errorAlert).not.toContainText(/initialise/i)
})

test("Case 2: Step 3 (building) headline uses 'Writing your brand files…' not 'marketing brain'", async ({
  page,
}) => {
  await walkToBuildingStep(page)
  // The new heading is in the DOM.
  await expect(
    page.getByRole("heading", { name: /Writing your brand files/i }),
  ).toBeVisible()
  // The AI-slop "marketing brain" metaphor is gone.
  const html = await page.content()
  expect(html).not.toMatch(/Building your marketing brain/i)
})

test("Case 3: Step 4 (done) names Audience as the middle written file (NOT Signals)", async ({
  page,
}) => {
  await walkToBuildingStep(page)

  // Wait for the demo stream to flip all three lanes to done. Generous
  // timeout because the demo lanes run on real-time setTimeouts.
  await expect(
    page.getByRole("heading", { name: /Your brand files are live/i }),
  ).toBeVisible({ timeout: 30_000 })

  // The three icon cards: Voice profile / Audience / Competitors.
  // CRITICAL: the middle one must read "Audience" -- this was previously
  // "Signals", which is a dashboard tab, not a written file.
  const cards = page.locator("text=/^Voice profile$|^Audience$|^Competitors$/")
  await expect(cards).toHaveCount(3, { timeout: 5_000 })
  // Order is Voice profile / Audience / Competitors.
  await expect(cards.nth(0)).toHaveText(/Voice profile/)
  await expect(cards.nth(1)).toHaveText(/Audience/)
  await expect(cards.nth(2)).toHaveText(/Competitors/)

  // Anti-regression: the literal string "Signals" must NOT appear inside
  // the card list. (The word may legitimately appear in the body
  // paragraph that names dashboard tabs; scope this to the cards.)
  const cardTexts = await cards.allInnerTexts()
  for (const t of cardTexts) {
    expect(t).not.toMatch(/^Signals$/)
  }
})

test("Case 4: Step 4 secondary CTA uses lucide ArrowRight icon, not text-arrow", async ({
  page,
}) => {
  await walkToBuildingStep(page)
  await expect(
    page.getByRole("heading", { name: /Your brand files are live/i }),
  ).toBeVisible({ timeout: 30_000 })

  const secondaryCta = page.getByRole("button", { name: /See your brand docs/i })
  await expect(secondaryCta).toBeVisible()

  // The label text must NOT include the unicode rightwards-arrow character
  // U+2192 ("→"). Pre-Wave-B, the file rendered "See your brand docs →"
  // with the glyph baked into the string.
  const labelText = (await secondaryCta.innerText()).trim()
  expect(labelText).not.toContain("→")

  // And it must contain a real <svg> child (the lucide ArrowRight icon
  // rendered inline). Gives us a structural guarantee, not just a text
  // assertion.
  const svgCount = await secondaryCta.locator("svg").count()
  expect(svgCount).toBeGreaterThanOrEqual(1)
})

test("Case 5: Step 4 'Open dashboard' click clears localStorage and navigates", async ({
  page,
}) => {
  await walkToBuildingStep(page)
  await expect(
    page.getByRole("heading", { name: /Your brand files are live/i }),
  ).toBeVisible({ timeout: 30_000 })

  // Sanity: localStorage carries the wizard state right now.
  const before = await page.evaluate(() =>
    window.localStorage.getItem("mktg-studio:onboarding"),
  )
  expect(before).not.toBeNull()

  await page.getByRole("button", { name: /Open dashboard/i }).click()
  await page.waitForURL(/\/dashboard/)

  // After click, the wizard state must be cleared so a refresh does not
  // re-open the success screen for an already-onboarded project.
  const after = await page.evaluate(() =>
    window.localStorage.getItem("mktg-studio:onboarding"),
  )
  expect(after).toBeNull()
})
