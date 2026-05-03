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

export const applyEnvLocal = (cwd: string): void => {
  const env = loadEnvLocal(cwd);
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
};
