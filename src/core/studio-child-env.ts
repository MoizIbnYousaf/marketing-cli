const STUDIO_AUTH_ENV = new Set([
  "MKTG_STUDIO_TOKEN",
  "MKTG_STUDIO_TOKEN_PATH",
  "MKTG_STUDIO_TOKEN_DIR",
]);

const NEXT_RUNTIME_ENV = new Set([
  "BUN_INSTALL",
  "CI",
  "FORCE_COLOR",
  "HOME",
  "LOGNAME",
  "NO_COLOR",
  "NODE_ENV",
  "NODE_OPTIONS",
  "PATH",
  "SHELL",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "USER",
  "XDG_CACHE_HOME",
]);

type EnvSource = Record<string, string | undefined>;

/** Preserve a child's capabilities while removing Studio authentication. */
export function childProcessEnv(
  source: EnvSource = process.env,
  extra: EnvSource = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...source, ...extra })) {
    if (value === undefined || STUDIO_AUTH_ENV.has(key)) continue;
    out[key] = value;
  }
  return out;
}

/** Next needs runtime plumbing and public config, never server integration keys. */
export function nextProcessEnv(
  source: EnvSource = process.env,
  extra: EnvSource = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...source, ...extra })) {
    if (value === undefined || STUDIO_AUTH_ENV.has(key)) continue;
    if (NEXT_RUNTIME_ENV.has(key) || key.startsWith("NEXT_PUBLIC_") || key in extra) {
      out[key] = value;
    }
  }
  return out;
}
