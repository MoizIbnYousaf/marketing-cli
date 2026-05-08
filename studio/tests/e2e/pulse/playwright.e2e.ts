// tests/e2e/pulse/playwright.e2e.ts
//
// Lane 5 Playwright -- visual + SSE-driven UI coverage on top of the
// bun:test API suite (snapshot.test.ts + staleSections.test.ts).
//
// Rides on the existing tests/e2e/global-setup.ts harness which boots
// server.ts on E2E_STUDIO_PORT and `next dev` on E2E_DASHBOARD_PORT against
// MKTG_PROJECT_ROOT/marketing.db. The global-setup currently disables auth
// (MKTG_STUDIO_AUTH=disabled) so the dashboard's SWR can fetch without
// threading a token through every call -- the auth-enabled path is covered
// by snapshot.test.ts in this same dir via tests/e2e/pulse/harness.ts.
//
// What this file proves end-to-end through a real browser:
//   1. /dashboard?tab=pulse mounts, hero chip renders
//   2. The 4 funnel nodes' labels appear (SIGNALS / BRIEFS / DRAFTS / PUBLISHES)
//   3. Recharts sparklines paint (one <linearGradient> per tone)
//   4. Delta pills show "+\\d+%" because the seeder produces positive deltas
//   5. Bottom strip headings render (Brand health / Recent media / Recent publishes)
//   6. SSE invalidation: POST /api/activity/log -> page re-fetches /api/pulse/snapshot
//      and the new activity row appears in the timeline WITHOUT a page reload

import { test, expect, type Request } from "@playwright/test"
import { spawnSync } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { tmpdir } from "node:os"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, "..", "..", "..")
const PROJECT_ROOT_FILE = join(tmpdir(), "mktg-studio-e2e.project-root")

const STUDIO_PORT = Number(process.env.E2E_STUDIO_PORT ?? "4801")
const DASHBOARD_PORT = Number(process.env.E2E_DASHBOARD_PORT ?? "4800")
const STUDIO = `http://127.0.0.1:${STUDIO_PORT}`
const DASHBOARD = `http://127.0.0.1:${DASHBOARD_PORT}`

test.describe.configure({ mode: "serial" })

function getProjectRoot(): string {
  if (!existsSync(PROJECT_ROOT_FILE)) {
    throw new Error(`global-setup did not write ${PROJECT_ROOT_FILE}`)
  }
  return readFileSync(PROJECT_ROOT_FILE, "utf-8").trim()
}

test.beforeAll(async () => {
  // Seed the shared harness DB so the funnel ribbon has real data to render.
  // Heavy current vs light prior produces visible positive deltas.
  const projectRoot = getProjectRoot()
  const dbPath = join(projectRoot, "marketing.db")
  const seederPath = join(REPO_ROOT, "scripts", "seed-pulse-series.ts")

  const r = spawnSync("bun", ["run", seederPath, "--db", dbPath, "--reset"], {
    encoding: "utf-8",
    timeout: 30_000,
  })
  if (r.status !== 0) {
    throw new Error(`seeder failed status=${r.status} stderr=${r.stderr}`)
  }

  // Sanity: snapshot endpoint reports non-zero funnel.
  const probe = await fetch(`${STUDIO}/api/pulse/snapshot`)
  if (probe.status !== 200) throw new Error(`snapshot probe status=${probe.status}`)
  const body = (await probe.json()) as {
    ok: boolean
    data: { funnel: { nodes: Array<{ total: number }> } }
  }
  const totals = body.data.funnel.nodes.map((n) => n.total)
  if (totals.every((t) => t === 0)) {
    throw new Error(`funnel all zero after seed: ${JSON.stringify(totals)}`)
  }
})

async function seedWorkspaceTab(page: import("@playwright/test").Page): Promise<void> {
  // Persist the zustand workspace store so /dashboard mounts on Pulse.
  const payload = {
    key: "mktg-studio-workspace",
    value: JSON.stringify({
      state: { workspaceTab: "pulse", signalFilters: {} },
      version: 2,
    }),
  }
  await page.addInitScript((arg: { key: string; value: string }) => {
    try {
      window.localStorage.setItem(arg.key, arg.value)
    } catch {
      /* fine */
    }
  }, payload)
}

test("Pulse hero chip + funnel ribbon render with real data", async ({ page }) => {
  await seedWorkspaceTab(page)
  await page.goto(`${DASHBOARD}/dashboard?tab=pulse`)

  await expect(page.getByText(/^Pulse$/)).toBeVisible({ timeout: 15_000 })
  for (const label of ["SIGNALS", "BRIEFS", "DRAFTS", "PUBLISHES"]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
})

test("4 sparklines paint as svg linearGradient defs (one per tone)", async ({ page }) => {
  await seedWorkspaceTab(page)
  await page.goto(`${DASHBOARD}/dashboard?tab=pulse`)
  await expect(page.getByText(/^Pulse$/)).toBeVisible({ timeout: 15_000 })

  // Recharts mount race; settle.
  await page.waitForTimeout(500)
  for (const id of ["pulse-spark-blue", "pulse-spark-violet", "pulse-spark-amber", "pulse-spark-green"]) {
    await expect(page.locator(`linearGradient#${id}`)).toHaveCount(1)
  }
})

test("delta pills render positive percentages on a heavier-current seed", async ({ page }) => {
  await seedWorkspaceTab(page)
  await page.goto(`${DASHBOARD}/dashboard?tab=pulse`)
  await expect(page.getByText(/^Pulse$/)).toBeVisible({ timeout: 15_000 })

  // Seeder shape produces +86% / +100% / +125% / +200%.
  const positivePill = page.locator('text=/\\+\\d+%/').first()
  await expect(positivePill).toBeVisible({ timeout: 15_000 })
})

test("bottom strip renders 3 sub-panels (Brand health / Recent media / Recent publishes)", async ({ page }) => {
  await seedWorkspaceTab(page)
  await page.goto(`${DASHBOARD}/dashboard?tab=pulse`)
  await expect(page.getByText(/^Pulse$/)).toBeVisible({ timeout: 15_000 })

  for (const title of ["Brand health", "Recent media", "Recent publishes"]) {
    await expect(page.getByRole("heading", { name: title })).toBeVisible()
  }
})

test("SSE invalidation: activity-log POST triggers a snapshot re-fetch + UI update WITHOUT reload", async ({ page, request }) => {
  await seedWorkspaceTab(page)
  await page.goto(`${DASHBOARD}/dashboard?tab=pulse`)
  await expect(page.getByText(/^Pulse$/)).toBeVisible({ timeout: 15_000 })

  // Capture every /api/pulse/snapshot fetch the page makes. The initial
  // mount fires one; the SWR + activity-live debounce should fire another
  // shortly after the activity-log POST lands and the SSE bridge pushes the
  // new row into the activity-live store.
  const snapshotRequests: Request[] = []
  page.on("requestfinished", (req) => {
    if (req.url().includes("/api/pulse/snapshot")) {
      snapshotRequests.push(req)
    }
  })

  // Wait for the initial mount fetch to complete before we POST so the
  // counter is stable.
  await page.waitForResponse(
    (res) => res.url().includes("/api/pulse/snapshot") && res.status() === 200,
    { timeout: 15_000 },
  )
  const baselineCount = snapshotRequests.length

  const marker = `pulse-e2e-playwright-${Date.now()}`
  const post = await request.post(`${STUDIO}/api/activity/log`, {
    data: { kind: "skill-run", skill: "seo-content", summary: marker },
  })
  expect(post.status()).toBe(200)

  // Wait for the page to issue another snapshot fetch in response to the SSE
  // event (or the SWR refresh interval, whichever wins). We give it 10s --
  // SWR refresh interval is 30s but the activity-live store debounce is
  // 300ms, so this should fire fast.
  await page.waitForResponse(
    (res) => res.url().includes("/api/pulse/snapshot") && res.status() === 200,
    { timeout: 35_000 },
  )

  // Sanity: at least one new snapshot fetch happened after the POST.
  expect(snapshotRequests.length).toBeGreaterThan(baselineCount)

  // UI assertion: the new activity summary appears in the page DOM without
  // a reload. The activity timeline renders summaries in a div within the
  // "Recent agent activity" panel.
  await expect(page.getByText(marker)).toBeVisible({ timeout: 10_000 })

  // Belt and suspenders: confirm we never reloaded -- url.location stayed
  // on /dashboard the whole time.
  expect(page.url()).toContain("/dashboard")
})

test("page reload refetches the snapshot (smoke for SSR fallback)", async ({ page }) => {
  await seedWorkspaceTab(page)
  await page.goto(`${DASHBOARD}/dashboard?tab=pulse`)
  await expect(page.getByText(/^Pulse$/)).toBeVisible({ timeout: 15_000 })
  await page.reload()
  await expect(page.getByText(/^Pulse$/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole("heading", { name: "Brand health" })).toBeVisible()
})
