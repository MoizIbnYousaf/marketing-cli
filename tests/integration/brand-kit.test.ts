// Integration test: Brand Kit Subcommand
// Parses creative-kit.md into structured brand tokens.
// Real file I/O in isolated temp dirs. NO MOCKS.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { handler as brandHandler } from "../../src/commands/brand";
import { scaffoldBrand } from "../../src/core/brand";
import type { GlobalFlags } from "../../src/types";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-brand-kit-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("brand kit — no brand directory", () => {
  test("returns notFound when brand/ does not exist", async () => {
    const result = await brandHandler(["kit"], flags);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("brand kit — template creative-kit.md", () => {
  test("returns template freshness with null tokens", async () => {
    await scaffoldBrand(tempDir);
    const result = await brandHandler(["kit"], flags);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.tokens).toBeNull();
      expect(result.data.source).toBe("creative-kit.md");
      expect(result.data.freshness).toBe("template");
      expect(result.data.completeness).toBe(0);
    }
  });
});

describe("brand kit — populated creative-kit.md", () => {
  const populatedKit = `# Creative Kit

## Brand Colors

- **Primary:** #6366F1 (indigo)
- **Secondary:** #7C3AED (violet)
- **Accent:** #F59E0B (amber)
- **Background:** #0F172A (slate-900)

## Typography

- **Headings:** Space Grotesk Bold
- **Body:** Inter Regular, 16px
- **Code:** JetBrains Mono

## Visual Style

- **Mood:** Developer-friendly, minimal, dark mode
- **Photography:** No stock photos, use screenshots and diagrams
- **Icons:** Lucide icons, 24px stroke

## Visual Brand Style

- **Primary Aesthetic:** Swiss Design x ASCII
- **Lighting:** rim lighting with warm tones
- **Backgrounds:** dark with warm accents
- **Composition:** single focal point, generous negative space
- **Mood:** cozy futurism -- tech that feels human
- **Avoid:** generic tech imagery, cold/sterile, stock photos
- **Reference Prompts:** A developer workspace with warm lighting
`;

  beforeEach(async () => {
    await scaffoldBrand(tempDir);
    await writeFile(join(tempDir, "brand", "creative-kit.md"), populatedKit);
  });

  test("parses all token sections", async () => {
    const result = await brandHandler(["kit"], flags);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const { tokens, completeness } = result.data;
      expect(tokens.colors.primary).toBe("#6366F1");
      expect(tokens.colors.secondary).toBe("#7C3AED");
      expect(tokens.colors.accent).toBe("#F59E0B");
      expect(tokens.colors.background).toBe("#0F172A");
      expect(tokens.typography.headings).toBe("Space Grotesk Bold");
      expect(tokens.typography.body).toBe("Inter Regular, 16px");
      expect(tokens.typography.code).toBe("JetBrains Mono");
      expect(tokens.visual.mood).toBe("Developer-friendly, minimal, dark mode");
      expect(tokens.visualBrandStyle.primaryAesthetic).toBe("Swiss Design x ASCII");
      expect(tokens.visualBrandStyle.lighting).toBe("rim lighting with warm tones");
      expect(tokens.visualBrandStyle.avoid).toBe("generic tech imagery, cold/sterile, stock photos");
      expect(completeness).toBeGreaterThanOrEqual(80);
    }
  });

  test("get colors returns just the color palette", async () => {
    const result = await brandHandler(["kit", "get", "colors"], flags);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.section).toBe("colors");
      expect(result.data.data.primary).toBe("#6366F1");
      expect(result.data.data.secondary).toBe("#7C3AED");
    }
  });

  test("get typography returns just typography", async () => {
    const result = await brandHandler(["kit", "get", "typography"], flags);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.section).toBe("typography");
      expect(result.data.data.headings).toBe("Space Grotesk Bold");
    }
  });

  test("get visualBrandStyle returns visual brand style", async () => {
    const result = await brandHandler(["kit", "get", "visualBrandStyle"], flags);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.section).toBe("visualBrandStyle");
      expect(result.data.data.primaryAesthetic).toBe("Swiss Design x ASCII");
    }
  });

  test("get with invalid section returns error", async () => {
    const result = await brandHandler(["kit", "get", "nonexistent"], flags);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGS");
    }
  });

  test("get without section name returns error", async () => {
    const result = await brandHandler(["kit", "get"], flags);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_ARGS");
    }
  });
});

describe("brand kit — partial creative-kit.md", () => {
  test("handles partially filled kit with null for missing fields", async () => {
    await scaffoldBrand(tempDir);
    const partialKit = `# Creative Kit

## Brand Colors

- **Primary:** #6366F1

## Typography

- **Headings:** Inter Bold

## Visual Style

## Visual Brand Style
`;
    await writeFile(join(tempDir, "brand", "creative-kit.md"), partialKit);
    const result = await brandHandler(["kit"], flags);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.tokens.colors.primary).toBe("#6366F1");
      expect(result.data.tokens.colors.secondary).toBeNull();
      expect(result.data.tokens.typography.headings).toBe("Inter Bold");
      expect(result.data.tokens.typography.body).toBeNull();
      expect(result.data.completeness).toBeGreaterThan(0);
      expect(result.data.completeness).toBeLessThan(50);
    }
  });
});
