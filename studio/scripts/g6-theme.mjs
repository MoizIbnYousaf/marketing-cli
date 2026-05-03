// G6 -- force true dark mode (via localStorage) and re-capture for theme diff.
// The app defaults to "light" regardless of OS prefs-color-scheme, so the
// G1 "dark" captures were actually rendering in light mode. This harness
// seeds localStorage with theme=dark before navigation so the useEffect-
// driven applyTheme() runs with the dark branch.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(SCRIPT_DIR, "..", "docs", "screenshots", "g6-theme");
fs.mkdirSync(OUT, { recursive: true });

const TARGETS = [
  { id: "dashboard", url: "http://localhost:3000/dashboard" },
  { id: "trends", url: "http://localhost:3000/dashboard?tab=trends" },
  { id: "signals", url: "http://localhost:3000/dashboard?tab=signals" },
  { id: "audience", url: "http://localhost:3000/dashboard?tab=audience" },
  { id: "opportunities", url: "http://localhost:3000/dashboard?tab=opportunities" },
  { id: "publish", url: "http://localhost:3000/dashboard?tab=publish" },
  { id: "brand", url: "http://localhost:3000/dashboard?tab=brand" },
  { id: "settings", url: "http://localhost:3000/settings" },
  { id: "onboarding", url: "http://localhost:3000/onboarding" },
];

(async () => {
  const browser = await chromium.launch();
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: theme,
    });
    await ctx.addInitScript((t) => {
      try { localStorage.setItem("mktg-studio-theme", t); } catch {}
    }, theme);
    const page = await ctx.newPage();
    for (const t of TARGETS) {
      const key = `${t.id}-${theme}`;
      try {
        await page.goto(t.url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(1500);
        // Sanity check: html class should match requested theme
        const htmlClass = await page.evaluate(() => document.documentElement.className);
        console.log(key, "html.class=", htmlClass);
        await page.screenshot({ path: path.join(OUT, `${key}.png`), fullPage: true, timeout: 20000 });
      } catch (e) {
        console.log("failed", key, String(e).slice(0, 120));
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log("DONE");
})();
