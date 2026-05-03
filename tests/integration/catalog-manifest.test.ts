// Integration test: catalog manifest loader — shape validation, license
// allowlist gate, adapter-name collision detection, drift-catcher between
// SKILL.md frontmatter env_vars and catalog.auth.credential_envs.
// Real file I/O, no mocks.

import { describe, test, expect } from "bun:test";
import { join } from "node:path";
import {
  detectAdapterCollisions,
  detectLicenseDenials,
  loadCatalogManifest,
  computeConfiguredStatus,
  isLinkSafeLicense,
  isCopyleftLicense,
  DEFAULT_BUILTIN_PUBLISH_ADAPTERS,
} from "../../src/core/catalogs";
import type { CatalogsManifest, CatalogEntry } from "../../src/types";

// Helper: build a fully-valid CatalogEntry (AGPL + http + null) for test inputs
const makeEntry = (name: string, overrides: Partial<CatalogEntry> = {}): CatalogEntry => ({
  name,
  repo_url: `https://github.com/test/${name}`,
  docs_url: `https://docs.test/${name}`,
  license: "AGPL-3.0",
  version_pinned: "v1.0.0",
  capabilities: { publish_adapters: [name] },
  transport: "http",
  sdk_reference: null,
  auth: {
    style: "bearer",
    base_env: `${name.toUpperCase()}_API_BASE`,
    credential_envs: [`${name.toUpperCase()}_API_KEY`],
    header_format: "bare",
  },
  skills: [name],
  ...overrides,
});

// =========================================================================
// License allowlist predicates
// =========================================================================

describe("license allowlist predicates", () => {
  test("recognizes LINK_SAFE licenses", () => {
    expect(isLinkSafeLicense("MIT")).toBe(true);
    expect(isLinkSafeLicense("Apache-2.0")).toBe(true);
    expect(isLinkSafeLicense("BSD-2-Clause")).toBe(true);
    expect(isLinkSafeLicense("BSD-3-Clause")).toBe(true);
    expect(isLinkSafeLicense("ISC")).toBe(true);
  });

  test("recognizes COPYLEFT licenses incl. AGPL variants", () => {
    expect(isCopyleftLicense("AGPL-3.0")).toBe(true);
    expect(isCopyleftLicense("AGPL-3.0-or-later")).toBe(true);
    expect(isCopyleftLicense("AGPL-3.0-only")).toBe(true);
    expect(isCopyleftLicense("GPL-3.0")).toBe(true);
    expect(isCopyleftLicense("LGPL-3.0")).toBe(true);
  });

  test("doesn't double-classify", () => {
    for (const lic of ["MIT", "Apache-2.0", "BSD-2-Clause"]) {
      expect(isCopyleftLicense(lic)).toBe(false);
    }
    for (const lic of ["AGPL-3.0", "GPL-3.0", "LGPL-3.0"]) {
      expect(isLinkSafeLicense(lic)).toBe(false);
    }
  });
});

// =========================================================================
// License denial gate
// =========================================================================

describe("detectLicenseDenials — copyleft + transport gate", () => {
  test("AGPL + http + null passes (the postiz shape)", () => {
    const manifest: CatalogsManifest = {
      version: 1,
      catalogs: { postiz: makeEntry("postiz") },
    };
    expect(detectLicenseDenials(manifest)).toHaveLength(0);
  });

  test("AGPL + sdk + non-null reference fails", () => {
    const manifest: CatalogsManifest = {
      version: 1,
      catalogs: {
        bad: makeEntry("bad", { transport: "sdk", sdk_reference: "@bad/sdk" }),
      },
    };
    const denials = detectLicenseDenials(manifest);
    expect(denials).toHaveLength(1);
    expect(denials[0]).toMatchObject({
      catalog: "bad",
      license: "AGPL-3.0",
      transport: "sdk",
      sdk_reference: "@bad/sdk",
      reason: "sdk-link-on-copyleft-license",
    });
  });

  test("GPL-3.0 + sdk transport is also denied", () => {
    const manifest: CatalogsManifest = {
      version: 1,
      catalogs: {
        bad: makeEntry("bad", {
          license: "GPL-3.0",
          transport: "sdk",
          sdk_reference: "@bad/sdk",
        }),
      },
    };
    expect(detectLicenseDenials(manifest)).toHaveLength(1);
  });

  test("MIT + sdk + reference passes (link-safe)", () => {
    const manifest: CatalogsManifest = {
      version: 1,
      catalogs: {
        good: makeEntry("good", {
          license: "MIT",
          transport: "sdk",
          sdk_reference: "@good/sdk",
        }),
      },
    };
    expect(detectLicenseDenials(manifest)).toHaveLength(0);
  });
});

// =========================================================================
// Adapter-name collision detection
// =========================================================================

describe("detectAdapterCollisions — catalog vs catalog, catalog vs builtin", () => {
  test("no collision when each catalog has a unique adapter name", () => {
    const manifest: CatalogsManifest = {
      version: 1,
      catalogs: {
        postiz: makeEntry("postiz"),
        mailer: makeEntry("mailer", { capabilities: { email_adapters: ["mailer"] } }),
      },
    };
    expect(detectAdapterCollisions(manifest, { publish_adapters: [] })).toHaveLength(0);
  });

  test("two catalogs declaring same publish adapter → collision", () => {
    const manifest: CatalogsManifest = {
      version: 1,
      catalogs: {
        postiz: makeEntry("postiz", { capabilities: { publish_adapters: ["mastodon"] } }),
        bluesky_bridge: makeEntry("bluesky_bridge", { capabilities: { publish_adapters: ["mastodon"] } }),
      },
    };
    const collisions = detectAdapterCollisions(manifest, { publish_adapters: [] });
    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toMatchObject({
      kind: "publish_adapters",
      adapter: "mastodon",
    });
    expect(collisions[0]!.declaredBy).toEqual(["postiz", "bluesky_bridge"]);
  });

  test("catalog trying to shadow built-in adapter → collision with <builtin>", () => {
    const manifest: CatalogsManifest = {
      version: 1,
      catalogs: {
        evil: makeEntry("evil", { capabilities: { publish_adapters: ["typefully"] } }),
      },
    };
    const collisions = detectAdapterCollisions(manifest, { publish_adapters: ["mktg-native", "typefully", "resend", "file"] });
    expect(collisions).toHaveLength(1);
    expect(collisions[0]!.declaredBy).toEqual(["<builtin>", "evil"]);
  });

  test("collisions across different kinds don't cross-pollute", () => {
    // A publish adapter and a scheduling adapter with the same name are not a collision —
    // they occupy different registries (publish.ts ADAPTERS vs. a future scheduling registry).
    const manifest: CatalogsManifest = {
      version: 1,
      catalogs: {
        a: makeEntry("a", { capabilities: { publish_adapters: ["foo"] } }),
        b: makeEntry("b", { capabilities: { scheduling_adapters: ["foo"] } }),
      },
    };
    expect(detectAdapterCollisions(manifest, { publish_adapters: [] })).toHaveLength(0);
  });

  test("DEFAULT_BUILTIN_PUBLISH_ADAPTERS seeds the expected names", () => {
    expect(DEFAULT_BUILTIN_PUBLISH_ADAPTERS).toEqual(["mktg-native", "typefully", "resend", "file"]);
  });
});

// =========================================================================
// Full loader against the shipped catalogs-manifest.json
// =========================================================================

describe("loadCatalogManifest — against the real shipped manifest", () => {
  test("loads the shipped postiz catalog successfully", async () => {
    const result = await loadCatalogManifest();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.version).toBe(1);
      expect(result.manifest.catalogs.postiz).toBeDefined();
      expect(result.manifest.catalogs.postiz!.license).toBe("AGPL-3.0");
      expect(result.manifest.catalogs.postiz!.transport).toBe("http");
      expect(result.manifest.catalogs.postiz!.sdk_reference).toBeNull();
    }
  });

  test("shipped manifest is collision-free against built-ins", async () => {
    const result = await loadCatalogManifest({ publish_adapters: ["mktg-native", "typefully", "resend", "file"] });
    expect(result.ok).toBe(true);
  });

  test("reloads fresh on every call (no internal cache)", async () => {
    const r1 = await loadCatalogManifest();
    const r2 = await loadCatalogManifest();
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    // Same shape but distinct object references — proves no caching
    if (r1.ok && r2.ok) {
      expect(r1.manifest).not.toBe(r2.manifest);
    }
  });
});

// =========================================================================
// computeConfiguredStatus — env var probe
// =========================================================================

describe("computeConfiguredStatus", () => {
  test("reports configured=true when every env var is set", () => {
    const entry = makeEntry("postiz");
    const status = computeConfiguredStatus(entry, {
      POSTIZ_API_BASE: "https://api.postiz.com",
      POSTIZ_API_KEY: "k_123",
    });
    expect(status.configured).toBe(true);
    expect(status.missingEnvs).toHaveLength(0);
    expect(status.resolvedBase).toBe("https://api.postiz.com");
  });

  test("reports missing envs in declaration order", () => {
    const entry = makeEntry("postiz");
    const status = computeConfiguredStatus(entry, {});
    expect(status.configured).toBe(false);
    expect(status.missingEnvs).toEqual(["POSTIZ_API_BASE", "POSTIZ_API_KEY"]);
    expect(status.resolvedBase).toBeNull();
  });

  test("partial config → not configured, resolved_base set if base_env is set", () => {
    const entry = makeEntry("postiz");
    const status = computeConfiguredStatus(entry, {
      POSTIZ_API_BASE: "https://api.postiz.com",
      // POSTIZ_API_KEY missing
    });
    expect(status.configured).toBe(false);
    expect(status.missingEnvs).toEqual(["POSTIZ_API_KEY"]);
    expect(status.resolvedBase).toBe("https://api.postiz.com");
  });
});

// =========================================================================
// O4 drift-catcher: SKILL.md frontmatter env_vars vs catalog manifest
// =========================================================================

describe("O4 drift-catcher: SKILL.md frontmatter env_vars ⋈ catalog manifest", () => {
  test("for every catalog-contributed skill, frontmatter env_vars equals catalog.auth (base_env ∪ credential_envs)", async () => {
    const result = await loadCatalogManifest();
    if (!result.ok) throw new Error("shipped manifest failed to load");
    for (const [catName, cat] of Object.entries(result.manifest.catalogs)) {
      for (const skillName of cat.skills) {
        // Each catalog-contributed skill may or may not ship a SKILL.md yet.
        // If absent, skip — the test becomes a regression guard for when it exists.
        const skillPath = join(process.cwd(), "skills", skillName, "SKILL.md");
        const skillFile = Bun.file(skillPath);
        if (!(await skillFile.exists())) continue;
        const content = await skillFile.text();
        // Parse YAML frontmatter env_vars (if any) — cheap regex since we only
        // need the `env_vars:` list shape.
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (!fmMatch) continue;
        const envVarsMatch = fmMatch[1]!.match(/env_vars:\s*\[([^\]]*)\]/);
        if (!envVarsMatch) continue;
        const frontmatterEnvs = new Set(
          envVarsMatch[1]!
            .split(",")
            .map(s => s.trim().replace(/^["']|["']$/g, ""))
            .filter(s => s.length > 0),
        );
        const expected = new Set<string>([cat.auth.base_env, ...cat.auth.credential_envs]);
        expect(frontmatterEnvs).toEqual(expected);
        // Log for humans — helps when the test fails to see which catalog
        if (frontmatterEnvs.size === 0) console.log(`(info) catalog ${catName} skill ${skillName} declares no env_vars frontmatter`);
      }
    }
  });
});
