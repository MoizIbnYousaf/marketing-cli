#!/usr/bin/env node

// postpack hook: restore the local package.json from the prepack backup so the
// "workspaces" field stays in the working tree for dev. Pairs with
// prepack-strip-workspaces.cjs.

const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(packageRoot, "package.json");
const backupPath = path.join(packageRoot, "package.json.prepack-backup");

const log = (message) => {
  if (process.env.MKTG_PREPACK_QUIET !== "1") {
    console.error(`[postpack] ${message}`);
  }
};

if (!fs.existsSync(backupPath)) {
  // Nothing to restore. Either prepack didn't run (e.g., manual rerun) or the
  // backup was already cleaned up. Treat as a no-op rather than fail the pack.
  log("no backup file found; skipping restore");
  process.exit(0);
}

const backup = fs.readFileSync(backupPath, "utf8");
fs.writeFileSync(packageJsonPath, backup);
fs.unlinkSync(backupPath);
log("restored package.json from backup");
