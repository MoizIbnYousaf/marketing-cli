// tests/integration/destructive-delete.test.ts — exercises the confirm rail
// end-to-end on DELETE /api/activity/:id. Proves a destructive route on the
// studio refuses without ?confirm=true, honors ?dryRun=true, 404s on missing
// ids, and otherwise removes the row + emits an SSE event.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { isErrorEnvelope, STUDIO_ERROR_CODES, startTestServer, type ServerHandle } from "./helpers.ts";

let server: ServerHandle;

beforeAll(async () => {
  server = await startTestServer(4012);
});

afterAll(async () => {
  await server.kill();
});

async function createActivity(): Promise<number> {
  const res = await fetch(`${server.baseUrl}/api/activity/log`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "custom", summary: `seed ${Date.now()}` }),
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { ok: boolean; data: { id: number } };
  expect(body.ok).toBe(true);
  expect(typeof body.data.id).toBe("number");
  return body.data.id;
}

describe("integration/destructive-delete", () => {
  test("DELETE /api/activity/:id without ?confirm=true → CONFIRM_REQUIRED", async () => {
    const id = await createActivity();
    const res = await fetch(`${server.baseUrl}/api/activity/${id}`, { method: "DELETE" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(isErrorEnvelope(body)).toBe(true);
    if (isErrorEnvelope(body)) {
      expect(STUDIO_ERROR_CODES.has(body.error.code)).toBe(true);
      expect(body.error.code).toBe("CONFIRM_REQUIRED");
      expect(body.error.fix).toBeTruthy();
    }

    // The row should still exist after a refused delete.
    const list = await fetch(`${server.baseUrl}/api/activity?limit=500`).then((r) => r.json()) as { data: Array<{ id: number }> };
    expect(list.data.some((row) => row.id === id)).toBe(true);
  });

  test("DELETE /api/activity/:id?confirm=true&dryRun=true → ok, row preserved", async () => {
    const id = await createActivity();
    const res = await fetch(`${server.baseUrl}/api/activity/${id}?confirm=true&dryRun=true`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; dryRun?: boolean };
    expect(body.ok).toBe(true);
    expect(body.dryRun).toBe(true);

    const list = await fetch(`${server.baseUrl}/api/activity?limit=500`).then((r) => r.json()) as { data: Array<{ id: number }> };
    expect(list.data.some((row) => row.id === id)).toBe(true);
  });

  test("DELETE /api/activity/99999999?confirm=true → NOT_FOUND with fix hint", async () => {
    const res = await fetch(`${server.baseUrl}/api/activity/99999999?confirm=true`, { method: "DELETE" });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(isErrorEnvelope(body)).toBe(true);
    if (isErrorEnvelope(body)) {
      expect(body.error.code).toBe("NOT_FOUND");
      expect(body.error.fix).toBeTruthy();
    }
  });

  test("DELETE /api/activity/:id?confirm=true → row removed + activity-deleted SSE", async () => {
    const id = await createActivity();

    // Subscribe to SSE before sending the delete so we don't miss the event.
    const ctrl = new AbortController();
    const sse = fetch(`${server.baseUrl}/api/events`, { signal: ctrl.signal });
    const seen: { id: number | null } = { id: null };

    const reader = (await sse).body!.getReader();
    const decoder = new TextDecoder();
    const eventPromise = (async () => {
      let buf = "";
      while (seen.id === null) {
        const chunk = await reader.read();
        if (chunk.done) return;
        buf += decoder.decode(chunk.value, { stream: true });
        // SSE frames are `data: <json>\n\n`; the envelope is
        // `{type, payload, ts}` per lib/sse.ts.
        for (const block of buf.split("\n\n")) {
          const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const parsed = JSON.parse(dataLine.slice("data: ".length)) as {
              type?: string;
              payload?: { id?: number };
            };
            if (parsed.type === "activity-deleted" && typeof parsed.payload?.id === "number") {
              seen.id = parsed.payload.id;
              return;
            }
          } catch { /* keep reading */ }
        }
      }
    })();

    // Small grace window so the SSE handshake registers before we mutate.
    await Bun.sleep(50);

    const res = await fetch(`${server.baseUrl}/api/activity/${id}?confirm=true`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { id: number; deleted: boolean } };
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ id, deleted: true });

    // Wait up to 2s for the SSE event, then tear down the subscription.
    await Promise.race([eventPromise, Bun.sleep(2_000)]);
    ctrl.abort();
    expect(seen.id).toBe(id);

    const list = await fetch(`${server.baseUrl}/api/activity?limit=500`).then((r) => r.json()) as { data: Array<{ id: number }> };
    expect(list.data.some((row) => row.id === id)).toBe(false);
  });

  test("DELETE /api/activity/abc → BAD_INPUT (digits-only path)", async () => {
    const res = await fetch(`${server.baseUrl}/api/activity/abc?confirm=true`, { method: "DELETE" });
    // The router regex only matches digits, so this should fall through to the
    // catch-all 404 — but either way the error is structured.
    expect([400, 404]).toContain(res.status);
    const body = await res.json();
    expect(isErrorEnvelope(body)).toBe(true);
  });
});
