import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseAssetsMarkdown } from "./brand-assets.ts";
import { resolveProjectPath, resolveProjectRoot } from "./project-root.ts";

export type ContentAssetKind = "image" | "video" | "markdown" | "file";
export type ContentAssetStatus = "draft" | "approved" | "published" | "archived";

export interface ContentAsset {
  id: string;
  kind: ContentAssetKind;
  relativePath: string;
  title: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  mtimeMs: number;
  contentHash?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  status?: ContentAssetStatus;
  tags?: string[];
  orderKey?: string;
  groupId?: string;
  linkedMarkdownPaths?: string[];
  notes?: string;
  isExternal?: boolean;
  source?: {
    kind: "brand-assets" | "filesystem";
    date?: string;
    type?: string;
    skill?: string;
  };
}

export interface ContentAssetMeta {
  title?: string;
  status?: ContentAssetStatus;
  tags?: string[];
  orderKey?: string;
  groupId?: string;
  linkedMarkdownPaths?: string[];
  notes?: string;
  updatedAt?: string;
}

export interface ContentGroupMeta {
  title: string;
  orderKey?: string;
}

export interface ContentMeta {
  schemaVersion: 1;
  assets: Record<string, ContentAssetMeta>;
  groups: Record<string, ContentGroupMeta>;
}

export interface ContentManifest {
  projectRoot: string;
  generatedAt: string;
  assets: ContentAsset[];
  groups: Record<string, ContentGroupMeta>;
  stats: {
    total: number;
    images: number;
    videos: number;
    markdown: number;
    files: number;
    external: number;
  };
}

export interface ContentFileRead {
  path: string;
  content: string;
  mtime: string;
  bytes: number;
}

export type ContentFileWriteResult =
  | { ok: true; path: string; mtime: string; bytes: number; deltaChars: number }
  | { ok: false; code: "CONFLICT"; serverMtime: string; clientMtime?: string };

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);
const TEXT_FILE_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".json",
  ".jsonl",
  ".csv",
  ".yaml",
  ".yml",
  ".html",
  ".css",
]);
const FILE_EXTENSIONS = new Set([".pdf", ".txt", ".json", ".jsonl", ".csv", ".yaml", ".yml"]);
const SCAN_DIRS = ["brand", "content", "assets", "marketing", "public"];
const ROOT_FILES = ["launch.md"];
const IGNORE_DIRS = new Set([".git", ".next", ".turbo", ".cmo/cache", "node_modules"]);
const MAX_MANIFEST_FILES = 5_000;
const MAX_TEXT_BYTES = 5_000_000;
const MAX_HASH_BYTES = 15_000_000;
const META_RELATIVE_PATH = ".cmo/content.meta.json";

function fileVersionToken(stat: { mtimeMs: number; size: number }): string {
  return `${stat.mtimeMs}:${stat.size}`;
}

function normalizeRelPath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function hashString(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function contentAssetIdForPath(path: string): string {
  return `asset_${hashString(normalizeRelPath(path).toLowerCase())}`;
}

export function contentMimeType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  if (lower.endsWith(".md") || lower.endsWith(".mdx")) return "text/markdown; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".csv")) return "text/csv; charset=utf-8";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export function classifyContentAssetKind(path: string): ContentAssetKind {
  const ext = extname(path).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (MARKDOWN_EXTENSIONS.has(ext)) return "markdown";
  return "file";
}

export function isTextContentPath(path: string): boolean {
  return TEXT_FILE_EXTENSIONS.has(extname(path).toLowerCase());
}

function isManifestCandidate(path: string): boolean {
  const ext = extname(path).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext) || MARKDOWN_EXTENSIONS.has(ext) || FILE_EXTENSIONS.has(ext);
}

function titleFromPath(path: string): string {
  const leaf = basename(path).replace(/\.[^.]+$/, "");
  const title = leaf.replace(/[-_]+/g, " ").trim();
  return title ? title.replace(/\b\w/g, (char) => char.toUpperCase()) : basename(path);
}

function safeRoot(root?: string): string {
  return resolveProjectRoot(root ?? process.cwd());
}

function metaPath(root: string): string {
  return join(root, META_RELATIVE_PATH);
}

function emptyMeta(): ContentMeta {
  return { schemaVersion: 1, assets: {}, groups: {} };
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8")) as unknown;
}

function isStatus(value: unknown): value is ContentAssetStatus {
  return value === "draft" || value === "approved" || value === "published" || value === "archived";
}

function sanitizeAssetMeta(value: unknown): ContentAssetMeta {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const output: ContentAssetMeta = {};
  if (typeof input.title === "string") output.title = input.title.slice(0, 240);
  if (isStatus(input.status)) output.status = input.status;
  if (Array.isArray(input.tags)) output.tags = input.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 40);
  if (typeof input.orderKey === "string") output.orderKey = input.orderKey.slice(0, 128);
  if (typeof input.groupId === "string") output.groupId = input.groupId.slice(0, 128);
  if (Array.isArray(input.linkedMarkdownPaths)) {
    output.linkedMarkdownPaths = input.linkedMarkdownPaths
      .filter((path): path is string => typeof path === "string")
      .slice(0, 40);
  }
  if (typeof input.notes === "string") output.notes = input.notes.slice(0, 8_000);
  if (typeof input.updatedAt === "string") output.updatedAt = input.updatedAt;
  return output;
}

function sanitizeGroupMeta(value: unknown): ContentGroupMeta | null {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  if (typeof input.title !== "string" || input.title.trim().length === 0) return null;
  return {
    title: input.title.slice(0, 160),
    orderKey: typeof input.orderKey === "string" ? input.orderKey.slice(0, 128) : undefined,
  };
}

export function loadContentMeta(rootArg?: string): ContentMeta {
  const root = safeRoot(rootArg);
  const path = metaPath(root);
  if (!existsSync(path)) return emptyMeta();
  try {
    const raw = readJsonFile(path);
    const input = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const assetsInput = input.assets && typeof input.assets === "object" ? input.assets as Record<string, unknown> : {};
    const groupsInput = input.groups && typeof input.groups === "object" ? input.groups as Record<string, unknown> : {};
    const meta = emptyMeta();
    for (const [id, asset] of Object.entries(assetsInput)) {
      meta.assets[id] = sanitizeAssetMeta(asset);
    }
    for (const [id, group] of Object.entries(groupsInput)) {
      const sanitized = sanitizeGroupMeta(group);
      if (sanitized) meta.groups[id] = sanitized;
    }
    return meta;
  } catch {
    return emptyMeta();
  }
}

export function writeContentMeta(meta: ContentMeta, rootArg?: string): ContentMeta {
  const root = safeRoot(rootArg);
  const path = metaPath(root);
  mkdirSync(dirname(path), { recursive: true });
  const sanitized: ContentMeta = {
    schemaVersion: 1,
    assets: {},
    groups: {},
  };
  for (const [id, asset] of Object.entries(meta.assets ?? {})) {
    sanitized.assets[id] = sanitizeAssetMeta(asset);
  }
  for (const [id, group] of Object.entries(meta.groups ?? {})) {
    const sanitizedGroup = sanitizeGroupMeta(group);
    if (sanitizedGroup) sanitized.groups[id] = sanitizedGroup;
  }
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(sanitized, null, 2)}\n`, "utf-8");
  renameSync(tmp, path);
  return sanitized;
}

function resolveInsideRoot(path: string, root: string): { ok: true; abs: string; rel: string } | { ok: false; message: string } {
  if (isAbsolute(path)) return { ok: false, message: "absolute paths are not allowed" };
  const resolved = resolveProjectPath(path, root);
  if (!resolved.ok) return { ok: false, message: resolved.message };
  return { ok: true, abs: resolved.abs, rel: normalizeRelPath(resolved.rel) };
}

function fileHash(abs: string, size: number): string | undefined {
  if (size > MAX_HASH_BYTES) return undefined;
  try {
    return createHash("sha256").update(readFileSync(abs)).digest("hex");
  } catch {
    return undefined;
  }
}

function firstMarkdownHeading(abs: string): string | null {
  try {
    const raw = readFileSync(abs, "utf-8").slice(0, 128_000);
    const match = raw.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim() || null;
  } catch {
    return null;
  }
}

function applyMeta(asset: ContentAsset, meta: ContentMeta): ContentAsset {
  const patch = meta.assets[asset.id];
  if (!patch) return asset;
  return {
    ...asset,
    title: patch.title ?? asset.title,
    status: patch.status ?? asset.status,
    tags: patch.tags ?? asset.tags,
    orderKey: patch.orderKey ?? asset.orderKey,
    groupId: patch.groupId ?? asset.groupId,
    linkedMarkdownPaths: patch.linkedMarkdownPaths ?? asset.linkedMarkdownPaths,
    notes: patch.notes ?? asset.notes,
  };
}

function createLocalAsset(root: string, relPath: string, meta: ContentMeta, defaults: Partial<ContentAsset> = {}): ContentAsset | null {
  const resolved = resolveInsideRoot(relPath, root);
  if (!resolved.ok || !existsSync(resolved.abs)) return null;
  const stat = statSync(resolved.abs);
  if (!stat.isFile()) return null;

  const kind = classifyContentAssetKind(resolved.rel);
  const id = contentAssetIdForPath(resolved.rel);
  const title =
    defaults.title ??
    (kind === "markdown" ? firstMarkdownHeading(resolved.abs) : null) ??
    titleFromPath(resolved.rel);
  const mediaUrl =
    kind === "image" || kind === "video"
      ? `/api/cmo/content/media?path=${encodeURIComponent(resolved.rel)}`
      : undefined;

  return applyMeta(
    {
      id,
      kind,
      relativePath: resolved.rel,
      title,
      mimeType: contentMimeType(resolved.rel),
      sizeBytes: stat.size,
      mtimeMs: stat.mtimeMs,
      contentHash: fileHash(resolved.abs, stat.size),
      mediaUrl,
      thumbnailUrl: kind === "image" ? mediaUrl : undefined,
      posterUrl: kind === "video" ? undefined : undefined,
      status: "draft",
      notes: defaults.notes,
      linkedMarkdownPaths: defaults.linkedMarkdownPaths,
      source: defaults.source ?? { kind: "filesystem" },
      isExternal: false,
    },
    meta,
  );
}

function createExternalAsset(location: string, meta: ContentMeta, defaults: Partial<ContentAsset> = {}): ContentAsset {
  const kind = classifyContentAssetKind(location);
  const id = contentAssetIdForPath(location);
  const mediaUrl = kind === "image" || kind === "video" ? location : undefined;
  return applyMeta(
    {
      id,
      kind,
      relativePath: location,
      title: defaults.title ?? titleFromPath(location),
      mimeType: contentMimeType(location),
      mtimeMs: 0,
      mediaUrl,
      thumbnailUrl: kind === "image" ? mediaUrl : undefined,
      status: "draft",
      notes: defaults.notes,
      linkedMarkdownPaths: defaults.linkedMarkdownPaths,
      isExternal: true,
      source: defaults.source ?? { kind: "brand-assets" },
    },
    meta,
  );
}

function scanDirectory(root: string, dirRel: string, files: string[], depth = 0): void {
  if (files.length >= MAX_MANIFEST_FILES || depth > 7) return;
  const dirAbs = join(root, dirRel);
  if (!existsSync(dirAbs)) return;
  let entries: string[] = [];
  try {
    entries = readdirSync(dirAbs);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (files.length >= MAX_MANIFEST_FILES) break;
    const rel = normalizeRelPath(join(dirRel, entry));
    const normalizedDir = normalizeRelPath(rel);
    if (IGNORE_DIRS.has(entry) || IGNORE_DIRS.has(normalizedDir)) continue;
    const abs = join(root, rel);
    let stat;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      scanDirectory(root, rel, files, depth + 1);
      continue;
    }
    if (stat.isFile() && isManifestCandidate(rel)) files.push(rel);
  }
}

function addAsset(target: Map<string, ContentAsset>, asset: ContentAsset | null): void {
  if (!asset) return;
  const existing = target.get(asset.id);
  target.set(asset.id, existing ? { ...asset, ...existing } : asset);
}

function assetStats(assets: ContentAsset[]): ContentManifest["stats"] {
  return {
    total: assets.length,
    images: assets.filter((asset) => asset.kind === "image").length,
    videos: assets.filter((asset) => asset.kind === "video").length,
    markdown: assets.filter((asset) => asset.kind === "markdown").length,
    files: assets.filter((asset) => asset.kind === "file").length,
    external: assets.filter((asset) => asset.isExternal).length,
  };
}

export function buildContentManifest(rootArg?: string): ContentManifest {
  const root = safeRoot(rootArg);
  const meta = loadContentMeta(root);
  const assets = new Map<string, ContentAsset>();

  const brandAssets = createLocalAsset(root, "brand/assets.md", meta, {
    title: "Brand Asset Log",
    linkedMarkdownPaths: ["brand/assets.md"],
  });
  addAsset(assets, brandAssets);

  if (brandAssets && existsSync(join(root, "brand/assets.md"))) {
    try {
      const rows = parseAssetsMarkdown(readFileSync(join(root, "brand/assets.md"), "utf-8"));
      for (const row of rows) {
        const defaults: Partial<ContentAsset> = {
          title: row.notes || titleFromPath(row.location),
          notes: row.notes,
          linkedMarkdownPaths: ["brand/assets.md"],
          source: {
            kind: "brand-assets",
            date: row.date,
            type: row.type,
            skill: row.skill,
          },
        };
        addAsset(
          assets,
          row.isExternal
            ? createExternalAsset(row.location, meta, defaults)
            : createLocalAsset(root, row.location, meta, defaults),
        );
      }
    } catch {
      // A malformed asset log should not make the whole Content page fail.
    }
  }

  for (const fileRel of ROOT_FILES) {
    addAsset(assets, createLocalAsset(root, fileRel, meta));
  }

  const scanned: string[] = [];
  for (const dir of SCAN_DIRS) {
    scanDirectory(root, dir, scanned);
  }
  for (const relPath of scanned) {
    addAsset(assets, createLocalAsset(root, relPath, meta));
  }

  const list = Array.from(assets.values()).sort((a, b) => {
    if (a.orderKey && b.orderKey) return a.orderKey.localeCompare(b.orderKey);
    if (a.orderKey) return -1;
    if (b.orderKey) return 1;
    return b.mtimeMs - a.mtimeMs || a.relativePath.localeCompare(b.relativePath);
  });

  return {
    projectRoot: root,
    generatedAt: new Date().toISOString(),
    assets: list,
    groups: meta.groups,
    stats: assetStats(list),
  };
}

export function readContentFile(path: string, rootArg?: string): ContentFileRead {
  const root = safeRoot(rootArg);
  const resolved = resolveInsideRoot(path, root);
  if (!resolved.ok) throw new Error(resolved.message);
  if (!isTextContentPath(resolved.rel)) throw new Error("Only markdown and text-like project files can be read");
  if (!existsSync(resolved.abs)) throw new Error(`${resolved.rel} does not exist`);
  const stat = statSync(resolved.abs);
  if (!stat.isFile()) throw new Error(`${resolved.rel} is not a file`);
  if (stat.size > MAX_TEXT_BYTES) throw new Error(`${resolved.rel} is too large to edit in Studio`);
  return {
    path: resolved.rel,
    content: readFileSync(resolved.abs, "utf-8"),
    mtime: fileVersionToken(stat),
    bytes: stat.size,
  };
}

export function writeContentFile(
  path: string,
  content: string,
  expectedMtime?: string,
  rootArg?: string,
): ContentFileWriteResult {
  const root = safeRoot(rootArg);
  const resolved = resolveInsideRoot(path, root);
  if (!resolved.ok) throw new Error(resolved.message);
  if (!isTextContentPath(resolved.rel)) throw new Error("Only markdown and text-like project files can be written");
  if (content.length > MAX_TEXT_BYTES) throw new Error(`${resolved.rel} exceeds the Studio edit limit`);

  const previous = existsSync(resolved.abs) ? readFileSync(resolved.abs, "utf-8") : "";
  if (expectedMtime && existsSync(resolved.abs)) {
    const serverMtime = fileVersionToken(statSync(resolved.abs));
    if (serverMtime !== expectedMtime) {
      return { ok: false, code: "CONFLICT", serverMtime, clientMtime: expectedMtime };
    }
  }

  mkdirSync(dirname(resolved.abs), { recursive: true });
  const tmp = `${resolved.abs}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, content, "utf-8");
  renameSync(tmp, resolved.abs);
  const stat = statSync(resolved.abs);
  return {
    ok: true,
    path: resolved.rel,
    mtime: fileVersionToken(stat),
    bytes: stat.size,
    deltaChars: content.length - previous.length,
  };
}

export function assertProjectMediaPath(path: string, rootArg?: string): { ok: true; abs: string; rel: string } | { ok: false; message: string } {
  const root = safeRoot(rootArg);
  const resolved = resolveInsideRoot(path, root);
  if (!resolved.ok) return resolved;
  if (!existsSync(resolved.abs)) return { ok: false, message: `${resolved.rel} does not exist` };
  const stat = statSync(resolved.abs);
  if (!stat.isFile()) return { ok: false, message: `${resolved.rel} is not a file` };
  return resolved;
}

export function relativePathFromAbsolute(absPath: string, rootArg?: string): string | null {
  const root = safeRoot(rootArg);
  const resolvedRoot = resolve(root);
  const resolvedAbs = resolve(absPath);
  if (resolvedAbs !== resolvedRoot && !resolvedAbs.startsWith(`${resolvedRoot}${sep}`)) return null;
  return normalizeRelPath(relative(resolvedRoot, resolvedAbs));
}
