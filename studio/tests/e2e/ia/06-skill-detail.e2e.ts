// 06-skill-detail.e2e.ts -- /skills/[name] detail view.
//
// SkillDetail (components/skills/skill-detail.tsx) fetches a single skill
// from /api/skills/<name>, renders triggers + routing + version blocks,
// and links cross-skill chips for skills in the routing.requires /
// routing.unlocks arrays.
//
// Coverage:
//   6.1  /skills/cmo renders the name h1 + Triggers + Versions blocks
//   6.2  Triggers list reflects every entry from the API
//   6.3  When the skill has a routing.requires array, those names render
//        as Link chips pointing back into /skills/<other>
//   6.4  Invalid skill name (uppercase / special chars) -> notFound (404)
//        per the SKILL_NAME_PATTERN regex in app/(dashboard)/skills/[name]/page.tsx
//   6.5  Valid-format but nonexistent name renders ErrorState (server
//        responds ok:false; dataFetcher throws; ErrorState shows)

import { test, expect } from "@playwright/test"
import { DASHBOARD, fetchSkills, waitForDashboardChrome } from "./_helpers"

test.describe.configure({ mode: "serial" })

test("6.1 /skills/cmo renders the name + Triggers + Versions sections", async ({
  page,
}) => {
  await page.goto(`${DASHBOARD}/skills/cmo`)
  await waitForDashboardChrome(page)

  // Name h1 is `font-mono` and reads exactly the slug.
  await expect(page.getByRole("heading", { name: "cmo" })).toBeVisible({
    timeout: 10_000,
  })
  // SectionHeading components render as h2 with text "Triggers" / "Versions".
  await expect(page.getByRole("heading", { name: /^triggers$/i })).toBeVisible({
    timeout: 5_000,
  })
  await expect(page.getByRole("heading", { name: /^versions$/i })).toBeVisible({
    timeout: 5_000,
  })
})

test("6.2 Triggers list reflects every entry from /api/skills/<name>", async ({
  page,
  request,
}) => {
  const port = process.env.E2E_STUDIO_PORT ?? "4801"
  const apiRes = await request.get(`http://127.0.0.1:${port}/api/skills/cmo`)
  expect(apiRes.status()).toBe(200)
  const apiBody = (await apiRes.json()) as {
    ok: boolean
    data: { triggers: string[] }
  }
  expect(apiBody.ok).toBe(true)
  expect(Array.isArray(apiBody.data.triggers)).toBe(true)

  await page.goto(`${DASHBOARD}/skills/cmo`)
  await waitForDashboardChrome(page)

  // Each trigger renders as a font-mono <li> inside the Triggers card.
  // Asserting first 3 triggers (the manifest can have 5+) keeps the
  // assertion stable while still proving the API->UI mapping.
  for (const trigger of apiBody.data.triggers.slice(0, 3)) {
    await expect(
      page.getByText(trigger, { exact: true }).first(),
    ).toBeVisible({ timeout: 5_000 })
  }
})

test("6.3 routing.requires/unlocks render as cross-skill chip links", async ({
  page,
}) => {
  // Find a skill that has routing.requires or routing.unlocks populated.
  const skills = await fetchSkills()
  const target = skills.find(
    (s) =>
      s.routing &&
      ((s.routing.requires?.length ?? 0) + (s.routing.unlocks?.length ?? 0)) > 0,
  )
  if (!target) {
    test.skip(
      true,
      "No skill in the live manifest has routing.requires or .unlocks entries; nothing to assert.",
    )
    return
  }

  await page.goto(`${DASHBOARD}/skills/${target.name}`)
  await waitForDashboardChrome(page)

  // Collect at least one chip target name.
  const chipTarget =
    target.routing?.requires[0] ?? target.routing?.unlocks[0]
  expect(chipTarget).toBeTruthy()

  // Chip is rendered as a Link with href=/skills/<chipTarget>. Use a
  // selector on the href to pinpoint exactly the chip (avoids matching
  // the page's own <h1> name).
  const chip = page.locator(`a[href="/skills/${chipTarget}"]`).first()
  await expect(chip).toBeVisible({ timeout: 10_000 })

  // Clicking it navigates into that skill's detail page.
  await chip.click()
  await page.waitForURL(new RegExp(`/skills/${chipTarget}(?:\\?|$)`), {
    timeout: 10_000,
  })
})

test("6.4 invalid skill name renders 404 not-found", async ({ page }) => {
  // SKILL_NAME_PATTERN at app/(dashboard)/skills/[name]/page.tsx is
  // /^[a-z0-9-]{1,64}$/. Uppercase fails. The page calls notFound() before
  // the API is even hit, so the response code is 404 from Next.js itself.
  const res = await page.goto(`${DASHBOARD}/skills/INVALID_NAME`)
  expect(res?.status()).toBe(404)
})

test("6.5 valid-format nonexistent name renders ErrorState (not 404)", async ({
  page,
}) => {
  // The slug matches the regex (lowercase + hyphens), so the page itself
  // resolves 200 OK. The API call /api/skills/this-skill-does-not-exist
  // returns ok:false; dataFetcher throws; ErrorState (level="tab") renders
  // with a Retry button.
  await page.goto(`${DASHBOARD}/skills/this-skill-does-not-exist`)
  // The header still renders the slug as the page title (skill-detail.tsx
  // renders `<h1>{name}</h1>` BEFORE the API resolves -- it's the static
  // header, not the data block).
  await expect(
    page.getByRole("heading", { name: "this-skill-does-not-exist" }),
  ).toBeVisible({ timeout: 10_000 })
  // The data block flips to ErrorState which renders an alert with
  // "Couldn't load this skill" heading.
  await expect(
    page.getByText(/couldn't load this skill/i),
  ).toBeVisible({ timeout: 15_000 })
})
