// Test preload — isolates the user's home directory for the whole test run.
//
// Loaded by `bun test` before any test file (see bunfig.toml). It points HOME
// at a fresh temp directory so nothing in the suite can write into the
// developer's real ~/.claude (installed skills and agents) or ~/.mktg
// (verify and ship-check summaries). Child processes inherit it through
// process.env; in-process code reads it through src/core/user-home.ts.
//
// Real file I/O still happens, in a real directory: this is isolation, not a
// mock. Tests that need a specific home set their own HOME on top of this.

import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const realHome = process.env.HOME && process.env.HOME.length > 0 ? process.env.HOME : homedir();
const isolatedHome = mkdtempSync(join(tmpdir(), "mktg-test-home-"));

// Kept so a test can assert that it is NOT running against the real home.
process.env.MKTG_TEST_REAL_USER_HOME = realHome;
process.env.HOME = isolatedHome;

// Tools that keep their own state under HOME still need to work from an
// empty one. Git needs an identity for the commits release tests create, and
// Bun should keep using its existing install cache instead of re-downloading.
process.env.GIT_AUTHOR_NAME ??= "mktg tests";
process.env.GIT_AUTHOR_EMAIL ??= "tests@mktg.invalid";
process.env.GIT_COMMITTER_NAME ??= "mktg tests";
process.env.GIT_COMMITTER_EMAIL ??= "tests@mktg.invalid";
process.env.BUN_INSTALL ??= join(realHome, ".bun");

process.on("exit", () => {
  try {
    rmSync(isolatedHome, { recursive: true, force: true });
  } catch {
    // Best effort: a leftover temp dir is harmless.
  }
});
