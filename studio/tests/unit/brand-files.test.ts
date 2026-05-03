// tests/unit/brand-files.test.ts — brand/ helpers

import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BRAND_FILE_NAMES,
  BRAND_FILE_SPECS,
  computeFreshness,
  getSpec,
  looksLikeTemplate,
  resolveBrandTemplateRoot,
  resolveBrandPath,
  brandRoot,
} from "../../lib/brand-files.ts";

afterEach(() => {
  delete process.env.MKTG_BRAND_TEMPLATE_DIR;
  delete process.env.MARKETING_CLI_BRAND_DIR;
  delete process.env.MKTG_CLI_ROOT;
  delete process.env.MARKETING_CLI_ROOT;
  delete process.env.MKTG_PROJECT_ROOT;
  delete process.env.MKTG_BRAND_DIR;
});

describe("BRAND_FILE_SPECS canonical set", () => {
  test("declares the 10 canonical brand files in spec order", () => {
    expect(BRAND_FILE_NAMES.length).toBe(10);
    expect(BRAND_FILE_NAMES[0]).toBe("voice-profile.md");
    expect(BRAND_FILE_NAMES).toContain("audience.md");
    expect(BRAND_FILE_NAMES).toContain("competitors.md");
    expect(BRAND_FILE_NAMES).toContain("learnings.md");
  });

  test("every spec has a name + purpose; freshnessDays is null only for append-only files", () => {
    for (const s of BRAND_FILE_SPECS) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.purpose.length).toBeGreaterThan(0);
      if (s.freshnessDays === null) {
        // Only append-only files have null freshness — they're never stale.
        expect(["assets.md", "learnings.md"]).toContain(s.name);
      }
    }
  });

  test("getSpec returns null for unknown files", () => {
    expect(getSpec("does-not-exist.md")).toBeNull();
    expect(getSpec("voice-profile.md")?.skill).toBe("brand-voice");
  });
});

describe("resolveBrandPath", () => {
  test("accepts a bare filename", () => {
    const r = resolveBrandPath("voice-profile.md");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rel).toBe("voice-profile.md");
      expect(r.abs).toContain("/brand/voice-profile.md");
    }
  });

  test("accepts the brand/ prefix", () => {
    const r = resolveBrandPath("brand/voice-profile.md");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rel).toBe("voice-profile.md");
  });

  test("rejects path traversal", () => {
    expect(resolveBrandPath("../../etc/passwd").ok).toBe(false);
    expect(resolveBrandPath("brand/../etc/passwd").ok).toBe(false);
  });

  test("rejects sub-directories (not yet supported)", () => {
    expect(resolveBrandPath("nested/file.md").ok).toBe(false);
    expect(resolveBrandPath("brand/sub/file.md").ok).toBe(false);
  });

  test("rejects non-.md files", () => {
    expect(resolveBrandPath("voice-profile.txt").ok).toBe(false);
    expect(resolveBrandPath("voice-profile").ok).toBe(false);
  });

  test("rejects empty + null bytes", () => {
    expect(resolveBrandPath("").ok).toBe(false);
    expect(resolveBrandPath("evil\x00.md").ok).toBe(false);
  });
});

describe("looksLikeTemplate", () => {
  test("true for short content (under threshold)", () => {
    expect(looksLikeTemplate("voice-profile.md", "# Short\n")).toBe(true);
  });

  test("false for long, real-looking content", () => {
    const long = "# Voice profile\n\n" + "real content. ".repeat(200);
    expect(looksLikeTemplate("voice-profile.md", long)).toBe(false);
  });
});

describe("resolveBrandTemplateRoot", () => {
  test("honors direct template-dir env override", () => {
    const tmp = mkdtempSync(join(tmpdir(), "mktg-template-dir-"));
    writeFileSync(join(tmp, "voice-profile.md"), "# template\n", "utf8");
    process.env.MKTG_BRAND_TEMPLATE_DIR = tmp;
    try {
      expect(resolveBrandTemplateRoot()).toBe(tmp);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test("finds sibling marketing-cli/brand from the local umbrella layout", () => {
    const resolved = resolveBrandTemplateRoot(process.cwd());
    expect(resolved).not.toBeNull();
    expect(resolved?.endsWith("/marketing-cli/brand")).toBe(true);
  });
});

describe("brandRoot", () => {
  test("uses MKTG_PROJECT_ROOT when set", () => {
    process.env.MKTG_PROJECT_ROOT = "/tmp/mktg-project-root";
    expect(brandRoot()).toBe("/tmp/mktg-project-root/brand");
  });

  test("MKTG_BRAND_DIR overrides project root", () => {
    process.env.MKTG_PROJECT_ROOT = "/tmp/mktg-project-root";
    process.env.MKTG_BRAND_DIR = "/tmp/custom-brand";
    expect(brandRoot()).toBe("/tmp/custom-brand");
  });
});

describe("computeFreshness", () => {
  const now = Date.now();

  test("template flag wins over age (template short content)", () => {
    const f = computeFreshness("voice-profile.md", "# Short\n", now);
    expect(f.freshness).toBe("template");
  });

  test("fresh content within window", () => {
    const long = "# Voice\n" + "x".repeat(2_000);
    const f = computeFreshness("voice-profile.md", long, now - 10 * 86_400_000, now);
    expect(f.freshness).toBe("fresh");
  });

  test("stale content past window", () => {
    const long = "# Voice\n" + "x".repeat(2_000);
    // voice-profile.md has a 30-day window
    const f = computeFreshness("voice-profile.md", long, now - 60 * 86_400_000, now);
    expect(f.freshness).toBe("stale");
  });

  test("append-only files are never stale (learnings.md, assets.md)", () => {
    const long = "# Learnings\n" + "x".repeat(2_000);
    const f = computeFreshness("learnings.md", long, now - 365 * 86_400_000, now);
    expect(f.freshness).toBe("fresh");
  });

  test("append-only files never show template freshness", () => {
    const short = "# Assets Log\n";
    const f = computeFreshness("assets.md", short, now - 10_000, now);
    expect(f.freshness).toBe("fresh");
  });
});
