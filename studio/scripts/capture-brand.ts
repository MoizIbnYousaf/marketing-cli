#!/usr/bin/env bun
/** Capture the Brand tab in three states for README/docs.
 *
 * Prereqs:
 *   bun run scripts/seed-demo.ts
 *   bun run server.ts              # :3001
 *   PORT=3012 bun run dev          # :3012
 */

import { chromium } from "playwright"
import path from "node:path"

const BASE = process.env.STUDIO_URL ?? "http://localhost:3012"
const OUT = path.join(process.cwd(), "docs", "screenshots")

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
})
const page = await ctx.newPage()
await page.addInitScript(() => {
  try {
    localStorage.setItem("mktg-studio-theme", "dark")
  } catch {}
})
const hide = `::-webkit-scrollbar{display:none!important}*{scrollbar-width:none!important}`

// 1 — Brand tab empty state
await page.goto(`${BASE}/dashboard?tab=brand`, { waitUntil: "domcontentloaded" })
await page.addStyleTag({ content: hide })
await page.waitForTimeout(2000)
await page.screenshot({ path: path.join(OUT, "brand-empty-state.png") })
console.log("[brand-capture] wrote brand-empty-state.png")

// 2 — Brand tab with voice-profile.md open
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find(
    (b) => b.textContent?.includes("Voice profile") || b.textContent?.includes("voice-profile"),
  )
  btn?.click()
})
await page.waitForTimeout(1600)
await page.screenshot({ path: path.join(OUT, "brand-voice-profile-editing.png") })
console.log("[brand-capture] wrote brand-voice-profile-editing.png")

// 3 — Brand tab raw mode
await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button")).find((b) =>
    b.textContent?.trim().startsWith("Raw"),
  )
  btn?.click()
})
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(OUT, "brand-raw-mode.png") })
console.log("[brand-capture] wrote brand-raw-mode.png")

await browser.close()
