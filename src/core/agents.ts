// mktg — Agent registry, install, and integrity verification
// Reads agents-manifest.json, copies bundled agents to ~/.claude/agents/

import { join, dirname } from "node:path";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import type { AgentsManifest } from "../types";
import { getPackageRoot } from "./paths";

// Where agents get installed — auto-discovered by Claude Code
const AGENTS_INSTALL_DIR = join(homedir(), ".claude", "agents");

// Namespace prefix to avoid collisions with other agents
const AGENT_PREFIX = "mktg-";

// Load the manifest from package root
export const loadAgentManifest = async (): Promise<AgentsManifest> => {
  const manifestPath = join(getPackageRoot(), "agents-manifest.json");
  const file = Bun.file(manifestPath);
  const exists = await file.exists();
  if (!exists) {
    throw new Error(`agents-manifest.json not found at ${manifestPath}`);
  }
  return file.json() as Promise<AgentsManifest>;
};

// Get all agent names from manifest
export const getAgentNames = (manifest: AgentsManifest): string[] =>
  Object.keys(manifest.agents);

// Get the installed filename for an agent
const installedName = (agentName: string): string =>
  `${AGENT_PREFIX}${agentName}.md`;

// Find the bundled agent source path
const getBundledAgentPath = (manifest: AgentsManifest, agentName: string): string => {
  const entry = manifest.agents[agentName];
  if (!entry) throw new Error(`Agent ${agentName} not in manifest`);
  return join(getPackageRoot(), "agents", entry.file);
};

// Check which agents are installed
export const getAgentInstallStatus = async (
  manifest: AgentsManifest,
): Promise<Record<string, { installed: boolean; path: string }>> => {
  const result: Record<string, { installed: boolean; path: string }> = {};

  for (const name of getAgentNames(manifest)) {
    const agentFile = join(AGENTS_INSTALL_DIR, installedName(name));
    const exists = await Bun.file(agentFile).exists();
    result[name] = { installed: exists, path: agentFile };
  }

  return result;
};

// Install all agents from the package to ~/.claude/agents/
export const installAgents = async (
  manifest: AgentsManifest,
  dryRun: boolean = false,
): Promise<{ installed: string[]; skipped: string[]; failed: string[] }> => {
  const installed: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  // Ensure install dir exists
  if (!dryRun) {
    await mkdir(AGENTS_INSTALL_DIR, { recursive: true });
  }

  const writes: Promise<void>[] = [];

  for (const name of getAgentNames(manifest)) {
    const bundledPath = getBundledAgentPath(manifest, name);
    const bundledFile = Bun.file(bundledPath);

    const bundledExists = await bundledFile.exists();
    if (!bundledExists) {
      skipped.push(name);
      continue;
    }

    if (dryRun) {
      installed.push(name);
      continue;
    }

    const installPath = join(AGENTS_INSTALL_DIR, installedName(name));

    writes.push(
      (async () => {
        try {
          const content = await bundledFile.text();
          await Bun.write(installPath, content);
          installed.push(name);
        } catch {
          failed.push(name);
        }
      })(),
    );
  }

  await Promise.all(writes);

  return { installed, skipped, failed };
};

// Update agents — re-copy bundled agents over installed ones
export const updateAgents = async (
  manifest: AgentsManifest,
  dryRun: boolean = false,
): Promise<{ updated: string[]; unchanged: string[]; notBundled: string[]; failed: string[] }> => {
  const updated: string[] = [];
  const unchanged: string[] = [];
  const notBundled: string[] = [];
  const failed: string[] = [];

  // Ensure install dir exists (may not if agents were never installed)
  if (!dryRun) {
    await mkdir(AGENTS_INSTALL_DIR, { recursive: true });
  }

  for (const name of getAgentNames(manifest)) {
    const bundledPath = getBundledAgentPath(manifest, name);
    const installPath = join(AGENTS_INSTALL_DIR, installedName(name));

    const bundledFile = Bun.file(bundledPath);
    const installedFile = Bun.file(installPath);

    const bundledExists = await bundledFile.exists();
    if (!bundledExists) {
      notBundled.push(name);
      continue;
    }

    const installedExists = await installedFile.exists();
    const bundledContent = await bundledFile.text();

    if (installedExists) {
      const installedContent = await installedFile.text();
      if (bundledContent === installedContent) {
        unchanged.push(name);
        continue;
      }
    }

    if (dryRun) {
      updated.push(name);
      continue;
    }

    try {
      await Bun.write(installPath, bundledContent);
      updated.push(name);
    } catch {
      failed.push(name);
    }
  }

  return { updated, unchanged, notBundled, failed };
};

// Get the agents install directory path
export const getAgentsInstallDir = (): string => AGENTS_INSTALL_DIR;

// Remove a single installed agent by name
export const removeAgent = async (
  name: string,
  dryRun: boolean = false,
): Promise<{ removed: boolean; path: string }> => {
  const agentFile = join(AGENTS_INSTALL_DIR, installedName(name));
  const exists = await Bun.file(agentFile).exists();
  if (!exists) return { removed: false, path: agentFile };
  if (!dryRun) {
    const { unlink } = await import("node:fs/promises");
    await unlink(agentFile);
  }
  return { removed: true, path: agentFile };
};

// Synchronous manifest reader (cached)
let _cachedAgentManifest: AgentsManifest | null = null;

export const readAgentManifest = (): AgentsManifest => {
  if (_cachedAgentManifest) return _cachedAgentManifest;
  const manifestPath = join(getPackageRoot(), "agents-manifest.json");
  const raw = require(manifestPath) as AgentsManifest;
  _cachedAgentManifest = raw;
  return raw;
};
