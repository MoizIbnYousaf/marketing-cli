#!/usr/bin/env bun
/**
 * cmo-loop-capture — long-running Playwright session that snaps the
 * dashboard on demand for the maintainer's /cmo loop audit.
 *
 * Sits on /dashboard with the activity panel visible. Polls
 * /tmp/cmo-step.txt every 200ms; whenever the file content changes, takes a
 * screenshot named docs/screenshots/cmo-loop-{content}.png. Set the content
 * to "done" to gracefully exit.
 *
 * From any other terminal:
 * echo "step1-help" > /tmp/cmo-step.txt
 * echo "step2-activity-landscape-scan" > /tmp/cmo-step.txt
 * ...
 * echo "done" > /tmp/cmo-step.txt
 *
 * Each snap also logs "[capture] snapped <name> at <iso-timestamp>" so the
 * driving terminal sees confirmation.
 */

import { chromium, type Page } from "playwright"
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs"
import path from "node:path"

const BASE_URL = process.env.STUDIO_URL ?? "http://localhost:3012"
const OUT_DIR = path.join(process.cwd(), "docs", "screenshots")
const STEP_FILE = "/tmp/cmo-step.txt"
const VIEWPORT = { width: 1440, height: 900 }
const SCALE = 2

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })
// Reset the step file
writeFileSync(STEP_FILE, "")

function log(msg: string) {
 console.log(`[capture] ${new Date().toISOString()} ${msg}`)
}

async function shot(page: Page, name: string) {
 const file = path.join(OUT_DIR, `cmo-loop-${name}.png`)
 await page.screenshot({ path: file, fullPage: false })
 log(`snapped ${name} → ${file}`)
}

async function main() {
 const browser = await chromium.launch({ headless: true })
 const ctx = await browser.newContext({
 viewport: VIEWPORT,
 deviceScaleFactor: SCALE,
 colorScheme: "dark",
 })
 const page = await ctx.newPage()
 await page.addInitScript(() => {
 try {
 localStorage.setItem("mktg-studio-theme", "dark")
 } catch {}
 })

 // Capture browser-side errors for the audit record.
 const consoleErrors: string[] = []
 page.on("console", (m) => {
 if (m.type() === "error") {
 const t = m.text()
 if (t.includes("favicon") || t.includes("DevTools")) return
 consoleErrors.push(`${new Date().toISOString()} ${t.slice(0, 200)}`)
 }
 })

 log(`opening ${BASE_URL}/dashboard`)
 await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" })
 await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {})
 await page.waitForTimeout(1500)

 // Wait until the page is actually subscribed to /api/events on the server.
 // Without this guard we'd snap a page that *renders* but isn't reactive.
 const apiBase = process.env.STUDIO_API_BASE ?? "http://localhost:3001"
 let subs = 0
 for (let i = 0; i < 20; i++) {
 try {
 const r = await fetch(`${apiBase}/api/health`).then((r) => r.json())
 subs = r.subscribers ?? 0
 if (subs >= 1) break
 } catch {}
 await page.waitForTimeout(300)
 }
 if (subs < 1) {
 log(`WARN — server reports subscribers=${subs} after 6s; SSE bridge may not have connected. Snaps won't reflect live SSE events.`)
 } else {
 log(`SSE confirmed: server reports subscribers=${subs}`)
 }
 log(`ready — poll ${STEP_FILE} for step names`)

 let lastSeen = ""
 let lastMtime = 0

 // eslint-disable-next-line no-constant-condition
 while (true) {
 let content = ""
 try {
 const st = statSync(STEP_FILE)
 if (st.mtimeMs !== lastMtime) {
 lastMtime = st.mtimeMs
 content = readFileSync(STEP_FILE, "utf-8").trim()
 }
 } catch {
 content = ""
 }

 if (content && content !== lastSeen) {
 lastSeen = content
 if (content === "done") {
 log("received 'done' — exiting")
 break
 }
 // Optional URL hint after a colon, e.g.
 // step4-navigate-publish:?tab=publish
 // Lets us reload onto the expected post-action URL (which sidesteps
 // the long-lived-SSE-drops-silently issue by always rendering a
 // fresh page that re-reads the DB).
 let snapName = content
 let urlSuffix: string | null = null
 const colonIx = content.indexOf(":")
 if (colonIx > 0) {
 snapName = content.slice(0, colonIx)
 urlSuffix = content.slice(colonIx + 1)
 }
 try {
 if (urlSuffix !== null) {
 const target = `${BASE_URL}/dashboard${urlSuffix}`
 log(`reload → ${target}`)
 await page.goto(target, { waitUntil: "domcontentloaded" })
 await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {})
 await page.waitForTimeout(1000)
 }
 await shot(page, snapName)
 } catch (e) {
 log(`snap failed: ${e instanceof Error ? e.message : String(e)}`)
 }
 // Reset file so next echo registers as a new event even if same name
 try {
 writeFileSync(STEP_FILE, "")
 } catch {}
 }

 await page.waitForTimeout(200)
 }

 await browser.close()
 if (consoleErrors.length) {
 log(`console errors during capture: ${consoleErrors.length}`)
 for (const e of consoleErrors.slice(0, 20)) console.log(` ${e}`)
 } else {
 log("no console errors during capture session")
 }
}

main().catch((e) => {
 console.error("[capture] fatal:", e)
 process.exit(1)
})
