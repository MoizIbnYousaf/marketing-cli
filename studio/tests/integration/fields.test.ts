import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { isErrorEnvelope, startTestServer, type ServerHandle } from "./helpers.ts";

let server: ServerHandle;

beforeAll(async () => {
  server = await startTestServer(4005);

  // Seed a deterministic row so field-mask probes have something to project.
  await fetch(`${server.baseUrl}/api/activity/log`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "fields-probe",
      skill: "landscape-scan",
      summary: "fields probe seed",
    }),
  });
});

afterAll(async () => {
  await server.kill();
});

describe("integration/fields", () => {
  test("?fields=id,summary returns only those fields per item", async () => {
    const res = await fetch(`${server.baseUrl}/api/activity?fields=id,summary&limit=5`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { ok: boolean; data: Record<string, unknown>[] };
    expect(body.ok).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    for (const item of body.data) {
      const keys = Object.keys(item);
      // Each item must contain only the requested fields (or a subset if missing).
      for (const key of keys) {
        expect(["id", "summary"].includes(key)).toBe(true);
      }
      expect("kind" in item).toBe(false);
      expect("createdAt" in item).toBe(false);
    }
  });

  test("?fields=<unknown> returns BAD_INPUT with available-fields hint", async () => {
    const res = await fetch(`${server.baseUrl}/api/activity?fields=__definitely_not_a_field__`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(isErrorEnvelope(body)).toBe(true);
    if (isErrorEnvelope(body)) {
      expect(body.error.code).toBe("BAD_INPUT");
      expect(body.error.message).toContain("__definitely_not_a_field__");
      // Fix hint should name real fields.
      expect(body.error.fix).toBeDefined();
    }
  });

  test("Accept: application/x-ndjson streams the list as NDJSON", async () => {
    const res = await fetch(`${server.baseUrl}/api/activity?limit=3`, {
      headers: { accept: "application/x-ndjson" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.length > 0);
    for (const line of lines) {
      // Each line must parse as JSON on its own.
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});
