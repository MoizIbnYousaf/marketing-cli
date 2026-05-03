#!/usr/bin/env bun
/**
 * Audit walkthrough — .
 *
 * Drives a real headless Chromium against the running studio and exercises
 * every surface in the 25×8 audit matrix from docs/AUDIT_PROMPT.md. Captures
 * page errors, failed network calls, console errors, and a screenshot per
 * surface. Writes a JSON summary to /tmp/audit-walkthrough-results.json.
 *
 * Prereq:
 * bun run scripts/seed-demo.ts
 * bun run server.ts # :3001
 * PORT=3012 bun run dev # :3012
 *
 * Usage:
 * STUDIO_URL=http://localhost:3012 bun run scripts/audit-walkthrough.ts
 */

import { chromium, type Page, type ConsoleMessage } from "playwright"
import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"

const BASE_URL = process.env.STUDIO_URL ?? "http://localhost:3012"
const OUT_DIR = path.join(process.cwd(), "docs", "screenshots")
const VIEWPORT_DESKTOP = { width: 1440, height: 900 }
const VIEWPORT_MOBILE = { width: 390, height: 844 }
const SCALE = 2

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

interface SurfaceCheck {
 name: string
 url: string
 expectSelector?: string
 notes?: string
}

interface CellResult {
 surface: string
 state: string
 status: "ok" | "warn" | "fail"
 notes: string[]
 screenshot?: string
}

const results: CellResult[] = []

function log(msg: string) {
 console.log(`[audit] ${msg}`)
}

async function attachLoggers(page: Page, errors: { console: string[]; pageError: string[]; failedReq: string[] }) {
 page.on("console", (msg: ConsoleMessage) => {
 if (msg.type() === "error") {
 const text = msg.text()
 // Filter known dev noise
 if (text.includes("Download the React DevTools")) return
 if (text.includes("favicon")) return
 errors.console.push(text)
 }
 })
 page.on("pageerror", (err) => {
 errors.pageError.push(err.message)
 })
 page.on("requestfailed", (req) => {
 const url = req.url()
 if (url.includes("favicon")) return
 if (url.includes("_next/static") && url.endsWith(".woff2")) return
 errors.failedReq.push(`${req.method()} ${url} — ${req.failure()?.errorText ?? "unknown"}`)
 })
}

function freshErrors() {
 return { console: [] as string[], pageError: [] as string[], failedReq: [] as string[] }
}

async function setTheme(page: Page, theme: "dark" | "light") {
 await page.addInitScript((t) => {
 try {
 localStorage.setItem("mktg-studio-theme", t)
 } catch {}
 }, theme)
}

async function visit(page: Page, url: string) {
 await page.goto(url, { waitUntil: "domcontentloaded" })
 await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {})
 await page.waitForTimeout(500)
}

async function check(
 page: Page,
 errors: ReturnType<typeof freshErrors>,
 surface: string,
 state: string,
 shotName?: string,
): Promise<CellResult> {
 const notes: string[] = []
 let status: "ok" | "warn" | "fail" = "ok"

 if (errors.pageError.length) {
 status = "fail"
 notes.push(`pageerror: ${errors.pageError.join(" | ")}`)
 }
 if (errors.console.length) {
 if (status !== "fail") status = "warn"
 notes.push(`console.error x${errors.console.length}: ${errors.console.slice(0, 2).join(" | ")}`)
 }
 if (errors.failedReq.length) {
 if (status !== "fail") status = "warn"
 notes.push(`req-failed x${errors.failedReq.length}: ${errors.failedReq.slice(0, 2).join(" | ")}`)
 }

 let screenshot: string | undefined
 if (shotName) {
 const file = path.join(OUT_DIR, shotName)
 await page.screenshot({ path: file, fullPage: false })
 screenshot = shotName
 }

 const result: CellResult = { surface, state, status, notes, screenshot }
 results.push(result)
 log(`${status.toUpperCase()} ${surface} [${state}]${notes.length ? " — " + notes.join("; ") : ""}`)
 return result
}

// -- main ----------------------------------------------------------------

async function main() {
 log(`Base: ${BASE_URL}`)
 const browser = await chromium.launch({ headless: true })

 // -------- DESKTOP DARK --------
 const ctx = await browser.newContext({
 viewport: VIEWPORT_DESKTOP,
 deviceScaleFactor: SCALE,
 colorScheme: "dark",
 })
 const errors = freshErrors()
 const page = await ctx.newPage()
 await attachLoggers(page, errors)
 await setTheme(page, "dark")

 // --- ONBOARDING ---
 // Step 1: project URL
 Object.assign(errors, freshErrors())
 await page.evaluate(() => {
 try {
 localStorage.removeItem("mktg-studio:onboarding")
 } catch {}
 }).catch(() => {})
 await visit(page, `${BASE_URL}/onboarding`)
 await check(page, errors, "Onboarding step-project", "ok-dark", "audit-onboarding-step-project.png")

 // Step 2: postiz
 await page.evaluate(() => {
 try {
 localStorage.setItem(
 "mktg-studio:onboarding",
 JSON.stringify({ step: 1, url: "https://example.com" }),
 )
 } catch {}
 })
 Object.assign(errors, freshErrors())
 await visit(page, `${BASE_URL}/onboarding`)
 await check(page, errors, "Onboarding step-postiz", "ok-dark", "audit-onboarding-step-postiz.png")

 // Step 3: optional integrations
 await page.evaluate(() => {
 try {
 localStorage.setItem(
 "mktg-studio:onboarding",
 JSON.stringify({ step: 2, url: "https://example.com", postizKey: "x", postizBase: "https://api.postiz.com" }),
 )
 } catch {}
 })
 Object.assign(errors, freshErrors())
 await visit(page, `${BASE_URL}/onboarding`)
 await check(page, errors, "Onboarding step-optional", "ok-dark", "audit-onboarding-step-optional.png")

 // Step 4: building
 await page.evaluate(() => {
 try {
 localStorage.setItem(
 "mktg-studio:onboarding",
 JSON.stringify({ step: 3, url: "https://example.com", postizKey: "x", postizBase: "https://api.postiz.com" }),
 )
 } catch {}
 })
 Object.assign(errors, freshErrors())
 await visit(page, `${BASE_URL}/onboarding`)
 await page.waitForTimeout(1500)
 await check(page, errors, "Onboarding step-building", "ok-dark", "audit-onboarding-step-building.png")

 // Step 5: done
 await page.evaluate(() => {
 try {
 localStorage.setItem(
 "mktg-studio:onboarding",
 JSON.stringify({ step: 4, url: "https://example.com", postizKey: "x", postizBase: "https://api.postiz.com" }),
 )
 } catch {}
 })
 Object.assign(errors, freshErrors())
 await visit(page, `${BASE_URL}/onboarding`)
 await check(page, errors, "Onboarding step-done", "ok-dark", "audit-onboarding-step-done.png")

 // --- DASHBOARD TABS (dark) ---
 const tabs = [
 { name: "Pulse", url: `${BASE_URL}/dashboard`, shot: "audit-tab-pulse-dark.png" },
 { name: "Trends", url: `${BASE_URL}/dashboard?tab=trends`, shot: "audit-tab-trends-dark.png" },
 { name: "Signals", url: `${BASE_URL}/dashboard?tab=signals`, shot: "audit-tab-signals-dark.png" },
 { name: "Audience", url: `${BASE_URL}/dashboard?tab=audience`, shot: "audit-tab-audience-dark.png" },
 { name: "Opportunities", url: `${BASE_URL}/dashboard?tab=opportunities`, shot: "audit-tab-opps-dark.png" },
 { name: "Publish", url: `${BASE_URL}/dashboard?tab=publish`, shot: "audit-tab-publish-dark.png" },
 { name: "Brand", url: `${BASE_URL}/dashboard?tab=brand`, shot: "audit-tab-brand-dark.png" },
 ] as const

 for (const t of tabs) {
 Object.assign(errors, freshErrors())
 await visit(page, t.url)
 await check(page, errors, `${t.name} tab`, "ok-dark", t.shot)
 }

 // --- BRAND EDITOR ---
 // file list (already captured above via brand tab)
 // open voice-profile.md
 Object.assign(errors, freshErrors())
 await visit(page, `${BASE_URL}/dashboard?tab=brand`)
 // Click on "voice-profile.md" if present
 const vfRow = page.getByRole("button", { name: /voice-profile/i }).first()
 const haveVf = (await vfRow.count()) > 0
 if (haveVf) {
 await vfRow.click().catch(() => {})
 await page.waitForTimeout(900)
 await check(page, errors, "Brand editor source view", "ok-dark", "audit-brand-source.png")

 // toggle Preview if button exists
 Object.assign(errors, freshErrors())
 const previewBtn = page.getByRole("button", { name: /^preview$/i }).first()
 if ((await previewBtn.count()) > 0) {
 await previewBtn.click().catch(() => {})
 await page.waitForTimeout(500)
 await check(page, errors, "Brand editor preview view", "ok-dark", "audit-brand-preview.png")
 } else {
 await check(page, errors, "Brand editor preview view", "no-toggle-found")
 }

 // Regenerate button
 Object.assign(errors, freshErrors())
 const regenBtn = page.getByRole("button", { name: /regenerate/i }).first()
 if ((await regenBtn.count()) > 0) {
 // don't actually click — could trigger a real skill. Just verify it's clickable.
 const enabled = await regenBtn.isEnabled().catch(() => false)
 await check(page, errors, "Brand editor regenerate", enabled ? "button-enabled" : "button-disabled", "audit-brand-regenerate-btn.png")
 } else {
 await check(page, errors, "Brand editor regenerate", "no-button-found")
 }
 } else {
 await check(page, errors, "Brand editor source view", "no-voice-profile-row")
 }

 // --- COMMAND PALETTE ---
 Object.assign(errors, freshErrors())
 await visit(page, `${BASE_URL}/dashboard`)
 await page.keyboard.press("Meta+KeyK")
 await page.waitForTimeout(300)
 let paletteOpen = (await page.locator("[cmdk-root]").count()) > 0
 if (!paletteOpen) {
 await page.keyboard.press("Control+KeyK")
 await page.waitForTimeout(300)
 paletteOpen = (await page.locator("[cmdk-root]").count()) > 0
 }
 await check(page, errors, "Command palette", paletteOpen ? "open" : "FAILED-TO-OPEN", "audit-palette-open.png")
 if (paletteOpen) await page.keyboard.press("Escape")

 // --- KEYBOARD HELP (?) ---
 Object.assign(errors, freshErrors())
 await page.waitForTimeout(300)
 await page.evaluate(() => {
 document.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true }))
 })
 await page.waitForTimeout(500)
 const helpOpen = (await page.locator('[role="dialog"]').count()) > 0
 await check(page, errors, "Keyboard help (?)", helpOpen ? "open" : "FAILED-TO-OPEN", "audit-keyboard-help.png")
 if (helpOpen) await page.keyboard.press("Escape")

 // --- KEYBOARD CHORDS — verify each g+X actually navigates ---
 for (const [chord, expectedTab] of [
 ["p", "pulse"],
 ["t", "trends"],
 ["s", "signals"],
 ["a", "audience"],
 ["o", "opportunities"],
 ["u", "publish"],
 ["b", "brand"],
 ] as const) {
 Object.assign(errors, freshErrors())
 await visit(page, `${BASE_URL}/dashboard`)
 await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
 await page.keyboard.press("g")
 await page.waitForTimeout(120)
 await page.keyboard.press(chord)
 await page.waitForTimeout(700)
 const url = page.url()
 let ok = false
 if (expectedTab === "pulse") {
 ok = !url.includes("?tab=") || url.endsWith("/dashboard")
 } else {
 ok = url.includes(`tab=${expectedTab}`)
 }
 await check(
 page,
 errors,
 `Chord g ${chord}`,
 ok ? `navigated→${expectedTab}` : `EXPECTED tab=${expectedTab} GOT ${url}`,
 )
 }

 // chord g , → settings
 Object.assign(errors, freshErrors())
 await visit(page, `${BASE_URL}/dashboard`)
 await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
 await page.keyboard.press("g")
 await page.waitForTimeout(120)
 await page.keyboard.press(",")
 await page.waitForTimeout(700)
 const settingsUrl = page.url()
 await check(
 page,
 errors,
 "Chord g ,",
 settingsUrl.includes("/settings") ? "navigated→settings" : `EXPECTED /settings GOT ${settingsUrl}`,
 )

 // --- INPUT-FOCUS GUARD: typing 'g p' inside palette must NOT navigate ---
 Object.assign(errors, freshErrors())
 await visit(page, `${BASE_URL}/dashboard?tab=signals`)
 await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
 await page.keyboard.press("Meta+KeyK")
 await page.waitForTimeout(300)
 if (!(await page.locator("[cmdk-root]").count())) await page.keyboard.press("Control+KeyK")
 await page.waitForTimeout(300)
 await page.keyboard.type("gp")
 await page.waitForTimeout(700)
 const stillSignals = page.url().includes("tab=signals")
 await check(
 page,
 errors,
 "Input-focus guard (g p in palette)",
 stillSignals ? "guard-works" : `LEAKED — url=${page.url()}`,
 )
 await page.keyboard.press("Escape")

 // --- SETTINGS ---
 Object.assign(errors, freshErrors())
 await visit(page, `${BASE_URL}/settings`)
 await check(page, errors, "Settings (full)", "ok-dark", "audit-settings-dark.png")

 await page.close()

 // -------- DESKTOP LIGHT (key tabs only) --------
 const lightCtx = await browser.newContext({
 viewport: VIEWPORT_DESKTOP,
 deviceScaleFactor: SCALE,
 colorScheme: "light",
 })
 const lightPage = await lightCtx.newPage()
 const lightErrors = freshErrors()
 await attachLoggers(lightPage, lightErrors)
 await setTheme(lightPage, "light")

 for (const t of tabs) {
 Object.assign(lightErrors, freshErrors())
 await visit(lightPage, t.url)
 await check(
 lightPage,
 lightErrors,
 `${t.name} tab`,
 "ok-light",
 `audit-tab-${t.name.toLowerCase()}-light.png`,
 )
 }
 Object.assign(lightErrors, freshErrors())
 await visit(lightPage, `${BASE_URL}/settings`)
 await check(lightPage, lightErrors, "Settings (full)", "ok-light", "audit-settings-light.png")
 await lightPage.close()

 // -------- MOBILE DARK (key tabs only) --------
 const mobileCtx = await browser.newContext({
 viewport: VIEWPORT_MOBILE,
 deviceScaleFactor: SCALE,
 colorScheme: "dark",
 isMobile: true,
 hasTouch: true,
 })
 const mPage = await mobileCtx.newPage()
 const mErrors = freshErrors()
 await attachLoggers(mPage, mErrors)
 await setTheme(mPage, "dark")

 for (const t of tabs) {
 Object.assign(mErrors, freshErrors())
 await visit(mPage, t.url)
 await check(mPage, mErrors, `${t.name} tab`, "ok-mobile", `audit-tab-${t.name.toLowerCase()}-mobile.png`)
 }
 Object.assign(mErrors, freshErrors())
 await visit(mPage, `${BASE_URL}/onboarding`)
 await check(mPage, mErrors, "Onboarding step-project", "ok-mobile", "audit-onboarding-mobile.png")
 await mPage.close()

 await browser.close()

 // -- summary -----------------------------------------------------------
 const fail = results.filter((r) => r.status === "fail")
 const warn = results.filter((r) => r.status === "warn")
 const ok = results.filter((r) => r.status === "ok")
 log("")
 log(`==== SUMMARY ====`)
 log(`OK: ${ok.length}`)
 log(`WARN: ${warn.length}`)
 log(`FAIL: ${fail.length}`)
 if (fail.length) {
 log("FAILS:")
 for (const r of fail) log(` - ${r.surface} [${r.state}]: ${r.notes.join("; ")}`)
 }
 if (warn.length) {
 log("WARNS:")
 for (const r of warn) log(` - ${r.surface} [${r.state}]: ${r.notes.join("; ")}`)
 }
 writeFileSync("/tmp/audit-walkthrough-results.json", JSON.stringify(results, null, 2))
 log(`Wrote /tmp/audit-walkthrough-results.json`)
}

main().catch((err) => {
 console.error("[audit] fatal:", err)
 process.exit(1)
})
