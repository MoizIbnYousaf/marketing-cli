#!/usr/bin/env bun
// bin/mktg-studio — single-command launch for the marketing studio.
//
// Starts the Bun API server (server.ts on STUDIO_PORT, default 3001) and the
// Next.js dashboard (DASHBOARD_PORT, default 3000). Streams both processes'
// output with prefixed tags. Waits until both are healthy. Prints a banner.
// Ctrl+C stops both cleanly.
//
// Usage:
//   mktg-studio                 # launch both processes + auto-open the dashboard
//   mktg-studio --no-open       # launch both processes but skip the browser open
//   mktg-studio --intent cmo    # open dashboard with a startup intent
//   mktg-studio --help          # show usage
//
// Env precedence: shell env > .env.local > default.

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __file = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__file), "..");

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  let version = "unknown";
  try {
    const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json"), "utf-8")) as { version?: unknown };
    if (typeof pkg.version === "string" && pkg.version.length > 0) version = pkg.version;
  } catch {
    // Keep version probing side-effect free even if package metadata is missing.
  }
  console.log(`mktg-studio ${version}`);
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`mktg-studio -- local marketing dashboard launcher

Usage:
  mktg-studio                  launch server + dashboard, auto-open browser
  mktg-studio --no-open        launch but skip the browser open
  mktg-studio --intent cmo     open the dashboard in CMO startup mode
  mktg-studio --session id     forward a Studio session id to the dashboard
  mktg-studio --browser <name> override the browser (macOS app name or path)
  mktg-studio --version        print the binary version
  mktg-studio --help           show this message

Environment:
  STUDIO_PORT                  API server port (default 3001)
  DASHBOARD_PORT               Next.js port  (default 3000)
  MKTG_STUDIO_OPEN             set to "false" to skip the auto-open (default: open)
  MKTG_STUDIO_BROWSER          override browser (e.g. "Google Chrome", "/usr/bin/firefox")
  BROWSER                      cross-tool fallback when MKTG_STUDIO_BROWSER not set
  MKTG_PROJECT_ROOT            target marketing project root (brand/ + marketing.db)
  MKTG_BRAND_DIR               override brand directory directly
  MKTG_STUDIO_DB               override SQLite DB path directly
  MKTG_STUDIO_DEBUG            set to "1" to bypass the Next.js noise filter and see all output

Reads .env.local if present. Shell env wins ties.

Press Ctrl+C to stop both processes.`);
  process.exit(0);
}

// Auto-open by default. Opt out via --no-open or MKTG_STUDIO_OPEN=false.
// --open is still accepted for backward compatibility (and to override an
// MKTG_STUDIO_OPEN=false in the env on a one-off run).
const noOpenFlag = args.includes("--no-open") || process.env.MKTG_STUDIO_OPEN === "false";
const explicitOpen = args.includes("--open") || process.env.MKTG_STUDIO_OPEN === "true";
const openFlag = explicitOpen || !noOpenFlag;

function flagValue(flag: string): string | undefined {
  const eq = `${flag}=`;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === flag) return args[i + 1];
    if (arg.startsWith(eq)) return arg.slice(eq.length);
  }
  return undefined;
}

function dashboardUrl(): string {
  const params = new URLSearchParams();
  const intent = flagValue("--intent");
  const session = flagValue("--session");
  if (intent) params.set("mode", intent);
  if (session) params.set("session", session);
  const query = params.toString();
  return `http://localhost:${DASHBOARD_PORT}/dashboard${query ? `?${query}` : ""}`;
}

// ---------------------------------------------------------------------------
// .env.local loader — simple KEY=VALUE, "#" comments, no escapes.
// Shell env always wins.
// ---------------------------------------------------------------------------

function loadEnvLocal(root: string): Record<string, string> {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return {};

  const out: Record<string, string> = {};
  const text = readFileSync(envPath, "utf-8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const projectRoot = process.env.MKTG_PROJECT_ROOT ? resolve(process.env.MKTG_PROJECT_ROOT) : REPO_ROOT;
const repoEnvFromFile = loadEnvLocal(REPO_ROOT);
const projectEnvFromFile = loadEnvLocal(projectRoot);
const inheritedEnv = { ...(process.env as Record<string, string>) };

// Bun auto-loads .env.local from the Studio repo before this script runs.
// When Studio is bound to another project, strip those repo-local values so a
// project with no Postiz key does not silently inherit the Studio dev key.
if (projectRoot !== REPO_ROOT) {
  for (const [key, value] of Object.entries(repoEnvFromFile)) {
    if (projectEnvFromFile[key] === undefined && inheritedEnv[key] === value) {
      delete inheritedEnv[key];
    }
  }
}

const env = { ...projectEnvFromFile, ...inheritedEnv }; // shell wins

const STUDIO_PORT = env.STUDIO_PORT ?? "3001";
const DASHBOARD_PORT = env.DASHBOARD_PORT ?? "3000";
const STUDIO_INTENT = flagValue("--intent") ?? env.MKTG_STUDIO_INTENT ?? "";
const STUDIO_SESSION = flagValue("--session") ?? env.MKTG_STUDIO_SESSION ?? "";

// ---------------------------------------------------------------------------
// Port conflict detection
// ---------------------------------------------------------------------------

async function portIsFree(port: number): Promise<boolean> {
  try {
    const s = Bun.serve({ port, fetch: () => new Response("") });
    s.stop();
    return true;
  } catch {
    return false;
  }
}

async function ensurePortFree(port: number, label: string): Promise<void> {
  if (await portIsFree(port)) return;
  console.error(
    `\n✗ ${label} port ${port} is already in use.\n` +
      `  Fix:   lsof -ti:${port} | xargs kill -9\n` +
      `  Or:    set ${label === "dashboard" ? "DASHBOARD_PORT" : "STUDIO_PORT"}=<free port> in .env.local\n`,
  );
  process.exit(1);
}

await ensurePortFree(Number(STUDIO_PORT), "server");
await ensurePortFree(Number(DASHBOARD_PORT), "dashboard");

// ---------------------------------------------------------------------------
// First-launch banner — set expectations during cold boot.
//
// The dashboard's first launch is slow because Next.js compiles on demand
// (and historically because pnpm fetched studio devDeps the first time the
// tarball was extracted). Print a friendly banner on the slow paths so the
// user understands why the prompt is hanging.
//
// Banner is written to STDERR so --json-style output paths stay clean.
// ---------------------------------------------------------------------------

function studioNodeModulesExists(): boolean {
  return existsSync(resolve(REPO_ROOT, "node_modules"));
}

function typescriptResolvableFromRoot(): boolean {
  // marketing-cli root is one directory up from studio/. typescript ships
  // as a top-level dependency of marketing-cli, so it lives in the root
  // node_modules even before studio/node_modules is created. Probing here
  // tells us whether Next.js will need to auto-spawn pnpm to install TS
  // (it won't, if this returns true).
  return existsSync(resolve(REPO_ROOT, "..", "node_modules", "typescript", "package.json"));
}

function printFirstLaunchBanner(): void {
  if (studioNodeModulesExists()) return; // warm path — silent
  if (typescriptResolvableFromRoot()) {
    process.stderr.write(
      "mktg studio · starting dashboard (first launch, ~15s)\n" +
        "This only happens once. Subsequent launches are instant.\n",
    );
  } else {
    process.stderr.write(
      "mktg studio · first launch · setting up the dashboard (~30s)\n" +
        "This only happens once. Subsequent launches are instant.\n",
    );
  }
}

printFirstLaunchBanner();

// ---------------------------------------------------------------------------
// Spawn both processes
// ---------------------------------------------------------------------------

const childEnv: Record<string, string> = {
  ...env,
  STUDIO_PORT,
  DASHBOARD_PORT,
  STUDIO_API_BASE: env.STUDIO_API_BASE ?? `http://localhost:${STUDIO_PORT}`,
  MKTG_STUDIO_INTENT: STUDIO_INTENT,
  MKTG_STUDIO_SESSION: STUDIO_SESSION,
};

console.log(`[mktg-studio] starting server (:${STUDIO_PORT}) + dashboard (:${DASHBOARD_PORT})`);

const server = Bun.spawn({
  cmd: ["bun", "run", "server.ts"],
  cwd: REPO_ROOT,
  env: childEnv,
  stdout: "pipe",
  stderr: "pipe",
});

const next = Bun.spawn({
  cmd: ["bun", "run", "next", "dev", "-p", DASHBOARD_PORT],
  cwd: REPO_ROOT,
  env: childEnv,
  stdout: "pipe",
  stderr: "pipe",
});

// ---------------------------------------------------------------------------
// Next.js output filter — suppress known cold-boot noise (pnpm install
// progress, telemetry notice, build-script warnings, version-drift hints).
// Lines that don't match the SUPPRESSED list pass through unchanged, so
// errors, "Ready in Xs", and Local/Network URLs are always visible.
//
// Set MKTG_STUDIO_DEBUG=1 to disable filtering and see the raw stream.
// If a real error ever gets dropped, the user can re-run with the env var
// flipped on and see the full output.
// ---------------------------------------------------------------------------

const MKTG_STUDIO_DEBUG = process.env.MKTG_STUDIO_DEBUG === "1";

const NEXT_NOISE_PATTERNS: RegExp[] = [
  /^\[next\]\s*Progress:/,
  /^\[next\]\s*Packages: \+/,
  /^\[next\]\s*\+ @types\//,
  /^\[next\]\s*\+ eslint(-\S+)?(\s|$)/,
  /^\[next\]\s*\+ typescript(\s|$)/,
  /^\[next\]\s*\+ vitest(\s|$)/,
  /^\[next\]\s*\+ @playwright\/test(\s|$)/,
  /^\[next\]\s*\+ @axe-core\/react(\s|$)/,
  /^\[next\]\s*Done in \d+(\.\d+)?s using pnpm/,
  /^\[next\]\s*Ignored build scripts:/,
  /^\[next\]\s*Run "pnpm approve-builds"/,
  /^\[next\]\s*╭ Warning ─/,
  /^\[next\]\s*╰─/,
  /^\[next\]\s*│/,
  /^\[next\]\s*Attention: Next\.js now collects/,
  /^\[next\]\s*This information is used to shape Next\.js'/,
  /^\[next\]\s*You can learn more, including how to opt-out/,
  /^\[next\]\s*https:\/\/nextjs\.org\/telemetry/,
  /^\[next\]\s*\(\d+(\.\d+)?\.\d+ is available\)/,
];

function shouldDropNextLine(taggedLine: string): boolean {
  if (MKTG_STUDIO_DEBUG) return false;
  for (const pattern of NEXT_NOISE_PATTERNS) {
    if (pattern.test(taggedLine)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Stream each child's output with a prefix tag
// ---------------------------------------------------------------------------

async function pipe(
  source: ReadableStream<Uint8Array> | null,
  prefix: string,
  stream: NodeJS.WriteStream,
  filter?: (taggedLine: string) => boolean,
): Promise<void> {
  if (!source) return;
  const decoder = new TextDecoder();
  const reader = source.getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    if (done) {
      if (buffer) {
        const tagged = `${prefix} ${buffer}`;
        if (!filter || !filter(tagged)) stream.write(`${tagged}\n`);
      }
      return;
    }
    let nl = buffer.indexOf("\n");
    while (nl >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (line.length > 0) {
        const tagged = `${prefix} ${line}`;
        if (!filter || !filter(tagged)) stream.write(`${tagged}\n`);
      }
      nl = buffer.indexOf("\n");
    }
  }
}

pipe(server.stdout, "[server]", process.stdout);
pipe(server.stderr, "[server]", process.stderr);
pipe(next.stdout, "[next]  ", process.stdout, shouldDropNextLine);
pipe(next.stderr, "[next]  ", process.stderr, shouldDropNextLine);

// ---------------------------------------------------------------------------
// Wait until both surfaces respond
// ---------------------------------------------------------------------------

async function waitFor(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status >= 200 && res.status < 500) return true;
    } catch {
      // keep polling
    }
    await Bun.sleep(250);
  }
  return false;
}

const [serverReady, nextReady] = await Promise.all([
  waitFor(`http://127.0.0.1:${STUDIO_PORT}/api/health`, 30_000),
  waitFor(`http://127.0.0.1:${DASHBOARD_PORT}/`, 30_000),
]);

if (!serverReady || !nextReady) {
  console.error(
    `\n✗ Startup timeout — server ready: ${serverReady}, dashboard ready: ${nextReady}`,
  );
  server.kill("SIGTERM");
  next.kill("SIGTERM");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

const dash = dashboardUrl();
const api = `http://localhost:${STUDIO_PORT}`;
console.log(`
  mktg-studio · ready

    → dashboard  ${dash}
    → api        ${api}
    → schema     ${api}/api/schema
    → help       ${api}/api/help

  Ctrl+C to stop.
`);

if (openFlag) {
  const url = dash;
  const browserOverride =
    flagValue("--browser") ?? process.env.MKTG_STUDIO_BROWSER ?? process.env.BROWSER;

  // Cross-platform open: spawn the system default browser via the OS-specific
  // command (`open` on macOS, `start` on Windows, `xdg-open` on Linux).
  let cmd: string[];
  if (browserOverride) {
    if (process.platform === "darwin") {
      // macOS: app name ("Google Chrome") OR absolute path
      cmd = browserOverride.includes("/") && !browserOverride.endsWith(".app")
        ? [browserOverride, url]
        : ["open", "-a", browserOverride, url];
    } else if (process.platform === "win32") {
      cmd = ["cmd", "/c", "start", "", browserOverride, url];
    } else {
      cmd = [browserOverride, url];
    }
  } else if (process.platform === "darwin") {
    cmd = ["open", url];
  } else if (process.platform === "win32") {
    cmd = ["cmd", "/c", "start", "", url];
  } else {
    cmd = ["xdg-open", url];
  }

  try {
    Bun.spawn({ cmd, stdout: "ignore", stderr: "ignore" });
  } catch {
    // fine -- user can open the URL printed in the banner above manually
  }
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[mktg-studio] received ${signal}, stopping...`);
  server.kill("SIGINT");
  next.kill("SIGTERM");
  await Promise.race([
    Promise.all([server.exited, next.exited]),
    Bun.sleep(5_000),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
  if (next.exitCode === null) next.kill("SIGKILL");
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// ---------------------------------------------------------------------------
// If either child exits unexpectedly, take the whole thing down
// ---------------------------------------------------------------------------

(async () => {
  const exitCode = await server.exited;
  if (!shuttingDown) {
    console.error(`\n[mktg-studio] server exited (code ${exitCode}) — stopping dashboard.`);
    next.kill("SIGTERM");
    process.exit(exitCode ?? 1);
  }
})();

(async () => {
  const exitCode = await next.exited;
  if (!shuttingDown) {
    console.error(`\n[mktg-studio] dashboard exited (code ${exitCode}) — stopping server.`);
    server.kill("SIGINT");
    process.exit(exitCode ?? 1);
  }
})();
