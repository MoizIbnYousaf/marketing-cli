// G5 -- run axe-core against every dashboard route, collect violations per page.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const OUT = path.join(SCRIPT_DIR, "..", "docs", "screenshots", "g5-a11y");
fs.mkdirSync(OUT, { recursive: true });

const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

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

const runs = {};

(async () => {
  const browser = await chromium.launch();
  for (const theme of ["light", "dark"]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: theme });
    await ctx.addInitScript((t) => { try { localStorage.setItem("mktg-studio-theme", t); } catch {} }, theme);
    const page = await ctx.newPage();
    for (const r of ROUTES) {
      try {
        await page.goto(r.url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(1500);
        await page.addScriptTag({ content: AXE });
        const result = await page.evaluate(async () => {
          // @ts-ignore
          return await window.axe.run({
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] },
            resultTypes: ["violations", "incomplete"],
          });
        });
        const key = `${r.id}-${theme}`;
        runs[key] = {
          url: r.url,
          violations: result.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            helpUrl: v.helpUrl,
            tags: v.tags,
            nodeCount: v.nodes.length,
            sampleTargets: v.nodes.slice(0, 3).map((n) => n.target?.join(" ") ?? ""),
          })),
          incompleteCount: result.incomplete.length,
        };
        console.log(key, "violations:", runs[key].violations.length, "incomplete:", runs[key].incompleteCount);
      } catch (e) {
        console.log("failed", r.id, theme, String(e).slice(0, 120));
      }
    }
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, "axe-results.json"), JSON.stringify(runs, null, 2));
  await browser.close();
  console.log("DONE");
})();
