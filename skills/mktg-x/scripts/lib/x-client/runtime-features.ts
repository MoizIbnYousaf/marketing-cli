// X/Twitter GraphQL client — MIT licensed.
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
// biome-ignore lint/correctness/useImportExtensions: JSON module import doesn't use .js extension.
import defaultOverrides from './features.json' with { type: 'json' };

export type FeatureOverrides = {
  global?: Record<string, boolean>;
  sets?: Record<string, Record<string, boolean>>;
};

type NormalizedFeatureOverrides = {
  global: Record<string, boolean>;
  sets: Record<string, Record<string, boolean>>;
};

export type FeatureOverridesSnapshot = {
  cachePath: string;
  overrides: FeatureOverrides;
};

const DEFAULT_CACHE_FILENAME = 'features.json';
let cachedOverrides: NormalizedFeatureOverrides | null = null;

function normalizeFeatureMap(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const result: Record<string, boolean> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === 'boolean') {
      result[key] = entry;
    }
  }
  return result;
}

function normalizeOverrides(value: unknown): NormalizedFeatureOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { global: {}, sets: {} };
  }
  const record = value as Record<string, unknown>;
  const global = normalizeFeatureMap(record.global);
  const sets: Record<string, Record<string, boolean>> = {};
  const rawSets =
    record.sets && typeof record.sets === 'object' && !Array.isArray(record.sets)
      ? (record.sets as Record<string, unknown>)
      : {};
  for (const [setName, setValue] of Object.entries(rawSets)) {
    const normalized = normalizeFeatureMap(setValue);
    if (Object.keys(normalized).length > 0) {
      sets[setName] = normalized;
    }
  }
  return { global, sets };
}

function mergeOverrides(
  base: NormalizedFeatureOverrides,
  next: NormalizedFeatureOverrides,
): NormalizedFeatureOverrides {
  const sets: Record<string, Record<string, boolean>> = { ...base.sets };
  for (const [setName, overrides] of Object.entries(next.sets)) {
    const existing = sets[setName];
    sets[setName] = existing ? { ...existing, ...overrides } : { ...overrides };
  }
  return {
    global: { ...base.global, ...next.global },
    sets,
  };
}

function toFeatureOverrides(overrides: NormalizedFeatureOverrides): FeatureOverrides {
  const result: FeatureOverrides = {};
  if (Object.keys(overrides.global).length > 0) {
    result.global = overrides.global;
  }
  const setEntries = Object.entries(overrides.sets).filter(([, value]) => Object.keys(value).length > 0);
  if (setEntries.length > 0) {
    result.sets = Object.fromEntries(setEntries);
  }
  return result;
}

function resolveFeaturesCachePath(): string {
  const override =
    process.env.MKTG_X_FEATURES_CACHE ??
    process.env.MKTG_X_FEATURES_PATH ??
    process.env.XTERMINAL_FEATURES_CACHE ??
    process.env.XTERMINAL_FEATURES_PATH;
  if (override && override.trim().length > 0) {
    return path.resolve(override.trim());
  }
  // Prefer the new `~/.config/mktg-x/` cache dir; fall back to the legacy `~/.config/xterminal/`
  // path if it already exists and the new one hasn't been seeded yet.
  const newCachePath = path.join(homedir(), '.config', 'mktg-x', DEFAULT_CACHE_FILENAME);
  const legacyCachePath = path.join(homedir(), '.config', 'xterminal', DEFAULT_CACHE_FILENAME);
  if (existsSync(newCachePath)) return newCachePath;
  if (existsSync(legacyCachePath)) return legacyCachePath;
  return newCachePath;
}

function readOverridesFromFile(cachePath: string): NormalizedFeatureOverrides | null {
  if (!existsSync(cachePath)) {
    return null;
  }
  try {
    const raw = readFileSync(cachePath, 'utf8');
    return normalizeOverrides(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readOverridesFromEnv(): NormalizedFeatureOverrides | null {
  const raw = process.env.MKTG_X_FEATURES_JSON ?? process.env.XTERMINAL_FEATURES_JSON;
  if (!raw || raw.trim().length === 0) {
    return null;
  }
  try {
    return normalizeOverrides(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeOverridesToDisk(cachePath: string, overrides: NormalizedFeatureOverrides): Promise<void> {
  const payload = toFeatureOverrides(overrides);
  return mkdir(path.dirname(cachePath), { recursive: true }).then(() =>
    writeFile(cachePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8'),
  );
}

export function loadFeatureOverrides(): NormalizedFeatureOverrides {
  if (cachedOverrides) {
    return cachedOverrides;
  }
  const base = normalizeOverrides(defaultOverrides);
  const fromFile = readOverridesFromFile(resolveFeaturesCachePath());
  const fromEnv = readOverridesFromEnv();
  let merged = base;
  if (fromFile) {
    merged = mergeOverrides(merged, fromFile);
  }
  if (fromEnv) {
    merged = mergeOverrides(merged, fromEnv);
  }
  cachedOverrides = merged;
  return merged;
}

export function getFeatureOverridesSnapshot(): FeatureOverridesSnapshot {
  const overrides = toFeatureOverrides(loadFeatureOverrides());
  return {
    cachePath: resolveFeaturesCachePath(),
    overrides,
  };
}

export function applyFeatureOverrides(setName: string, base: Record<string, boolean>): Record<string, boolean> {
  const overrides = loadFeatureOverrides();
  const globalOverrides = overrides.global;
  const setOverrides = overrides.sets[setName];
  if (Object.keys(globalOverrides).length === 0 && (!setOverrides || Object.keys(setOverrides).length === 0)) {
    return base;
  }
  if (setOverrides) {
    return {
      ...base,
      ...globalOverrides,
      ...setOverrides,
    };
  }

  return {
    ...base,
    ...globalOverrides,
  };
}

export async function refreshFeatureOverridesCache(): Promise<FeatureOverridesSnapshot> {
  const cachePath = resolveFeaturesCachePath();
  const base = normalizeOverrides(defaultOverrides);
  const fromFile = readOverridesFromFile(cachePath);
  const merged = mergeOverrides(base, fromFile ?? { global: {}, sets: {} });
  await writeOverridesToDisk(cachePath, merged);
  cachedOverrides = null;
  return { cachePath, overrides: toFeatureOverrides(merged) };
}

export function clearFeatureOverridesCache(): void {
  cachedOverrides = null;
}
