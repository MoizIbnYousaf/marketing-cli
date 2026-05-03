// Integration test: Brand Claims Subcommand
// Extracts Claims Blacklist from landscape.md as structured JSON.
// Real file I/O in isolated temp dirs. NO MOCKS.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { handler as brandHandler } from "../../src/commands/brand";
import { scaffoldBrand } from "../../src/core/brand";
import type { GlobalFlags } from "../../src/types";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-brand-claims-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Phase 1: No brand directory", () => {
  test("returns notFound error when brand/ does not exist", async () => {
    const result = await brandHandler(["claims"], flags);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("Phase 2: Template landscape.md", () => {
  test("returns empty claims with template freshness", async () => {
    await scaffoldBrand(tempDir);
    const result = await brandHandler(["claims"], flags);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.claims).toEqual([]);
      expect(result.data.source).toBe("landscape.md");
      expect(result.data.freshness).toBe("template");
    }
  });
});

describe("Phase 3: Populated landscape.md with claims", () => {
  const populatedLandscape = `# Market Landscape

## Market Overview
- **Category:** AI agent tooling
- **Stage:** Early growth

## Recent Shifts
- **2026-03-15** New competitor launched

## Ecosystem Tools
| Tool | What It Does | How People Use It | Source |
|------|-------------|-------------------|--------|
| ExampleTool | Does things | People use it | example.com |

## Industry Benchmarks
- Market size: $10B (Gartner, 2026)

## Claims Blacklist
| Claim | Why Wrong | What To Say Instead |
|-------|-----------|---------------------|
| We're the only AI marketing CLI | At least 3 competitors exist | We're the most agent-native marketing CLI |
| All agents use mktg | Adoption is early-stage | Growing number of agents use mktg |

## Claims Confirmed
- mktg is open source (GitHub, verified 2026-03-27)

## Brand File Contradictions
| File | Claims | Research Shows | Recommended Action |
|------|--------|---------------|-------------------|

*Last updated: 2026-03-27 by /landscape-scan*
`;

  test("extracts claims from populated landscape.md", async () => {
    await mkdir(join(tempDir, "brand"), { recursive: true });
    await writeFile(join(tempDir, "brand", "landscape.md"), populatedLandscape);

    const result = await brandHandler(["claims"], flags);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.claims).toHaveLength(2);
      expect(result.data.claims[0]).toEqual({
        claim: "We're the only AI marketing CLI",
        whyWrong: "At least 3 competitors exist",
        whatToSayInstead: "We're the most agent-native marketing CLI",
      });
      expect(result.data.claims[1]).toEqual({
        claim: "All agents use mktg",
        whyWrong: "Adoption is early-stage",
        whatToSayInstead: "Growing number of agents use mktg",
      });
      expect(result.data.source).toBe("landscape.md");
      expect(result.data.freshness).toBe("fresh");
      expect(result.data.ageDays).toBe(0);
    }
  });

  test("returns empty claims when blacklist section has no data rows", async () => {
    const emptyBlacklist = `# Market Landscape

## Claims Blacklist
| Claim | Why Wrong | What To Say Instead |
|-------|-----------|---------------------|

## Claims Confirmed
- Something confirmed
`;
    await mkdir(join(tempDir, "brand"), { recursive: true });
    await writeFile(join(tempDir, "brand", "landscape.md"), emptyBlacklist);

    const result = await brandHandler(["claims"], flags);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.claims).toEqual([]);
    }
  });

  test("--dry-run does not error on read-only operation", async () => {
    await mkdir(join(tempDir, "brand"), { recursive: true });
    await writeFile(join(tempDir, "brand", "landscape.md"), populatedLandscape);

    const dryFlags = { ...flags, dryRun: true };
    const result = await brandHandler(["claims"], dryFlags);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.claims).toHaveLength(2);
    }
  });
});

describe("Phase 4: Missing landscape.md with existing brand/", () => {
  test("returns empty claims with missing freshness", async () => {
    // Scaffold brand/ but delete landscape.md
    await scaffoldBrand(tempDir);
    await rm(join(tempDir, "brand", "landscape.md"));

    const result = await brandHandler(["claims"], flags);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.claims).toEqual([]);
      expect(result.data.freshness).toBe("missing");
    }
  });
});
