#!/usr/bin/env bun
/**
 * Live walkthrough — drives the running dashboard (localhost:3000) and Bun
 * server (localhost:3001) with Playwright, takes a screenshot of every
 * surface, and exercises the brand editor + 5-verb /cmo loop end to end.
 *
 * Output: docs/screenshots/livetest-<step>.png
 *
 * Run:    bun run scripts/livetest-walkthrough.ts
 */

import { chromium, type Page } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DASHBOARD = "http://localhost:3000";
const STUDIO = "http://localhost:3001";
const SHOT_DIR = path.join(import.meta.dir, "..", "docs", "screenshots");
const PREFIX = "livetest";

const TABS = ["pulse", "trends", "signals", "audience", "opportunities", "publish", "brand"] as const;

interface StepResult {
  step: string;
  ok: boolean;
  detail?: string;
  screenshot?: string;
  consoleErrors: string[];
}

const results: StepResult[] = [];

async function shoot(page: Page, name: string): Promise<string> {
  const file = path.join(SHOT_DIR, `${PREFIX}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return path.relative(process.cwd(), file);
}

async function step(name: string, fn: () => Promise<{ detail?: string; screenshot?: string; consoleErrors?: string[] }>): Promise<void> {
  process.stdout.write(`▸ ${name} `);
  try {
    const r = await fn();
    results.push({ step: name, ok: true, ...r, consoleErrors: r.consoleErrors ?? [] });
    console.log("✓");
  } catch (e) {
    results.push({ step: name, ok: false, detail: String(e), consoleErrors: [] });
    console.log(`✗ ${e}`);
  }
}

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });

  console.log(`\n[livetest] Dashboard: ${DASHBOARD}`);
  console.log(`[livetest] Studio:    ${STUDIO}`);
  console.log(`[livetest] Screenshots → ${path.relative(process.cwd(), SHOT_DIR)}/${PREFIX}-*.png\n`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

  // ----- Phase A: boot -----
  await step("boot — open /dashboard", async () => {
    await page.goto(`${DASHBOARD}/dashboard`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.waitForTimeout(800);
    return { screenshot: await shoot(page, "00-boot") };
  });

  // ----- Phase B: walk every tab desktop -----
  for (let i = 0; i < TABS.length; i++) {
    const tab = TABS[i];
    await step(`tab — ${tab} (desktop 1440px)`, async () => {
      const url = tab === "pulse" ? `${DASHBOARD}/dashboard` : `${DASHBOARD}/dashboard?tab=${tab}`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
      await page.waitForTimeout(600);
      const screenshot = await shoot(page, `tab-${String(i + 1).padStart(2, "0")}-${tab}`);
      const errs = consoleErrors.splice(0).filter((e) => !e.includes("hydration") && !e.includes("Hydration"));
      return { screenshot, consoleErrors: errs };
    });
  }

  // ----- Phase C: brand editor surface -----
  await step("brand — open Voice profile editor", async () => {
    await page.goto(`${DASHBOARD}/dashboard?tab=brand`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    // Click the Voice profile card (or first brand doc).
    const voice = page.getByText("Voice profile").first();
    if (await voice.isVisible({ timeout: 3000 }).catch(() => false)) {
      await voice.click();
      await page.waitForTimeout(400);
    }
    return { screenshot: await shoot(page, "brand-01-voice-open") };
  });

  // ----- Phase D: 5-verb /cmo loop with dashboard reaction -----
  await step("/cmo verb — POST /api/activity/log", async () => {
    await page.goto(`${DASHBOARD}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    // Fire from terminal via fetch API on the page itself (same origin via Next rewrites)
    const r = await page.evaluate(async () => {
      const res = await fetch("/api/activity/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "skill-run",
          skill: "cmo",
          summary: "livetest — Phase D activity log",
        }),
      });
      return res.json();
    });
    await page.waitForTimeout(700);
    return { detail: JSON.stringify(r).slice(0, 200), screenshot: await shoot(page, "verb-01-activity") };
  });

  await step("/cmo verb — POST /api/toast (success)", async () => {
    const r = await page.evaluate(async () => {
      const res = await fetch("/api/toast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ level: "success", message: "livetest toast — alive ✓" }),
      });
      return res.json();
    });
    await page.waitForTimeout(900);
    return { detail: JSON.stringify(r).slice(0, 200), screenshot: await shoot(page, "verb-02-toast") };
  });

  await step("/cmo verb — POST /api/navigate (trends)", async () => {
    const r = await page.evaluate(async () => {
      const res = await fetch("/api/navigate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tab: "trends" }),
      });
      return res.json();
    });
    await page.waitForTimeout(900);
    return { detail: `${JSON.stringify(r)} → URL=${page.url()}`, screenshot: await shoot(page, "verb-03-navigate-trends") };
  });

  await step("/cmo verb — POST /api/opportunities/push", async () => {
    const r = await page.evaluate(async () => {
      const res = await fetch("/api/opportunities/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          skill: "positioning-angles",
          reason: "livetest opportunity — should appear in Opportunities tab",
          priority: 88,
        }),
      });
      return res.json();
    });
    // Switch to Opportunities tab to capture
    await page.goto(`${DASHBOARD}/dashboard?tab=opportunities`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    return { detail: JSON.stringify(r).slice(0, 200), screenshot: await shoot(page, "verb-04-opportunity-tab") };
  });

  // ----- Phase E: bad input → BAD_INPUT envelope -----
  await step("error — BAD_INPUT on bogus kind", async () => {
    const r = await page.evaluate(async () => {
      const res = await fetch("/api/activity/log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "TOTALLY_FAKE", summary: "should fail" }),
      });
      return { status: res.status, body: await res.json() };
    });
    return { detail: JSON.stringify(r).slice(0, 280) };
  });

  // ----- Phase F: mobile viewport -----
  await step("responsive — mobile 390px walk", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${DASHBOARD}/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);
    return { screenshot: await shoot(page, "mobile-01-pulse") };
  });

  for (const tab of ["signals", "brand"] as const) {
    await step(`responsive — mobile ${tab}`, async () => {
      await page.goto(`${DASHBOARD}/dashboard?tab=${tab}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(600);
      return { screenshot: await shoot(page, `mobile-02-${tab}`) };
    });
  }

  // ----- Phase G: SSE persistence -----
  await step("sse — subscriber count after full walk", async () => {
    const r = await page.evaluate(async () => {
      const res = await fetch("/api/health");
      return res.json();
    });
    return { detail: JSON.stringify(r) };
  });

  await browser.close();

  // ----- Report -----
  console.log("\n══════ Results ══════");
  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    const errs = r.consoleErrors.length > 0 ? ` [${r.consoleErrors.length} console errs]` : "";
    console.log(`  ${icon}  ${r.step}${errs}`);
    if (r.detail) console.log(`        ↳ ${r.detail}`);
    if (r.screenshot) console.log(`        📸 ${r.screenshot}`);
    if (r.consoleErrors.length > 0) {
      for (const e of r.consoleErrors.slice(0, 3)) console.log(`        ⚠  ${e.slice(0, 200)}`);
    }
  }

  // JSON report
  const reportPath = path.join(SHOT_DIR, `${PREFIX}-report.json`);
  await writeFile(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nFull JSON: ${path.relative(process.cwd(), reportPath)}`);

  const failed = results.filter((r) => !r.ok).length;
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
