import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { MANIFEST_SPECS, readManifestVersions } from "../src/core/release-manifests";

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
    // Reads through the same shared registry that `mktg release` writes
    // through, so adding a fifth plugin host (e.g., a future Cursor manifest)
    // is one MANIFEST_SPECS append, not a divergent edit in two surfaces.
    const versions = await readManifestVersions(root);
    for (const spec of MANIFEST_SPECS) {
      const v = versions.get(spec.relativePath);
      expect(v, `${spec.relativePath} version`).toBe(pkg.version);
    }
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
