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

const installSkills = () => {
  const manifest = readJson(skillsManifestPath);
  const targetRoot = path.join(os.homedir(), ".claude", "skills");
  let installed = 0;

  fs.mkdirSync(targetRoot, { recursive: true });

  for (const skillName of Object.keys(manifest.skills ?? {})) {
    const sourceDir = path.join(skillsSource, skillName);
    const skillFile = path.join(sourceDir, "SKILL.md");
    if (!fs.existsSync(skillFile)) continue;

    copyDirectory(sourceDir, path.join(targetRoot, skillName));
    installed += 1;
  }

  return installed;
};

const installAgents = () => {
  const manifest = readJson(agentsManifestPath);
  const targetRoot = path.join(os.homedir(), ".claude", "agents");
  let installed = 0;

  fs.mkdirSync(targetRoot, { recursive: true });

  for (const [agentName, entry] of Object.entries(manifest.agents ?? {})) {
    if (!entry || typeof entry.file !== "string") continue;

    const sourceFile = path.join(agentsSource, entry.file);
    if (!fs.existsSync(sourceFile)) continue;

    copyFilePreservingMode(sourceFile, path.join(targetRoot, `mktg-${agentName}.md`));
    installed += 1;
  }

  return installed;
};

try {
  if (!isGlobalInstall) {
    log("mktg postinstall: skipped Claude skill install for non-global install. Run `mktg init` when ready.");
    process.exit(0);
  }

  const skills = installSkills();
  const agents = installAgents();
  log(`mktg postinstall: installed ${skills} skills and ${agents} agents for Claude Code.`);
  log("mktg postinstall: run `mktg init` inside a project to scaffold brand memory.");
} catch (error) {
  log(`mktg postinstall: skipped Claude skill install (${error && error.message ? error.message : String(error)}).`);
  log("mktg postinstall: run `mktg init` manually after install.");
  process.exit(0);
}
