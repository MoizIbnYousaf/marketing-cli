// mktg — Runtime compatibility shim
//
// Purpose: `bun build src/cli.ts --outdir dist --target node` preserves Bun
// API calls (Bun.file, Bun.write, Bun.Glob, Bun.CryptoHasher, Bun.which) in
// the bundled output. When the resulting dist/cli.js runs under node — which
// happens via `npm install -g marketing-cli && mktg ...` — every Bun.* reference
// crashes with "Bun is not defined".
//
// This module installs a node-compatible subset of the Bun global when one
// is not already present. It runs at CLI entry time (first import in
// src/cli.ts) so every downstream module that uses Bun.* sees a working
// implementation.
//
// Design principles:
// - Under Bun: typeof globalThis.Bun !== "undefined", polyfill is a no-op.
// - Under node: polyfill installs the subset of Bun APIs mktg actually uses.
// - Covers the exact surface grepped from src/: Bun.file({text,json,arrayBuffer,exists}),
//   Bun.write, Bun.Glob{scan}, Bun.CryptoHasher, Bun.which, Bun.spawn. Nothing else.
// - No new deps. Uses only node built-ins (fs/promises, fs, crypto, path,
//   child_process).
//
// Regression test: tests/integration/node-runtime-compat.test.ts builds the
// bundle and spawns it via `node` child process, asserting the 5 core
// commands (doctor, init --dry-run, list, status, schema) exit cleanly.

import {
  readFile,
  writeFile,
  access,
  readdir,
  stat as fsStat,
  mkdir,
} from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { createHash, type Hash } from "node:crypto";
import { dirname, join, delimiter } from "node:path";
import { accessSync, constants as syncFsConstants } from "node:fs";
import { spawn as nodeSpawn } from "node:child_process";
import { Readable } from "node:stream";

// Short-circuit under Bun — the real Bun global is already present.
if (typeof (globalThis as { Bun?: unknown }).Bun === "undefined") {
  // -------------------------------------------------------------------------
  // Bun.file(path) — lazy file handle with text/json/arrayBuffer/exists
  // -------------------------------------------------------------------------
  const file = (path: string) => ({
    async text(): Promise<string> {
      return readFile(path, "utf-8");
    },
    async json(): Promise<unknown> {
      const raw = await readFile(path, "utf-8");
      return JSON.parse(raw);
    },
    async arrayBuffer(): Promise<ArrayBuffer> {
      const buf = await readFile(path);
      return buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      ) as ArrayBuffer;
    },
    async exists(): Promise<boolean> {
      try {
        await access(path, fsConstants.F_OK);
        return true;
      } catch {
        return false;
      }
    },
    // Bun.file(path).stat() — returns a node fs.Stats shape which is
    // API-compatible with Bun's return (both expose `mtimeMs`, `size`,
    // `isFile()`, `isDirectory()`, etc.). Used by brand freshness checks
    // in src/core/brand.ts and src/commands/brand.ts — without this method
    // `mktg init`, `mktg doctor`, `mktg status` crash under node with
    // `bunFile.stat is not a function` AFTER writing brand files (task #21).
    async stat() {
      return fsStat(path);
    },
  });

  // -------------------------------------------------------------------------
  // Bun.write(path, content) — write string, ArrayBuffer, or Uint8Array
  // Also auto-creates parent directories to match Bun's behavior. mktg only
  // ever passes string, ArrayBuffer (from Bun.file().arrayBuffer()), or
  // Uint8Array — SharedArrayBuffer is never used, so the signature
  // deliberately excludes ArrayBufferLike to keep TypeScript's strict mode
  // happy about the ArrayBuffer branch.
  // -------------------------------------------------------------------------
  const write = async (
    path: string,
    content: string | ArrayBuffer | Uint8Array,
  ): Promise<number> => {
    // Ensure parent directory exists (Bun.write does this automatically).
    await mkdir(dirname(path), { recursive: true });

    let data: Buffer | string;
    if (typeof content === "string") {
      data = content;
    } else if (content instanceof Uint8Array) {
      // Uint8Array is a view onto an underlying ArrayBuffer.
      data = Buffer.from(
        content.buffer,
        content.byteOffset,
        content.byteLength,
      );
    } else {
      // ArrayBuffer — the only remaining branch per the signature.
      data = Buffer.from(content);
    }
    await writeFile(path, data);
    return typeof data === "string" ? Buffer.byteLength(data) : data.length;
  };

  // -------------------------------------------------------------------------
  // Bun.CryptoHasher — wraps node:crypto createHash with the Bun API shape
  // -------------------------------------------------------------------------
  class CryptoHasher {
    private readonly hasher: Hash;
    constructor(algo: string) {
      this.hasher = createHash(algo);
    }
    update(data: string | Uint8Array | ArrayBuffer | Buffer): this {
      if (data instanceof ArrayBuffer) {
        this.hasher.update(Buffer.from(data));
      } else if (data instanceof Uint8Array) {
        // Uint8Array is accepted by hasher.update directly.
        this.hasher.update(data);
      } else {
        // string or Buffer — native hasher support.
        this.hasher.update(data as string | Buffer);
      }
      return this;
    }
    digest(encoding: "hex" | "base64" = "hex"): string {
      return this.hasher.digest(encoding);
    }
  }

  // -------------------------------------------------------------------------
  // Bun.Glob(pattern).scan(cwd) — minimal recursive glob walker
  // Supports: **, *, ?, {alt1,alt2}, literal paths. Matches the subset of
  // patterns mktg actually uses: "**/*", "**/*.{md,mdx,txt,html}",
  // "**/publish.json", "*/skills/<name>/SKILL.md".
  // -------------------------------------------------------------------------
  class Glob {
    private readonly regex: RegExp;
    constructor(pattern: string) {
      this.regex = globToRegex(pattern);
    }
    // Bun accepts both scan("dir") and scan({ cwd: "dir" }); callers use both.
    async *scan(target: string | { cwd?: string } = "."): AsyncIterable<string> {
      const cwd = typeof target === "string" ? target : (target.cwd ?? ".");
      for await (const rel of walk(cwd, "")) {
        if (this.regex.test(rel)) yield rel;
      }
    }
  }

  async function* walk(
    root: string,
    prefix: string,
  ): AsyncIterable<string> {
    const currentDir = prefix ? join(root, prefix) : root;
    let entries: string[];
    try {
      entries = await readdir(currentDir);
    } catch {
      return;
    }
    for (const name of entries) {
      const rel = prefix ? `${prefix}/${name}` : name;
      const full = join(root, rel);
      let s;
      try {
        s = await fsStat(full);
      } catch {
        continue;
      }
      if (s.isDirectory()) {
        yield* walk(root, rel);
      } else {
        yield rel;
      }
    }
  }

  function globToRegex(pattern: string): RegExp {
    let re = "";
    let i = 0;
    while (i < pattern.length) {
      const ch = pattern[i]!;
      if (ch === "*") {
        if (pattern[i + 1] === "*") {
          // `**/` matches zero or more directory segments
          if (pattern[i + 2] === "/") {
            re += "(?:[^/]+/)*";
            i += 3;
            continue;
          }
          // `**` at end matches anything
          re += ".*";
          i += 2;
          continue;
        }
        // `*` matches anything except `/`
        re += "[^/]*";
        i += 1;
        continue;
      }
      if (ch === "?") {
        re += "[^/]";
        i += 1;
        continue;
      }
      if (ch === "{") {
        // `{md,json,mdx}` → `(?:md|json|mdx)`
        const end = pattern.indexOf("}", i);
        if (end === -1) {
          re += "\\{";
          i += 1;
          continue;
        }
        const alts = pattern
          .slice(i + 1, end)
          .split(",")
          .map(escapeRegex)
          .join("|");
        re += `(?:${alts})`;
        i = end + 1;
        continue;
      }
      // Escape regex metacharacters; pass through everything else.
      if (".+^$()|[]\\".includes(ch)) {
        re += "\\" + ch;
      } else {
        re += ch;
      }
      i += 1;
    }
    return new RegExp("^" + re + "$");
  }

  function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // -------------------------------------------------------------------------
  // Bun.which(tool) — PATH lookup. Returns the absolute path to `tool` if
  // found on PATH, else null.
  //
  // Hardening (task #23 fix 4): the previous implementation used
  // `execSync(\`command -v ${tool}\`, { shell: "/bin/sh" })` which interpolated
  // `tool` into a shell string — a latent command-injection primitive. Today
  // only hardcoded binary names from doctor.ts reach it, but the signature
  // accepts any string and a future caller passing agent-supplied input would
  // execute `; rm -rf ~` verbatim.
  //
  // Fix: no child processes at all. Walk `process.env.PATH` ourselves and
  // check file existence + exec bit with `accessSync`. Defense in depth:
  //   1. Allow-list regex on the tool name (rejects metacharacters).
  //   2. Pure Node fs — no shell, no argv interpolation, no injection surface.
  // -------------------------------------------------------------------------
  const SAFE_TOOL_NAME_RE = /^[a-zA-Z0-9._-]+$/;
  const which = (tool: string): string | null => {
    if (!SAFE_TOOL_NAME_RE.test(tool)) {
      return null;
    }
    const pathEnv = process.env.PATH || process.env.Path || "";
    if (pathEnv === "") return null;
    const pathExts = process.platform === "win32"
      ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM")
          .split(";")
          .map((e) => e.trim())
          .filter(Boolean)
      : [""];
    for (const dir of pathEnv.split(delimiter)) {
      if (!dir) continue;
      for (const ext of pathExts) {
        const candidate = join(dir, `${tool}${ext}`);
        try {
          accessSync(candidate, syncFsConstants.X_OK);
          return candidate;
        } catch {
          // Not executable or doesn't exist — try next candidate.
        }
      }
    }
    return null;
  };

  // -------------------------------------------------------------------------
  // Bun.spawn — the subset mktg uses: spawn(cmd[], opts) and spawn({cmd,...}),
  // piped stdout/stderr readable via `new Response(proc.stdout).text()`,
  // a writable stdin with write()/end(), `exited` as a Promise<number>, and
  // kill(signal). No shell is involved: argv is passed straight to the OS.
  // -------------------------------------------------------------------------
  type StdioMode = "pipe" | "inherit" | "ignore";
  type SpawnOptions = {
    cwd?: string;
    env?: Record<string, string | undefined>;
    stdin?: StdioMode;
    stdout?: StdioMode;
    stderr?: StdioMode;
  };
  type SpawnInput = SpawnOptions & { cmd: readonly string[] };

  const emptyStream = (): ReadableStream<Uint8Array> =>
    new ReadableStream<Uint8Array>({ start: (controller) => controller.close() });

  const spawn = (
    first: readonly string[] | SpawnInput,
    second: SpawnOptions = {},
  ) => {
    const isArgv = Array.isArray(first);
    const cmd = isArgv ? (first as readonly string[]) : (first as SpawnInput).cmd;
    const opts = isArgv ? second : (first as SpawnInput);
    const [file, ...args] = cmd;
    if (typeof file !== "string" || file.length === 0) {
      throw new Error("Bun.spawn: cmd must be a non-empty array of strings");
    }
    const child = nodeSpawn(file, args, {
      cwd: opts.cwd,
      env: (opts.env ?? process.env) as NodeJS.ProcessEnv,
      stdio: [opts.stdin ?? "ignore", opts.stdout ?? "pipe", opts.stderr ?? "inherit"],
    });
    const exited = new Promise<number>((resolve) => {
      // A spawn failure (ENOENT, EACCES) emits "error" and never "close".
      // Resolve to 127, the shell convention for "command not found", so
      // callers that only await `exited` still see a non-zero exit.
      child.once("error", () => resolve(127));
      child.once("close", (code, signal) => resolve(code ?? (signal ? 128 : 1)));
    });
    const toWeb = (stream: Readable | null): ReadableStream<Uint8Array> =>
      stream ? (Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>) : emptyStream();
    return {
      pid: child.pid,
      stdout: toWeb(child.stdout),
      stderr: toWeb(child.stderr),
      stdin: {
        write: (data: string | Uint8Array): number => {
          child.stdin?.write(data);
          return typeof data === "string" ? Buffer.byteLength(data) : data.byteLength;
        },
        end: async (): Promise<void> => {
          child.stdin?.end();
        },
      },
      exited,
      kill: (signal?: NodeJS.Signals | number): void => {
        child.kill(signal);
      },
    };
  };

  // -------------------------------------------------------------------------
  // Install the polyfill as globalThis.Bun.
  // -------------------------------------------------------------------------
  (globalThis as { Bun?: unknown }).Bun = {
    file,
    write,
    CryptoHasher,
    Glob,
    which,
    spawn,
  };
}

// Re-export nothing — this module is imported for its top-level side effect
// only. The empty export satisfies `isolatedModules` in strict TypeScript.
export {};
