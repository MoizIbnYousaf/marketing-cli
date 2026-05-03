import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const pkg = await Bun.file(join(root, "package.json")).json() as {
  version: string;
  files: string[];
};

const readJson = async <T>(path: string): Promise<T> =>
  await Bun.file(join(root, path)).json() as T;

describe("agent packaging surfaces", () => {
  test("ships plugin metadata and agent docs in npm package files", () => {
    expect(pkg.files).toContain(".claude-plugin");
    expect(pkg.files).toContain(".codex-plugin");
    expect(pkg.files).toContain("gemini-extension.json");
    expect(pkg.files).toContain("skills");
    expect(pkg.files).toContain("agents");
  });

  test("plugin metadata files exist", () => {
    expect(existsSync(join(root, ".claude-plugin", "plugin.json"))).toBe(true);
    expect(existsSync(join(root, ".claude-plugin", "marketplace.json"))).toBe(true);
    expect(existsSync(join(root, ".codex-plugin", "plugin.json"))).toBe(true);
    expect(existsSync(join(root, "gemini-extension.json"))).toBe(true);
    expect(existsSync(join(root, "skills", "README.md"))).toBe(true);
    expect(existsSync(join(root, "agents", "README.md"))).toBe(true);
  });

  test("agent plugin versions match package version", async () => {
    const claude = await readJson<{ version: string }>(".claude-plugin/plugin.json");
    const codex = await readJson<{ version: string }>(".codex-plugin/plugin.json");
    const gemini = await readJson<{ version: string }>("gemini-extension.json");
    const marketplace = await readJson<{ plugins: Array<{ version: string }> }>(".claude-plugin/marketplace.json");

    expect(claude.version).toBe(pkg.version);
    expect(codex.version).toBe(pkg.version);
    expect(gemini.version).toBe(pkg.version);
    expect(marketplace.plugins[0]?.version).toBe(pkg.version);
  });

  test("codex plugin advertises skills and interface metadata", async () => {
    const codex = await readJson<{
      skills: string;
      interface: { displayName: string; capabilities: string[] };
    }>(".codex-plugin/plugin.json");

    expect(codex.skills).toBe("./skills/");
    expect(codex.interface.displayName).toBe("Marketing CLI");
    expect(codex.interface.capabilities).toContain("Read");
    expect(codex.interface.capabilities).toContain("Write");
  });
});
