# WebMCP in Marketing Studio

Marketing Studio exposes a curated browser-native tool surface through the
WebMCP Imperative API. In a supporting browser, the authenticated top-level
document registers tools with `document.modelContext.registerTool()`. Other
browsers continue to run Studio normally.

WebMCP is currently an experimental Draft Community Group Report, not a W3C
Standard. Studio follows the 26 August 2026 draft and Chrome's current
`document.modelContext` API.

## Why this boundary

WebMCP tools call the same local Bun API and update the same visible Next.js
workspace used by the human. They do not scrape the DOM, duplicate business
logic, receive the Studio bearer token, or bypass API validation.

The 20-tool surface covers every Studio concern:

| Surface | Read tools | Collaborative actions |
|---|---|---|
| Pulse | project context, Pulse snapshot, activity | visible navigation |
| Signals | list signals, content manifest/file | human-confirmed signal review and content update |
| Publish | adapters, providers, schedule, history | real API dry-run preview; final external publish stays in the UI |
| Brand | file index and file read | human-confirmed optimistic-lock update |
| Skills | skill index and detail | human-confirmed queue for the user's `/cmo` session |
| Settings | secret-free env, catalog, and SEO readiness | no credential mutation tool |
| Onboarding | project, brand, and integration status | human-confirmed three-lane foundation start |

Credential writes, brand reset, arbitrary file access, raw media reads, and
direct external publishing are intentionally not exposed. Authentication is
not consent. Persistent local mutations open a browser confirmation dialog;
publishing is preview-only so the human sees and finalizes the exact content,
providers, and schedule in Studio.

## Security contract

- Tools register only after an authenticated `/api/project/current` probe.
- Browser auth stays in an HttpOnly, SameSite=Strict cookie.
- Registration uses an `AbortSignal`; unmounting unregisters the tool set.
- Tool execution forwards the caller's `AbortSignal` to `fetch()`.
- No tool sets `exposedTo`; tools are same-origin only.
- Responses redact likely secret fields, truncate long text, cap arrays, and
  enforce a 128 KB serialized result budget.
- User, brand, signal, content, and upstream output is marked with
  `untrustedContentHint: true`.
- Read-only annotations match actual behavior. Mutation descriptions name
  their side effects and visible confirmation requirements.
- Brand/content edits require the exact mtime returned by the corresponding
  read tool, preserving Studio's 409 conflict behavior.

The Next document sends:

```http
Origin-Agent-Cluster: ?1
Permissions-Policy: tools=(self)
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

## Browser support and inspection

Use ChatGPT's WebMCP-capable in-app browser or Chrome 149+ with WebMCP enabled.
The Settings page reports whether all tools registered. Chrome's Model Context
Tool Inspector can list and manually execute the same definitions.

The integration is tested at three levels:

```bash
cd studio
bun test tests/unit/webmcp.test.ts
bun run typecheck
E2E_SKIP_CHROME=1 bun x playwright test tests/e2e/webmcp/webmcp.e2e.ts
```

The browser test injects a spec-shaped `document.modelContext` because the
normal Playwright Chromium channel may trail Chrome's experimental API. It
verifies response headers, all definitions, live API execution, visible
navigation, declined-write behavior, and publish dry-run enforcement. Before a
public release, run the native lane in a current Chrome/Chromium build and
repeat manual inspection in the Chrome origin trial or ChatGPT in-app browser:

```bash
cd studio
xvfb-run -a env WEBMCP_NATIVE_CHROMIUM=/usr/bin/chromium \
  E2E_SKIP_CHROME=1 bun x playwright test tests/e2e/webmcp/webmcp-native.e2e.ts
```

The native lane enables Chromium's official `WebMCPTesting` feature and uses
the browser's real `getTools()` and `executeTool()` implementations. Omit
`xvfb-run` when running headed Chrome on a desktop. Studio also tolerates the
origin-trial implementation that passes JSON text to `executeTool()` and omits
the callback options dictionary, while preserving `AbortSignal` cancellation
when current draft-conformant clients provide it.

## Public challenge deployment

The normal product is local-first. A public challenge URL should use an
isolated fictional-data project with no provider credentials and no external
writes. Do not expose a user's real `brand/`, `.env.local`, SQLite database, or
native publishing account through a public tunnel.
