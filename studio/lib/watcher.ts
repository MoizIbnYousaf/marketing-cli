// lib/watcher.ts -- brand/ directory watcher
// Uses fs.watch (Bun-compatible) to detect file changes.
// On any change → publishes SSE event to the global emitter.

import { watch } from "node:fs";
import { join, basename, relative } from "node:path";
import { existsSync, mkdirSync, statSync } from "node:fs";
import type { SSEEmitter } from "./sse.ts";
import { resolveProjectRoot } from "./project-root.ts";
import { classifyContentAssetKind } from "./content-manifest.ts";

// Brand files we care about -- exact filenames in brand/
export const BRAND_FILES = [
  "voice-profile.md",
  "audience.md",
  "positioning.md",
  "competitors.md",
  "landscape.md",
  "keyword-plan.md",
  "creative-kit.md",
  "stack.md",
  "assets.md",
  "learnings.md",
] as const;

export type BrandFile = (typeof BRAND_FILES)[number];

export interface BrandFileChangedPayload {
  file: string;
  brandFile: BrandFile | null;
  path: string;
  eventType: "rename" | "change";
}

let watcherInstance: ReturnType<typeof watch> | null = null;
let contentWatcherInstances: ReturnType<typeof watch>[] = [];

/**
 * Start watching the brand/ directory for file changes.
 * Publishes { type: "brand-file-changed", payload } to the SSE emitter
 * on every detected write.
 *
 * @param emitter  The SSEEmitter to publish events to (typically globalEmitter)
 * @param brandDir Absolute path to the brand/ directory (defaults to CWD/brand)
 */
export function startBrandWatcher(
  emitter: SSEEmitter,
  brandDir?: string,
): void {
  // Default resolution honors MKTG_BRAND_DIR so the E1 test harness
  // can redirect watcher + API at a shared tmp dir (A30).
  const dir =
    brandDir
    ?? process.env.MKTG_BRAND_DIR
    ?? join(resolveProjectRoot(process.cwd()), "brand");

  // Create brand/ if it doesn't exist yet (fresh project)
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
      console.log("[watcher] Created brand/ directory at", dir);
    } catch {
      console.warn("[watcher] Could not create brand/ directory:", dir);
      return;
    }
  }

  if (watcherInstance) {
    watcherInstance.close();
    watcherInstance = null;
  }

  console.log("[watcher] Watching brand/ directory:", dir);

  // Debounce rapid successive events (e.g. editor saves multiple times)
  const debounceMap = new Map<string, NodeJS.Timeout>();

  watcherInstance = watch(dir, { recursive: false }, (eventType, filename) => {
    if (!filename) return;

    // Only react to markdown files
    if (!filename.endsWith(".md")) return;

    // Debounce per-file -- 150ms window
    const existing = debounceMap.get(filename);
    if (existing) clearTimeout(existing);

    debounceMap.set(
      filename,
      setTimeout(() => {
        debounceMap.delete(filename);

        const brandFile = (BRAND_FILES as readonly string[]).includes(filename)
          ? (filename as BrandFile)
          : null;

        const payload: BrandFileChangedPayload = {
          file: filename,
          brandFile,
          path: join(dir, filename),
          eventType: eventType as "rename" | "change",
        };

        console.log(`[watcher] brand-file-changed: ${filename} (${eventType})`);

        emitter.publish<BrandFileChangedPayload>("*", {
          type: "brand-file-changed",
          payload,
        });
      }, 150),
    );
  });

  watcherInstance.on("error", (err) => {
    console.error("[watcher] Error watching brand/ directory:", err.message);
  });
}

/** Stop the brand/ watcher. Call on graceful shutdown. */
export function stopBrandWatcher(): void {
  if (watcherInstance) {
    watcherInstance.close();
    watcherInstance = null;
    console.log("[watcher] Stopped brand/ watcher.");
  }
}

export interface ContentFileChangedPayload {
  path: string;
  kind: "image" | "video" | "markdown" | "file";
  eventType: "rename" | "change";
}

const CONTENT_WATCH_DIRS = ["", "brand", "content", "assets", "marketing", "public"] as const;
const CONTENT_WATCH_ROOT_FILES = new Set(["launch.md"]);
const CONTENT_WATCH_EXTENSIONS = /\.(md|mdx|txt|json|jsonl|csv|yaml|yml|png|jpe?g|webp|gif|svg|avif|mp4|webm|mov|m4v|pdf)$/i;

function shouldEmitContentPath(relPath: string, watchedDir: string): boolean {
  const normalized = relPath.replace(/\\/g, "/");
  if (!normalized || normalized.includes("/node_modules/") || normalized.includes("/.next/")) return false;
  if (watchedDir === "") return CONTENT_WATCH_ROOT_FILES.has(normalized);
  return CONTENT_WATCH_EXTENSIONS.test(normalized);
}

/**
 * Start lightweight local content watching for agent-native UI sync.
 *
 * This intentionally uses Bun-compatible fs.watch instead of a new chokidar
 * dependency. It watches the project surfaces the Studio owns today and emits
 * `content-file-changed` so the Content page can invalidate its manifest when
 * either the user or an agent writes markdown/media on disk.
 */
export function startContentWatcher(
  emitter: SSEEmitter,
  rootArg?: string,
): void {
  stopContentWatcher();
  const root = resolveProjectRoot(rootArg ?? process.cwd());
  const debounceMap = new Map<string, NodeJS.Timeout>();

  for (const dir of CONTENT_WATCH_DIRS) {
    const abs = dir ? join(root, dir) : root;
    if (!existsSync(abs)) continue;
    try {
      if (!statSync(abs).isDirectory()) continue;
    } catch {
      continue;
    }

    const watcher = watch(abs, { recursive: false }, (eventType, filename) => {
      if (!filename) return;
      const relPath = (dir ? join(dir, filename.toString()) : filename.toString()).replace(/\\/g, "/");
      if (!shouldEmitContentPath(relPath, dir)) return;

      const existing = debounceMap.get(relPath);
      if (existing) clearTimeout(existing);

      debounceMap.set(
        relPath,
        setTimeout(() => {
          debounceMap.delete(relPath);
          const payload: ContentFileChangedPayload = {
            path: relPath,
            kind: classifyContentAssetKind(relPath),
            eventType: eventType as "rename" | "change",
          };
          console.log(`[watcher] content-file-changed: ${payload.path} (${eventType})`);
          emitter.publish<ContentFileChangedPayload>("*", {
            type: "content-file-changed",
            payload,
          });
        }, 150),
      );
    });

    watcher.on("error", (err) => {
      console.error(`[watcher] Error watching content directory ${relative(root, abs) || "."}:`, err.message);
    });
    contentWatcherInstances.push(watcher);
  }

  if (contentWatcherInstances.length > 0) {
    console.log(`[watcher] Watching content surfaces: ${contentWatcherInstances.length} directory/directories.`);
  }
}

/** Stop all Content workspace watchers. Call on graceful shutdown. */
export function stopContentWatcher(): void {
  if (contentWatcherInstances.length === 0) return;
  for (const watcher of contentWatcherInstances) watcher.close();
  contentWatcherInstances = [];
  console.log("[watcher] Stopped content watchers.");
}
