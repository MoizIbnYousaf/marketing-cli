import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { resolveRepositoryLayout } from "../src/core/monorepo";

describe("repository layout overrides", () => {
  test("MKTG_CLI_PATH selects an explicit CLI checkout", () => {
    const cliRoot = resolve("/tmp/explicit-marketing-cli");
    const layout = resolveRepositoryLayout(import.meta.url, { MKTG_CLI_PATH: cliRoot });
    expect(layout.cliRoot).toBe(cliRoot);
    expect(layout.ecosystemRoot).toBe(resolve("/tmp"));
    expect(layout.studioRoot).toBe(resolve("/tmp/mktg-studio"));
  });

  test("MKTG_STUDIO_BIN selects the Studio owning the launcher", () => {
    const cliRoot = resolve("/tmp/explicit-marketing-cli");
    const studioBin = resolve("/tmp/explicit-studio/bin/mktg-studio.ts");
    const layout = resolveRepositoryLayout(import.meta.url, {
      MKTG_CLI_PATH: cliRoot,
      MKTG_STUDIO_BIN: studioBin,
    });
    expect(layout.cliRoot).toBe(cliRoot);
    expect(layout.studioRoot).toBe(resolve("/tmp/explicit-studio"));
  });
});
