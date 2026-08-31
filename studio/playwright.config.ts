// playwright.config.ts — minimal Chromium-only config for the E2E walkthrough.
//
// The runner spins up a fresh Bun API server + Next.js dev on scratch ports
// via globalSetup so the test file doesn't have to — see tests/e2e/global-setup.ts.

import { defineConfig, devices } from "@playwright/test";

const STUDIO_PORT = Number(process.env.E2E_STUDIO_PORT ?? "4801");
const DASHBOARD_PORT = Number(process.env.E2E_DASHBOARD_PORT ?? "4800");
const NATIVE_WEBMCP_BROWSER = process.env.WEBMCP_NATIVE_CHROMIUM;

export default defineConfig({
  testDir: "./tests/e2e",
  // Match .e2e.ts (not .spec.ts) so bun test discovery doesn't pick up
  // Playwright files and crash with "test.describe.configure not allowed".
  testMatch: /.*\.e2e\.ts$/,
  // The chrome visual lane owns two private Next stacks. `test:e2e` runs it
  // separately so those stacks never compete with the shared suite server.
  testIgnore: process.env.E2E_SKIP_CHROME ? /chrome\/chrome\.e2e\.ts$/ : undefined,
  // Cold Turbopack compilation and spec-local server boot both count toward
  // the test budget on fresh CI/orb caches.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // the server + next are a shared resource in globalSetup
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",

  use: {
    baseURL: `http://127.0.0.1:${DASHBOARD_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    extraHTTPHeaders: {
      // Surface the scratch studio port to tests that need to hit the API
      // directly via request.
      "x-studio-port": String(STUDIO_PORT),
    },
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(NATIVE_WEBMCP_BROWSER
          ? {
              headless: false,
              launchOptions: {
                executablePath: NATIVE_WEBMCP_BROWSER,
                args: ["--enable-features=WebMCPTesting"],
              },
            }
          : {}),
      },
    },
  ],
});

export { STUDIO_PORT, DASHBOARD_PORT };
