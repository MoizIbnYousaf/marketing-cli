#!/usr/bin/env bun
/**
 * Retake the 3 shots affected by the Opportunities hook-order bug:
 * dashboard-opportunities, command-palette-open, keyboard-help.
 *
 * Run after the fix in components/workspace/opportunities-tab.tsx has reloaded.
 */
import { chromium, type Page } from "playwright"
import path from "node:path"

const BASE_URL = process.env.STUDIO_URL ?? "http://localhost:3012"
const OUT_DIR = path.join(process.cwd(), "docs", "screenshots")
const VIEWPORT = { width: 1440, height: 900 }

async function hideScrollbars(page: Page) {
  await page.addStyleTag({
    content: `::-webkit-scrollbar { display: none !important; } * { scrollbar-width: none !important; }`,
  })
}

async function waitReady(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(1200)
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  colorScheme: "dark",
})
const page = await ctx.newPage()
await page.addInitScript(() => {
  try { localStorage.setItem("mktg-studio-theme", "dark") } catch {}
})

await page.goto(`${BASE_URL}/dashboard?tab=opportunities`, { waitUntil: "domcontentloaded" })
await hideScrollbars(page)
await waitReady(page)
await page.screenshot({ path: path.join(OUT_DIR, "dashboard-opportunities.png") })
console.log("[retake] dashboard-opportunities.png")

await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
await hideScrollbars(page)
await waitReady(page)
await page.keyboard.press("Meta+KeyK")
await page.waitForTimeout(300)
let openCount = await page.locator('[cmdk-root]').count()
if (!openCount) {
  await page.keyboard.press("Control+KeyK")
  await page.waitForTimeout(300)
}
await page.waitForTimeout(200)
await page.screenshot({ path: path.join(OUT_DIR, "command-palette-open.png") })
console.log("[retake] command-palette-open.png")
await page.keyboard.press("Escape")

await page.waitForTimeout(300)
await page.evaluate(() => {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }))
})
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(OUT_DIR, "keyboard-help.png") })
console.log("[retake] keyboard-help.png")

await browser.close()
console.log("[retake] Done.")
