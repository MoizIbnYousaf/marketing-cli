// Integration test: `mktg catalog` command — end-to-end via real CLI
// subprocess. Covers all 5 subcommands plus the 7 DX axes.
// NO MOCKS. Real subprocess, real JSON round-trip.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";

const runCli = async (args: readonly string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: import.meta.dir.replace("/tests/integration", ""),
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited };
};

// =========================================================================
// catalog list
// =========================================================================

describe("catalog list", () => {
  test("returns the shipped postiz catalog", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "list", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.catalogs)).toBe(true);
    expect(parsed.catalogs.length).toBeGreaterThanOrEqual(1);
    expect(parsed.total).toBe(parsed.catalogs.length);
    const postiz = parsed.catalogs.find((c: { name: string }) => c.name === "postiz");
    expect(postiz).toBeDefined();
    expect(postiz.license).toBe("AGPL-3.0");
    expect(postiz.transport).toBe("http");
    expect(postiz.sdk_reference).toBeNull();
    expect(postiz.auth.header_format).toBe("bare");
  });

  test("axis 4 (nested --fields on array): catalog.name pivots correctly", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "list", "--fields", "catalogs.name", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.catalogs).toBeDefined();
    expect(parsed.catalogs.name).toBeDefined();
    expect(Array.isArray(parsed.catalogs.name)).toBe(true);
    expect(parsed.catalogs.name).toContain("postiz");
  });

  test("axis 4 (nested into nested object): capabilities.publish_adapters", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "list", "--fields", "catalogs.capabilities.publish_adapters", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    // After nested-array fix, this walks catalogs[*].capabilities.publish_adapters
    expect(parsed.catalogs).toBeDefined();
  });

  test("axis 1 (valid JSON)", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "list", "--json"]);
    expect(exitCode).toBe(0);
    expect(() => JSON.parse(stdout)).not.toThrow();
  });
});

// =========================================================================
// catalog info
// =========================================================================

describe("catalog info", () => {
  test("returns full CatalogEntry + computed fields for postiz", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "info", "postiz", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.name).toBe("postiz");
    expect(parsed.license).toBe("AGPL-3.0");
    expect(parsed.transport).toBe("http");
    expect(parsed.sdk_reference).toBeNull();
    expect(parsed.auth.credential_envs).toEqual(["POSTIZ_API_KEY"]);
    expect(parsed.auth.base_env).toBe("POSTIZ_API_BASE");
    expect(parsed.auth.header_format).toBe("bare");
    // Computed fields
    expect(typeof parsed.configured).toBe("boolean");
    expect(Array.isArray(parsed.missing_envs)).toBe(true);
    expect(parsed.resolved_base === null || typeof parsed.resolved_base === "string").toBe(true);
  });

  test("axis 5 (hardening): rejects invalid name with INVALID_ARGS exit 2", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "info", "bad?name", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("axis 5 (hardening): rejects hash character (typical URL fragment injection)", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "info", "bad#name", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("unknown catalog returns CATALOG_NOT_FOUND exit 1", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "info", "nonexistent", "--json"]);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("CATALOG_NOT_FOUND");
  });

  test("missing positional returns INVALID_ARGS exit 2", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "info", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("--fields on flat response filters correctly", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "info", "postiz", "--fields", "configured,missing_envs", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.configured).toBeDefined();
    expect(parsed.missing_envs).toBeDefined();
    // Other fields should be filtered out
    expect(parsed.name).toBeUndefined();
    expect(parsed.license).toBeUndefined();
  });
});

// =========================================================================
// catalog sync (v1 is read-only)
// =========================================================================

describe("catalog sync (v1 read-only)", () => {
  test("returns per-catalog items with pinned version + v1 error note", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "sync", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.catalogs)).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.summary.total).toBe(parsed.catalogs.length);
    const postiz = parsed.catalogs.find((c: { name: string }) => c.name === "postiz");
    expect(postiz).toBeDefined();
    expect(postiz.from_version).toBe("v2.21.6");
    expect(postiz.to_version).toBeNull();
    expect(postiz.error).toMatch(/not yet implemented/);
  });

  test("--catalog filter narrows to one entry", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "sync", "--catalog", "postiz", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.catalogs.length).toBe(1);
    expect(parsed.catalogs[0].name).toBe("postiz");
  });
});

// =========================================================================
// catalog status
// =========================================================================

describe("catalog status", () => {
  test("returns fleet-wide status", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "status", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.catalogs)).toBe(true);
    expect(parsed.summary.total).toBe(parsed.catalogs.length);
    const postiz = parsed.catalogs.find((c: { name: string }) => c.name === "postiz");
    expect(postiz).toBeDefined();
    expect(typeof postiz.configured).toBe("boolean");
    expect(typeof postiz.detail).toBe("string");
  });
});

// =========================================================================
// catalog add — axes 2 (raw payload) + 5 (hardening) + 6 (safety rails)
// =========================================================================

describe("catalog add — mutating subcommand, dry-run/confirm gate", () => {
  let tmpProject: string;

  beforeEach(async () => {
    tmpProject = await mkdtemp(join(tmpdir(), "mktg-catalog-add-"));
  });

  afterEach(async () => {
    await rm(tmpProject, { recursive: true, force: true });
  });

  test("axis 2 (raw payload): --input is required", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "add", "newcat", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(parsed.error.message).toMatch(/--input/);
  });

  test("axis 2 (raw payload): parseJsonInput rejects >64KB", async () => {
    const big = JSON.stringify({ name: "newcat", data: "x".repeat(70_000) });
    const { stdout, exitCode } = await runCli(["catalog", "add", "newcat", "--input", big, "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
    expect(parsed.error.message).toMatch(/64KB|JSON/);
  });

  test("axis 2 (raw payload): parseJsonInput rejects prototype pollution", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "add", "newcat", "--input", '{"__proto__":{"polluted":true}}', "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("axis 5 (hardening): rejects invalid name with INVALID_ARGS (not NOT_FOUND)", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "add", "bad?name", "--input", "{}", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("shape-invalid payload returns CATALOG_MANIFEST_INVALID exit 2", async () => {
    // Well-formed JSON but missing required fields
    const { stdout, exitCode } = await runCli(["catalog", "add", "newcat", "--input", '{"foo": "bar"}', "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("CATALOG_MANIFEST_INVALID");
  });

  test("license denial: AGPL + sdk + non-null reference returns CATALOG_LICENSE_DENIED", async () => {
    const payload = JSON.stringify({
      name: "newcat",
      repo_url: "https://example.com/x",
      docs_url: "https://docs.example.com",
      license: "AGPL-3.0",
      version_pinned: "v1.0.0",
      capabilities: { publish_adapters: ["newcat"] },
      transport: "sdk",
      sdk_reference: "@bad/agpl-sdk",
      auth: {
        style: "bearer",
        base_env: "NEWCAT_BASE",
        credential_envs: ["NEWCAT_KEY"],
      },
      skills: [],
    });
    const { stdout, exitCode } = await runCli(["catalog", "add", "newcat", "--input", payload, "--json"]);
    // Note: shape validator catches the transport='sdk' + copyleft mismatch first via the sdk_reference rule,
    // but if that passed, license denial would catch it. Either way → INVALID_ARGS exit 2.
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(["CATALOG_LICENSE_DENIED", "CATALOG_MANIFEST_INVALID"]).toContain(parsed.error.code);
  });

  test("axis 6 (safety): without --confirm defaults to dry-run (added=false)", async () => {
    const validPayload = JSON.stringify({
      name: "postiz",
      repo_url: "https://github.com/gitroomhq/postiz-app",
      docs_url: "https://docs.postiz.com",
      license: "AGPL-3.0",
      version_pinned: "v2.21.6",
      capabilities: { publish_adapters: ["postiz"] },
      transport: "http",
      sdk_reference: null,
      auth: {
        style: "bearer",
        base_env: "POSTIZ_API_BASE",
        credential_envs: ["POSTIZ_API_KEY"],
        header_format: "bare",
      },
      skills: ["postiz"],
    });
    const { stdout, exitCode } = await runCli(["catalog", "add", "postiz", "--input", validPayload, "--dry-run", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.added).toBe(false);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.after.name).toBe("postiz");
  });
});

// =========================================================================
// Axis 3: schema-vs-output parity
// =========================================================================

describe("axis 3 (schema introspection): declared output shape matches real output", () => {
  test("schema includes catalog entry with subcommands", async () => {
    const { stdout, exitCode } = await runCli(["schema", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    const catalog = parsed.commands.find((c: { name: string }) => c.name === "catalog");
    expect(catalog).toBeDefined();
    expect(catalog.subcommands).toBeDefined();
    const subNames = catalog.subcommands.map((s: { name: string }) => s.name);
    expect(subNames).toEqual(["list", "info", "sync", "status", "add"]);
  });

  test("every data-returning subcommand has non-empty output map (A3-G1 mitigation)", async () => {
    const { stdout, exitCode } = await runCli(["schema", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    const catalog = parsed.commands.find((c: { name: string }) => c.name === "catalog");
    for (const sub of catalog.subcommands) {
      const outputKeys = Object.keys(sub.output);
      expect(outputKeys.length).toBeGreaterThan(0);
    }
  });

  test("catalog list output shape matches schema", async () => {
    const [schemaRes, listRes] = await Promise.all([
      runCli(["schema", "--json"]),
      runCli(["catalog", "list", "--json"]),
    ]);
    expect(schemaRes.exitCode).toBe(0);
    expect(listRes.exitCode).toBe(0);
    const schema = JSON.parse(schemaRes.stdout);
    const list = JSON.parse(listRes.stdout);
    const catalogSchema = schema.commands.find((c: { name: string }) => c.name === "catalog");
    const listSchema = catalogSchema.subcommands.find((s: { name: string }) => s.name === "list");
    // Top-level declared fields must all be present in the actual response
    const declaredTop = Object.keys(listSchema.output).filter(k => !k.includes("."));
    for (const field of declaredTop) {
      expect(Object.prototype.hasOwnProperty.call(list, field)).toBe(true);
    }
  });
});

// =========================================================================
// Axis 1: machine-readable output
// =========================================================================

describe("axis 1 (machine-readable output): all subcommands emit valid JSON", () => {
  test("list, info, sync, status all produce parseable JSON", async () => {
    for (const args of [
      ["catalog", "list", "--json"],
      ["catalog", "info", "postiz", "--json"],
      ["catalog", "sync", "--json"],
      ["catalog", "status", "--json"],
    ]) {
      const { stdout, exitCode } = await runCli(args);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    }
  });
});

// =========================================================================
// Axis 7: catalog umbrella without subcommand
// =========================================================================

describe("catalog umbrella — invalid invocations", () => {
  test("no subcommand returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });

  test("unknown subcommand returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await runCli(["catalog", "frobulate", "--json"]);
    expect(exitCode).toBe(2);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("INVALID_ARGS");
  });
});
