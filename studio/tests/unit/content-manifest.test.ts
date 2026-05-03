import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildContentManifest,
  contentAssetIdForPath,
  readContentFile,
  writeContentFile,
  writeContentMeta,
} from "../../lib/content-manifest.ts";

let roots: string[] = [];

function makeProject(): string {
  const root = mkdtempSync(join(tmpdir(), "mktg-content-manifest-"));
  roots.push(root);
  mkdirSync(join(root, "brand"), { recursive: true });
  mkdirSync(join(root, "assets"), { recursive: true });
  writeFileSync(
    join(root, "brand", "assets.md"),
    [
      "# Assets Log",
      "",
      "| Date | Type | Location | Skill | Notes |",
      "| --- | --- | --- | --- | --- |",
      "| 2026-04-26 | Image | assets/hero.png | imagegen | Launch hero |",
    ].join("\n"),
    "utf-8",
  );
  writeFileSync(join(root, "assets", "hero.png"), "fake-png", "utf-8");
  writeFileSync(join(root, "launch.md"), "# Launch Plan\n", "utf-8");
  return root;
}

afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots = [];
});

describe("buildContentManifest", () => {
  test("normalizes brand asset rows, media files, and markdown files into one manifest", () => {
    const root = makeProject();
    const manifest = buildContentManifest(root);
    const hero = manifest.assets.find((asset) => asset.relativePath === "assets/hero.png");
    const launch = manifest.assets.find((asset) => asset.relativePath === "launch.md");

    expect(manifest.projectRoot).toBe(root);
    expect(manifest.stats.images).toBe(1);
    expect(manifest.stats.markdown).toBeGreaterThanOrEqual(2);
    expect(hero?.kind).toBe("image");
    expect(hero?.title).toBe("Launch hero");
    expect(hero?.mediaUrl).toContain("/api/cmo/content/media");
    expect(launch?.title).toBe("Launch Plan");
  });

  test("applies JSON sidecar metadata by stable asset id", () => {
    const root = makeProject();
    const id = contentAssetIdForPath("assets/hero.png");
    writeContentMeta(
      {
        schemaVersion: 1,
        assets: {
          [id]: {
            status: "approved",
            tags: ["launch"],
            orderKey: "a",
          },
        },
        groups: {},
      },
      root,
    );

    const hero = buildContentManifest(root).assets.find((asset) => asset.id === id);
    expect(hero?.status).toBe("approved");
    expect(hero?.tags).toEqual(["launch"]);
    expect(hero?.orderKey).toBe("a");
  });
});

describe("content file helpers", () => {
  test("reads and writes only project-local text artifacts with optimistic locking", () => {
    const root = makeProject();
    const current = readContentFile("brand/assets.md", root);
    const write = writeContentFile("brand/assets.md", `${current.content}\nmore\n`, current.mtime, root);
    expect(write.ok).toBe(true);
    if (write.ok) {
      expect(write.path).toBe("brand/assets.md");
      expect(write.bytes).toBeGreaterThan(current.bytes);
    }

    const stale = writeContentFile("brand/assets.md", "stale", current.mtime, root);
    expect(stale.ok).toBe(false);
  });

  test("rejects absolute paths", () => {
    const root = makeProject();
    expect(() => readContentFile(join(root, "brand", "assets.md"), root)).toThrow("absolute paths");
  });
});
