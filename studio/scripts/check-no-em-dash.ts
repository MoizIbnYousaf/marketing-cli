#!/usr/bin/env bun
// scripts/check-no-em-dash.ts — F03 lint guard.
//
// Fails CI / `bun run lint` when an em-dash (U+2014) appears in shipped UI
// source files. Reason: style-audit commit 24399f2 stripped 51 of them,
// G1 audit F03 found 13 had crept back in. Durable fix = machine check.
//
// Scope is intentionally narrow: we only check files that render to users.
// Docs, tests, audit scripts, and skill markdown are allowed to use em-dashes
// freely. This script belongs in `bun run lint`.

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const REPO_ROOT = new URL("..", import.meta.url).pathname;

// Directories that ship to real users (UI source + library + entry point).
//
// Wave A (Lane 8) cleared every em-dash from app/, components/, lib/, bin/
// in one sweep, so the guard now enforces the no-em-dash rule across the
// full production surface. `scripts/` is intentionally excluded because
// `seed-demo.ts` is Wave B's domain (rich fixture copy + URLs); add it to
// this list when Wave B's seed rewrite lands. Tests are excluded by the
// IGNORED_SEGMENTS list below.
const WATCHED_DIRS = [
  "app",
  "components",
  "lib",
  "bin",
];

// Extensions worth scanning.
const WATCHED_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

// Directories that are fine to contain em-dashes (tests, scripts, build).
const IGNORED_SEGMENTS = new Set([
  "node_modules",
  ".next",
  "dist",
  "tests",
  "__tests__",
  "e2e",
]);

type Hit = { file: string; line: number; content: string };

async function walk(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (IGNORED_SEGMENTS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (entry.isFile()) {
      const dot = entry.name.lastIndexOf(".");
      if (dot === -1) continue;
      const ext = entry.name.slice(dot);
      if (WATCHED_EXTS.has(ext)) out.push(full);
    }
  }
}

async function main(): Promise<void> {
  const files: string[] = [];
  for (const dir of WATCHED_DIRS) {
    await walk(join(REPO_ROOT, dir), files);
  }

  const hits: Hit[] = [];
  for (const file of files) {
    const content = await readFile(file, "utf8");
    if (!content.includes("—")) continue;
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("—")) {
        hits.push({ file: relative(REPO_ROOT, file), line: i + 1, content: lines[i].trim() });
      }
    }
  }

  if (hits.length === 0) {
    console.log(`[check-no-em-dash] clean: scanned ${files.length} file(s) across ${WATCHED_DIRS.join(", ")}`);
    process.exit(0);
  }

  console.error(`[check-no-em-dash] FAIL: ${hits.length} em-dash(es) found in shipped UI:\n`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}: ${h.content}`);
  }
  console.error(
    `\nStyle rule: em-dashes (U+2014) are not allowed in ${WATCHED_DIRS.join(", ")}.\n` +
      `Replace with ':', ';', '.', parentheses, or an ASCII '-' glyph as appropriate.\n` +
      `See commit 24399f2 (2026-04-13 style audit) + G1 F03 + Lane 8 Wave A sweep.`,
  );
  process.exit(1);
}

main().catch((e) => {
  console.error("[check-no-em-dash] fatal:", e);
  process.exit(2);
});
