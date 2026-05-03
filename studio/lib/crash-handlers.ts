// lib/crash-handlers.ts — Task #31 server stability
//
// Top-level handlers for `uncaughtException` and `unhandledRejection`.
// Imported for side effects from server.ts (and any other long-running
// entry point — the bin launcher, etc.).
//
// Why: Bun's default behavior on an unhandled promise rejection is
// `process.exit`, with no stack trace. Under sustained browser traffic
// (Playwright capture runs hitting /api/* through the Next.js dev proxy),
// `server.ts` was vanishing silently. The dashboard then renders
// `SectionError` banners as Next's proxy returns Internal Server Error.
//
// Net effect of this module:
//   - silent exits become visible failures (the trace is logged to stderr)
//   - the server stays alive through transient async errors instead of
//     dying on an SSE subscriber yanked mid-write or a brand-watcher race
//
// Idempotent. Importing twice is a no-op (the listener tracks seen kinds).

const installed = new Set<"uncaughtException" | "unhandledRejection">();

function install(
  kind: "uncaughtException" | "unhandledRejection",
  label: string,
): void {
  if (installed.has(kind)) return;
  installed.add(kind);

  process.on(kind, (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    process.stderr.write(
      `[crash-handlers] ${label} — keeping process alive:\n  ` +
        err.message +
        "\n" +
        (err.stack ?? "") +
        "\n",
    );
  });
}

install("uncaughtException", "uncaughtException");
install("unhandledRejection", "unhandledRejection");

export {};
