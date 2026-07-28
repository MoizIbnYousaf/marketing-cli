// Tests for mktg seo — OpenSEO state sync contract (S3)
// Real file I/O in isolated temp dirs, no mocks.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { BRAND_TEMPLATES } from "../src/core/brand";

const run = async (
  args: string[],
  envOverrides: Record<string, string | undefined> = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  const env: Record<string, string> = { ...process.env, NO_COLOR: "1" } as Record<string, string>;
  for (const [key, value] of Object.entries(envOverrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: import.meta.dir.replace("/tests", ""),
    stdout: "pipe",
    stderr: "pipe",
    env,
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited };
};

const seedKeywordPlan = async (tmp: string, template = false): Promise<void> => {
  await mkdir(join(tmp, "brand"), { recursive: true });
  await writeFile(
    join(tmp, "brand", "keyword-plan.md"),
    template ? BRAND_TEMPLATES["keyword-plan.md"] : `# Keyword Plan\n\nReal researched keywords. ${"x".repeat(400)}\n`,
  );
};

const SYNC_PAYLOAD = {
  version: 1,
  syncedAt: "2026-07-28T10:00:00.000Z",
  keywords: [
    { keyword: "agent marketing cli", intent: "commercial", volume: 720, kd: 12, priority: "high", cluster: "core" },
    { keyword: "ai marketing playbook", intent: "informational", volume: 1400, kd: 28, priority: "med" },
  ],
};

describe("mktg seo status", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "mktg-seo-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  test("unbound project reports not_configured + missing keyword plan", async () => {
    const { stdout, exitCode } = await run(["seo", "status", "--json", "--cwd", tmp], { OPENSEO_API_KEY: undefined, OPENSEO_API_BASE: undefined, OPENSEO_MCP_CONFIGURED: undefined });
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.readiness).toBe("not_configured");
    expect(parsed.project).toBeNull();
    expect(parsed.bindingCorrupt).toBe(false);
    expect(parsed.keywordPlan).toBe("missing");
    expect(parsed.catalog.registered).toBe(true);
    expect(parsed.catalog.mcp.default_url).toBe("https://app.openseo.so/mcp");
  });

  test("api_ready when fully configured (key + base)", async () => {
    const { stdout } = await run(["seo", "status", "--json", "--cwd", tmp], { OPENSEO_API_KEY: "k", OPENSEO_API_BASE: "https://api.openseo.so" });
    const parsed = JSON.parse(stdout);
    expect(parsed.readiness).toBe("api_ready");
    expect(parsed.catalog.configured).toBe(true);
  });

  test("credential without a base is NOT api_ready — half-configured is not readiness", async () => {
    const { stdout } = await run(["seo", "status", "--json", "--cwd", tmp], { OPENSEO_API_KEY: "k", OPENSEO_API_BASE: undefined });
    const parsed = JSON.parse(stdout);
    expect(parsed.readiness).toBe("not_configured");
    expect(parsed.catalog.configured).toBe(false);
    expect(parsed.catalog.missingEnvs).toContain("OPENSEO_API_BASE");
  });

  test("selfhost_ready when base points at a self-hosted instance", async () => {
    const { stdout } = await run(
      ["seo", "status", "--json", "--cwd", tmp],
      { OPENSEO_API_KEY: "k", OPENSEO_API_BASE: "http://localhost:3100" },
    );
    const parsed = JSON.parse(stdout);
    expect(parsed.readiness).toBe("selfhost_ready");
  });

  test("corrupt binding is surfaced, never crash", async () => {
    await mkdir(join(tmp, ".seo"), { recursive: true });
    await writeFile(join(tmp, ".seo", "openseo.json"), "{not json");
    const { stdout, exitCode } = await run(["seo", "status", "--json", "--cwd", tmp], { OPENSEO_API_KEY: undefined, OPENSEO_API_BASE: undefined });
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.bindingCorrupt).toBe(true);
    expect(parsed.project).toBeNull();
  });
});

describe("mktg seo link-project", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "mktg-seo-link-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  test("first link writes the binding without --confirm", async () => {
    const { stdout, exitCode } = await run(["seo", "link-project", "--input", '{"projectId":"proj_1","domain":"example.com"}', "--json", "--cwd", tmp]);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.linked).toBe(true);
    const onDisk = JSON.parse(await readFile(join(tmp, ".seo", "openseo.json"), "utf-8"));
    expect(onDisk.projectId).toBe("proj_1");
    expect(onDisk.mcpUrl).toBe("https://app.openseo.so/mcp");
  });

  test("same project relink is an idempotent no-op", async () => {
    await run(["seo", "link-project", "--input", '{"projectId":"proj_1","domain":"example.com"}', "--json", "--cwd", tmp]);
    const { stdout } = await run(["seo", "link-project", "--input", '{"projectId":"proj_1","domain":"example.com"}', "--json", "--cwd", tmp]);
    const parsed = JSON.parse(stdout);
    expect(parsed.unchanged).toBe(true);
    expect(parsed.linked).toBe(false);
  });

  test("relink to a different project requires --confirm", async () => {
    await run(["seo", "link-project", "--input", '{"projectId":"proj_1","domain":"example.com"}', "--json", "--cwd", tmp]);
    const guarded = JSON.parse((await run(["seo", "link-project", "--input", '{"projectId":"proj_2","domain":"example.com"}', "--json", "--cwd", tmp])).stdout);
    expect(guarded.linked).toBe(false);
    expect(guarded.needsConfirm).toBe(true);
    expect(guarded.previousProjectId).toBe("proj_1");
    // Original binding untouched
    const onDisk = JSON.parse(await readFile(join(tmp, ".seo", "openseo.json"), "utf-8"));
    expect(onDisk.projectId).toBe("proj_1");
    // With --confirm it writes
    const confirmed = JSON.parse((await run(["seo", "link-project", "--input", '{"projectId":"proj_2","domain":"example.com"}', "--confirm", "--json", "--cwd", tmp])).stdout);
    expect(confirmed.linked).toBe(true);
    const relinked = JSON.parse(await readFile(join(tmp, ".seo", "openseo.json"), "utf-8"));
    expect(relinked.projectId).toBe("proj_2");
    expect(relinked.linkedAt).toBe(onDisk.linkedAt); // linkedAt preserved across relink
  });

  test("dry-run never writes", async () => {
    const { stdout } = await run(["seo", "link-project", "--input", '{"projectId":"proj_1","domain":"example.com"}', "--dry-run", "--json", "--cwd", tmp]);
    expect(JSON.parse(stdout).dryRun).toBe(true);
    expect(await Bun.file(join(tmp, ".seo", "openseo.json")).exists()).toBe(false);
  });

  test("rejects protocol-in-domain and control chars", async () => {
    const bad1 = JSON.parse((await run(["seo", "link-project", "--input", '{"projectId":"p","domain":"https://example.com"}', "--json", "--cwd", tmp])).stdout);
    expect(bad1.error.code).toBe("INVALID_ARGS");
    const bad2 = JSON.parse((await run(["seo", "link-project", "--input", '{"projectId":"p\u0007","domain":"example.com"}', "--json", "--cwd", tmp])).stdout);
    expect(bad2.error.code).toBe("INVALID_ARGS");
  });
});

describe("mktg seo sync-keywords", () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), "mktg-seo-sync-")); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  test("missing payload exits 1 with fix guidance", async () => {
    await seedKeywordPlan(tmp);
    const { stdout, exitCode } = await run(["seo", "sync-keywords", "--confirm", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(1);
    const parsed = JSON.parse(stdout);
    expect(parsed.error.code).toBe("NOT_FOUND");
    expect(parsed.error.suggestions.join(" ")).toContain("openseo-keyword-research");
  });

  test("template keyword-plan refuses merge", async () => {
    await seedKeywordPlan(tmp, true);
    await mkdir(join(tmp, ".seo"), { recursive: true });
    await writeFile(join(tmp, ".seo", "keywords-sync.json"), JSON.stringify(SYNC_PAYLOAD));
    const { stdout, exitCode } = await run(["seo", "sync-keywords", "--confirm", "--json", "--cwd", tmp]);
    expect(exitCode).toBe(2);
    expect(JSON.parse(stdout).error.message).toContain("template");
  });

  test("dry-run previews without writing; --confirm merges an atomic section", async () => {
    await seedKeywordPlan(tmp);
    await mkdir(join(tmp, ".seo"), { recursive: true });
    await writeFile(join(tmp, ".seo", "keywords-sync.json"), JSON.stringify(SYNC_PAYLOAD));

    const before = await readFile(join(tmp, "brand", "keyword-plan.md"), "utf-8");
    const preview = JSON.parse((await run(["seo", "sync-keywords", "--dry-run", "--json", "--cwd", tmp])).stdout);
    expect(preview.action).toBe("preview");
    expect(preview.keywords).toBe(2);
    expect(await readFile(join(tmp, "brand", "keyword-plan.md"), "utf-8")).toBe(before);

    const merged = JSON.parse((await run(["seo", "sync-keywords", "--confirm", "--json", "--cwd", tmp])).stdout);
    expect(merged.action).toBe("merged");
    const after = await readFile(join(tmp, "brand", "keyword-plan.md"), "utf-8");
    expect(after).toContain("## OpenSEO Sync (2026-07-28)");
    expect(after).toContain("agent marketing cli");
    expect(after).toContain(before.trim().slice(0, 40)); // original content preserved
  });

  test("second sync replaces the section atomically (no duplication)", async () => {
    await seedKeywordPlan(tmp);
    await mkdir(join(tmp, ".seo"), { recursive: true });
    await writeFile(join(tmp, ".seo", "keywords-sync.json"), JSON.stringify(SYNC_PAYLOAD));
    await run(["seo", "sync-keywords", "--confirm", "--json", "--cwd", tmp]);
    const payload2 = { ...SYNC_PAYLOAD, keywords: [SYNC_PAYLOAD.keywords[0]!] };
    await writeFile(join(tmp, ".seo", "keywords-sync.json"), JSON.stringify(payload2));
    await run(["seo", "sync-keywords", "--confirm", "--json", "--cwd", tmp]);
    const after = await readFile(join(tmp, "brand", "keyword-plan.md"), "utf-8");
    expect(after.match(/## OpenSEO Sync \(/g)!.length).toBe(1);
    expect(after).not.toContain("ai marketing playbook");
  });

  test("binding lastKeywordsSync is stamped on merge", async () => {
    await seedKeywordPlan(tmp);
    await mkdir(join(tmp, ".seo"), { recursive: true });
    await writeFile(join(tmp, ".seo", "keywords-sync.json"), JSON.stringify(SYNC_PAYLOAD));
    await run(["seo", "link-project", "--input", '{"projectId":"proj_1","domain":"example.com"}', "--json", "--cwd", tmp]);
    await run(["seo", "sync-keywords", "--confirm", "--json", "--cwd", tmp]);
    const binding = JSON.parse(await readFile(join(tmp, ".seo", "openseo.json"), "utf-8"));
    expect(binding.lastKeywordsSync).toBe(SYNC_PAYLOAD.syncedAt);
  });

  test("payload validation: bad version, oversized batch, control chars", async () => {
    await seedKeywordPlan(tmp);
    await mkdir(join(tmp, ".seo"), { recursive: true });
    await writeFile(join(tmp, ".seo", "keywords-sync.json"), JSON.stringify({ version: 2, syncedAt: "x", keywords: [] }));
    const badVersion = JSON.parse((await run(["seo", "sync-keywords", "--confirm", "--json", "--cwd", tmp])).stdout);
    expect(badVersion.error.code).toBe("INVALID_ARGS");

    await writeFile(join(tmp, ".seo", "keywords-sync.json"), JSON.stringify({
      version: 1, syncedAt: "x", keywords: [{ keyword: "bad\u0001keyword" }],
    }));
    const ctrl = JSON.parse((await run(["seo", "sync-keywords", "--confirm", "--json", "--cwd", tmp])).stdout);
    expect(ctrl.error.code).toBe("INVALID_ARGS");

    await writeFile(join(tmp, ".seo", "keywords-sync.json"), JSON.stringify({
      version: 1, syncedAt: "x", keywords: Array.from({ length: 501 }, (_, i) => ({ keyword: `kw${i}` })),
    }));
    const oversized = JSON.parse((await run(["seo", "sync-keywords", "--confirm", "--json", "--cwd", tmp])).stdout);
    expect(oversized.error.message).toContain("500");
  });
});

describe("mktg seo open", () => {
  test("returns hosted URL by default and binding projectId when linked", async () => {
    const tmp = await mkdtemp(join(tmpdir(), "mktg-seo-open-"));
    const unbound = JSON.parse((await run(["seo", "open", "--json", "--cwd", tmp])).stdout);
    expect(unbound.url).toBe("https://app.openseo.so");
    expect(unbound.projectId).toBeNull();
    await run(["seo", "link-project", "--input", '{"projectId":"proj_1","domain":"example.com"}', "--json", "--cwd", tmp]);
    const bound = JSON.parse((await run(["seo", "open", "--json", "--cwd", tmp])).stdout);
    expect(bound.projectId).toBe("proj_1");
    await rm(tmp, { recursive: true, force: true });
  });
});
