#!/usr/bin/env bun
/**
 * Hero screenshot set for README / launch assets.
 *
 * 1920×1080 @ 2x scale, dark theme. Real Playwright against the live
 * Next.js dev + Bun API stack. Saves to `docs/screenshots/hero-*.png`.
 *
 * Prereqs:
 *   bun run scripts/seed-demo.ts   (populate SQLite so Activity streams)
 *   bun run server.ts              (Bun API on :3001)
 *   PORT=3012 bun run dev          (Next.js on :3012)
 *
 * Usage:
 *   STUDIO_URL=http://localhost:3012 bun run scripts/capture-hero.ts
 */

import { chromium, type Page } from "playwright"
import path from "node:path"

const BASE_URL = process.env.STUDIO_URL ?? "http://localhost:3012"
const OUT_DIR = path.join(process.cwd(), "docs", "screenshots")
const VIEWPORT = { width: 1920, height: 1080 }
const DEVICE_SCALE_FACTOR = 2

function log(msg: string) {
  console.log(`[hero] ${msg}`)
}

async function hideScrollbars(page: Page) {
  await page.addStyleTag({
    content: `
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
    `,
  })
}

async function settle(page: Page, label: string, extraMs = 0) {
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => {
    log(`${label}: networkidle timed out — continuing`)
  })
  await page.waitForTimeout(1200 + extraMs)
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: false })
  log(`wrote ${name}`)
}

async function pressChord(page: Page, ...keys: string[]) {
  for (const key of keys) {
    await page.keyboard.press(key)
    await page.waitForTimeout(100)
  }
}

async function main() {
  log(`Base:  ${BASE_URL}`)
  log(`Out:   ${OUT_DIR}`)
  log(`View:  ${VIEWPORT.width}×${VIEWPORT.height} @${DEVICE_SCALE_FACTOR}x`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    colorScheme: "dark",
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    try {
      localStorage.setItem("mktg-studio-theme", "dark")
    } catch {}
  })

  // hero-01 — onboarding step 4. Needs either a live foundation runner
  // or NEXT_PUBLIC_STUDIO_DEMO=1 at Next.js build time. If the lanes are all
  // "Waiting" we still capture the frame — it's honest.
  await page.evaluate(() => {
    try {
      localStorage.setItem(
        "mktg-studio:onboarding",
        JSON.stringify({
          step: 3,
          url: "https://parallel.example",
          postizKey: "",
          postizBase: "https://api.postiz.com",
          firecrawlKey: "",
          exaKey: "",
          resendKey: "",
        }),
      )
    } catch {}
  })
  await page.goto(`${BASE_URL}/onboarding`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  // Mid-animation — give /cmo a second or two to emit queued → running events
  await page.waitForTimeout(1800)
  await shot(page, "hero-01-onboarding.png")

  // hero-02 — dashboard Pulse (the hero shot).
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await settle(page, "pulse", 600)
  await shot(page, "hero-02-dashboard.png")

  // hero-03 — Brand editor, voice-profile.md open, split view.
  await page.goto(`${BASE_URL}/dashboard?tab=brand`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await settle(page, "brand-shell")
  // Click "Voice profile" in the file list
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Voice profile"),
    )
    btn?.click()
  })
  await page.waitForTimeout(1600)
  await shot(page, "hero-03-brand-editor.png")

  // hero-04 — Cmd+K palette open. Meta+KeyK with Control+KeyK fallback.
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await settle(page, "palette-prep")
  await pressChord(page, "Meta+KeyK")
  const paletteOpen = await page.locator("[cmdk-root]").count()
  if (!paletteOpen) await pressChord(page, "Control+KeyK")
  await page.waitForTimeout(500)
  await shot(page, "hero-04-palette.png")
  await pressChord(page, "Escape")

  // hero-05 — Publish tab.
  await page.goto(`${BASE_URL}/dashboard?tab=publish`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await settle(page, "publish")
  await shot(page, "hero-05-publish.png")

  // hero-06 — Settings page (API keys + dots).
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await settle(page, "settings")
  await shot(page, "hero-06-settings.png")

  // hero-07 — Activity panel standalone. Full dashboard with seeded activity
  // streaming. The activity stream is on the right; full-viewport capture so
  // README can crop or full-frame it.
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
  await hideScrollbars(page)
  await settle(page, "activity", 2400)
  await shot(page, "hero-07-activity.png")

  await browser.close()
  log("Done.")
}

main().catch((err) => {
  console.error("[hero] Failed:", err)
  process.exit(1)
})
