// G1 Desktop Visual Audit — screenshots + DOM analysis, fast.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// Writes to a project-local scratch dir (gitignored) — re-run safely.
const OUT = path.join(SCRIPT_DIR, '..', '.scratch', 'screenshots', 'g1-desktop');
fs.mkdirSync(OUT, { recursive: true });

const BREAKPOINTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
  { name: '2560', width: 2560, height: 1440 },
];

const TARGETS = [
  { id: 'home', url: 'http://localhost:3000/' },
  { id: 'onboarding', url: 'http://localhost:3000/onboarding' },
  { id: 'dashboard-pulse', url: 'http://localhost:3000/dashboard' },
  { id: 'dashboard-trends', url: 'http://localhost:3000/dashboard?tab=trends' },
  { id: 'dashboard-signals', url: 'http://localhost:3000/dashboard?tab=signals' },
  { id: 'dashboard-audience', url: 'http://localhost:3000/dashboard?tab=audience' },
  { id: 'dashboard-opportunities', url: 'http://localhost:3000/dashboard?tab=opportunities' },
  { id: 'dashboard-publish', url: 'http://localhost:3000/dashboard?tab=publish' },
  { id: 'dashboard-brand', url: 'http://localhost:3000/dashboard?tab=brand' },
  { id: 'brand-route', url: 'http://localhost:3000/brand' },
  { id: 'settings', url: 'http://localhost:3000/settings' },
];

async function analyze(page) {
  return await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('*')).slice(0, 4000);
    const borders = new Set(), shadows = new Set(), fontSizes = new Set(),
      fontWeights = new Set(), lineHeights = new Set(), radii = new Set(),
      colors = new Set(), bgColors = new Set();
    const iconSizes = new Set();
    let tinyTargets = 0, tinyText = 0, focusable = 0;
    const tinyTextSamples = [];
    const h1 = document.querySelectorAll('h1').length;
    const h2 = document.querySelectorAll('h2').length;
    const h3 = document.querySelectorAll('h3').length;
    for (const el of nodes) {
      const cs = getComputedStyle(el);
      if (cs.borderTopStyle !== 'none' && cs.borderTopWidth !== '0px') borders.add(cs.borderTopColor);
      if (cs.boxShadow !== 'none') shadows.add(cs.boxShadow);
      fontSizes.add(cs.fontSize); fontWeights.add(cs.fontWeight); lineHeights.add(cs.lineHeight);
      if (cs.borderTopLeftRadius !== '0px') radii.add(cs.borderTopLeftRadius);
      colors.add(cs.color);
      if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bgColors.add(cs.backgroundColor);
      const tag = el.tagName;
      if (tag === 'SVG' || tag === 'svg') iconSizes.add(`${cs.width}x${cs.height}`);
      const role = el.getAttribute('role');
      if ((tag === 'BUTTON' || tag === 'A' || role === 'button') && el.offsetParent !== null) {
        focusable++;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (r.width < 32 || r.height < 32)) tinyTargets++;
      }
      if (['P','SPAN','DIV','SMALL','LABEL','A','BUTTON'].includes(tag) && el.offsetParent && el.textContent) {
        const fs = parseFloat(cs.fontSize);
        if (fs < 12 && fs > 0 && el.textContent.trim().length > 0) {
          tinyText++;
          if (tinyTextSamples.length < 5) tinyTextSamples.push({ t: el.textContent.slice(0,40).trim(), fs });
        }
      }
    }
    const hasHScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return {
      title: document.title, url: location.href, htmlClass: document.documentElement.className,
      uniqueBorders: borders.size, uniqueShadows: shadows.size,
      uniqueFontSizes: fontSizes.size, fontSizesList: [...fontSizes].sort((a,b)=>parseFloat(a)-parseFloat(b)),
      uniqueFontWeights: fontWeights.size, fontWeights: [...fontWeights].sort(),
      uniqueLineHeights: lineHeights.size, uniqueRadii: radii.size, radiiList: [...radii],
      uniqueColors: colors.size, uniqueBgColors: bgColors.size,
      iconSizes: [...iconSizes].slice(0, 30),
      tinyTargets, focusable, tinyText, tinyTextSamples,
      h1, h2, h3, hasHScroll,
      docScroll: {
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        sh: document.documentElement.scrollHeight,
        ch: document.documentElement.clientHeight,
      },
    };
  });
}

const results = {};
const events = [];

(async () => {
  const browser = await chromium.launch();
  for (const bp of BREAKPOINTS) {
    for (const scheme of ['dark', 'light']) {
      const ctx = await browser.newContext({
        viewport: { width: bp.width, height: bp.height },
        deviceScaleFactor: 1,
        colorScheme: scheme,
      });
      const page = await ctx.newPage();
      page.on('pageerror', e => events.push({ kind: 'pageerror', bp: bp.name, scheme, err: String(e).slice(0,300) }));
      page.on('console', msg => {
        if (msg.type() === 'error') events.push({ kind: 'console-error', bp: bp.name, scheme, text: msg.text().slice(0,200) });
      });
      for (const t of TARGETS) {
        const key = `${t.id}-${bp.name}-${scheme}`;
        try {
          await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
          // Settle: wait for fonts + one render frame
          await page.waitForLoadState('load', { timeout: 10000 }).catch(()=>{});
          await page.waitForTimeout(1500);
          const file = path.join(OUT, `${key}.png`);
          await page.screenshot({ path: file, fullPage: true });
          results[key] = { status: 'ok', ...(await analyze(page)) };
          console.log('captured', key);
        } catch (e) {
          events.push({ kind: 'capture-error', key, err: String(e).slice(0,300) });
          console.log('failed', key, String(e).slice(0,100));
        }
      }
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(OUT, 'analysis.json'), JSON.stringify({ results, events }, null, 2));
  await browser.close();
  console.log('DONE', Object.keys(results).length, 'captures,', events.length, 'events');
})();
