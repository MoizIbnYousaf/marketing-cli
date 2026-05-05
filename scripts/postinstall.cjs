#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const packageRoot = path.resolve(__dirname, "..");
const skillsSource = path.join(packageRoot, "skills");
const agentsSource = path.join(packageRoot, "agents");
const skillsManifestPath = path.join(packageRoot, "skills-manifest.json");
const agentsManifestPath = path.join(packageRoot, "agents-manifest.json");

const isGlobalInstall =
  process.env.npm_config_global === "true" ||
  process.env.npm_config_global === "1" ||
  process.env.MKTG_POSTINSTALL_FORCE === "1";

const log = (message) => {
  if (process.env.MKTG_POSTINSTALL_QUIET !== "1") {
    console.error(message);
  }
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

// Resolve the real user's home directory + ownership info.
//
// Under `sudo npm i -g ...`, `process.env.HOME` and `os.homedir()` resolve to
// `/var/root` (macOS) or `/root` (Linux) — the *root* user's home. Skills and
// agents installed there are invisible to the human user's Claude Code. We
// detect the sudo case via SUDO_USER/SUDO_UID/SUDO_GID and resolve the *real*
// user's home so we can install there and chown the files back afterwards.
//
// Note: we deliberately do NOT use `os.userInfo({uid})` — Node silently
// ignores the `uid` option (only `encoding` is honored), so it just returns
// the current process's info, which under real sudo is root (homedir
// `/var/root`). That's exactly the wrong answer.
//
// Resolution order (sudo case):
//   1. MKTG_TEST_REAL_HOME (test escape hatch)
//   2. /Users/$SUDO_USER (macOS) or /home/$SUDO_USER (Linux) if it exists
//   3. dscl (macOS) / getent (Linux) lookup of the real homedir
//   4. Graceful skip with a clear log message
const resolveRealHome = () => {
  const sudoUser = process.env.SUDO_USER;
  const sudoUidRaw = process.env.SUDO_UID;
  const sudoGidRaw = process.env.SUDO_GID;

  if (!sudoUser) {
    return { home: os.homedir(), uid: null, gid: null, viaSudo: false };
  }

  const uid = sudoUidRaw ? parseInt(sudoUidRaw, 10) : null;
  const gid = sudoGidRaw ? parseInt(sudoGidRaw, 10) : null;

  if (process.env.MKTG_TEST_REAL_HOME) {
    return {
      home: process.env.MKTG_TEST_REAL_HOME,
      uid,
      gid,
      viaSudo: true,
    };
  }

  const guess = process.platform === "darwin" ? `/Users/${sudoUser}` : `/home/${sudoUser}`;
  if (fs.existsSync(guess)) {
    return { home: guess, uid, gid, viaSudo: true };
  }

  // Last-resort lookup via the platform's user-database tooling.
  try {
    const { execFileSync } = require("node:child_process");
    if (process.platform === "darwin") {
      const out = execFileSync(
        "dscl",
        [".", "-read", `/Users/${sudoUser}`, "NFSHomeDirectory"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000 },
      );
      const match = out.match(/NFSHomeDirectory:\s*(.+?)\s*$/m);
      if (match && match[1] && fs.existsSync(match[1])) {
        return { home: match[1], uid, gid, viaSudo: true };
      }
    } else {
      const out = execFileSync("getent", ["passwd", sudoUser], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 5000,
      });
      const parts = out.split(":");
      if (parts.length >= 6 && parts[5] && fs.existsSync(parts[5])) {
        return { home: parts[5], uid, gid, viaSudo: true };
      }
    }
  } catch {
    // Fall through to graceful failure below.
  }

  return { home: null, uid, gid, viaSudo: true };
};

const chownRecursive = (target, uid, gid) => {
  if (uid === null || gid === null) return;
  try {
    const stat = fs.lstatSync(target);
    fs.lchownSync(target, uid, gid);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
        chownRecursive(path.join(target, entry.name), uid, gid);
      }
    }
  } catch (err) {
    log(`⚠️  chown failed for ${target}: ${err && err.message ? err.message : String(err)}. You may need to run: sudo chown -R $(whoami) ~/.claude`);
  }
};

const copyFilePreservingMode = (source, target) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  const mode = fs.statSync(source).mode;
  if (mode & 0o111) {
    fs.chmodSync(target, 0o755);
  }
};

const copyDirectory = (source, target) => {
  if (!fs.existsSync(source)) return;

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      copyFilePreservingMode(sourcePath, targetPath);
    }
  }
};

const installSkills = (home) => {
  const manifest = readJson(skillsManifestPath);
  const targetRoot = path.join(home, ".claude", "skills");
  let installed = 0;

  fs.mkdirSync(targetRoot, { recursive: true });

  for (const skillName of Object.keys(manifest.skills ?? {})) {
    const sourceDir = path.join(skillsSource, skillName);
    const skillFile = path.join(sourceDir, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;

    copyDirectory(sourceDir, path.join(targetRoot, skillName));
    installed += 1;
  }

  return { installed, targetRoot };
};

const installAgents = (home) => {
  const manifest = readJson(agentsManifestPath);
  const targetRoot = path.join(home, ".claude", "agents");
  let installed = 0;

  fs.mkdirSync(targetRoot, { recursive: true });

  for (const [agentName, entry] of Object.entries(manifest.agents ?? {})) {
    if (!entry || typeof entry.file !== "string") continue;

    const sourceFile = path.join(agentsSource, entry.file);
    if (!fs.existsSync(sourceFile)) continue;

    copyFilePreservingMode(sourceFile, path.join(targetRoot, `mktg-${agentName}.md`));
    installed += 1;
  }

  return { installed, targetRoot };
};

try {
  if (!isGlobalInstall) {
    log("mktg postinstall: skipped Claude skill install for non-global install. Run `mktg init` when ready.");
    process.exit(0);
  }

  const { home, uid, gid, viaSudo } = resolveRealHome();

  if (viaSudo && !home) {
    log(
      "⚠️  mktg postinstall: detected sudo install but couldn't resolve your real home directory.",
    );
    log(
      "    Skills were NOT installed to ~/.claude/. Run `mktg update` (as your normal user) after install completes.",
    );
    process.exit(0);
  }

  if (viaSudo) {
    log(
      `ℹ️  mktg postinstall: detected sudo install — installing to ${home}/.claude/ (your real home, not ${os.homedir()}).`,
    );
  }

  const skills = installSkills(home);
  const agents = installAgents(home);

  if (viaSudo) {
    chownRecursive(skills.targetRoot, uid, gid);
    chownRecursive(agents.targetRoot, uid, gid);
    // Also chown the parent .claude dir so subsequent writes by the real user
    // don't trip over a root-owned ancestor.
    chownRecursive(path.join(home, ".claude"), uid, gid);
  }

  log(`mktg postinstall: installed ${skills.installed} skills and ${agents.installed} agents for Claude Code.`);

  // Optional sibling CLIs that pair with bundled skills. These install
  // automatically alongside marketing-cli so users running
  // `npm i -g marketing-cli` get a working setup in one shot. Skip with
  // MKTG_SKIP_OPTIONAL_DEPS=1. Tests skip via MKTG_TEST_REAL_HOME (which
  // signals a controlled test environment — running real npm i during tests
  // would hit network timeouts and modify the user's global npm install).
  // Each install is fail-soft — a network or permission error here must NOT
  // break the marketing-cli install itself.
  // Tests set MKTG_POSTINSTALL_QUIET=1 to silence the postinstall — we use
  // the same signal to skip optional CLI installs because tests run in
  // sandboxed temp homes where running real `npm i -g` would either modify
  // the user's global install or hit network timeouts.
  if (
    process.env.MKTG_SKIP_OPTIONAL_DEPS !== "1" &&
    !process.env.MKTG_TEST_REAL_HOME &&
    process.env.MKTG_POSTINSTALL_QUIET !== "1"
  ) {
    const { execSync } = require("node:child_process");
    const optionalDeps = [
      {
        pkg: "@higgsfield/cli",
        purpose: "AI image + video generation (powers higgsfield-generate / soul-id / product-photoshoot skills)",
      },
    ];

    for (const dep of optionalDeps) {
      try {
        execSync(`npm i -g ${dep.pkg}`, { stdio: "ignore", timeout: 120_000 });
        log(`mktg postinstall: installed ${dep.pkg} — ${dep.purpose}.`);
      } catch (_err) {
        log(`mktg postinstall: skipped ${dep.pkg} (install failed; run \`npm i -g ${dep.pkg}\` manually).`);
      }
    }
  }

  log("mktg postinstall: run `mktg init` inside a project to scaffold brand memory.");
} catch (error) {
  log(`mktg postinstall: skipped Claude skill install (${error && error.message ? error.message : String(error)}).`);
  log("mktg postinstall: run `mktg init` manually after install.");
  process.exit(0);
}
