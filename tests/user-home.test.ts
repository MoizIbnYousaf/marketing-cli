// mktg — home directory isolation guard.
//
// The suite must never touch the developer's real home. tests/preload.ts
// points HOME at a temp directory; this file fails loudly if that stops being
// true, and checks that the CLI's install paths follow HOME.

import { describe, expect, test } from "bun:test";
import { tmpdir } from "node:os";
import { realpathSync } from "node:fs";
import { userHome } from "../src/core/user-home";
import { getSkillsInstallDir } from "../src/core/skills";
import { getAgentsInstallDir } from "../src/core/agents";

describe("test home isolation", () => {
  test("HOME is an isolated temp directory, not the real user home", () => {
    const realHome = process.env.MKTG_TEST_REAL_USER_HOME;
    expect(typeof realHome).toBe("string");
    expect(userHome()).not.toBe(realHome);
    expect(realpathSync(userHome()).startsWith(realpathSync(tmpdir()))).toBe(true);
  });

  test("skill and agent install directories resolve under the isolated home", () => {
    expect(getSkillsInstallDir().startsWith(userHome())).toBe(true);
    expect(getAgentsInstallDir().startsWith(userHome())).toBe(true);
  });

  test("userHome falls back to the OS lookup when HOME is empty", () => {
    const saved = process.env.HOME;
    try {
      process.env.HOME = "";
      expect(userHome().length).toBeGreaterThan(0);
    } finally {
      process.env.HOME = saved;
    }
  });
});
