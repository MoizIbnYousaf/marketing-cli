// Tests for src/core/paths.ts — package root resolution
// No mocks. Real file I/O.

import { describe, test, expect } from "bun:test";
import { existsSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { getPackageRoot } from "../src/core/paths";

describe("getPackageRoot", () => {
  test("returns a path that contains skills-manifest.json", () => {
    const root = getPackageRoot();
    const manifestPath = join(root, "skills-manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
  });

  test("returns a path that contains agents-manifest.json", () => {
    const root = getPackageRoot();
    const manifestPath = join(root, "agents-manifest.json");
    expect(existsSync(manifestPath)).toBe(true);
  });

  test("returns an absolute path", () => {
    const root = getPackageRoot();
    expect(isAbsolute(root)).toBe(true);
  });

  test("returns a directory that exists", () => {
    const root = getPackageRoot();
    expect(existsSync(root)).toBe(true);
    expect(statSync(root).isDirectory()).toBe(true);
  });
});
