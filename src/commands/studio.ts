// mktg studio — Launch the mktg-studio dashboard
//
// Thin launcher for the companion mktg-studio app. Resolution priority:
//   1. Local monorepo subfolder: `<repoRoot>/studio/bin/mktg-studio.ts`
//      (the in-repo workspace member; this is the path everyone running from
//      source uses).
//   2. Sibling checkout: `<repoRoot>/../mktg-studio/bin/mktg-studio.ts`
//      (legacy two-repo layout, kept for backward compatibility).
//   3. `MKTG_STUDIO_BIN` env override pointing at any binary or launcher file.
//   4. `mktg-studio` on PATH (a globally installed companion binary).
//
// Modes:
//   - Interactive (no --json, no --dry-run): resolve a local launcher or PATH binary, spawn
//     with inherited stdio, forward --open, block until exit. The child
//     handles ports, .env.local, health checks, and graceful shutdown.
//   - --dry-run or --json: return a structured StudioLaunchPreview envelope,
//     NEVER spawn. Agents use this to self-discover the launch command and
//     verify the binary resolves without side effects.
//   - Binary missing in interactive launch mode: return a structured
//     MISSING_DEPENDENCY error with install suggestions. Exit code 3.
//
// Agent DX notes:
//   - All output goes through ok()/err() (axis 1: machine-readable output).
//   - --open is a boolean passthrough; all other args come from global flags
//     (axis 2: raw payload — the launch envelope round-trips cleanly).
//   - Schema below exposes every flag + the response shape (axis 3: introspection).
//   - Preview-by-default when --json is set avoids locking agents into a
//     long-running foreground process (axis 4: context window discipline,
//     axis 6: safety rails — --dry-run always available).

import { existsSync } from "node:fs";
import { spawn as spawnChild } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { ok, type CommandHandler, type CommandSchema } from "../types";
import { missingDep } from "../core/errors";
import { isTTY, writeStderr, bold, dim, green } from "../core/output";
import { getPackageRoot } from "../core/paths";

const STUDIO_BIN = "mktg-studio";
const DEFAULT_STUDIO_PORT = "3001";
const DEFAULT_DASHBOARD_PORT = "3000";
const LOCAL_STUDIO_LAUNCHER = join("bin", "mktg-studio.ts");

// mktg-studio is currently maintainer-only: the package is not yet published
// to npm. The working install paths are the in-repo `studio/` subfolder
// (when running from a marketing-cli source checkout), a sibling checkout, an
// explicit MKTG_STUDIO_BIN env var, or a `bun link`'d local checkout. Don't
// suggest `npm i -g mktg-studio` here: the registry returns 404 for it today.
const INSTALL_SUGGESTIONS: readonly string[] = [
  "Run from a marketing-cli source checkout: the studio/ subfolder is the default launcher",
  "Or use a sibling checkout: ~/projects/mktgmono/mktg-studio",
  "Or set MKTG_STUDIO_BIN=/absolute/path/to/mktg-studio/bin/mktg-studio.ts",
  "Or link a local checkout from its repo root: bun link && bun link mktg-studio",
  "Verify installation: which mktg-studio",
  "Docs: https://github.com/MoizIbnYousaf/marketing-cli#studio",
];

export const schema: CommandSchema = {
  name: "studio",
  description:
    "Launch the mktg-studio dashboard (Bun API server + Next.js UI). Prefers a local sibling checkout, falls back to mktg-studio on PATH.",
  flags: [
    {
      name: "--open",
      type: "boolean",
      required: false,
      default: true,
      description: "Open the dashboard in the default browser after startup (default: true)",
    },
    {
      name: "--no-open",
      type: "boolean",
      required: false,
      default: false,
      description: "Skip the auto-open and let you visit the URL printed in the banner manually",
    },
    {
      name: "--intent",
      type: "string",
      required: false,
      description: "Launch intent forwarded to Studio (for example: cmo)",
    },
    {
      name: "--session",
      type: "string",
      required: false,
      description: "Studio session id forwarded to the dashboard and API",
    },
  ],
  output: {
    "mode": "'launch' | 'preview' — launch: child spawned and awaited; preview: no side effects",
    "binary": "string — resolved local launcher, MKTG_STUDIO_BIN, PATH binary, or 'mktg-studio' when unresolved in preview mode",
    "version": "string — mktg-studio binary version if discoverable, 'unknown' on probe failure, or 'unresolved' when binary is absent in preview mode",
    "argv": "string[] — argv forwarded to the child (e.g. ['--open', '--intent', 'cmo'])",
    "env": "{ STUDIO_PORT: string, DASHBOARD_PORT: string } — ports the launcher will use (shell env wins)",
    "urls": "{ dashboard: string, api: string } — URLs the launcher will expose once ready",
    "exitCode": "number | null — child exit code (launch mode only); null in preview",
  },
  examples: [
    { args: "mktg studio", description: "Launch server + dashboard in the foreground" },
    { args: "mktg studio --open", description: "Launch and open the dashboard in the browser" },
    { args: "mktg studio --open --intent cmo", description: "Launch the Studio into CMO startup mode" },
    { args: "mktg studio --dry-run --json --intent cmo --session abc", description: "Preview CMO session launch args without spawning" },
    { args: "mktg studio --dry-run --json", description: "Preview the launch envelope without spawning" },
    { args: "mktg studio --json", description: "Same as --dry-run --json; agent self-discovery" },
    { args: "mktg studio --fields urls", description: "Only the resolved URLs" },
  ],
  vocabulary: ["studio", "dashboard", "launch", "ui", "workspace"],
};

export type StudioLaunchPreview = {
  readonly mode: "launch" | "preview";
  readonly binary: string;
  readonly version: string;
  readonly argv: readonly string[];
  readonly env: {
    readonly STUDIO_PORT: string;
    readonly DASHBOARD_PORT: string;
  };
  readonly urls: {
    readonly dashboard: string;
    readonly api: string;
  };
  readonly exitCode: number | null;
};

type ResolvedStudioLauncher = {
  readonly binary: string;
  readonly cmd: readonly string[];
};

const resolveBunCommand = (): string => {
  const bunVersion = (process.versions as NodeJS.ProcessVersions & { bun?: string }).bun;
  if (bunVersion) return process.execPath;
  return Bun.which("bun", { PATH: process.env.PATH ?? "" }) ?? "bun";
};

const launcherCommand = (binary: string): readonly string[] => {
  return binary.endsWith(".ts") ? [resolveBunCommand(), "run", binary] : [binary];
};

const fileExists = (path: string): boolean => {
  try {
    return existsSync(path);
  } catch {
    return false;
  }
};

const resolveLocalLauncher = (): string | null => {
  const packageRoot = getPackageRoot();
  // Order matters. The in-repo `studio/` subfolder wins so the monorepo
  // checkout is self-contained: `mktg studio` works without a sibling
  // mktg-studio repo and without anything on PATH. Sibling-checkout paths
  // remain as fallbacks for the legacy two-repo layout.
  const candidates = [
    join(packageRoot, "studio", LOCAL_STUDIO_LAUNCHER),
    join(dirname(packageRoot), "mktg-studio", LOCAL_STUDIO_LAUNCHER),
    join(packageRoot, "..", "mktg-studio", LOCAL_STUDIO_LAUNCHER),
    join(packageRoot, "mktg-studio", LOCAL_STUDIO_LAUNCHER),
  ].map((candidate) => resolve(candidate));

  for (const candidate of candidates) {
    if (fileExists(candidate)) return candidate;
  }
  return null;
};

const resolveExplicitLauncher = (): string | null => {
  const explicit = process.env.MKTG_STUDIO_BIN?.trim();
  if (!explicit) return null;

  const candidate = resolve(explicit);
  if (fileExists(candidate)) return candidate;

  const nestedLauncher = resolve(candidate, LOCAL_STUDIO_LAUNCHER);
  if (fileExists(nestedLauncher)) return nestedLauncher;

  return null;
};

// Resolve the Studio launcher. Returns null if not found.
// Passes PATH explicitly so the lookup honors the current `process.env.PATH`
// (Bun.which otherwise uses a snapshot taken at interpreter start, which
// ignores any PATH exports made after boot — including those done by tests).
const resolveStudioLauncher = (): ResolvedStudioLauncher | null => {
  const explicit = resolveExplicitLauncher();
  if (explicit) {
    return { binary: explicit, cmd: launcherCommand(explicit) };
  }

  if (process.env.MKTG_STUDIO_DISABLE_LOCAL !== "1") {
    const local = resolveLocalLauncher();
    if (local) {
      return { binary: local, cmd: launcherCommand(local) };
    }
  }

  const pathBinary = Bun.which(STUDIO_BIN, { PATH: process.env.PATH ?? "" });
  if (pathBinary) return { binary: pathBinary, cmd: [pathBinary] };

  return null;
};

// Probe the binary for its version. Best-effort — if the binary doesn't
// support --version we return "unknown" rather than failing the command.
const VERSION_PROBE_TIMEOUT_MS = 750;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const probeVersion = async (binary: string): Promise<string> => {
  const cmd = [...launcherCommand(binary), "--version"];
  try {
    const proc = spawnChild(cmd[0]!, cmd.slice(1), {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    proc.stdout?.setEncoding("utf8");
    proc.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });

    const exitOrTimeout = await Promise.race([
      new Promise<{ exitCode: number | null }>((resolve) => {
        proc.once("exit", (exitCode) => resolve({ exitCode }));
        proc.once("error", () => resolve({ exitCode: 1 }));
      }),
      sleep(VERSION_PROBE_TIMEOUT_MS).then(() => ({ timeout: true as const })),
    ]);

    if ("timeout" in exitOrTimeout) {
      try {
        proc.kill("SIGTERM");
        await Promise.race([
          new Promise((resolve) => proc.once("exit", resolve)),
          sleep(250),
        ]);
        if (proc.exitCode === null) proc.kill("SIGKILL");
      } catch {
        // best effort cleanup
      }
      return "unknown";
    }

    const exitCode = exitOrTimeout.exitCode;
    if (exitCode === 0) {
      const line = stdout.trim().split("\n")[0];
      if (line && line.length < 64) return line;
    }
  } catch {
    // fall through
  }
  return "unknown";
};

// Build the preview envelope. Pure — no side effects.
const buildPreview = (args: {
  binary: string;
  version: string;
  forwardArgv: readonly string[];
  mode: "launch" | "preview";
  exitCode: number | null;
}): StudioLaunchPreview => {
  const studioPort = process.env.STUDIO_PORT ?? DEFAULT_STUDIO_PORT;
  const dashboardPort = process.env.DASHBOARD_PORT ?? DEFAULT_DASHBOARD_PORT;
  const intent = getFlagValue(args.forwardArgv, "--intent");
  const session = getFlagValue(args.forwardArgv, "--session");
  const dashboardPath = intent || session
    ? `/dashboard?${new URLSearchParams({
        ...(intent ? { mode: intent } : {}),
        ...(session ? { session } : {}),
      }).toString()}`
    : "";
  return {
    mode: args.mode,
    binary: args.binary,
    version: args.version,
    argv: args.forwardArgv,
    env: { STUDIO_PORT: studioPort, DASHBOARD_PORT: dashboardPort },
    urls: {
      dashboard: `http://localhost:${dashboardPort}${dashboardPath}`,
      api: `http://localhost:${studioPort}`,
    },
    exitCode: args.exitCode,
  };
};

const getFlagValue = (args: readonly string[], flag: string): string | undefined => {
  const eq = `${flag}=`;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === flag) return args[i + 1];
    if (arg.startsWith(eq)) return arg.slice(eq.length);
  }
  return undefined;
};

const parseForwardArgv = (args: readonly string[]): readonly string[] => {
  const forward: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--open" || arg === "--no-open") {
      forward.push(arg);
      continue;
    }
    if (arg === "--intent" || arg === "--session" || arg === "--browser") {
      const value = args[i + 1];
      if (value) {
        forward.push(arg, value);
        i++;
      }
      continue;
    }
    if (arg.startsWith("--intent=") || arg.startsWith("--session=") || arg.startsWith("--browser=")) {
      forward.push(arg);
    }
  }
  return forward;
};

export const handler: CommandHandler<StudioLaunchPreview> = async (args, flags) => {
  const resolvedLauncher = resolveStudioLauncher();
  if (!resolvedLauncher && !(flags.dryRun || flags.json)) {
    return missingDep(
      `${STUDIO_BIN} launcher not found locally or on PATH`,
      INSTALL_SUGGESTIONS,
      "https://github.com/MoizIbnYousaf/marketing-cli#studio",
    );
  }

  const binary = resolvedLauncher?.binary ?? STUDIO_BIN;
  const version = resolvedLauncher ? await probeVersion(resolvedLauncher.binary) : "unresolved";
  const forwardArgv = parseForwardArgv(args);

  // Preview-only: --dry-run or --json. No spawn, no side effects.
  if (flags.dryRun || flags.json) {
    const preview = buildPreview({
      binary,
      version,
      forwardArgv,
      mode: "preview",
      exitCode: null,
    });

    if (isTTY() && !flags.json) {
      writeStderr("");
      writeStderr(`  ${bold("mktg studio")} ${dim("(preview)")}`);
      writeStderr(`  ${dim("binary:")}  ${binary}`);
      writeStderr(`  ${dim("version:")} ${version}`);
      writeStderr(`  ${dim("would run:")} ${(resolvedLauncher?.cmd ?? [binary]).join(" ")} ${forwardArgv.join(" ") || "(no args)"}`);
      writeStderr(`  ${dim("urls:")}    ${preview.urls.dashboard} · ${preview.urls.api}`);
      writeStderr("");
    }

    return ok(preview);
  }

  // Interactive launch: spawn with inherited stdio and block until exit.
  if (isTTY()) {
    writeStderr("");
    writeStderr(`  ${bold("mktg studio")} ${dim("→")} ${green("starting...")}`);
    writeStderr(`  ${dim(`binary: ${binary}`)}`);
    writeStderr("");
  }

  const childCmd = [...(resolvedLauncher?.cmd ?? [binary]), ...forwardArgv];
  const child = spawnChild(childCmd[0]!, childCmd.slice(1), {
    stdio: "inherit",
    env: {
      ...(process.env as Record<string, string>),
      MKTG_PROJECT_ROOT: process.env.MKTG_PROJECT_ROOT ?? flags.cwd,
    },
  });

  // Forward termination signals so Ctrl+C in this process tears the child
  // down cleanly (the mktg-studio binary has its own SIGINT/SIGTERM handlers).
  const forwardSignal = (sig: NodeJS.Signals) => {
    try {
      child.kill(sig);
    } catch {
      // already gone
    }
  };
  const onSigint = () => forwardSignal("SIGINT");
  const onSigterm = () => forwardSignal("SIGTERM");
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);

  const exitCode = await new Promise<number | null>((resolve) => {
    child.once("exit", (code) => resolve(code));
    child.once("error", () => resolve(1));
  });
  process.off("SIGINT", onSigint);
  process.off("SIGTERM", onSigterm);

  const result = buildPreview({
    binary,
    version,
    forwardArgv,
    mode: "launch",
    exitCode: exitCode ?? null,
  });

  return ok(result);
};
