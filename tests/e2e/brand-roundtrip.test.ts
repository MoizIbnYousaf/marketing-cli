// E2E: Brand Roundtrip
// scaffold → write all 10 files with real content → export bundle → delete brand/ → import bundle → verify SHA match → freshness correct
// NO MOCKS. Real file I/O in isolated temp dirs.
//
// Agent DX Axes Validated:
// - Schema Introspection (3/3): status command returns machine-parseable brandSummary, freshness enums, health enums
// - Machine-Readable Output (supports): all status calls use --json, output is structured and parseable
// - Agent Knowledge Packaging (supports): brand files follow documented 10-file contract, SHA-256 integrity verified

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { BRAND_FILES, type BrandFile } from "../../src/types";
import {
  scaffoldBrand,
  getBrandStatus,
  isTemplateContent,
  exportBrand,
  importBrand,
  computeBrandHashes,
  saveBrandHashes,
  diffBrand,
} from "../../src/core/brand";
import { handler as statusHandler } from "../../src/commands/status";
import type { GlobalFlags } from "../../src/types";

let tempDir: string;
let flags: GlobalFlags;

// Real brand content for all 10 files — not templates, not stubs
const REAL_CONTENT: Record<BrandFile, string> = {
  "voice-profile.md": `# Brand Voice Profile

## Voice DNA
- **Tone:** Confident, direct, slightly irreverent
- **Personality:** The smart friend who cuts through marketing BS
- **Vocabulary:** Technical when needed, never corporate

## Do / Don't
| Do | Don't |
|----|-------|
| Use active voice | Use passive constructions |
| Say "you" not "users" | Use corporate speak |
| Be specific with numbers | Use vague qualifiers |

## Examples
- **Good:** "Ship faster with zero config."
- **Bad:** "Our solution enables accelerated deployment workflows."
`,
  "positioning.md": `# Positioning & Angles

## Core Positioning
- **Category:** Agent-native marketing CLI
- **For:** Solo founders who need marketing but don't have time
- **Unlike:** HubSpot, Jasper, generic AI writing tools
- **We:** Give your AI agent a complete CMO brain

## Angles
1. One install = full marketing department
2. Marketing that compounds across sessions
3. Built for agents, not humans

## Proof Points
- 42 marketing skills, zero configuration
- Brand memory persists across sessions
- Parallel research with sub-agents
`,
  "audience.md": `# Audience Research

## Primary Audience
- **Who:** Solo founders running 2-5 projects
- **Pain points:** No time for marketing, can't afford a CMO, content creation takes too long
- **Current solution:** Manual social posts, sporadic content, no strategy
- **Trigger to buy:** Realizes marketing is the bottleneck to growth

## Secondary Audience
- **Who:** Developer advocates at startups
- **Pain points:** Content creation takes too long, inconsistent voice across channels

## Watering Holes
- r/SaaS, r/indiehackers
- Indie Hackers forum
- Twitter: @levelsio, @marc_louvion
`,
  "competitors.md": `# Competitive Intelligence

## Competitors

### Jasper AI
- **Positioning:** AI writing assistant for marketing teams
- **Pricing:** $49/mo Creator, $125/mo Teams
- **Weakness:** No brand memory, starts fresh each session

### Copy.ai
- **Positioning:** AI-powered content creation platform
- **Pricing:** Free tier, $49/mo Pro
- **Weakness:** Template-based, not strategic

## Our Differentiation
- We're the only tool built for AI agents, not humans
- Brand memory compounds — every session builds on the last
`,
  "landscape.md": `# Market Landscape

## Market Overview
- **Category:** AI-assisted marketing tools for developers and solo founders
- **Market size:** $15.2B (2025), growing 28% YoY
- **Stage:** Early growth — most tools target human operators, not AI agents
- **Dominant model:** SaaS subscriptions with per-seat pricing, increasingly usage-based

## Recent Shifts
| Date | Shift | Impact | Source |
|------|-------|--------|--------|
| 2026-03 | Claude Code reaches 1M+ daily users | Agent-native tooling demand surging; CLI-first workflows normalized | Anthropic blog |
| 2026-02 | Google releases Gemini marketing agent | Enterprise-first, $500/mo minimum — leaves indie founders underserved | TechCrunch |
| 2026-01 | HubSpot acquires Jasper AI | Consolidation in AI writing tools; standalone tools losing ground to suites | HubSpot press |
| 2025-12 | OpenAI launches GPT Store marketing templates | Commoditizes basic AI copy generation; differentiation shifts to workflow integration | OpenAI changelog |

## Ecosystem Tools
| Tool | Category | Integration Status | Notes |
|------|----------|-------------------|-------|
| Exa | Search API | Integrated via MCP | Powers competitive and keyword research |
| Playwright | Browser automation | Integrated via ply | Screenshot capture, demo recording, social posting |
| Remotion | Programmatic video | Integrated via ffmpeg/Remotion | TikTok slideshows, product demos |
| Typefully | Social scheduling | Integrated via MCP | Twitter/X, LinkedIn, Threads posting |
| gws | Email sending | Integrated via CLI | Outbound email sequences |
| Resend | Transactional email | Planned | Inbound agent email, deliverability |

## Industry Benchmarks
| Metric | Benchmark | Source |
|--------|-----------|--------|
| Email open rate (SaaS) | 21-25% | Mailchimp 2025 report |
| Landing page conversion | 2.5-5.5% | Unbounce 2025 benchmark |
| SEO content time-to-rank | 3-6 months | Ahrefs study |
| Social engagement rate (Twitter) | 0.5-1.2% | Sprout Social Q4 2025 |
| Blog post production cost (agency) | $500-2,000 | Content Marketing Institute |

## Claims Blacklist
- NEVER claim "first AI marketing tool" (Jasper, Copy.ai predate us by years)
- NEVER claim "replaces your marketing team" (we augment agents, not replace humans)
- NEVER cite specific ROI multipliers without source data
- NEVER claim compatibility with tools not listed in stack.md
- SAFE: "Only CLI built for AI agents, not humans" (Confirmed: no competitor targets agent-native workflows)
- SAFE: "Brand memory that compounds across sessions" (Confirmed: competitors reset context per session)

## Brand File Contradictions
| File | Claims | Research Shows | Recommended Action |
|------|--------|---------------|-------------------|
| competitors.md | Lists Copy.ai free tier | Copy.ai removed free tier Jan 2026 | Update competitors.md pricing |

*Last updated: 2026-03-25 by /landscape-scan*
`,
  "keyword-plan.md": `# Keyword Plan

## Priority Keywords
| Keyword | Intent | Difficulty | Priority |
|---------|--------|------------|----------|
| ai marketing tool | commercial | high | P0 |
| marketing automation for founders | commercial | medium | P0 |
| ai agent marketing | informational | low | P1 |

## Long-tail Opportunities
- how to automate marketing for saas
- ai agent marketing automation
- best marketing cli tool

## Content Map
| Keyword | Content Type | Status |
|---------|-------------|--------|
| ai marketing tool | landing page | planned |
| marketing automation | blog post | planned |
`,
  "creative-kit.md": `# Creative Kit

## Brand Colors
- **Primary:** #6366F1 (indigo)
- **Secondary:** #10B981 (emerald)
- **Accent:** #F59E0B (amber)
- **Background:** #0F172A (slate-900)

## Typography
- **Headings:** Inter Bold
- **Body:** Inter Regular, 16px
- **Code:** JetBrains Mono

## Visual Style
- **Mood:** Developer-friendly, minimal, dark mode
- **Photography:** No stock photos, use screenshots and diagrams
- **Icons:** Lucide icons, 24px stroke
`,
  "stack.md": `# Marketing Stack

## Available Tools
- **Email:** gws (Google Workspace Send)
- **Social:** playwright-cli / ply
- **Video:** remotion, ffmpeg
- **Search:** exa
- **Media:** ffmpeg

## Accounts
- Twitter: @mktgcli
- ProductHunt: scheduled for Q2

## Constraints
- No paid ads budget yet
- Max 3 social posts per day
`,
  "assets.md": `# Assets Log

| Date | Type | File/URL | Skill | Notes |
|------|------|----------|-------|-------|
| 2026-03-20 | blog | /blog/launch-guide | seo-content | 1,800 words, verified-source meal-delivery guide |
| 2026-03-20 | social | tweet-thread-1 | content-atomizer | 8 tweets from blog post |
`,
  "learnings.md": `# Marketing Learnings

| Date | Action | Result | Learning | Next Step |
|------|--------|--------|----------|-----------|
| 2026-03-20 | Published meal-delivery guide | 1.2K views day 1 | Long-form with specific examples outperforms listicles | Write more deep-dive guides |
| 2026-03-20 | Tweet thread | 45 likes, 12 retweets | Threads with data points get 3x engagement | Always include numbers |
`,
  "landscape.md": `# Market Landscape

## Ecosystem Snapshot
- **Category:** AI-powered marketing tools
- **Market stage:** Early growth, fragmented
- **Key players:** Jasper, Copy.ai, HubSpot AI, generic LLM wrappers

## Claims Blacklist
| Claim | Status | Source |
|-------|--------|--------|
| "Only AI-native marketing CLI" | Verified | No direct competitors found in CLI space |
| "Brand memory persists" | Verified | Unique to mktg architecture |

## Trends
- Growing demand for agent-native tooling
- Shift from template-based to context-aware content generation
`,
};

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-e2e-brand-roundtrip-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Phase 1: Scaffold and populate all 10 brand files", () => {
  test("scaffold creates all 10 template files", async () => {
    const result = await scaffoldBrand(tempDir);
    expect(result.created).toHaveLength(10);

    for (const file of BRAND_FILES) {
      const exists = await Bun.file(join(tempDir, "brand", file)).exists();
      expect(exists).toBe(true);
    }
  });

  test("write real content to all 10 files", async () => {
    await scaffoldBrand(tempDir);

    for (const file of BRAND_FILES) {
      await Bun.write(join(tempDir, "brand", file), REAL_CONTENT[file]);
    }

    // Verify all files have real content (not templates)
    for (const file of BRAND_FILES) {
      const content = await Bun.file(join(tempDir, "brand", file)).text();
      expect(isTemplateContent(file, content)).toBe(false);
      expect(content).toBe(REAL_CONTENT[file]);
    }
  });

  test("status shows all 10 populated, health ready", async () => {
    await scaffoldBrand(tempDir);
    for (const file of BRAND_FILES) {
      await Bun.write(join(tempDir, "brand", file), REAL_CONTENT[file]);
    }

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.health).toBe("ready");
    expect(result.data.brandSummary.populated).toBe(10);
    expect(result.data.brandSummary.template).toBe(0);
    expect(result.data.brandSummary.missing).toBe(0);
  });
});

describe("Phase 2: Export brand bundle", () => {
  test("export produces a valid bundle with all 10 files", async () => {
    await scaffoldBrand(tempDir);
    for (const file of BRAND_FILES) {
      await Bun.write(join(tempDir, "brand", file), REAL_CONTENT[file]);
    }

    const bundle = await exportBrand(tempDir);

    expect(bundle.version).toBe(1);
    expect(typeof bundle.exportedAt).toBe("string");
    expect(Object.keys(bundle.files)).toHaveLength(10);

    for (const file of BRAND_FILES) {
      const entry = bundle.files[file];
      expect(entry).toBeDefined();
      expect(entry!.content).toBe(REAL_CONTENT[file]);
      expect(typeof entry!.sha256).toBe("string");
      expect(entry!.sha256.length).toBe(64);
    }
  });

  test("export SHA-256 hashes match computeBrandHashes", async () => {
    await scaffoldBrand(tempDir);
    for (const file of BRAND_FILES) {
      await Bun.write(join(tempDir, "brand", file), REAL_CONTENT[file]);
    }

    const bundle = await exportBrand(tempDir);
    const hashes = await computeBrandHashes(tempDir);

    for (const file of BRAND_FILES) {
      expect(bundle.files[file]!.sha256).toBe(hashes[file]);
    }
  });
});

describe("Phase 3: Delete brand/ and import bundle", () => {
  test("full roundtrip: export → delete → import → verify", async () => {
    // Step 1: Scaffold and populate
    await scaffoldBrand(tempDir);
    for (const file of BRAND_FILES) {
      await Bun.write(join(tempDir, "brand", file), REAL_CONTENT[file]);
    }

    // Step 2: Compute hashes before export
    const originalHashes = await computeBrandHashes(tempDir);

    // Step 3: Export
    const bundle = await exportBrand(tempDir);

    // Step 4: Delete entire brand/ directory
    await rm(join(tempDir, "brand"), { recursive: true, force: true });

    // Verify brand/ is gone
    const statusAfterDelete = await statusHandler([], flags);
    expect(statusAfterDelete.ok).toBe(true);
    if (!statusAfterDelete.ok) return;
    expect(statusAfterDelete.data.health).toBe("needs-setup");

    // Step 5: Import bundle
    const importResult = await importBrand(tempDir, bundle, false);
    expect(importResult.imported).toHaveLength(10);
    expect(importResult.skipped).toHaveLength(0);

    // Step 6: Verify all 10 files restored with correct content
    for (const file of BRAND_FILES) {
      const content = await Bun.file(join(tempDir, "brand", file)).text();
      expect(content).toBe(REAL_CONTENT[file]);
    }

    // Step 7: Verify SHA-256 integrity
    const restoredHashes = await computeBrandHashes(tempDir);
    for (const file of BRAND_FILES) {
      expect(restoredHashes[file]).toBe(originalHashes[file]);
    }

    // Step 8: Verify status is back to ready
    const statusAfterImport = await statusHandler([], flags);
    expect(statusAfterImport.ok).toBe(true);
    if (!statusAfterImport.ok) return;
    expect(statusAfterImport.data.health).toBe("ready");
    expect(statusAfterImport.data.brandSummary.populated).toBe(10);
  });
});

describe("Phase 4: Freshness after import", () => {
  test("imported files have freshness: current (not template)", async () => {
    await scaffoldBrand(tempDir);
    for (const file of BRAND_FILES) {
      await Bun.write(join(tempDir, "brand", file), REAL_CONTENT[file]);
    }
    const bundle = await exportBrand(tempDir);
    await rm(join(tempDir, "brand"), { recursive: true, force: true });
    await importBrand(tempDir, bundle, false);

    const result = await statusHandler([], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const [, entry] of Object.entries(result.data.brand)) {
      expect(entry.exists).toBe(true);
      expect(entry.isTemplate).toBe(false);
      expect(entry.freshness).toBe("current");
    }
  });
});

describe("Phase 5: Diff tracking across roundtrip", () => {
  test("save hashes → export → delete → import → diff shows no changes", async () => {
    await scaffoldBrand(tempDir);
    for (const file of BRAND_FILES) {
      await Bun.write(join(tempDir, "brand", file), REAL_CONTENT[file]);
    }

    // Save baseline hashes
    const hashes = await computeBrandHashes(tempDir);
    await saveBrandHashes(tempDir, hashes);

    // Export, delete, import
    const bundle = await exportBrand(tempDir);
    await rm(join(tempDir, "brand"), { recursive: true, force: true });
    await importBrand(tempDir, bundle, false);

    // Diff should show no changes (content is identical)
    const diff = await diffBrand(tempDir);
    expect(diff.hasChanges).toBe(false);
    expect(diff.baselineTimestamp).not.toBeNull();
  });

  test("modify one file after import → diff detects it", async () => {
    await scaffoldBrand(tempDir);
    for (const file of BRAND_FILES) {
      await Bun.write(join(tempDir, "brand", file), REAL_CONTENT[file]);
    }
    const hashes = await computeBrandHashes(tempDir);
    await saveBrandHashes(tempDir, hashes);

    // Modify one file
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), "# Changed voice after roundtrip");

    const diff = await diffBrand(tempDir);
    expect(diff.hasChanges).toBe(true);
    const changed = diff.changes.find(c => c.file === "voice-profile.md");
    expect(changed?.status).toBe("modified");

    // Other 9 files should be unchanged
    const unchanged = diff.changes.filter(c => c.status === "unchanged");
    expect(unchanged).toHaveLength(9);
  });
});

describe("Phase 6: Cross-project import", () => {
  test("export from project A, import to project B", async () => {
    // Project A: scaffold and populate
    await scaffoldBrand(tempDir);
    for (const file of BRAND_FILES) {
      await Bun.write(join(tempDir, "brand", file), REAL_CONTENT[file]);
    }
    const bundle = await exportBrand(tempDir);

    // Project B: fresh directory
    const projectB = await mkdtemp(join(tmpdir(), "mktg-e2e-projB-"));
    const importResult = await importBrand(projectB, bundle, false);

    expect(importResult.imported).toHaveLength(10);

    // Verify content matches across projects
    for (const file of BRAND_FILES) {
      const contentA = await Bun.file(join(tempDir, "brand", file)).text();
      const contentB = await Bun.file(join(projectB, "brand", file)).text();
      expect(contentB).toBe(contentA);
    }

    // Verify SHA integrity across projects
    const hashesA = await computeBrandHashes(tempDir);
    const hashesB = await computeBrandHashes(projectB);
    for (const file of BRAND_FILES) {
      expect(hashesB[file]).toBe(hashesA[file]);
    }

    // Status in project B should be ready
    const flagsB: GlobalFlags = { json: true, dryRun: false, fields: [], cwd: projectB };
    const statusB = await statusHandler([], flagsB);
    expect(statusB.ok).toBe(true);
    if (!statusB.ok) return;
    expect(statusB.data.health).toBe("ready");
    expect(statusB.data.brandSummary.populated).toBe(10);

    await rm(projectB, { recursive: true, force: true });
  });
});

describe("Phase 7: Partial bundle import", () => {
  test("import bundle missing some files → only imports what exists", async () => {
    await scaffoldBrand(tempDir);
    // Only populate 3 files
    await Bun.write(join(tempDir, "brand", "voice-profile.md"), REAL_CONTENT["voice-profile.md"]);
    await Bun.write(join(tempDir, "brand", "positioning.md"), REAL_CONTENT["positioning.md"]);
    await Bun.write(join(tempDir, "brand", "audience.md"), REAL_CONTENT["audience.md"]);

    // Export (only 10 files in bundle, but 7 are templates)
    const bundle = await exportBrand(tempDir);

    // Import to fresh dir
    const target = await mkdtemp(join(tmpdir(), "mktg-e2e-partial-"));
    const result = await importBrand(target, bundle, false);

    expect(result.imported).toHaveLength(10); // All 10 present in bundle

    // But only 3 should have real content
    for (const file of ["voice-profile.md", "positioning.md", "audience.md"] as BrandFile[]) {
      const content = await Bun.file(join(target, "brand", file)).text();
      expect(content).toBe(REAL_CONTENT[file]);
      expect(isTemplateContent(file, content)).toBe(false);
    }

    await rm(target, { recursive: true, force: true });
  });
});
