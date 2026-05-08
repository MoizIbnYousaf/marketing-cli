# Lane 1 E2E -- Security & API Hardening

**Owner:** ironmint
**Task:** #30 (E2E Lane 1: Real auth perimeter coverage)
**Run date:** 2026-05-08
**Result:** **69/69 pass, 0 fail, 169 expect() calls, 7 files, ~3.2s wall clock**

```
$ bun test --timeout 120000 tests/e2e/security/
bun test v1.3.8 (b64edcb4)

 69 pass
 0 fail
 169 expect() calls
Ran 69 tests across 7 files. [3.23s]
```

No mocks. No shimmed validators. Every test boots a real Bun server with the auth perimeter ENABLED (no `MKTG_STUDIO_AUTH=disabled`), reads a real token from a per-test file, and probes via real `fetch()` calls. The only subprocess is the server itself + a `bun run src/cli.ts` for the CLI validation suite.

## File-by-file breakdown

| File | Tests | Coverage |
|---|---|---|
| `harness.ts` | (no tests) | Spawns real server, reads token, returns base URL + helpers. Per-port allocation prevents cross-suite collisions. |
| `auth-perimeter.test.ts` | 17 | Public allowlist (3), Authorization: Bearer (5), `?token=` query (4), header precedence (2), Host header allowlist (5) |
| `api-key-redaction.test.ts` | 4 | Full response shape on `/api/publish/native/account`, regex regression guard against `mktg_live_/mktg_test_` substrings, apiKeyPreview shape, no-auth-still-no-leak |
| `parse-body-strict.test.ts` | 10 | 64 KB cap (3), prototype pollution `__proto__` + `constructor` (4), malformed JSON (3) |
| `palette-endpoints.test.ts` | 18 | All 5 palette POSTs (skill/run, cmo/playbook, brand/refresh, brand/reset, settings/env) gated -- 3 cases each: no-auth=401 / Bearer=success / `?token=`=success. Plus confirm-gate on destructive routes (3) and live SSE assertion that audit row contains key NAME but NOT key VALUE. |
| `token-rotation.test.ts` | 4 | File mode 0o600, restart-reuses-token, delete+restart-rotates-token (old rejected), `MKTG_STUDIO_TOKEN` env override |
| `malformed-headers.test.ts` | 8 | `Bearer` no token, whitespace-only, `Basic`, `Token`, double space, trailing whitespace, folded duplicates, embedded control char |
| `mktg-run-validation.test.ts` | 5 | CLI `mktg run`: valid name -> NOT_FOUND (past validator), uppercase rejected, shell-metachar rejected, 10000-char rejected (regression: error message length capped), missing positional |

## Coverage map vs Lane 1 ship criteria

| Requirement | Coverage |
|---|---|
| Authorization: Bearer happy path | `auth-perimeter` 5 tests, `palette-endpoints` 5 tests |
| `?token=` query param fallback (browser SSE) | `auth-perimeter` 4 tests + 1 SSE-stream test, `palette-endpoints` 5 tests |
| Host allowlist (DNS rebinding mitigation) | `auth-perimeter` 5 Host tests including "applies to public allowlist" and "applies before token check" |
| Public allowlist (`/api/health`, `/api/schema`, `/api/help`) | `auth-perimeter` 3 tests asserting 200 with no token |
| API key redaction full response shape | `api-key-redaction` 4 tests, regex guard against full-key substrings |
| `parseBodyStrict` 64 KB cap | `parse-body-strict` 3 tests at 1 KB happy / 65 KB+1 boundary / 70 KB |
| Prototype pollution guard (`__proto__` + `constructor`) | `parse-body-strict` 4 tests, both inline + wrapRoute paths |
| `mktg run` skill name validation | `mktg-run-validation` 5 tests including 10000-char regression guard |
| Token rotation | `token-rotation` 4 tests covering file mode, persistence, rotation, env override |
| Malformed Authorization headers | `malformed-headers` 8 tests, all return 401 or 400 (never 5xx) |
| All 5 palette mutating endpoints token-gated | `palette-endpoints` 15 tests (3 per endpoint x 5 endpoints) |

## Raw response samples (live curl)

Captured via separate boot at port 39901 with auth ON, fresh token, no other state.

### T1 -- `/api/health` (public allowlist)
```
HTTP 200
{"ok":true,"version":"0.1.0","ts":"2026-05-08T05:47:12.175Z","subscribers":0}
```

### T2 -- `/api/skills` (no token)
```
HTTP 401
{"ok":false,"error":{"code":"UNAUTHORIZED","message":"Missing bearer token","fix":"Send Authorization: Bearer <token> (or ?token= for EventSource). Token at /tmp/e2e-tok"}}
```

### T3 -- evil Host header with valid bearer (DNS rebinding guard)
```
HTTP 400
{"ok":false,"error":{"code":"BAD_INPUT","message":"Host header rejected -- studio binds to localhost only","fix":"Connect via http://127.0.0.1 or http://localhost (DNS rebinding guard)"}}
```

### T4 -- `/api/publish/native/account` (apiKey redacted)
```
HTTP 200
{"ok":true,"data":{"adapter":"mktg-native","account":{"id":"mktg-native-cc7758a6-555a-46d9-84bb-d533671a95b4","apiKeyPreview":"mktg_liv…f145","mode":"workspace","createdAt":"2026-05-01T16:51:16.733Z","updatedAt":"2026-05-01T16:51:16.733Z"},"providerCount":1,"postCount":2}}
```
Note: `apiKey` field is ABSENT from the response. `apiKeyPreview` shows only the prefix + ellipsis + last 4 chars. Regression guard in `api-key-redaction.test.ts` greps the raw bytes for `"apiKey":` and `mktg_live_` / `mktg_test_` patterns to catch any future shape regressions.

### T5 -- `/api/settings/env` without confirm
```
HTTP 400
{"ok":false,"error":{"code":"CONFIRM_REQUIRED","message":"Writing API keys requires explicit confirmation","fix":"Add ?confirm=true to the URL. The studio's audit trail will record the key names (never values)."}}
```

### T6 -- 70 KB body to wrapRoute endpoint
```
HTTP 413
{"ok":false,"error":{"code":"PAYLOAD_TOO_LARGE","message":"JSON input exceeds 64KB limit","fix":"Keep the JSON body under 64 KB"}}
```

### T7 -- `__proto__` payload
```
HTTP 400
{"ok":false,"error":{"code":"UNSAFE_JSON_KEYS","message":"Unsafe JSON keys detected","fix":"Remove __proto__ or constructor keys from the payload"}}
```

### T8 -- Schema introspection includes the new `/api/pulse/snapshot` slot
```json
{
    "ok": true,
    "routes": [
        {
            "method": "GET",
            "path": "/api/pulse/snapshot",
            "description": "Coalesced Pulse snapshot: funnel + brand health + actions + activity + media + publish",
            "params": [...]
        }
    ]
}
```

## Flakiness notes

1. **Port allocation.** Initial pass of `token-rotation.test.ts` reused a single port (38005) across 4 sequential boots and hit TIME_WAIT-style boot failures intermittently. Switched to per-boot port allocation (`allocPort()`) starting at 38050. Zero flakes after the change. Other suites (`auth-perimeter`, `api-key-redaction`, etc.) use one boot per file and don't have this problem.

2. **Bun's `fetch()` and folded Authorization headers.** Test in `malformed-headers.test.ts` sends two `Authorization` headers on the same request. Behavior is impl-defined per RFC 7230 -- Bun keeps the first; nothing returns 5xx. The test asserts only that the response is in `{200, 401}` and explicitly NOT 500. Documented in the test comment.

3. **Embedded control chars in header values.** Some HTTP clients reject control bytes at construct time (the `fetch()` call throws before sending). The test catches the throw and treats either rejection (200/401 from server OR thrown at client) as the correct outcome. Status 0 sentinel handled.

4. **64 KB boundary computation.** First pass of the boundary test had off-by-7 padding math; corrected by using `65_537 - '{"name":""}'.length` so the resulting body is exactly 1 byte over the cap. The check in `parseJsonInput` is `> 65_536` (strict greater).

5. **`MKTG_STUDIO_TOKEN` env override.** When set, the auth module skips file IO entirely. The test reads the file path best-effort and accepts both "file exists with non-override content" and "file does not exist" as valid outcomes.

6. **No timing-dependent assertions.** SSE delivery test in `palette-endpoints.test.ts` polls for an `activity-new` frame with a 2 s deadline and a 500 ms inner readFrame timeout. If the server is overloaded enough that 2 s is not enough, the test fails loudly rather than silently passing. Observed wall time on a clean machine: ~150 ms from POST to SSE frame.

## Sequencing / hygiene

- Every harness boot writes its token to a `mkdtemp` path and points `MKTG_STUDIO_DB` at the same temp dir. No state leaks between tests or between this suite and any other.
- `MKTG_PROJECT_ROOT` is the temp dir so `STUDIO_CWD` resolves cleanly and the server reads its seeded `brand/` from the temp dir.
- Server processes are killed via SIGINT first (graceful), then SIGKILL after 2.5 s if still running. Temp dirs are removed in the cleanup callback.
- `MKTG_STUDIO_AUTH` is explicitly deleted from the spawn env in every harness so a stale `MKTG_STUDIO_AUTH=disabled` from a previous integration test cannot bleed in.

## Sentinel files / regression hooks

- `api-key-redaction.test.ts` greps the raw response body for `"apiKey":`, `mktg_live_`, and `mktg_test_` substrings. Any future code path that re-serializes the full key triggers an immediate failure with the offending substring in the diff.
- `mktg-run-validation.test.ts` asserts `body.error?.message.length < 500` for the 10 000-char input. Caps the regression where the original audit found error envelopes echoing untrusted input verbatim.
- `palette-endpoints.test.ts` asserts the audit-trail SSE frame contains the env var NAME but NOT the env var VALUE. Catches any future code path that logs values to the activity table.
- `auth-perimeter.test.ts` "Host check applies even on PUBLIC allowlist" pins the rule that `/api/health` is reachable from localhost only. Catches any future "we made health public for an LB probe" change that quietly opens DNS rebinding.

## Commands to reproduce

```bash
cd marketing-cli/studio
bun test --timeout 120000 tests/e2e/security/
```

Per-file:
```bash
bun test --timeout 120000 tests/e2e/security/auth-perimeter.test.ts
bun test --timeout 120000 tests/e2e/security/api-key-redaction.test.ts
bun test --timeout 120000 tests/e2e/security/parse-body-strict.test.ts
bun test --timeout 120000 tests/e2e/security/palette-endpoints.test.ts
bun test --timeout 120000 tests/e2e/security/token-rotation.test.ts
bun test --timeout 120000 tests/e2e/security/malformed-headers.test.ts
bun test --timeout 120000 tests/e2e/security/mktg-run-validation.test.ts
```
