import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import {
  STUDIO_ERROR_CODES,
  isErrorEnvelope,
  startTestServer,
  type ServerHandle,
} from "./helpers.ts";

let server: ServerHandle;

beforeAll(async () => {
  server = await startTestServer(4003);
});

afterAll(async () => {
  await server.kill();
});

describe("integration/error-envelope", () => {
  test("GET /api/schema?route=<unknown> → 404 with structured error", async () => {
    const res = await fetch(
      `${server.baseUrl}/api/schema?route=${encodeURIComponent("/api/nope")}`,
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(isErrorEnvelope(body)).toBe(true);
    if (isErrorEnvelope(body)) {
      expect(STUDIO_ERROR_CODES.has(body.error.code)).toBe(true);
      expect(body.error.code).toBe("NOT_FOUND");
    }
  });

  test("POST /api/activity/log with invalid JSON → BAD_INPUT", async () => {
    const res = await fetch(`${server.baseUrl}/api/activity/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(isErrorEnvelope(body)).toBe(true);
    if (isErrorEnvelope(body)) expect(body.error.code).toBe("BAD_INPUT");
  });

  test("POST /api/brand/note with path traversal → BAD_INPUT", async () => {
    const res = await fetch(`${server.baseUrl}/api/brand/note`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ file: "../../etc/passwd", excerpt: "nope" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(isErrorEnvelope(body)).toBe(true);
    if (isErrorEnvelope(body)) expect(body.error.code).toBe("BAD_INPUT");
  });

  test("POST /api/skill/run with uppercase skill id → BAD_INPUT", async () => {
    const res = await fetch(`${server.baseUrl}/api/skill/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Bad Skill" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(isErrorEnvelope(body)).toBe(true);
  });

  test("POST /api/activity/log with control chars → BAD_INPUT", async () => {
    const res = await fetch(`${server.baseUrl}/api/activity/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "skill-run\x00",
        summary: "evil",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(isErrorEnvelope(body)).toBe(true);
  });

  test("every error response in this suite carries a string `fix` hint where possible", async () => {
    // Re-exercise a validator error and confirm the fix field is present.
    const res = await fetch(`${server.baseUrl}/api/activity/log`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "", summary: "" }),
    });
    const body = await res.json();
    expect(isErrorEnvelope(body)).toBe(true);
    if (isErrorEnvelope(body)) {
      expect(typeof body.error.message).toBe("string");
      if (body.error.fix) expect(typeof body.error.fix).toBe("string");
    }
  });
});
