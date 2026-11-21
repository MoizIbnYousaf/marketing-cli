import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

type EnvCache = {
  readonly mtimeMs: number;
  readonly env: Record<string, string>;
};

const CACHE = new Map<string, EnvCache>();

export const loadEnvLocal = (cwd: string): Record<string, string> => {
  const envPath = resolve(cwd, ".env.local");
  if (!existsSync(envPath)) {
    CACHE.delete(cwd);
    return {};
  }

  const mtimeMs = statSync(envPath).mtimeMs;
  const cached = CACHE.get(cwd);
  if (cached && cached.mtimeMs === mtimeMs) return cached.env;

  const env: Record<string, string> = {};
  for (const raw of readFileSync(envPath, "utf-8").split("\n")) {
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
    env[key] = value;
  }

  CACHE.set(cwd, { mtimeMs, env });
  return env;
};

// A project's .env.local is read from whatever --cwd the caller passes, so it
// is input from the repository, not from the operator. Two classes of key
// are never taken from it:
//
// 1. Variables that change how processes run or which binary gets executed.
//    A hostile repository could otherwise run its own code through
//    NODE_OPTIONS, PATH, or a *_BIN override the moment any mktg command runs.
//    Studio's own control keys belong here too: where Studio binds, which
//    token it accepts, which directories it serves, where its /api proxy
//    points.
// 2. A service base URL whose API key comes from the operator's shell. That
//    combination would send the operator's real key to a host the repository
//    chose. The base URL is honoured when the key sits in the same file,
//    because then no secret from outside the project is involved.
const BLOCKED_KEYS: ReadonlySet<string> = new Set([
  "PATH", "HOME", "SHELL", "NODE_OPTIONS", "NODE_PATH", "BUN_INSTALL", "BUN_OPTIONS",
  "MKTG_STUDIO_BIN", "MKTG_STUDIO_AUTH", "MKTG_POSTINSTALL_FORCE",
  "MKTG_STUDIO_TOKEN", "MKTG_STUDIO_TOKEN_PATH", "MKTG_STUDIO_TOKEN_DIR",
  "MKTG_PROJECT_ROOT", "MKTG_BRAND_DIR", "MKTG_STUDIO_DB",
  "STUDIO_API_BASE", "NEXT_PUBLIC_STUDIO_API_BASE", "DASHBOARD_HOST",
  "MKTG_STUDIO_BROWSER", "BROWSER", "MKTG_STUDIO_DEBUG",
]);
const BLOCKED_PREFIXES: readonly string[] = ["LD_", "DYLD_", "npm_config_", "NPM_CONFIG_", "GIT_"];

/** Base URL variable -> the secret that would be sent to it. */
const BASE_URL_SECRETS: Readonly<Record<string, string>> = {
  POSTIZ_API_BASE: "POSTIZ_API_KEY",
  TYPEFULLY_API_BASE: "TYPEFULLY_API_KEY",
  OPENSEO_MCP_URL: "OPENSEO_API_KEY",
};

export const isEnvLocalKeyAllowed = (
  key: string,
  fileEnv: Readonly<Record<string, string>>,
  shellEnv: Readonly<Record<string, string | undefined>> = process.env,
): boolean => {
  if (BLOCKED_KEYS.has(key) || key.endsWith("_BIN")) return false;
  if (BLOCKED_PREFIXES.some((prefix) => key.startsWith(prefix))) return false;
  const secret = BASE_URL_SECRETS[key];
  if (secret !== undefined && shellEnv[secret] !== undefined && fileEnv[secret] === undefined) return false;
  return true;
};

export const applyEnvLocal = (cwd: string): void => {
  const env = loadEnvLocal(cwd);
  // Decide against the shell environment as it was before this file was
  // applied, so the order of keys in the file cannot change the outcome.
  const shellEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (!isEnvLocalKeyAllowed(key, env, shellEnv)) continue;
    if (process.env[key] === undefined) process.env[key] = value;
  }
};
