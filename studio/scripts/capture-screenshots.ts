#!/usr/bin/env bun
/**
 * Screenshot capture for docs/screenshots/.
 *
 * Prereq:
 *   bun run scripts/seed-demo.ts     # so dashboard has data
 *   bun run server.ts                # Bun API on :3001
 *   PORT=3012 bun run dev            # Next.js on :3012
 *
 * Usage:
 *   STUDIO_URL=http://localhost:3012 bun run scripts/capture-screenshots.ts
 *
 * Emits PNG files at 1440x900 @ 2x scale. Dark theme by default; a light
 * counterpart is captured for dashboard-pulse.
 */

import { chromium, type Page } from "playwright"
import path from "node:path"
import { mkdirSync, existsSync } from "node:fs"

const BASE_URL = process.env.STUDIO_URL ?? "http://localhost:3012"
const OUT_DIR = path.join(process.cwd(), "docs", "screenshots")
const VIEWPORT = { width: 1440, height: 900 }
const DEVICE_SCALE_FACTOR = 2

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

function log(msg: string) {
  console.log(`[capture] ${msg}`)
}

async function setTheme(page: Page, theme: "dark" | "light") {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("mktg-studio-theme", t)
    } catch {}
  }, theme)
}

async function hideScrollbars(page: Page) {
  await page.addStyleTag({
    content: `
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
    `,
  })
}

async function waitForReady(page: Page, label: string) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {
    log(`${label}: networkidle timed out — continuing anyway`)
  })
  // Give SWR and framer-motion a beat to settle
  await page.waitForTimeout(800)
}

async function shot(page: Page, name: string) {
  const file = path.join(OUT_DIR, name)
  await page.screenshot({ path: file, fullPage: false })
  log(`wrote ${name}`)
}

async function main() {
  log(`Base URL: ${BASE_URL}`)
  log(`Out dir:  ${OUT_DIR}`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: "dark",
  })

  // Dark-theme preflight: one page to set localStorage before any nav
  const page = await context.newPage()
  await setTheme(page, "dark")

  // 1 — onboarding step 1 (project URL)
  await page.goto(`${BASE_URL}/onboarding`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await waitForReady(page, "onboarding")
  await shot(page, "onboarding-step-1-project.png")

  // 2 — onboarding step 4 (foundation lanes) via demo mode
  // We can't force the wizard state without walking — instead navigate with a
  // localStorage shortcut that pre-fills earlier steps.
  await page.evaluate(() => {
    try {
      localStorage.setItem(
        "mktg-studio:onboarding",
        JSON.stringify({ step: 3, url: "https://parallel.example", postizKey: "", postizBase: "https://api.postiz.com" }),
      )
    } catch {}
  })
  // Enable demo stream so the lanes animate without a real server call
  await page.evaluate(() => {
    try {
      ;(window as unknown as Record<string, unknown>).__demo = true
    } catch {}
  })
  await page.goto(`${BASE_URL}/onboarding`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await page.waitForTimeout(1600) // let queued/running kick in
  await shot(page, "onboarding-step-4-foundation.png")

  // 3 — onboarding step 5 (done)
  await page.evaluate(() => {
    try {
      localStorage.setItem(
        "mktg-studio:onboarding",
        JSON.stringify({ step: 4, url: "https://parallel.example", postizKey: "", postizBase: "https://api.postiz.com" }),
      )
    } catch {}
  })
  await page.goto(`${BASE_URL}/onboarding`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await waitForReady(page, "onboarding step 5")
  await shot(page, "onboarding-step-5-done.png")

  // 4 — dashboard Pulse
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await waitForReady(page, "dashboard pulse")
  await shot(page, "dashboard-pulse.png")

  // 5 — dashboard Signals
  await page.goto(`${BASE_URL}/dashboard?tab=signals`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await waitForReady(page, "dashboard signals")
  await shot(page, "dashboard-signals.png")

  // 5b — dashboard Trends
  await page.goto(`${BASE_URL}/dashboard?tab=trends`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await waitForReady(page, "dashboard trends")
  await shot(page, "dashboard-trends.png")

  // 5c — dashboard Audience
  await page.goto(`${BASE_URL}/dashboard?tab=audience`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await waitForReady(page, "dashboard audience")
  await shot(page, "dashboard-audience.png")

  // 5d — dashboard Opportunities
  await page.goto(`${BASE_URL}/dashboard?tab=opportunities`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await waitForReady(page, "dashboard opportunities")
  await shot(page, "dashboard-opportunities.png")

  // 6 — dashboard Publish
  await page.goto(`${BASE_URL}/dashboard?tab=publish`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await waitForReady(page, "dashboard publish")
  await shot(page, "dashboard-publish.png")

  // 7 — command palette open. Try Meta+K (macOS) and fall back to Control+K.
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await waitForReady(page, "dashboard for palette")
  await page.keyboard.press("Meta+KeyK")
  await page.waitForTimeout(300)
  // If the palette didn't open (headless Linux Chromium ignores Meta),
  // send Control+K as a fallback.
  let paletteOpen = await page.locator('[cmdk-root]').count()
  if (!paletteOpen) {
    await page.keyboard.press("Control+KeyK")
    await page.waitForTimeout(300)
    paletteOpen = await page.locator('[cmdk-root]').count()
  }
  await page.waitForTimeout(200)
  await shot(page, "command-palette-open.png")
  if (paletteOpen) await page.keyboard.press("Escape")

  // 8 — keyboard help (?). Dispatch the `?` keydown directly rather than
  // relying on Shift+Slash, which Playwright translates unpredictably.
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }))
  })
  await page.waitForTimeout(500)
  await shot(page, "keyboard-help.png")
  await page.keyboard.press("Escape")

  // 9 — settings
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await waitForReady(page, "settings")
  await shot(page, "settings.png")

  // 10 — activity panel stream (full dashboard, zoomed-right crop would be nice
  // but Playwright doesn't crop natively — take full and let README crop)
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await waitForReady(page, "activity panel")
  await shot(page, "activity-panel-stream.png")

  await page.close()

  // Light-theme counterpart for Pulse
  const lightContext = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: "light",
  })
  const lightPage = await lightContext.newPage()
  await setTheme(lightPage, "light")
  await lightPage.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(lightPage)
  await waitForReady(lightPage, "dashboard pulse light")
  await shot(lightPage, "dashboard-pulse-light.png")

  await browser.close()
  log("Done.")
}

main().catch((err) => {
  console.error("[capture] Failed:", err)
  process.exit(1)
})
