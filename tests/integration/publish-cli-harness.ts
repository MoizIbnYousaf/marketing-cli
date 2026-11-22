// Shared harness for the publish-safety tests: the real CLI as a child
// process, a fresh project and a fresh HOME per run, and a byte-level
// snapshot of every file so a test can prove a run wrote nothing.

import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

export const CLI = join(import.meta.dir, "..", "..", "src", "cli.ts");

export type CliRun = { readonly exitCode: number; readonly stdout: string; readonly json: Record<string, unknown> | null };

export type Sandbox = { readonly project: string; readonly home: string; readonly cleanup: () => Promise<void> };

export const makeSandbox = async (): Promise<Sandbox> => {
  const project = await mkdtemp(join(tmpdir(), "mktg-pubsafe-proj-"));
  const home = await mkdtemp(join(tmpdir(), "mktg-pubsafe-home-"));
  return {
    project,
    home,
    cleanup: async () => {
      await rm(project, { recursive: true, force: true });
      await rm(home, { recursive: true, force: true });
    },
  };
};

/** Run `mktg publish <args>` in the sandbox. Provider keys are unset unless `env` names them. */
export const runPublish = async (
  sb: Sandbox,
  args: readonly string[],
  env: Readonly<Record<string, string>> = {},
): Promise<CliRun> => {
  const proc = Bun.spawn(["bun", "run", CLI, "publish", ...args], {
    cwd: sb.project,
    env: { PATH: process.env.PATH ?? "", HOME: sb.home, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, , exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(stdout.trim().split("\n").at(-1) ?? "") as Record<string, unknown>;
  } catch {
    json = null;
  }
  return { exitCode, stdout, json };
};

const walk = async (root: string, dir: string, out: Map<string, string>): Promise<void> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      out.set(`${relative(root, full)}/`, "dir");
      await walk(root, full, out);
    } else {
      out.set(relative(root, full), createHash("sha256").update(await readFile(full)).digest("hex"));
    }
  }
};

/** Every file and directory under the project and HOME, with content hashes. */
export const snapshot = async (sb: Sandbox): Promise<Map<string, string>> => {
  const out = new Map<string, string>();
  const project = new Map<string, string>();
  const home = new Map<string, string>();
  await walk(sb.project, sb.project, project);
  await walk(sb.home, sb.home, home);
  for (const [k, v] of project) out.set(`project/${k}`, v);
  for (const [k, v] of home) out.set(`home/${k}`, v);
  return out;
};

/** Paths added, removed or changed between two snapshots. */
export const changedPaths = (before: Map<string, string>, after: Map<string, string>): string[] => {
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].filter((k) => before.get(k) !== after.get(k)).sort();
};

export const manifest = (items: readonly Record<string, unknown>[], name = "c"): string =>
  JSON.stringify({ name, items });
