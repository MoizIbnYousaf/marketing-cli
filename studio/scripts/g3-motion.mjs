// G3 -- measure animation durations with performance.now() on the live dashboard.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(SCRIPT_DIR, "..", "docs", "screenshots", "g3-motion");
fs.mkdirSync(OUT, { recursive: true });

const measurements = [];

async function measure(page, label, triggerFn, selectorToWatch) {
  const t0 = await page.evaluate(() => performance.now());
  await triggerFn();
  // Wait for the animation to settle via Web Animations API
  const duration = await page.evaluate(async (sel) => {
    const start = performance.now();
    const deadline = start + 2000;
    let el;
    while (!el && performance.now() < deadline) {
      el = document.querySelector(sel);
      if (!el) await new Promise((r) => setTimeout(r, 16));
    }
    if (!el) return { error: "no-element", elapsed: performance.now() - start };
    // Wait until no running Web Animations remain on this subtree
    let elapsed = 0;
    const settle = performance.now() + 2000;
    while (performance.now() < settle) {
      const anims = el.getAnimations({ subtree: true });
      const running = anims.filter((a) => a.playState === "running");
      if (running.length === 0 && elapsed > 50) break;
      await new Promise((r) => setTimeout(r, 16));
      elapsed = performance.now() - start;
    }
    return { elapsed, animCount: el.getAnimations({ subtree: true }).length };
  }, selectorToWatch);
  const t1 = await page.evaluate(() => performance.now());
  measurements.push({ label, wall_ms: Math.round(t1 - t0), ...duration });
  console.log(label, JSON.stringify(measurements[measurements.length - 1]));
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // Tab switch Pulse -> Trends
  await measure(page, "tab-switch-pulse-to-trends", async () => {
    await page.getByRole("button", { name: /trends/i }).first().click().catch(() => {});
  }, "[data-demo-id=\"trends-radar\"], [data-demo-id=\"workspace-shell\"]");

  // Tab switch Trends -> Signals
  await measure(page, "tab-switch-trends-to-signals", async () => {
    await page.getByRole("button", { name: /signals/i }).first().click().catch(() => {});
  }, "[data-demo-id=\"workspace-shell\"]");

  // Cmd+K palette (if mounted)
  await measure(page, "cmd-k-palette-open", async () => {
    await page.keyboard.press("Meta+K").catch(() => {});
  }, "[role=\"dialog\"], [cmdk-root]").catch(() => {});

  // Close palette
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(200);

  // Theme toggle
  await measure(page, "theme-toggle", async () => {
    await page.getByRole("button", { name: /(theme|dark|light)/i }).first().click().catch(() => {});
  }, "html").catch(() => {});

  // Reduced-motion re-run
  const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark", reducedMotion: "reduce" });
  const page2 = await ctx2.newPage();
  await page2.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
  await page2.waitForTimeout(1500);

  await measure(page2, "RM-tab-switch-pulse-to-trends", async () => {
    await page2.getByRole("button", { name: /trends/i }).first().click().catch(() => {});
  }, "[data-demo-id=\"workspace-shell\"]");

  // Snapshot running animations on the dashboard (on load)
  const loadAnims = await page.evaluate(() => {
    const anims = document.getAnimations();
    return anims.map((a) => ({
      id: a.id,
      playState: a.playState,
      effect: a.effect?.getTiming?.()?.duration ?? null,
      targetTag: (a.effect?.target?.tagName) ?? null,
    })).slice(0, 40);
  });

  fs.writeFileSync(`${OUT}/measurements.json`, JSON.stringify({ measurements, loadAnims }, null, 2));
  await browser.close();
  console.log("DONE", measurements.length, "measurements");
})();
