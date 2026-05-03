// tests/integration/sse-keepalive.test.ts — Bug #8 regression guard
//
// Opens a live EventSource-shaped fetch against /api/events, holds it for
// ≥40s, and asserts:
//   1. The server never closes the stream on its own (Bun idleTimeout bypass).
//   2. Keepalive `: ping <ts>` comment frames arrive every ~15s.
//   3. /api/health .subscribers reports >= 1 for the entire window.
//
// If this test ever fails, the server-side half of Bug #8 has regressed.
//
// Related: docs/BUG8-DIAGNOSIS.md, lib/sse.ts:49-60, server.ts:1101-1108.

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { startTestServer, type ServerHandle } from "./helpers.ts";

const SOAK_MS = 40_000;
const MIN_PINGS = 2; // 40s with 15s keepalive ⇒ expect ≥2 pings.

let server: ServerHandle;

beforeAll(async () => {
  server = await startTestServer(4105);
});

afterAll(async () => {
  await server.kill();
});

describe("integration/sse-keepalive", () => {
  test(
    `holds /api/events open for ${SOAK_MS / 1000}s with keepalive pings and non-zero subscribers`,
    async () => {
      const controller = new AbortController();
      const started = Date.now();

      const res = await fetch(`${server.baseUrl}/api/events`, {
        signal: controller.signal,
        headers: { Accept: "text/event-stream" },
      });
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/event-stream");
      expect(res.body).not.toBeNull();

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let pingCount = 0;
      let sawConnected = false;
      const healthSamples: { tMs: number; subscribers: number }[] = [];

      // Sample /api/health every 10s while draining SSE frames.
      const healthTimer = setInterval(() => {
        fetch(`${server.baseUrl}/api/health`)
          .then((r) => r.json())
          .then((body: unknown) => {
            const b = body as { data?: { subscribers?: number }; subscribers?: number };
            const subs = b.data?.subscribers ?? b.subscribers ?? -1;
            healthSamples.push({ tMs: Date.now() - started, subscribers: subs });
          })
          .catch(() => {
            // Don't abort the soak on a single health hiccup.
          });
      }, 10_000);

      try {
        while (Date.now() - started < SOAK_MS) {
          const { value, done } = await reader.read();
          if (done) {
            throw new Error(
              `SSE stream closed prematurely after ${Date.now() - started}ms ` +
                `(expected to stay open for ${SOAK_MS}ms)`,
            );
          }
          buffer += decoder.decode(value, { stream: true });

          // Split on SSE event boundary (\n\n) and classify frames.
          let idx: number;
          while ((idx = buffer.indexOf("\n\n")) !== -1) {
            const frame = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            if (frame.startsWith(": ping")) pingCount++;
            else if (frame.includes('"type":"connected"')) sawConnected = true;
          }
        }
      } finally {
        clearInterval(healthTimer);
        controller.abort();
        try {
          await reader.cancel();
        } catch {
          // already closed
        }
      }

      // 1. Handshake arrived.
      expect(sawConnected).toBe(true);

      // 2. Server sent keepalive pings on schedule.
      expect(pingCount).toBeGreaterThanOrEqual(MIN_PINGS);

      // 3. /api/health reported subscribers >= 1 for every sample we took
      //    during the soak window.
      expect(healthSamples.length).toBeGreaterThanOrEqual(2);
      for (const s of healthSamples) {
        expect(s.subscribers).toBeGreaterThanOrEqual(1);
      }
    },
    SOAK_MS + 15_000,
  );
});
