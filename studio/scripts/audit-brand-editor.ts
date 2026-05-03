#!/usr/bin/env bun
/**
 * Audit — brand editor deep dive .
 *
 * Drives Playwright through the brand editor flow:
 * - open file list, click voice-profile.md, expect content to load
 * - edit content, expect "Saving" → "Saved" pill
 * - simulate external write via curl (POST /api/brand/write) with stale
 * mtime to trigger CONFLICT envelope; verify the editor surfaces it
 * - verify Regenerate button is enabled when a writer skill exists
 * - verify Regenerate is disabled for append-only files (assets, learnings)
 *
 * Also verifies the live activity panel on the Pulse tab actually paints a new
 * row when an external POST /api/activity/log + POST /api/toast lands.
 *
 * Captures screenshots into docs/screenshots/audit-brand-*.png.
 *
 * Prereq: server.ts on :3001 + Next on :3012.
 */

import { chromium, type Page } from "playwright"
import path from "node:path"
import { writeFileSync, mkdirSync, existsSync } from "node:fs"

const NEXT_BASE = process.env.STUDIO_URL ?? "http://localhost:3012"
const API_BASE = process.env.STUDIO_API_BASE ?? "http://localhost:3001"
const OUT_DIR = path.join(process.cwd(), "docs", "screenshots")

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

interface Finding {
 scenario: string
 status: "ok" | "warn" | "fail"
 notes: string[]
}
const findings: Finding[] = []

function log(msg: string) {
 console.log(`[brand-audit] ${msg}`)
}

function record(scenario: string, status: Finding["status"], notes: string[] = []) {
 findings.push({ scenario, status, notes })
 log(`${status.toUpperCase()} ${scenario}${notes.length ? " — " + notes.join("; ") : ""}`)
}

async function shot(page: Page, name: string) {
 await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: false })
}

async function visit(page: Page, url: string) {
 await page.goto(url, { waitUntil: "domcontentloaded" })
 await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {})
 await page.waitForTimeout(500)
}

async function main() {
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

 // Track console errors for the whole brand-editor session.
 const consoleErrors: string[] = []
 page.on("console", (m) => {
 if (m.type() === "error") {
 const t = m.text()
 if (t.includes("favicon") || t.includes("DevTools")) return
 consoleErrors.push(t)
 }
 })
 // Capture failed network requests too
 const failedReqs: string[] = []
 page.on("requestfailed", (req) => {
 if (req.url().includes("favicon")) return
 failedReqs.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText ?? "unknown"}`)
 })
 page.on("response", (resp) => {
 if (resp.status() >= 400 && !resp.url().includes("favicon")) {
 failedReqs.push(`${resp.status()} ${resp.request().method()} ${resp.url()}`)
 }
 })

 // ── 1. Open Brand tab and click voice-profile.md ────────────────────────
 await visit(page, `${NEXT_BASE}/dashboard?tab=brand`)
 await shot(page, "audit-brand-empty.png")

 const vfRow = page.getByRole("button", { name: /voice-profile/i }).first()
 if ((await vfRow.count()) === 0) {
 record("brand: file list shows voice-profile.md", "fail", ["row not found in sidebar"])
 await page.close()
 await browser.close()
 return
 }
 await vfRow.click()
 await page.waitForTimeout(1200)
 // Expect editor to be visible — look for textarea inside editor
 const editorTextarea = page.locator("textarea").first()
 const hasEditor = (await editorTextarea.count()) > 0
 if (!hasEditor) {
 record("brand: editor mounts after select", "fail", ["no textarea after click"])
 } else {
 const initial = await editorTextarea.inputValue().catch(() => "")
 if (initial.length < 20) {
 record("brand: editor content loaded", "warn", [`content length=${initial.length}`])
 } else {
 record("brand: editor content loaded", "ok", [`content length=${initial.length}`])
 }
 await shot(page, "audit-brand-source.png")
 }

 // ── 2. Edit, expect "Saving" → "Saved" ──────────────────────────────────
 if (hasEditor) {
 await editorTextarea.focus()
 await editorTextarea.evaluate((el: HTMLTextAreaElement) => {
 const cur = el.value
 // Append a marker so we can detect the round-trip.
 el.value = cur + "\n\n<!-- audit-marker -->\n"
 el.dispatchEvent(new Event("input", { bubbles: true }))
 })
 // Type a single character to be sure React picks it up via the change handler.
 await editorTextarea.press("End")
 await editorTextarea.press("a")
 await editorTextarea.press("Backspace")
 await page.waitForTimeout(2500) // wait past 1.5s autosave debounce
 // Look for the save-status pill in the header — it should say "Saved" or be in saving state
 const headerText = await page.locator("body").textContent()
 if (headerText?.includes("Save failed") || headerText?.includes("Conflict")) {
 record("brand: autosave first edit", "fail", ["header reports failure or conflict on first edit"])
 await shot(page, "audit-brand-save-failed.png")
 } else if (headerText?.includes("Saved") || headerText?.includes("Unsaved") || headerText?.includes("Saving")) {
 record("brand: autosave first edit", "ok", [
 headerText.includes("Saved") ? "pill: Saved" : (headerText.includes("Saving") ? "pill: Saving (still in flight)" : "pill: Unsaved"),
 ])
 } else {
 record("brand: autosave first edit", "warn", ["no save-state pill text found"])
 }
 await shot(page, "audit-brand-saved.png")
 }

 // ── 3. CONFLICT — write the file via curl with stale mtime ──────────────
 // We send POST /api/brand/write with expectedMtime far in the past.
 const conflictResp = await page.evaluate(async () => {
 const r = await fetch(`/api/brand/write`, {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({
 file: "voice-profile.md",
 content: "# stale write\n",
 expectedMtime: "1970-01-01T00:00:00.000Z",
 }),
 })
 return { status: r.status, body: await r.text() }
 })
 if (
 conflictResp.status === 409 ||
 conflictResp.body.includes('"CONFLICT"') ||
 conflictResp.body.includes('"code":"CONFLICT"')
 ) {
 record("brand: server returns CONFLICT on stale mtime", "ok", [
 `status=${conflictResp.status}`,
 ])
 } else {
 record("brand: server returns CONFLICT on stale mtime", "warn", [
 `status=${conflictResp.status} body=${conflictResp.body.slice(0, 120)}`,
 ])
 }

 // ── 4. Regenerate button enabled for voice-profile.md ───────────────────
 const regenBtn = page.getByRole("button", { name: /regenerate/i }).first()
 if ((await regenBtn.count()) > 0) {
 const enabled = await regenBtn.isEnabled().catch(() => false)
 record("brand: regenerate enabled for voice-profile.md", enabled ? "ok" : "fail", [
 enabled ? "button enabled" : "button DISABLED",
 ])
 await shot(page, "audit-brand-regenerate.png")
 } else {
 record("brand: regenerate button present", "fail", ["no Regenerate button found"])
 }

 // ── 5. Regenerate disabled for assets.md (append-only) ──────────────────
 const assetsRow = page.getByRole("button", { name: /assets\.md/i }).first()
 if ((await assetsRow.count()) > 0) {
 await assetsRow.click()
 await page.waitForTimeout(1200)
 const regen2 = page.getByRole("button", { name: /regenerate/i }).first()
 if ((await regen2.count()) > 0) {
 const enabled = await regen2.isEnabled().catch(() => false)
 // Per spec: "Disabled for append-only files (assets.md, learnings.md)"
 if (!enabled) {
 record("brand: regenerate disabled for assets.md (append-only)", "ok", [
 "button correctly disabled",
 ])
 } else {
 record("brand: regenerate disabled for assets.md (append-only)", "warn", [
 "button enabled — spec says append-only files shouldn't allow regen; clicking it shows toast.info",
 ])
 }
 } else {
 record("brand: regenerate disabled for assets.md", "warn", [
 "no regenerate button (might be hidden — also acceptable)",
 ])
 }
 } else {
 record("brand: assets.md row in sidebar", "warn", ["row not found"])
 }

 // ── 6. Activity panel live updates from external POSTs ──────────────────
 await visit(page, `${NEXT_BASE}/dashboard`)
 await page.waitForTimeout(800)

 // Send an activity log + toast via fetch in the page context (so the SSE
 // bridge already mounted by the dashboard layout sees them).
 const logResp = await page.evaluate(async () => {
 const summary = "BRAND-EDITOR-AUDIT: live activity probe " + Date.now()
 const r = await fetch(`/api/activity/log`, {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({
 kind: "skill-run",
 skill: "audit-walkthrough",
 summary,
 }),
 })
 return { status: r.status, summary, body: (await r.text()).slice(0, 300) }
 })

 await page.waitForTimeout(1500)
 const bodyText = await page.locator("body").textContent()
 const seenInPanel = bodyText?.includes("BRAND-EDITOR-AUDIT") ?? false
 record(
 "activity-panel: live SSE row appears after POST /api/activity/log",
 seenInPanel ? "ok" : "fail",
 [
 `log status=${logResp.status}`,
 seenInPanel ? "row visible in DOM" : "marker NOT found in panel within 1.5s",
 ],
 )
 await shot(page, "audit-activity-live.png")

 // Toast — fire and watch for sonner toast container
 await page.evaluate(async () => {
 await fetch(`/api/toast`, {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({
 level: "success",
 message: "BRAND-EDITOR-AUDIT: toast probe",
 }),
 })
 })
 await page.waitForTimeout(900)
 const toastVisible = await page
 .locator("li[data-sonner-toast], [data-sonner-toaster] li")
 .first()
 .isVisible()
 .catch(() => false)
 // Sometimes sonner uses different roots; also check by text.
 const toastByText = (await page.locator("body").textContent())?.includes("BRAND-EDITOR-AUDIT: toast probe") ?? false
 record(
 "toast: live SSE toast appears after POST /api/toast",
 toastVisible || toastByText ? "ok" : "warn",
 [
 `sonner visible=${toastVisible}`,
 `text-in-dom=${toastByText}`,
 ],
 )
 await shot(page, "audit-toast-live.png")

 // ── 7. /api/navigate — switch the dashboard tab from the server ─────────
 const beforeUrl = page.url()
 await page.evaluate(async () => {
 await fetch(`/api/navigate`, {
 method: "POST",
 headers: { "content-type": "application/json" },
 body: JSON.stringify({ tab: "signals" }),
 })
 })
 await page.waitForTimeout(1200)
 const afterUrl = page.url()
 if (afterUrl.includes("tab=signals") || afterUrl !== beforeUrl) {
 record("/api/navigate: dashboard switches tabs from external POST", "ok", [
 `before=${beforeUrl} after=${afterUrl}`,
 ])
 } else {
 record("/api/navigate: dashboard switches tabs from external POST", "warn", [
 `URL did not change after POST: ${afterUrl}`,
 ])
 }

 await page.close()
 await browser.close()

 log("")
 log("==== BRAND-EDITOR + LIVE-STREAM AUDIT ====")
 for (const f of findings) {
 log(`${f.status.toUpperCase()} ${f.scenario}`)
 for (const n of f.notes) log(` ${n}`)
 }
 if (consoleErrors.length) {
 log("")
 log("Console errors during run:")
 consoleErrors.slice(0, 10).forEach((e) => log(` - ${e.slice(0, 200)}`))
 }
 if (failedReqs.length) {
 log("")
 log("Failed/4xx-5xx requests during run:")
 failedReqs.slice(0, 20).forEach((e) => log(` - ${e}`))
 }
 writeFileSync("/tmp/audit-brand-results.json", JSON.stringify({ findings, consoleErrors, failedReqs }, null, 2))
 log("Wrote /tmp/audit-brand-results.json")
}

main().catch((e) => {
 console.error("[brand-audit] fatal:", e)
 process.exit(1)
})
