// mktg — Catalog registry loader, collision detector, license allowlist
// Reads catalogs-manifest.json. Template: src/core/agents.ts:17-25, extended
// with shape validation + license gate + adapter-name collision detection.

import { join } from "node:path";
import type {
  CatalogEntry,
  CatalogsManifest,
  CatalogLoadResult,
  CatalogCollision,
  CatalogLicenseDenial,
  CatalogTransport,
} from "../types";
import { getPackageRoot } from "./paths";
import { parseJsonInput } from "./errors";

// License allowlist. LINK_SAFE licenses may declare transport: "sdk".
// COPYLEFT licenses may declare a catalog only if transport: "http" and
// sdk_reference: null (raw-fetch path, no linkable dependency).
const LINK_SAFE_LICENSES: readonly string[] = [
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
] as const;

const COPYLEFT_LICENSES: readonly string[] = [
  "AGPL-3.0",
  "AGPL-3.0-or-later",
  "AGPL-3.0-only",
  "GPL-3.0",
  "GPL-3.0-or-later",
  "GPL-3.0-only",
  "LGPL-3.0",
  "LGPL-3.0-or-later",
  "LGPL-3.0-only",
] as const;

export const isLinkSafeLicense = (license: string): boolean =>
  LINK_SAFE_LICENSES.includes(license);

export const isCopyleftLicense = (license: string): boolean =>
  COPYLEFT_LICENSES.includes(license);

// Resource-ID style (matches src/core/errors.ts:141). Lowercase alphanum + dots + hyphens.
const VALID_CATALOG_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

const AUTH_STYLES = new Set(["bearer", "basic", "oauth2", "none"]);
const TRANSPORTS = new Set(["sdk", "http"]);

// Required credential_envs count per auth.style. oauth2 is open-ended (≥3).
const expectedCredentialEnvCount = (style: string): { min: number; max: number } => {
  switch (style) {
    case "bearer": return { min: 1, max: 1 };
    case "basic":  return { min: 2, max: 2 };
    case "oauth2": return { min: 3, max: Number.POSITIVE_INFINITY };
    case "none":   return { min: 0, max: 0 };
    default:       return { min: 0, max: Number.POSITIVE_INFINITY };
  }
};

// Pure function — exported for tests. Seeds the seen-map with hardcoded
// built-in adapter names so a catalog can't shadow typefully/resend/file.
// Returns every collision (cross-catalog + catalog-vs-builtin).
export const detectAdapterCollisions = (
  manifest: CatalogsManifest,
  hardcoded: Readonly<{ publish_adapters: readonly string[] }> = { publish_adapters: [] },
): readonly CatalogCollision[] => {
  const seen = new Map<string, string[]>();

  for (const name of hardcoded.publish_adapters) {
    seen.set(`publish_adapters:${name}`, ["<builtin>"]);
  }

  const kinds = ["publish_adapters", "scheduling_adapters", "email_adapters"] as const;
  for (const [catName, cat] of Object.entries(manifest.catalogs)) {
    for (const kind of kinds) {
      const adapters = cat.capabilities[kind] ?? [];
      for (const adapter of adapters) {
        const key = `${kind}:${adapter}`;
        const prior = seen.get(key);
        if (prior) seen.set(key, [...prior, catName]);
        else seen.set(key, [catName]);
      }
    }
  }

  const collisions: CatalogCollision[] = [];
  for (const [key, declaredBy] of seen) {
    if (declaredBy.length < 2) continue;
    const colonIdx = key.indexOf(":");
    const kind = key.slice(0, colonIdx) as CatalogCollision["kind"];
    const adapter = key.slice(colonIdx + 1);
    collisions.push({ kind, adapter, declaredBy });
  }
  return collisions;
};

// Pure function — license gate. Exported for tests.
export const detectLicenseDenials = (
  manifest: CatalogsManifest,
): readonly CatalogLicenseDenial[] => {
  const denials: CatalogLicenseDenial[] = [];
  for (const [name, cat] of Object.entries(manifest.catalogs)) {
    if (!isCopyleftLicense(cat.license)) continue;
    // Copyleft catalogs must use transport: "http" with sdk_reference: null.
    if (cat.transport !== "http" || cat.sdk_reference !== null) {
      denials.push({
        catalog: name,
        license: cat.license,
        transport: cat.transport,
        sdk_reference: cat.sdk_reference,
        reason: "sdk-link-on-copyleft-license",
      });
    }
  }
  return denials;
};

// Shape validation — returns the first violation as `{ok:false,...}` or
// `{ok:true}` when every entry satisfies the CatalogEntry contract.
const validateShape = (
  raw: unknown,
): { ok: true; manifest: CatalogsManifest } | { ok: false; detail: string; path: string } => {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, detail: "manifest must be a JSON object", path: "" };
  }
  const m = raw as Record<string, unknown>;
  if (typeof m.version !== "number") {
    return { ok: false, detail: "missing or non-number 'version' field", path: "version" };
  }
  if (m.catalogs === null || typeof m.catalogs !== "object" || Array.isArray(m.catalogs)) {
    return { ok: false, detail: "'catalogs' must be an object", path: "catalogs" };
  }

  const catalogs = m.catalogs as Record<string, unknown>;
  for (const [name, entry] of Object.entries(catalogs)) {
    if (!VALID_CATALOG_NAME_RE.test(name)) {
      return { ok: false, detail: `catalog key '${name}' is not a valid resource id`, path: `catalogs.${name}` };
    }
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, detail: "catalog entry must be an object", path: `catalogs.${name}` };
    }
    const e = entry as Record<string, unknown>;
    for (const required of ["name", "repo_url", "docs_url", "license", "version_pinned", "capabilities", "transport", "auth", "skills"] as const) {
      if (!(required in e)) {
        return { ok: false, detail: `missing required field '${required}'`, path: `catalogs.${name}.${required}` };
      }
    }
    if (typeof e.name !== "string" || e.name !== name) {
      return { ok: false, detail: "entry 'name' must equal the object key", path: `catalogs.${name}.name` };
    }
    if (typeof e.repo_url !== "string") return { ok: false, detail: "'repo_url' must be a string", path: `catalogs.${name}.repo_url` };
    if (typeof e.docs_url !== "string") return { ok: false, detail: "'docs_url' must be a string", path: `catalogs.${name}.docs_url` };
    if (typeof e.license !== "string") return { ok: false, detail: "'license' must be a string", path: `catalogs.${name}.license` };
    if (typeof e.version_pinned !== "string") return { ok: false, detail: "'version_pinned' must be a string", path: `catalogs.${name}.version_pinned` };
    if (typeof e.transport !== "string" || !TRANSPORTS.has(e.transport)) {
      return { ok: false, detail: "'transport' must be 'sdk' or 'http'", path: `catalogs.${name}.transport` };
    }
    // sdk_reference: string iff transport==='sdk', null iff transport==='http'
    if (e.transport === "sdk") {
      if (typeof e.sdk_reference !== "string" || e.sdk_reference.length === 0) {
        return { ok: false, detail: "'sdk_reference' must be a non-empty string when transport='sdk'", path: `catalogs.${name}.sdk_reference` };
      }
    } else {
      if (e.sdk_reference !== null) {
        return { ok: false, detail: "'sdk_reference' must be null when transport='http'", path: `catalogs.${name}.sdk_reference` };
      }
    }

    // capabilities
    if (e.capabilities === null || typeof e.capabilities !== "object" || Array.isArray(e.capabilities)) {
      return { ok: false, detail: "'capabilities' must be an object", path: `catalogs.${name}.capabilities` };
    }
    const caps = e.capabilities as Record<string, unknown>;
    let hasAnyAdapter = false;
    for (const kind of ["publish_adapters", "scheduling_adapters", "email_adapters"] as const) {
      const arr = caps[kind];
      if (arr === undefined) continue;
      if (!Array.isArray(arr)) {
        return { ok: false, detail: `'capabilities.${kind}' must be an array of strings`, path: `catalogs.${name}.capabilities.${kind}` };
      }
      for (const item of arr) {
        if (typeof item !== "string" || !VALID_CATALOG_NAME_RE.test(item)) {
          return { ok: false, detail: `'capabilities.${kind}' contains invalid adapter name`, path: `catalogs.${name}.capabilities.${kind}` };
        }
      }
      if (arr.length > 0) hasAnyAdapter = true;
    }

    // skills
    if (!Array.isArray(e.skills)) {
      return { ok: false, detail: "'skills' must be an array of strings", path: `catalogs.${name}.skills` };
    }
    for (const skill of e.skills) {
      if (typeof skill !== "string" || !VALID_CATALOG_NAME_RE.test(skill)) {
        return { ok: false, detail: "'skills' contains invalid skill name", path: `catalogs.${name}.skills` };
      }
    }
    if (!hasAnyAdapter && (e.skills as readonly string[]).length === 0) {
      return { ok: false, detail: "catalog must declare at least one adapter OR one skill", path: `catalogs.${name}` };
    }

    // auth
    if (e.auth === null || typeof e.auth !== "object" || Array.isArray(e.auth)) {
      return { ok: false, detail: "'auth' must be an object", path: `catalogs.${name}.auth` };
    }
    const auth = e.auth as Record<string, unknown>;
    if (typeof auth.style !== "string" || !AUTH_STYLES.has(auth.style)) {
      return { ok: false, detail: "'auth.style' must be 'bearer' | 'basic' | 'oauth2' | 'none'", path: `catalogs.${name}.auth.style` };
    }
    if (typeof auth.base_env !== "string") {
      return { ok: false, detail: "'auth.base_env' must be a string", path: `catalogs.${name}.auth.base_env` };
    }
    if (!Array.isArray(auth.credential_envs) || !(auth.credential_envs as unknown[]).every(x => typeof x === "string")) {
      return { ok: false, detail: "'auth.credential_envs' must be a string array", path: `catalogs.${name}.auth.credential_envs` };
    }
    const credCount = (auth.credential_envs as readonly unknown[]).length;
    const { min, max } = expectedCredentialEnvCount(auth.style);
    if (credCount < min || credCount > max) {
      return {
        ok: false,
        detail: `auth.style '${auth.style}' requires ${min === max ? min : `${min}+`} credential_envs, got ${credCount}`,
        path: `catalogs.${name}.auth.credential_envs`,
      };
    }
    if (auth.header_format !== undefined && auth.header_format !== "bearer" && auth.header_format !== "bare") {
      return { ok: false, detail: "'auth.header_format' must be 'bearer' or 'bare' when present", path: `catalogs.${name}.auth.header_format` };
    }
  }

  return { ok: true, manifest: raw as CatalogsManifest };
};

// Default built-in set — kept in sync with publish.ts ADAPTERS registry.
// Ownership note: API reviewer may export this from publish.ts; until then the
// loader call site injects the constant, and this default lets unit tests
// run without pulling publish.ts into the import graph.
export const DEFAULT_BUILTIN_PUBLISH_ADAPTERS: readonly string[] = ["mktg-native", "typefully", "resend", "file"] as const;

/**
 * Load and fully validate catalogs-manifest.json. Returns a discriminated
 * union; never throws for expected failure modes. Every command invocation
 * calls this fresh (no cache) — the cost is bounded (N ≤ ~20 catalogs,
 * M ≤ ~100 adapters) and freshness matters after `mktg catalog add`.
 */
export const loadCatalogManifest = async (
  hardcoded: Readonly<{ publish_adapters: readonly string[] }> = { publish_adapters: DEFAULT_BUILTIN_PUBLISH_ADAPTERS },
): Promise<CatalogLoadResult> => {
  const manifestPath = join(getPackageRoot(), "catalogs-manifest.json");
  const file = Bun.file(manifestPath);
  const exists = await file.exists();
  if (!exists) {
    return { ok: false, reason: "manifest-missing", path: manifestPath };
  }
  const raw = await file.text();
  const parsed = parseJsonInput<unknown>(raw);
  if (!parsed.ok) {
    return { ok: false, reason: "manifest-invalid", detail: parsed.message, path: manifestPath };
  }
  const shape = validateShape(parsed.data);
  if (!shape.ok) {
    return { ok: false, reason: "manifest-invalid", detail: shape.detail, path: shape.path };
  }
  const denials = detectLicenseDenials(shape.manifest);
  if (denials.length > 0) {
    return { ok: false, reason: "license-denied", denials };
  }
  const collisions = detectAdapterCollisions(shape.manifest, hardcoded);
  if (collisions.length > 0) {
    return { ok: false, reason: "collision", collisions };
  }
  return { ok: true, manifest: shape.manifest };
};

// Get all catalog names — mirrors src/core/skills.ts:30
export const getCatalogNames = (manifest: CatalogsManifest): string[] =>
  Object.keys(manifest.catalogs);

// Get a catalog entry by name (no redirects for catalogs — names are stable).
export const getCatalog = (
  manifest: CatalogsManifest,
  name: string,
): CatalogEntry | null => manifest.catalogs[name] ?? null;

// Compute configured/missing env vars for a catalog against the current
// process.env. Used by `catalog info` + `catalog status`.
export const computeConfiguredStatus = (
  entry: CatalogEntry,
  env: Readonly<Record<string, string | undefined>> = process.env,
): { configured: boolean; missingEnvs: readonly string[]; resolvedBase: string | null } => {
  const missing: string[] = [];
  if (!env[entry.auth.base_env]) missing.push(entry.auth.base_env);
  for (const cred of entry.auth.credential_envs) {
    if (!env[cred]) missing.push(cred);
  }
  return {
    configured: missing.length === 0,
    missingEnvs: missing,
    resolvedBase: env[entry.auth.base_env] ?? null,
  };
};

export const _testing = {
  validateShape,
  LINK_SAFE_LICENSES,
  COPYLEFT_LICENSES,
};
