#!/usr/bin/env bun
import { chromium } from "playwright";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const SHOT = path.join(import.meta.dir, "..", "docs", "screenshots");
await mkdir(SHOT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

for (const tab of ["pulse", "signals", "brand", "opportunities"] as const) {
  const url = tab === "pulse" ? "http://localhost:3000/dashboard" : `http://localhost:3000/dashboard?tab=${tab}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  // Wait long enough for SWR fetch + Framer entrance animation to fully settle.
  await page.waitForTimeout(3500);
  const file = path.join(SHOT, `recheck-mobile-${tab}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`shot: ${path.relative(process.cwd(), file)}`);
}

await browser.close();
