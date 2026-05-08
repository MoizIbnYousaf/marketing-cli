// playwright.lane3.config.ts — chrome-lane (Lane 3) Playwright config.
//
// Runs ONLY tests/e2e/chrome/*.e2e.ts. Skips the shared globalSetup so this
// suite owns its own server lifecycle (booted in test.beforeAll inside the
// spec). This insulates the chrome lane from cross-suite PID-file collisions
// observed when multiple E2E lanes share the default 4800/4801 ports.

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e/chrome",
  testMatch: /.*\.e2e\.ts$/,
  timeout: 240_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-lane3", open: "never" }],
  ],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
