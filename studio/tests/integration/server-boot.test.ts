import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { startTestServer, type ServerHandle } from "./helpers.ts";

let server: ServerHandle;

beforeAll(async () => {
  server = await startTestServer(4001);
});

afterAll(async () => {
  await server.kill();
});

describe("integration/server-boot", () => {
  test("/api/health returns JSON + version + timestamp", async () => {
    const res = await fetch(`${server.baseUrl}/api/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    // /api/health goes through wrapRoute, so it emits {ok, data: {...}}.
    const body = (await res.json()) as {
      ok: boolean;
      data?: { version: string; ts: string; subscribers: number };
      version?: string;
      ts?: string;
    };
    expect(body.ok).toBe(true);
    const payload = body.data ?? body;
    expect(typeof payload.version).toBe("string");
    expect(Number.isNaN(Date.parse(payload.ts ?? ""))).toBe(false);
  });

  test("/api/schema returns the full ROUTE_SCHEMA", async () => {
    const res = await fetch(`${server.baseUrl}/api/schema`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; routes: { path: string }[] };
    expect(body.ok).toBe(true);
    expect(body.routes.length).toBeGreaterThan(30);
    const paths = new Set(body.routes.map((r) => r.path));
    expect(paths.has("/api/health")).toBe(true);
    expect(paths.has("/api/activity")).toBe(true);
    expect(paths.has("/api/help")).toBe(true);
  });

  test("/api/help returns the agent cheat-sheet", async () => {
    const res = await fetch(`${server.baseUrl}/api/help`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      data: { errorCodes: string[]; entryPoints: unknown[] };
    };
    expect(body.ok).toBe(true);
    expect(body.data.errorCodes).toContain("BAD_INPUT");
    expect(body.data.entryPoints.length).toBeGreaterThan(0);
  });

  test("unknown route returns 404 with structured error", async () => {
    const res = await fetch(`${server.baseUrl}/api/definitely-not-a-route`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false });
  });
});
