// DOCTOR --CONFIGURE — Guided integration setup for agent consumption.
// Real temp dirs. NO MOCKS. NO NETWORK CALLS.
//
// Agent DX Axes Validated:
//   Axis 1: MACHINE-READABLE OUTPUT — structured JSON with envVar, configured, docsUrl, exportCommand
//   Axis 2: RAW PAYLOAD INPUT — --configure=value and --configure value both work
//   Axis 5: INPUT HARDENING — unknown integrations return structured error with suggestions

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { GlobalFlags } from "../../src/types";
import { handler as doctorHandler } from "../../src/commands/doctor";
import { INTEGRATION_CONFIG } from "../../src/core/integrations";

let tempDir: string;
let flags: GlobalFlags;

type ConfigureResult = {
  integration: string;
  envVar: string;
  configured: boolean;
  docsUrl: string;
  exportCommand: string;
};

type ListIntegrationsResult = {
  integrations: readonly ConfigureResult[];
};

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-doctor-configure-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ==================== NAMED INTEGRATION ====================

describe("--configure <integration>", () => {
  test("returns expected shape for typefully", async () => {
    const result = await doctorHandler(["--configure", "typefully"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    const data = result.data as ConfigureResult;
    expect(data.integration).toBe("typefully");
    expect(data.envVar).toBe("TYPEFULLY_API_KEY");
    expect(typeof data.configured).toBe("boolean");
    expect(data.docsUrl).toBe("https://typefully.com/settings/api");
    expect(data.exportCommand).toBe("export TYPEFULLY_API_KEY=<your-api-key>");
  });

  test("returns expected shape for resend", async () => {
    const result = await doctorHandler(["--configure", "resend"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    const data = result.data as ConfigureResult;
    expect(data.integration).toBe("resend");
    expect(data.envVar).toBe("RESEND_API_KEY");
    expect(typeof data.configured).toBe("boolean");
    expect(data.docsUrl).toBe("https://resend.com/api-keys");
    expect(data.exportCommand).toBe("export RESEND_API_KEY=<your-api-key>");
  });

  test("output includes all required fields", async () => {
    const result = await doctorHandler(["--configure", "typefully"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    const data = result.data as ConfigureResult;
    expect("integration" in data).toBe(true);
    expect("envVar" in data).toBe(true);
    expect("configured" in data).toBe(true);
    expect("docsUrl" in data).toBe(true);
    expect("exportCommand" in data).toBe(true);
  });

  test("--configure=typefully (equals syntax) works", async () => {
    const result = await doctorHandler(["--configure=typefully"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    const data = result.data as ConfigureResult;
    expect(data.integration).toBe("typefully");
  });

  test("exportCommand uses correct env var name", async () => {
    for (const [name, cfg] of Object.entries(INTEGRATION_CONFIG)) {
      const result = await doctorHandler(["--configure", name], flags);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected ok");
      const data = result.data as ConfigureResult;
      expect(data.exportCommand).toBe(`export ${cfg.envVar}=<your-api-key>`);
    }
  });
});

// ==================== UNKNOWN INTEGRATION ====================

describe("--configure unknown-integration", () => {
  test("returns error with available integrations list", async () => {
    const result = await doctorHandler(["--configure", "unknown-integration"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error");
    expect(result.error.code).toBe("INVALID_ARGS");
    expect(result.error.message).toContain("unknown-integration");
  });

  test("error message includes available integrations", async () => {
    const result = await doctorHandler(["--configure", "not-real"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error");
    // Should mention at least one known integration
    const available = Object.keys(INTEGRATION_CONFIG);
    const mentionsOne = available.some(
      name => result.error.message.includes(name) || result.error.suggestions.some(s => s.includes(name)),
    );
    expect(mentionsOne).toBe(true);
  });

  test("error suggestions include configure commands for known integrations", async () => {
    const result = await doctorHandler(["--configure", "bogus"], flags);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error");
    expect(result.error.suggestions.length).toBeGreaterThan(0);
    expect(result.error.suggestions.some(s => s.includes("--configure"))).toBe(true);
  });
});

// ==================== LIST ALL INTEGRATIONS ====================

describe("--configure (bare, no value)", () => {
  test("lists all available integrations", async () => {
    const result = await doctorHandler(["--configure"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    const data = result.data as ListIntegrationsResult;
    expect(Array.isArray(data.integrations)).toBe(true);
    expect(data.integrations.length).toBe(Object.keys(INTEGRATION_CONFIG).length);
  });

  test("each integration entry has required fields", async () => {
    const result = await doctorHandler(["--configure"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    const data = result.data as ListIntegrationsResult;
    for (const entry of data.integrations) {
      expect(typeof entry.integration).toBe("string");
      expect(typeof entry.envVar).toBe("string");
      expect(typeof entry.configured).toBe("boolean");
      expect(typeof entry.docsUrl).toBe("string");
      expect(typeof entry.exportCommand).toBe("string");
      expect(entry.exportCommand).toContain(entry.envVar);
    }
  });

  test("typefully and resend both appear in list", async () => {
    const result = await doctorHandler(["--configure"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    const data = result.data as ListIntegrationsResult;
    const names = data.integrations.map(i => i.integration);
    expect(names).toContain("typefully");
    expect(names).toContain("resend");
  });
});

// ==================== DRY RUN ====================

describe("--configure with --dry-run", () => {
  test("dry-run returns configure result without error", async () => {
    const dryFlags = { ...flags, dryRun: true };
    const result = await doctorHandler(["--configure", "typefully"], dryFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    const data = result.data as ConfigureResult;
    expect(data.integration).toBe("typefully");
    expect(data.envVar).toBe("TYPEFULLY_API_KEY");
  });

  test("dry-run bare --configure lists integrations", async () => {
    const dryFlags = { ...flags, dryRun: true };
    const result = await doctorHandler(["--configure"], dryFlags);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok");
    const data = result.data as ListIntegrationsResult;
    expect(Array.isArray(data.integrations)).toBe(true);
  });
});
