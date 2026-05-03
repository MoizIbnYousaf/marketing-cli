import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { startTestServer, type ServerHandle } from "./helpers.ts";

let server: ServerHandle;

beforeAll(async () => {
  server = await startTestServer(4002);
});

afterAll(async () => {
  await server.kill();
});

/**
 * Collect SSE events into an array for a fixed window.
 * Skips the initial `connected` heartbeat so tests can wait for real events.
 */
async function collectEvents(url: string, waitMs: number): Promise<{ type: string; payload: unknown }[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), waitMs);
  const events: { type: string; payload: unknown }[] = [];

  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });
      if (done) break;

      let nl = buffer.indexOf("\n\n");
      while (nl >= 0) {
        const chunk = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 2);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim()) as { type: string; payload: unknown };
            if (evt.type !== "connected") events.push(evt);
          } catch {
            // ignore malformed frames
          }
        }
        nl = buffer.indexOf("\n\n");
      }
    }
  } catch {
    // abort expected on timeout
  } finally {
    clearTimeout(timer);
  }

  return events;
}

describe("integration/sse-delivery", () => {
  test("POST /api/activity/log fires an activity-new SSE event", async () => {
    const summary = `sse-delivery probe ${Date.now()}`;

    // Start collecting first, then trigger the write.
    const collector = collectEvents(`${server.baseUrl}/api/events`, 2_000);
    await Bun.sleep(100); // let the subscriber attach

    const post = await fetch(`${server.baseUrl}/api/activity/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "skill-run", skill: "landscape-scan", summary }),
    });
    expect(post.status).toBe(200);

    const events = await collector;
    const match = events.find(
      (e) => e.type === "activity-new" && (e.payload as { summary?: string }).summary === summary,
    );
    expect(match).toBeDefined();
  });

  test("POST /api/toast fires a toast SSE event with payload", async () => {
    const message = `toast probe ${Date.now()}`;

    const collector = collectEvents(`${server.baseUrl}/api/events`, 2_000);
    await Bun.sleep(100);

    const post = await fetch(`${server.baseUrl}/api/toast`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ level: "success", message }),
    });
    expect(post.status).toBe(200);

    const events = await collector;
    const match = events.find(
      (e) => e.type === "toast" && (e.payload as { message?: string }).message === message,
    );
    expect(match).toBeDefined();
  });
});
