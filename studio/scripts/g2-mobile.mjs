// G2 -- mobile visual audit harness. Uses Playwright device emulation.
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(SCRIPT_DIR, "..", "docs", "screenshots", "g2-mobile");
fs.mkdirSync(OUT, { recursive: true });

// Handpicked devices mapped to the G2 task spec.
const EMULATIONS = [
  { id: "iphone15", device: "iPhone 14 Pro" },        // 393x852, closest shipped profile to iPhone 15
  { id: "iphone-se", device: "iPhone SE" },           // 375x667
  { id: "pixel", device: "Pixel 7" },                 // 412x915
  { id: "ipad-mini", device: "iPad Mini" },           // 768x1024
];

const ROUTES = [
  { id: "onboarding", url: "http://localhost:3000/onboarding" },
  { id: "pulse", url: "http://localhost:3000/dashboard" },
  { id: "trends", url: "http://localhost:3000/dashboard?tab=trends" },
  { id: "signals", url: "http://localhost:3000/dashboard?tab=signals" },
  { id: "audience", url: "http://localhost:3000/dashboard?tab=audience" },
  { id: "opportunities", url: "http://localhost:3000/dashboard?tab=opportunities" },
  { id: "publish", url: "http://localhost:3000/dashboard?tab=publish" },
  { id: "brand", url: "http://localhost:3000/dashboard?tab=brand" },
  { id: "settings", url: "http://localhost:3000/settings" },
];

const report = { emulations: {}, tinyTargets: [], horizontalOverflow: [] };

(async () => {
  const browser = await chromium.launch();
  for (const emu of EMULATIONS) {
    const profile = devices[emu.device];
    if (!profile) { console.log("no device profile for", emu.device); continue; }
    const ctx = await browser.newContext({ ...profile, colorScheme: "dark" });
    await ctx.addInitScript(() => { try { localStorage.setItem("mktg-studio-theme", "dark"); } catch {} });
    const page = await ctx.newPage();
    report.emulations[emu.id] = { viewport: profile.viewport, userAgent: profile.userAgent, routes: {} };

    for (const r of ROUTES) {
      const key = `${emu.id}-${r.id}`;
      try {
        await page.goto(r.url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(OUT, `${key}.png`), fullPage: true, timeout: 20000 });
        const metrics = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const sw = document.documentElement.scrollWidth;
          // enumerate interactive elements + measure
          const interactive = Array.from(document.querySelectorAll("button, a, [role='button'], input, select, textarea, [tabindex]:not([tabindex='-1'])"));
          const tiny = [];
          const okAt44 = { total: 0, passes: 0 };
          const okAt48 = { total: 0, passes: 0 };
          for (const el of interactive) {
            if (el.offsetParent === null) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            okAt44.total++;
            okAt48.total++;
            if (r.width >= 44 && r.height >= 44) okAt44.passes++;
            if (r.width >= 48 && r.height >= 48) okAt48.passes++;
            if (r.width < 44 || r.height < 44) {
              tiny.push({
                tag: el.tagName,
                role: el.getAttribute("role") || null,
                text: (el.textContent || "").trim().slice(0, 40),
                w: Math.round(r.width),
                h: Math.round(r.height),
              });
            }
          }
          // font sizes in use
          const sizes = new Set();
          for (const el of document.querySelectorAll("p, span, div, a, button, label, li")) {
            const fs = parseFloat(getComputedStyle(el).fontSize);
            if (fs > 0) sizes.add(fs);
          }
          return {
            vw, sw,
            hasHScroll: sw > vw + 1,
            interactiveCount: interactive.length,
            okAt44, okAt48,
            tinySample: tiny.slice(0, 20),
            fontSizes: [...sizes].sort((a,b)=>a-b),
            hasMobileDock: !!document.querySelector("[aria-label*='tab' i], .fixed.bottom-0, .md\\:hidden.fixed"),
          };
        });
        report.emulations[emu.id].routes[r.id] = metrics;
        if (metrics.hasHScroll) report.horizontalOverflow.push(key);
        if (metrics.tinySample.length > 0) report.tinyTargets.push({ key, count: metrics.tinySample.length, sample: metrics.tinySample.slice(0, 5) });
        console.log(key, `tiny=${metrics.tinySample.length} hscroll=${metrics.hasHScroll} 44/${metrics.okAt44.total}=${metrics.okAt44.passes}`);
      } catch (e) {
        console.log("failed", key, String(e).slice(0, 120));
      }
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, "metrics.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log("DONE");
})();
