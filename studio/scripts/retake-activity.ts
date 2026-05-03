#!/usr/bin/env bun
/** Retake just the activity-panel-stream screenshot after the full sequence
 *  sometimes captures the dashboard mid-recompile. Loads /dashboard with a
 *  longer settle window so the SSE stream has time to populate. */

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
  try { localStorage.setItem("mktg-studio-theme", "dark") } catch {}
})

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" })
await page.addStyleTag({ content: `::-webkit-scrollbar{display:none!important}*{scrollbar-width:none!important}` })
// Let SSE + SWR settle. The activity panel opens its own EventSource and
// needs a moment to populate from `/api/activity?limit=50` + live events.
await page.waitForTimeout(3500)
await page.screenshot({ path: path.join(OUT, "activity-panel-stream.png"), fullPage: false })
console.log("[retake] wrote activity-panel-stream.png")
await browser.close()
