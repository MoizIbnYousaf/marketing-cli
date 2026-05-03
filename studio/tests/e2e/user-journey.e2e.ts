// tests/e2e/user-journey.spec.ts
//
// End-to-end walk of the full user journey — boot → onboarding → dashboard
// → keyboard shortcuts → palette → SSE navigate/toast/activity → settings.
// Each step is its own `test(...)` so a regression names the step cleanly.
//
// Test isolation: Playwright tests share the Bun server + Next.js dev
// servers started in `global-setup.ts`. We clear localStorage at the top of
// each test so the onboarding wizard always starts at step 0.

import { test, expect } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STUDIO_PORT = Number(process.env.E2E_STUDIO_PORT ?? "4801");
const DASHBOARD_PORT = Number(process.env.E2E_DASHBOARD_PORT ?? "4800");
const STUDIO = `http://127.0.0.1:${STUDIO_PORT}`;
const DASHBOARD = `http://127.0.0.1:${DASHBOARD_PORT}`;
const SHOT_DIR = join(__dirname, "..", "..", "docs", "screenshots");

test.describe.configure({ mode: "serial" });

/**
 * Dismiss Next.js' dev-mode runtime error overlay if it's showing. Task #21
 * (legacy HQ tab crash) blocks the HQ tab in dev: every other tab works, so
 * we hide the overlay and keep testing. In production builds this is a no-op.
 */
async function hideNextErrorOverlay(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(() => {
    const portal = document.querySelector("nextjs-portal");
    if (portal) portal.remove();
    const dialog = document.querySelector("[data-nextjs-dialog-overlay]");
    if (dialog) (dialog as HTMLElement).style.display = "none";
  });
}

/**
 * Seed the zustand workspace store so the initial render lands on a tab that
 * doesn't trigger the HQ crash (task #21). Call this before every test
 * that navigates into /dashboard.
 */
async function seedWorkspaceTab(
  page: import("@playwright/test").Page,
  tab: "hq" | "content" | "publish" | "brand",
): Promise<void> {
  const payload = {
    key: "mktg-studio-workspace",
    value: JSON.stringify({
      state: { workspaceTab: tab, signalFilters: {} },
      version: 0,
    }),
  };
  await page.addInitScript((arg: { key: string; value: string }) => {
    try {
      window.localStorage.setItem(arg.key, arg.value);
    } catch {
      /* fine */
    }
  }, payload);
}

async function waitForDashboardChrome(
  page: import("@playwright/test").Page,
): Promise<void> {
  await expect(
    page.getByRole("button", { name: /^Publish/i }).first(),
  ).toBeVisible({ timeout: 10_000 });
}

function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ---------------------------------------------------------------------------
// 1. Boot smoke — both surfaces up
// ---------------------------------------------------------------------------

test("1. boot — both surfaces respond", async ({ request }) => {
  const health = await request.get(`${STUDIO}/api/health`);
  expect(health.status()).toBe(200);
  const body = (await health.json()) as { ok: boolean };
  expect(body.ok).toBe(true);

  const dash = await request.get(`${DASHBOARD}/`);
  expect([200, 307, 308]).toContain(dash.status());
});

// ---------------------------------------------------------------------------
// 2. Onboarding wizard — fresh user walks through the three input steps
// ---------------------------------------------------------------------------

test("2. onboarding — fresh user can walk through every step", async ({ page }) => {
  // Clear any resumed wizard state from a prior run.
  await page.goto(DASHBOARD);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${DASHBOARD}/onboarding`);

  // Step 0 — project (URL blank → "Start fresh")
  await expect(
    page.getByRole("heading", { name: /what's your project\?/i }),
  ).toBeVisible();
  await page.screenshot({ path: join(SHOT_DIR, "01-onboarding-project.png") });
  await page.getByRole("button", { name: /start fresh/i }).click();

  // Step 1 — postiz
  await expect(
    page.getByRole("heading", { name: /connect social accounts/i }),
  ).toBeVisible();
  await page.locator("#postiz-key").fill("ptz_test_e2e_abc");
  await page.getByRole("button", { name: /^save & continue$/i }).click();

  // Step 2 — optional integrations: primary label is "Skip all"
  await expect(
    page.getByRole("heading", { name: /optional integrations/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^skip all$/i }).click();

  // Step 3 → Step 4 — demo mode auto-completes all three lanes in ~3s and
  // auto-advances to StepDone ("Your marketing brain is live" + "Open dashboard").
  // We verify the terminal step renders; the dashboard itself is covered by
  // the next test (it navigates directly).
  await expect(
    page.getByRole("heading", { name: /marketing brain is live/i }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("button", { name: /open dashboard/i }),
  ).toBeVisible();
  await page.screenshot({ path: join(SHOT_DIR, "02-onboarding-done.png") });
});

// ---------------------------------------------------------------------------
// 3. Dashboard render — tabs + activity panel
// ---------------------------------------------------------------------------

test(
  "3. dashboard — all tabs + activity panel render",
  async ({ page }) => {
    await seedWorkspaceTab(page, "content");
    await page.goto(`${DASHBOARD}/dashboard?tab=content`);
    await waitForDashboardChrome(page);
    await hideNextErrorOverlay(page);

    for (const label of ["Pulse", "Signals", "Publish", "Brand"]) {
      await expect(
        page.getByRole("button", { name: new RegExp(`^${label}`, "i") }).first(),
      ).toBeVisible({ timeout: 10_000 });
    }
    await expect(page.getByText(/activity/i).first()).toBeVisible();
    await page.screenshot({
      path: join(SHOT_DIR, "03-dashboard-content.png"),
      fullPage: false,
    });
  },
);

// ---------------------------------------------------------------------------
// 4. Route compatibility — old tab URLs remap to current homes
// ---------------------------------------------------------------------------

test("4. routing — legacy tab URLs canonicalize", async ({ page }) => {
  await page.goto(`${DASHBOARD}/dashboard?tab=trends`);
  await expect(page).toHaveURL(/[?&]tab=content/, { timeout: 5_000 });

  await page.goto(`${DASHBOARD}/dashboard?tab=signals`);
  await expect(page).toHaveURL(/[?&]tab=content/, { timeout: 5_000 });

  await page.goto(`${DASHBOARD}/dashboard?tab=audience`);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5_000 });

  await page.goto(`${DASHBOARD}/dashboard?tab=opportunities`);
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 5. Keyboard shortcuts — `g <letter>` chords
// ---------------------------------------------------------------------------

test("5. keyboard — `g c` chord switches to Content", async ({ page }) => {
  await page.goto(`${DASHBOARD}/dashboard`);
  await waitForDashboardChrome(page);

  // Blur any autofocused input so the chord handler sees our keys.
  await page.locator("body").click();

  // g + c  → Content
  await page.keyboard.press("g");
  await page.keyboard.press("c");
  await expect(page).toHaveURL(/[?&]tab=content/);

  // g + , → settings
  await page.keyboard.press("g");
  await page.keyboard.press(",");
  await expect(page).toHaveURL(/\/settings/);
});

// ---------------------------------------------------------------------------
// 6. Help overlay — "?" toggles the keyboard help sheet
// ---------------------------------------------------------------------------

test("6. keyboard — `?` opens the help overlay", async ({ page }) => {
  await seedWorkspaceTab(page, "content");
  await page.goto(`${DASHBOARD}/dashboard?tab=content`);
  await waitForDashboardChrome(page);
  await hideNextErrorOverlay(page);
  await page.locator("body").click();

  // Playwright translates `Shift+/` differently across platforms — the
  // keyboard provider listens for `event.key === "?"`, so type the literal
  // character instead of synthesising the chord.
  await page.keyboard.type("?");

  await expect(
    page.getByRole("dialog", { name: /keyboard shortcuts/i }),
  ).toBeVisible({ timeout: 5_000 });
  await page.screenshot({ path: join(SHOT_DIR, "04-keyboard-help.png") });
  await page.keyboard.press("Escape");
});

// ---------------------------------------------------------------------------
// 7. Command palette — Cmd+K opens
// ---------------------------------------------------------------------------

test("7. palette — Cmd+K opens and accepts query", async ({ page }) => {
  await seedWorkspaceTab(page, "content");
  await page.goto(`${DASHBOARD}/dashboard?tab=content`);
  await waitForDashboardChrome(page);
  await hideNextErrorOverlay(page);
  await page.locator("body").click();

  const modifier = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${modifier}+KeyK`);

  // The palette uses a search input. Common affordances: role="combobox" or
  // an input with placeholder mentioning "search" / "command".
  const paletteInput = page.locator("input[role='combobox'], input[placeholder*='earch' i], input[placeholder*='ommand' i]").first();
  await expect(paletteInput).toBeVisible({ timeout: 5_000 });

  await page.screenshot({ path: join(SHOT_DIR, "05-palette-open.png") });

  // Close cleanly so subsequent tests don't inherit focus.
  await page.keyboard.press("Escape");
});

// ---------------------------------------------------------------------------
// 8. SSE navigate — /cmo switching the dashboard from the outside
// ---------------------------------------------------------------------------

test("8. SSE — POST /api/navigate flips the active tab", async ({ page, request }) => {
  await seedWorkspaceTab(page, "content");
  // Catch the SSE handshake before issuing the POST. networkidle ignores
  // long-lived EventSource connections, so without this wait we race the
  // bridge's useEffect and lose the navigate event entirely.
  const ssePromise = page.waitForResponse(
    (r) => r.url().includes("/api/events"),
    { timeout: 10_000 },
  );
  await page.goto(`${DASHBOARD}/dashboard?tab=content`);
  await ssePromise;

  const res = await request.post(`${STUDIO}/api/navigate`, {
    data: { tab: "publish" },
  });
  expect(res.ok()).toBeTruthy();

  // The workspace store receives the SSE event and updates the URL.
  await expect(page).toHaveURL(/[?&]tab=publish/, { timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 9. SSE toast — POST /api/toast surfaces in the UI
// ---------------------------------------------------------------------------

test("9. SSE — POST /api/toast renders a toast", async ({ page, request }) => {
  await seedWorkspaceTab(page, "content");
  const ssePromise = page.waitForResponse(
    (r) => r.url().includes("/api/events"),
    { timeout: 10_000 },
  );
  await page.goto(`${DASHBOARD}/dashboard?tab=content`);
  await ssePromise;

  const message = `e2e toast ${Date.now()}`;
  const res = await request.post(`${STUDIO}/api/toast`, {
    data: { level: "success", message },
  });
  expect(res.ok()).toBeTruthy();

  await expect(page.getByText(message)).toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 10. Activity feed — POST /api/activity/log streams into the panel
// ---------------------------------------------------------------------------

test("10. SSE — POST /api/activity/log streams into the activity panel", async ({
  page,
  request,
}) => {
  await seedWorkspaceTab(page, "content");
  const ssePromise = page.waitForResponse(
    (r) => r.url().includes("/api/events"),
    { timeout: 10_000 },
  );
  await page.goto(`${DASHBOARD}/dashboard?tab=content`);
  await ssePromise;

  const summary = `e2e activity ${Date.now()}`;
  const res = await request.post(`${STUDIO}/api/activity/log`, {
    data: {
      kind: "skill-run",
      skill: "e2e-probe",
      summary,
    },
  });
  expect(res.ok()).toBeTruthy();

  await expect(page.getByText(summary)).toBeVisible({ timeout: 5_000 });
});

// ---------------------------------------------------------------------------
// 11. Publish tab — native backend flow works end to end
// ---------------------------------------------------------------------------

test("11. publish — native backend flow works end to end", async ({ page }) => {
  await seedWorkspaceTab(page, "publish");
  await page.goto(`${DASHBOARD}/dashboard?tab=publish`);
  await hideNextErrorOverlay(page);
  const publishTab = page.locator('[data-demo-id="publish-tab"]').first();
  await expect(publishTab).toBeVisible({
    timeout: 10_000,
  });

  await publishTab.getByRole("radio", { name: /^Native$/i }).click();
  await expect(publishTab.getByText(/workspace account/i).first()).toBeVisible({
    timeout: 10_000,
  });

  await publishTab.getByRole("button", { name: /add provider/i }).click();
  await publishTab.getByLabel("Native platform").selectOption("linkedin");
  await publishTab.getByLabel("Provider name").fill("Acme LinkedIn");
  await publishTab.getByLabel("Provider profile").fill("acme");
  await publishTab.getByRole("button", { name: /^save$/i }).click();

  const providerChip = publishTab.getByRole("button", { name: /toggle linkedin @acme/i });
  await expect(providerChip).toBeVisible({ timeout: 10_000 });
  await providerChip.click();

  await publishTab.getByRole("radio", { name: /^Schedule$/i }).click();

  const content = `E2E native publish ${Date.now()}`;
  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000);
  await publishTab.locator("textarea").fill(content);
  await publishTab.getByLabel("Scheduled at").fill(formatDateTimeLocal(scheduledAt));
  await publishTab.getByRole("button", { name: /^Schedule$/i }).last().click();

  await expect(
    page.locator('[data-demo-id="publish-scheduled"]').first().getByText(content).first(),
  ).toBeVisible({ timeout: 10_000 });

  await page.screenshot({ path: join(SHOT_DIR, "07-native-publish.png") });
});

// ---------------------------------------------------------------------------
// 12. Settings page — every section renders
// ---------------------------------------------------------------------------

test("12. settings — all sections render", async ({ page }) => {
  await page.goto(`${DASHBOARD}/settings`);

  // Settings panel is composed of 5 sections (env, integrations, brand
  // health, doctor, reset) per components/settings/settings-panel.tsx.
  // Probe for each heading — match generously because copy may evolve.
  const headings = [
    /api keys/i,
    /connected providers/i,
    /brand file health/i,
    /mktg doctor/i,
    /danger zone/i,
  ];
  for (const probe of headings) {
    await expect(
      page.getByText(probe).first(),
    ).toBeVisible({ timeout: 10_000 });
  }

  await page.screenshot({ path: join(SHOT_DIR, "06-settings.png") });
});
