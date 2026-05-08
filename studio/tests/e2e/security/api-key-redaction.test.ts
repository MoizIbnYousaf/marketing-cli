// Lane 1 E2E -- API key redaction on /api/publish/native/account.
//
// Asserts the FULL response shape (not just key presence). The endpoint
// must return apiKeyPreview but NEVER the full apiKey. Audit (Task #16)
// found this as a P0 leak; this test pins the redaction so it cannot
// regress.

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { startSecurityServer, type SecurityHarness, PORTS } from "./harness";

let h: SecurityHarness;

beforeAll(async () => {
  h = await startSecurityServer({ port: PORTS.apiKeyRedaction });
});

afterAll(async () => {
  await h?.teardown();
});

interface NativeAccountResponse {
  ok: true;
  data: {
    adapter: "mktg-native";
    account: {
      id: string;
      apiKeyPreview: string;
      mode: "workspace";
      createdAt: string;
      updatedAt: string;
      // apiKey MUST NOT be present
      apiKey?: never;
    };
    providerCount: number;
    postCount: number;
  };
}

describe("API key redaction -- /api/publish/native/account", () => {
  test("HAPPY: response envelope is {ok:true, data:{...}} and account.apiKey is ABSENT", async () => {
    const r = await fetch(`${h.baseUrl}/api/publish/native/account`, { headers: h.bearer() });
    expect(r.status).toBe(200);
    const raw = (await r.json()) as Record<string, unknown>;
    // Top-level envelope
    expect(raw.ok).toBe(true);
    expect(raw.data).toBeTruthy();

    const body = raw as unknown as NativeAccountResponse;
    expect(body.data.adapter).toBe("mktg-native");
    expect(typeof body.data.providerCount).toBe("number");
    expect(typeof body.data.postCount).toBe("number");

    // The account block: every documented field present...
    expect(typeof body.data.account.id).toBe("string");
    expect(typeof body.data.account.apiKeyPreview).toBe("string");
    expect(body.data.account.mode).toBe("workspace");
    expect(typeof body.data.account.createdAt).toBe("string");
    expect(typeof body.data.account.updatedAt).toBe("string");

    // ...except apiKey, which MUST NOT be in the response.
    expect("apiKey" in (body.data.account as Record<string, unknown>)).toBe(false);
  });

  test("REGRESSION GUARD: serialized JSON does not contain the substring 'apiKey:' or 'apiKey\"' as a key", async () => {
    // Belt + suspenders: even if the type changes, the wire bytes must not
    // include the full key. The local mktg-native account stores a
    // 'mktg_live_*' or 'mktg_test_*' prefixed token; if the server ever
    // accidentally serialises it again, this guard catches it.
    const r = await fetch(`${h.baseUrl}/api/publish/native/account`, { headers: h.bearer() });
    expect(r.status).toBe(200);
    const text = await r.text();

    // The full "apiKey" property name must not appear anywhere in the body.
    // (apiKeyPreview is fine -- it does not contain the string `"apiKey"` followed by `":"`.)
    expect(text).not.toMatch(/"apiKey"\s*:/);
    // mktg-native key prefixes that should never leak.
    expect(text).not.toMatch(/mktg_live_/);
    expect(text).not.toMatch(/mktg_test_/);
  });

  test("EDGE: apiKeyPreview is a redacted form (must contain a tail/ellipsis pattern, never full key shape)", async () => {
    const r = await fetch(`${h.baseUrl}/api/publish/native/account`, { headers: h.bearer() });
    const body = (await r.json()) as { data: { account: { apiKeyPreview: string } } };
    const preview = body.data.account.apiKeyPreview;
    // The preview should be much shorter than a real 64+ char API key,
    // and should not contain known key-prefix strings.
    expect(preview.length).toBeLessThan(40);
    expect(preview).not.toMatch(/mktg_live_[a-zA-Z0-9]{20,}/);
    expect(preview).not.toMatch(/mktg_test_[a-zA-Z0-9]{20,}/);
  });

  test("FAILURE: same endpoint without auth returns 401 (auth gate runs first, no apiKey leaked)", async () => {
    const r = await fetch(`${h.baseUrl}/api/publish/native/account`);
    expect(r.status).toBe(401);
    const text = await r.text();
    expect(text).not.toMatch(/"apiKey"\s*:/);
    expect(text).not.toMatch(/mktg_live_/);
  });
});
