// tests/e2e/onboarding/wizard-error.e2e.ts
//
// Lane 8 E2E coverage for the wizard silent-error fix (Wave B fix #1).
// Real Playwright walks /onboarding, drives the URL + Postiz steps with
// real inputs, and verifies the inline AlertTriangle error UI appears
// when /api/settings/env or /api/init rejects, and that the wizard does
// NOT silently advance.
//
// All cases hit the real Bun studio server booted by global-setup. The
// `MKTG_STUDIO_AUTH=disabled` env override is in place for the harness so
// tokens do not have to be threaded through page navigation; the
// validation paths exercised here are server-side BAD_INPUT checks that
// fire regardless of auth.

import { test, expect } from "@playwright/test"

const DASHBOARD_PORT = Number(process.env.E2E_DASHBOARD_PORT ?? "4800")
const DASHBOARD = `http://127.0.0.1:${DASHBOARD_PORT}`

test.describe.configure({ mode: "serial" })

test.beforeEach(async ({ page }) => {
  // Reset wizard state so every test starts at step 0. The wizard persists
  // state to localStorage["mktg-studio:onboarding"] and resumes from there.
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem("mktg-studio:onboarding")
    } catch {
      // private mode; harmless
    }
  })
})

test("Case 1: bad URL on Step 0 surfaces inline error and blocks advance", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/onboarding`)
  await expect(page.getByRole("heading", { name: /What.*your project/i })).toBeVisible()

  // The /api/init route validates `from` as a real URL via Zod's
  // `string().url()`. A non-URL string like "not-a-url" lands a real
  // BAD_INPUT envelope back from the server.
  await page.getByLabel(/Website URL/i).fill("not-a-url")
  await page.getByRole("button", { name: /Import brand|Start fresh/i }).click()

  // The error block uses role="alert" with the headline
  // "Couldn't initialize the project" (US spelling per Wave C item).
  const errorAlert = page.getByRole("alert").filter({
    has: page.getByText(/Couldn.t initialize the project/i),
  })
  await expect(errorAlert).toBeVisible({ timeout: 5_000 })

  // CTA flips to "Retry" instead of "Import brand" / "Start fresh".
  await expect(page.getByRole("button", { name: /^Retry$/ })).toBeVisible()

  // Crucially: the wizard MUST still be on Step 0. Step 1's "Connect social
  // accounts" headline should NOT be in the DOM.
  await expect(
    page.getByRole("heading", { name: /Connect social accounts/i }),
  ).not.toBeVisible()
})

test("Case 2: editing the URL after error clears the error block", async ({ page }) => {
  await page.goto(`${DASHBOARD}/onboarding`)
  await page.getByLabel(/Website URL/i).fill("not-a-url")
  await page.getByRole("button", { name: /Import brand|Start fresh/i }).click()

  // Scope to the wizard's project-init error specifically. A bare
  // page.getByRole("alert") collides with Next.js's route announcer
  // (<div role="alert" id="__next-route-announcer__">), which is always
  // in the DOM in dev mode.
  const errorAlert = page.locator("#project-init-error")
  await expect(errorAlert).toBeVisible({ timeout: 5_000 })

  // Edit clears: the wizard listens to onChange and clears projectError
  // when the user touches the field again.
  const input = page.getByLabel(/Website URL/i)
  await input.click()
  await input.fill("https://example.com")

  await expect(errorAlert).not.toBeVisible({ timeout: 2_000 })
  await expect(page.getByRole("button", { name: /^Import brand$/ })).toBeVisible()
})

test("Case 3: Postiz step BAD_INPUT shows error UI, blocks advance, offers Continue without saving", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/onboarding`)
  // Step 0: blank URL is a valid "start fresh" path that advances cleanly.
  await page.getByRole("button", { name: /Start fresh|Import brand/i }).click()
  await expect(
    page.getByRole("heading", { name: /Connect social accounts/i }),
  ).toBeVisible({ timeout: 10_000 })

  // /api/settings/env validates control-char-free strings server-side.
  // Inject a control char (U+0001, START OF HEADING) directly via
  // dispatchEvent + setRangeText so the wizard's onChange picks it up
  // without React rejecting the keypress. The server then returns a real
  // BAD_INPUT envelope.
  const keyInput = page.getByLabel(/POSTIZ_API_KEY/i)
  await keyInput.fill("pk_live_test")
  // Append a real control char by setting native value + dispatching input.
  await keyInput.evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!
    setter.call(el, (el as HTMLInputElement).value + "")
    el.dispatchEvent(new Event("input", { bubbles: true }))
  })

  await page.getByRole("button", { name: /Save & continue/i }).click()

  // Inline error block appears with the headline neonpulse wired in.
  const errorAlert = page.getByRole("alert").filter({
    has: page.getByText(/Couldn.t save the Postiz key/i),
  })
  await expect(errorAlert).toBeVisible({ timeout: 5_000 })

  // The skip CTA flips from "Skip for now" to "Continue without saving".
  await expect(
    page.getByRole("button", { name: /Continue without saving/i }),
  ).toBeVisible()
  // The primary CTA flips to "Try again".
  await expect(page.getByRole("button", { name: /Try again/i })).toBeVisible()

  // CRITICAL anti-regression: the wizard must NOT silently advance. The
  // pre-Wave-B code path swallowed errors and `goTo(2)`'d. Verify Step 2's
  // "Optional integrations" headline is NOT visible.
  await expect(
    page.getByRole("heading", { name: /Optional integrations/i }),
  ).not.toBeVisible()
})

test("Case 4: 'Continue without saving' explicitly skips the integration and advances", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/onboarding`)
  await page.getByRole("button", { name: /Start fresh|Import brand/i }).click()
  await expect(
    page.getByRole("heading", { name: /Connect social accounts/i }),
  ).toBeVisible({ timeout: 10_000 })

  // Trigger the error first.
  const keyInput = page.getByLabel(/POSTIZ_API_KEY/i)
  await keyInput.fill("pk_live_test")
  await keyInput.evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!
    setter.call(el, (el as HTMLInputElement).value + "")
    el.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await page.getByRole("button", { name: /Save & continue/i }).click()
  await expect(
    page.getByRole("button", { name: /Continue without saving/i }),
  ).toBeVisible({ timeout: 5_000 })

  // Click the explicit-skip CTA. The wizard must advance to Step 2 WITHOUT
  // sending another POST -- the user has consciously chosen to skip the
  // integration.
  const networkRequests: string[] = []
  page.on("request", (req) => {
    if (req.url().includes("/api/settings/env")) {
      networkRequests.push(`${req.method()} ${req.url()}`)
    }
  })

  await page.getByRole("button", { name: /Continue without saving/i }).click()

  // Now on Step 2.
  await expect(
    page.getByRole("heading", { name: /Optional integrations/i }),
  ).toBeVisible({ timeout: 5_000 })

  // Confirm no extra POST fired during the skip click. Real network spy --
  // not a mock; we just observe what the page actually sent.
  expect(networkRequests).toEqual([])
})

test("Case 5: Optional step BAD_INPUT shows differentiated error and blocks advance to Building", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/onboarding`)
  await page.getByRole("button", { name: /Start fresh|Import brand/i }).click()
  await expect(
    page.getByRole("heading", { name: /Connect social accounts/i }),
  ).toBeVisible({ timeout: 10_000 })

  // Step 1: skip cleanly.
  await page.getByRole("button", { name: /^Skip for now$/ }).click()
  await expect(
    page.getByRole("heading", { name: /Optional integrations/i }),
  ).toBeVisible({ timeout: 10_000 })

  // Inject a control-char value into FIRECRAWL_API_KEY.
  const keyInput = page.getByLabel(/FIRECRAWL_API_KEY/i)
  await keyInput.fill("fc-test")
  await keyInput.evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!
    setter.call(el, (el as HTMLInputElement).value + "")
    el.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await page.getByRole("button", { name: /^Continue$/ }).click()

  // Inline error: differentiated headline (NOT "Postiz" -- this is the
  // optional step).
  const errorAlert = page.getByRole("alert").filter({
    has: page.getByText(/Couldn.t save the optional keys/i),
  })
  await expect(errorAlert).toBeVisible({ timeout: 5_000 })

  // Anti-regression: must NOT have advanced to Step 3 ("Writing your
  // brand files…" -- the rebadged "Building your marketing brain…").
  await expect(
    page.getByRole("heading", { name: /Writing your brand files/i }),
  ).not.toBeVisible()
  await expect(
    page.getByRole("heading", { name: /Building your marketing brain/i }),
  ).not.toBeVisible()
})
