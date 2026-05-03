// G4 — force empty / loading / error / populated states with page.route().
//
// Screenshots each tab three times + once populated. Network is mocked
// at the Chromium protocol layer (`page.route("/api/**")`) — the studio
// source code is untouched, so this matches the "no mocks, real browser"
// contract (we're mocking the EXTERNAL network surface only).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(SCRIPT_DIR, "..", "docs", "screenshots", "g4-states");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORT = { width: 1440, height: 900 };

const TARGETS = [
  { id: "pulse", url: "http://localhost:3000/dashboard" },
  { id: "trends", url: "http://localhost:3000/dashboard?tab=trends" },
  { id: "signals", url: "http://localhost:3000/dashboard?tab=signals" },
  { id: "audience", url: "http://localhost:3000/dashboard?tab=audience" },
  { id: "opportunities", url: "http://localhost:3000/dashboard?tab=opportunities" },
  { id: "publish", url: "http://localhost:3000/dashboard?tab=publish" },
  { id: "brand", url: "http://localhost:3000/dashboard?tab=brand" },
  { id: "settings", url: "http://localhost:3000/settings" },
];

// Endpoints the dashboard fetches; everything else passes through.
const API_GLOB = "**/api/**";

const MODES = {
  populated: null, // no interception
  empty: async (route) => {
    const url = route.request().url();
    // Send empty arrays / empty objects shaped to the known responses.
    // Default: empty array for list-shaped endpoints, empty object otherwise.
    if (/\/api\/(signals|activity|brand\/files|pulse\/spike-stack)/.test(url)) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (/\/api\/opportunities/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ opportunities: [], watchItems: [], actions: [] }),
      });
    }
    if (/\/api\/audience/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ profiles: [], platformIntelligence: [], byTheNumbers: [] }),
      });
    }
    if (/\/api\/trends\/feed/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ trending: [], explore: [], hashtag: [], instagram: [], agents: [] }),
      });
    }
    if (/\/api\/trends\/hot-context/.test(url)) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
    }
    if (/\/api\/publish\/(integrations|history|scheduled)/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, adapter: "postiz", data: [] }),
      });
    }
    if (/\/api\/health/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, subscribers: 0 }),
      });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  },
  loading: async (route) => {
    // Artificially stall data endpoints; screenshot is taken before they resolve.
    await new Promise((r) => setTimeout(r, 60_000));
    return route.abort();
  },
  error: async (route) => {
    return route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: { code: "INTERNAL_ERROR", message: "Induced 500 for G4 audit." } }),
    });
  },
};

const report = { captures: [], errors: [] };

(async () => {
  const browser = await chromium.launch();
  for (const [mode, handler] of Object.entries(MODES)) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, colorScheme: "dark" });
    const page = await ctx.newPage();
    if (handler) {
      await page.route(API_GLOB, handler);
    }
    for (const t of TARGETS) {
      const key = `${t.id}-${mode}`;
      const file = path.join(OUT, `${key}.png`);
      try {
        if (mode === "loading") {
          // Navigate but DO NOT await networkidle — screenshot while requests are still in-flight.
          page.goto(t.url, { waitUntil: "commit" }).catch(() => {});
          await page.waitForTimeout(1500);
        } else {
          await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 15000 });
          await page.waitForTimeout(1500);
        }
        await page.screenshot({ path: file, fullPage: true, timeout: 20000 });
        report.captures.push(key);
        console.log("captured", key);
      } catch (e) {
        report.errors.push({ key, err: String(e).slice(0, 200) });
        console.log("failed", key, String(e).slice(0, 120));
      }
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log("DONE", report.captures.length, "captures,", report.errors.length, "errors");
})();
