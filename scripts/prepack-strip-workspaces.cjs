#!/usr/bin/env node

// prepack hook: strip the "workspaces" field from package.json before npm
// builds the tarball. The local file is backed up to package.json.prepack-backup
// and restored by postpack-restore.cjs after npm finishes packing.
//
// Why: keeping "workspaces": ["studio"] in the *published* package.json triggers
// Next.js' workspace-root inference race when a fresh `npm i -g marketing-cli`
// runs `mktg studio` against the global install. Removing it at publish time
// eliminates the race entirely while keeping the field locally for dev.

const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(packageRoot, "package.json");
const backupPath = path.join(packageRoot, "package.json.prepack-backup");

const log = (message) => {
  if (process.env.MKTG_PREPACK_QUIET !== "1") {
    console.error(`[prepack] ${message}`);
  }
};

const original = fs.readFileSync(packageJsonPath, "utf8");

// Snapshot the on-disk file so postpack can restore it byte-for-byte.
fs.writeFileSync(backupPath, original);
log(`backed up package.json -> ${path.basename(backupPath)}`);

const pkg = JSON.parse(original);

if (!Object.prototype.hasOwnProperty.call(pkg, "workspaces")) {
  log("no `workspaces` field present; nothing to strip");
  process.exit(0);
}

delete pkg.workspaces;

// Preserve 2-space indent + trailing newline to match repo convention.
fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
log("stripped `workspaces` field for the published tarball");
