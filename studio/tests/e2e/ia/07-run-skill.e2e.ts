// 07-run-skill.e2e.ts -- the "Run" button on every Skill Browser surface.
//
// RunSkillButton (components/skills/run-skill-button.tsx) POSTs to
// /api/skill/run with `{ name }` plus `studioAuthHeaders()`. On success
// it surfaces a sonner toast; on failure it surfaces an error toast. Lane 1
// gated /api/skill/run behind the Bearer middleware, but the e2e harness
// runs with MKTG_STUDIO_AUTH=disabled. Browser auth normally uses an HttpOnly
// session cookie, so dashboard JavaScript never attaches the bearer header.
//
// Coverage:
//   7.1  Click Run on a list-view card POSTs to /api/skill/run with the
//        right name and Content-Type
//   7.2  Click Run on the detail page does the same and surfaces the
//        success toast
//   7.3  When skill.installed is false, the button is disabled (proves
//        the disabled state mapping in run-skill-button.tsx)
//   7.4  Credentials left by older releases in localStorage or the URL are
//        removed and never forwarded by the POST.

import { test, expect, type Request } from "@playwright/test"
import { DASHBOARD, fetchSkills, waitForDashboardChrome } from "./_helpers"

test.describe.configure({ mode: "serial" })

test("7.1 list-view Run button POSTs /api/skill/run with the correct shape", async ({
  page,
}) => {
  const skills = await fetchSkills()
  // Find an INSTALLED skill so the button isn't disabled.
  const installed = skills.find((s) => s.installed)
  if (!installed) {
    test.skip(true, "No installed skills in test environment.")
    return
  }

  await page.goto(`${DASHBOARD}/skills`)
  await waitForDashboardChrome(page)
  await expect(
    page.getByText(/skills in the playbook/i),
  ).toBeVisible({ timeout: 15_000 })

  // Search to narrow the grid to a single card so the Run button selector
  // is unambiguous.
  await page.getByRole("searchbox", { name: /search skills/i }).fill(installed.name)

  // Wait for the matching link to be the only one rendered.
  await expect(
    page.getByRole("link", { name: new RegExp(`^${installed.name}$`) }),
  ).toBeVisible({ timeout: 5_000 })

  // Capture the next POST to /api/skill/run while clicking Run.
  const reqPromise = page.waitForRequest(
    (req: Request) =>
      req.url().includes("/api/skill/run") && req.method() === "POST",
    { timeout: 10_000 },
  )
  await page.getByRole("button", { name: new RegExp(`^Run ${installed.name}$`) }).click()
  const req = await reqPromise

  // Real, granular request assertions.
  expect(req.method()).toBe("POST")
  expect(req.url()).toMatch(/\/api\/skill\/run$/)
  const headers = req.headers()
  expect(headers["content-type"]).toMatch(/application\/json/)
  const body = req.postData()
  expect(body).toBeTruthy()
  const parsed = JSON.parse(body!)
  expect(parsed).toEqual({ name: installed.name })

  // Toast confirms the POST landed (server returns 200 since the harness
  // routes /api/skill/run to /cmo's queue without actually running).
  await expect(
    page.getByText(new RegExp(`Queued ${installed.name}`, "i")),
  ).toBeVisible({ timeout: 10_000 })
})

test("7.2 detail-view Run button posts and surfaces success toast", async ({
  page,
}) => {
  const skills = await fetchSkills()
  const installed = skills.find((s) => s.installed) ?? skills[0]!

  await page.goto(`${DASHBOARD}/skills/${installed.name}`)
  await waitForDashboardChrome(page)
  // Wait for the detail to finish loading (Versions block appears AFTER
  // SWR resolves).
  await expect(page.getByRole("heading", { name: /^versions$/i })).toBeVisible({
    timeout: 15_000,
  })

  const reqPromise = page.waitForRequest(
    (req: Request) =>
      req.url().includes("/api/skill/run") && req.method() === "POST",
    { timeout: 10_000 },
  )
  await page.getByRole("button", { name: new RegExp(`^Run ${installed.name}$`) }).click()
  const req = await reqPromise
  const parsed = JSON.parse(req.postData() ?? "{}")
  expect(parsed.name).toBe(installed.name)

  await expect(
    page.getByText(new RegExp(`Queued ${installed.name}`, "i")),
  ).toBeVisible({ timeout: 10_000 })
})

test("7.3 Run button disabled state matches skill.installed=false", async ({
  page,
}) => {
  const skills = await fetchSkills()
  const uninstalled = skills.find((s) => !s.installed)
  if (!uninstalled) {
    // Nothing uninstalled in this environment. The disabled state mapping
    // is still covered by the unit test on RunSkillButton (Lane 4 ships
    // `disabled={!skill.installed}` -- if a skill ever flips, this test
    // will start asserting). Skip cleanly.
    test.skip(
      true,
      "All skills are installed in this test environment -- nothing to assert disabled state against.",
    )
    return
  }

  await page.goto(`${DASHBOARD}/skills/${uninstalled.name}`)
  await waitForDashboardChrome(page)

  const button = page.getByRole("button", { name: new RegExp(`^Run ${uninstalled.name}$`) })
  await expect(button).toBeVisible({ timeout: 10_000 })
  await expect(button).toBeDisabled({ timeout: 5_000 })
})

test("7.4 legacy browser credentials are removed and never sent in URLs or headers", async ({
  page,
}) => {
  const skills = await fetchSkills()
  const installed = skills.find((s) => s.installed) ?? skills[0]!

  // Seed the key used by pre-cookie releases. Bootstrap must delete it
  // without reading or forwarding it.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("mktgStudioToken", "test-token-aabbcc")
    } catch {
      /* fine */
    }
  })

  await page.goto(`${DASHBOARD}/skills/${installed.name}?token=legacy-url-token`)
  await waitForDashboardChrome(page)
  await expect(page.getByRole("heading", { name: /^versions$/i })).toBeVisible({
    timeout: 15_000,
  })

  const reqPromise = page.waitForRequest(
    (req: Request) =>
      req.url().includes("/api/skill/run") && req.method() === "POST",
    { timeout: 10_000 },
  )
  await page.getByRole("button", { name: new RegExp(`^Run ${installed.name}$`) }).click()
  const req = await reqPromise

  const auth = req.headers()["authorization"] ?? req.headers()["Authorization"] ?? ""
  expect(auth).toBe("")
  expect(req.url()).not.toContain("token=")
  await expect.poll(() => page.url()).not.toContain("token=")
  expect(await page.evaluate(() => window.localStorage.getItem("mktgStudioToken"))).toBeNull()
})
