// mktg publish — safety contract, driven through the real CLI.
//
// Each test runs `bun run src/cli.ts publish` as a child process in a fresh
// project with a fresh HOME and no provider keys, then checks stdout, the
// exit code and every byte under the project and HOME.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { changedPaths, makeSandbox, manifest, runPublish, snapshot, type Sandbox } from "./publish-cli-harness";

const T = 120_000;
let sb: Sandbox;

beforeEach(async () => { sb = await makeSandbox(); });
afterEach(async () => { await sb.cleanup(); });

const fileItem = { type: "file", adapter: "file", content: "hello", metadata: { filename: "out.md" } };

describe("unknown --adapter", () => {
  test("is refused with INVALID_ARGS, exit 2, the valid list, and no file written", async () => {
    await writeFile(join(sb.project, "publish.json"), manifest([fileItem]));
    const before = await snapshot(sb);
    const r = await runPublish(sb, ["--adapter", "fv-unknown", "--confirm", "--json"]);
    expect(r.exitCode).toBe(2);
    const error = (r.json as { error?: { code: string; message: string; suggestions: string[] } }).error!;
    expect(error.code).toBe("INVALID_ARGS");
    expect(error.message).toContain("fv-unknown");
    expect(error.suggestions.join(" ")).toContain("mktg-native, postiz, typefully, resend, file");
    expect(changedPaths(before, await snapshot(sb))).toEqual([]);
  }, T);

  test("a name that is an Object.prototype key is refused, as --adapter and as a manifest item's adapter", async () => {
    await writeFile(join(sb.project, "publish.json"), manifest([fileItem]));
    const before = await snapshot(sb);
    for (const name of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      const r = await runPublish(sb, ["--adapter", name, "--confirm", "--json"]);
      expect(r.exitCode).toBe(2);
      expect((r.json as { error?: { code: string } }).error?.code).toBe("INVALID_ARGS");
    }
    for (const name of ["constructor", "hasOwnProperty"]) {
      await writeFile(join(sb.project, "publish.json"), manifest([fileItem, { type: "file", adapter: name, content: "x" }]));
      const r = await runPublish(sb, ["--confirm", "--json"]);
      expect(r.exitCode).toBe(2);
      expect((r.json as { error?: { code: string; message: string } }).error?.message).toContain(`Unknown adapter '${name}'`);
    }
    await writeFile(join(sb.project, "publish.json"), manifest([fileItem]));
    expect(changedPaths(before, await snapshot(sb))).toEqual([]);
  }, T);

  test("a repeated --adapter is refused instead of being read as the campaign path", async () => {
    await writeFile(join(sb.project, "publish.json"), manifest([fileItem]));
    const before = await snapshot(sb);
    for (const args of [["--adapter", "file", "--adapter", "postiz"], ["--adapter=file", "--adapter", "file"]]) {
      const r = await runPublish(sb, [...args, "--confirm", "--json"]);
      expect(r.exitCode).toBe(2);
      const error = (r.json as { error?: { code: string; message: string } }).error!;
      expect(error.code).toBe("INVALID_ARGS");
      expect(error.message).toContain("more than once");
    }
    expect(changedPaths(before, await snapshot(sb))).toEqual([]);
  }, T);

  test("is refused before a maintenance flag runs", async () => {
    await mkdir(join(sb.project, ".mktg"), { recursive: true });
    const r = await runPublish(sb, ["--adapter", "nope", "--list-integrations", "--json"]);
    expect(r.exitCode).toBe(2);
    expect((r.json as { error?: { code: string } }).error?.code).toBe("INVALID_ARGS");
  }, T);
});

// ---------------------------------------------------------------- dry runs and listings write nothing

const nativeItem = { type: "social", adapter: "mktg-native", content: "native x", metadata: { providers: ["linkedin"] } };
const postizItem = { type: "social", adapter: "postiz", content: "postiz x", metadata: { providers: ["linkedin"] } };

/** A local Postiz stand-in: one connected linkedin integration, drafts accepted. */
const startPostiz = (postStatus = 200) => {
  const seen: string[] = [];
  const server = Bun.serve({
    port: 0,
    fetch: async (req) => {
      const path = new URL(req.url).pathname;
      seen.push(`${req.method} ${path}`);
      if (req.method === "GET" && path === "/public/v1/integrations") {
        return Response.json([{ id: "int-li", identifier: "linkedin", name: "LI", picture: "", disabled: false, profile: "li" }]);
      }
      if (req.method === "POST" && path === "/public/v1/posts") {
        return postStatus < 300
          ? Response.json([{ postId: "p1", integration: "int-li" }])
          : Response.json({ msg: "boom" }, { status: postStatus });
      }
      return new Response("not found", { status: 404 });
    },
  });
  return { server, seen, env: { POSTIZ_API_KEY: "dummy-not-real", POSTIZ_API_BASE: `http://127.0.0.1:${server.port}` } };
};

const expectNoChange = async (args: readonly string[], env: Record<string, string> = {}) => {
  const before = await snapshot(sb);
  const r = await runPublish(sb, args, env);
  expect(changedPaths(before, await snapshot(sb))).toEqual([]);
  return r;
};

describe("a dry run writes nothing", () => {
  test("native item, with and without --adapter, with --dry-run and without --confirm", async () => {
    await writeFile(join(sb.project, "publish.json"), manifest([nativeItem, postizItem]));
    for (const args of [
      ["--adapter", "mktg-native", "--dry-run", "--json"],
      ["--adapter", "mktg-native", "--json"],
      ["--dry-run", "--json"],
      ["--adapter", "mktg-native", "--confirm", "--dry-run", "--json"],
    ]) {
      const r = await expectNoChange(args);
      expect((r.json as { dryRun?: boolean }).dryRun).toBe(true);
    }
  }, T);

  test("an unreadable native account.json is left byte-identical", async () => {
    await mkdir(join(sb.project, ".mktg", "native-publish"), { recursive: true });
    await writeFile(join(sb.project, ".mktg", "native-publish", "account.json"), "{not json");
    await writeFile(join(sb.project, "publish.json"), manifest([nativeItem]));
    await expectNoChange(["--adapter", "mktg-native", "--dry-run", "--json"]);
    const r = await expectNoChange(["--native-account", "--dry-run", "--json"]);
    const data = r.json as { accountState: string; account: unknown; wouldCreate: string[] };
    expect(data.accountState).toBe("unreadable");
    expect(data.account).toBeNull();
    expect(data.wouldCreate).toEqual([".mktg/native-publish/account.json"]);
  }, T);

  test("--native-account --dry-run reports the account it would create", async () => {
    const r = await expectNoChange(["--native-account", "--dry-run", "--json"]);
    const data = r.json as { dryRun: boolean; accountState: string; account: unknown; wouldCreate: string[] };
    expect(r.exitCode).toBe(0);
    expect(data).toMatchObject({ dryRun: true, accountState: "missing", account: null });
    expect(data.wouldCreate).toEqual([".mktg/native-publish/account.json"]);
  }, T);

  test("--native-upsert-provider --dry-run validates and returns the provider without writing", async () => {
    const input = JSON.stringify({ identifier: "linkedin", name: "Acme", profile: "acme" });
    const r = await expectNoChange(["--native-upsert-provider", "--dry-run", "--input", input, "--json"]);
    const data = r.json as { dryRun: boolean; provider: { identifier: string }; wouldWrite: string[] };
    expect(r.exitCode).toBe(0);
    expect(data.dryRun).toBe(true);
    expect(data.provider.identifier).toBe("linkedin");
    expect(data.wouldWrite).toEqual([".mktg/native-publish/account.json", ".mktg/native-publish/providers.json"]);
    const bad = await expectNoChange(["--native-upsert-provider", "--dry-run", "--input", JSON.stringify({ identifier: "myspace", name: "a", profile: "b" }), "--json"]);
    expect(bad.exitCode).toBe(2);
  }, T);

  test("postiz: no sent-marker is created, rewritten or archived", async () => {
    const p = startPostiz();
    try {
      await writeFile(join(sb.project, "publish.json"), manifest([postizItem], "fv-campaign"));
      await expectNoChange(["--adapter", "postiz", "--json"], p.env);
      await expectNoChange(["--dry-run", "--json"], p.env);
      await mkdir(join(sb.project, ".mktg", "publish"), { recursive: true });
      const marker = join(sb.project, ".mktg", "publish", "fv-campaign-postiz.json");
      await writeFile(marker, JSON.stringify({ version: 1, campaign: "fv-campaign", catalog: "postiz", sent: { k: { postedAt: "2026-01-01T00:00:00.000Z", providers: ["linkedin"] } } }));
      await expectNoChange(["--adapter", "postiz", "--dry-run", "--json"], p.env);
      await writeFile(marker, "{not json");
      const r = await expectNoChange(["--adapter", "postiz", "--dry-run", "--json"], p.env);
      expect(r.stdout).toContain("postiz-sent-marker-corrupt");
      await expectNoChange(["--adapter", "postiz", "--dry-run", "--json"]); // no key either
      expect(p.seen.filter((s) => s.startsWith("POST"))).toEqual([]);
    } finally {
      p.server.stop(true);
    }
  }, T);
});

describe("read-only listings write nothing", () => {
  test("--native-list-posts with no account says so and returns no posts", async () => {
    for (const extra of [[], ["--dry-run"]]) {
      const r = await expectNoChange(["--native-list-posts", ...extra, "--json"]);
      expect(r.exitCode).toBe(0);
      expect(r.json).toEqual({ adapter: "mktg-native", accountState: "missing", posts: [] });
    }
  }, T);

  test("--adapter mktg-native --list-integrations with no account says so", async () => {
    const r = await expectNoChange(["--adapter", "mktg-native", "--list-integrations", "--json"]);
    expect(r.exitCode).toBe(0);
    expect(r.json).toEqual({ adapter: "mktg-native", accountState: "missing", integrations: [] });
  }, T);
});

describe("a failed confirmed run leaves nothing new behind", () => {
  test("native: no connected provider creates no account", async () => {
    await writeFile(join(sb.project, "publish.json"), manifest([nativeItem]));
    const r = await expectNoChange(["--adapter", "mktg-native", "--confirm", "--json"]);
    expect((r.json as { failed: number }).failed).toBe(1);
  }, T);

  test("native: an unreadable account.json is not overwritten by a failing run", async () => {
    await mkdir(join(sb.project, ".mktg", "native-publish"), { recursive: true });
    await writeFile(join(sb.project, ".mktg", "native-publish", "account.json"), "{not json");
    await writeFile(join(sb.project, "publish.json"), manifest([nativeItem]));
    await expectNoChange(["--adapter", "mktg-native", "--confirm", "--json"]);
  }, T);

  test("postiz: every item failing writes no sent-marker", async () => {
    for (const status of [500, 404, 429]) {
      const p = startPostiz(status);
      try {
        await writeFile(join(sb.project, "publish.json"), manifest([postizItem], "fv-campaign"));
        const before = await snapshot(sb);
        const r = await runPublish(sb, ["--adapter", "postiz", "--confirm", "--json"], p.env);
        expect((r.json as { failed: number }).failed).toBe(1);
        expect(changedPaths(before, await snapshot(sb))).toEqual([]);
      } finally {
        p.server.stop(true);
      }
    }
  }, T);
});

// ---------------------------------------------------------------- provider answers

/** A local Typefully v2 stand-in that answers every draft POST with `postBody` (raw text). */
const startTypefully = (postBody: string, postStatus = 200) => {
  const posts: unknown[] = [];
  const server = Bun.serve({
    port: 0,
    fetch: async (req) => {
      const path = new URL(req.url).pathname;
      if (req.method === "POST" && path === "/v2/social-sets/4242/drafts") {
        posts.push(JSON.parse(await req.text()));
        return new Response(postBody, { status: postStatus, headers: { "Content-Type": "application/json" } });
      }
      return new Response("not found", { status: 404 });
    },
  });
  return {
    server,
    posts,
    env: { TYPEFULLY_API_KEY: "dummy-not-real", TYPEFULLY_API_BASE: `http://127.0.0.1:${server.port}/v2`, TYPEFULLY_SOCIAL_SET_ID: "4242" },
  };
};

const typefullyItem = (metadata: Record<string, unknown> = {}) =>
  ({ type: "social", adapter: "typefully", content: "tf x", metadata: { platforms: ["x"], ...metadata } });

describe("a malformed provider answer is a failure", () => {
  test("typefully: 2xx with a body that is not JSON marks the item failed and counts nothing", async () => {
    const t = startTypefully('{"truncated": [');
    try {
      await writeFile(join(sb.project, "publish.json"), manifest([typefullyItem()]));
      const r = await runPublish(sb, ["--adapter", "typefully", "--confirm", "--json"], t.env);
      const data = r.json as { published: number; failed: number; adapters: { published: number; results: { status: string; detail: string }[] }[] };
      expect(t.posts.length).toBe(1);
      expect(data.adapters[0]!.results[0]!.status).toBe("failed");
      expect(data.adapters[0]!.results[0]!.detail).toContain("Invalid JSON response from Typefully");
      expect(data.adapters[0]!.published).toBe(0);
      expect(data.published).toBe(0);
      expect(data.failed).toBe(1);
    } finally {
      t.server.stop(true);
    }
  }, T);
});

describe("postiz: one create per item", () => {
  const INTEGRATIONS = JSON.stringify([{ id: "int-li", identifier: "linkedin", name: "LI", picture: "", disabled: false, profile: "li" }]);
  const serve = (route: (method: string, path: string) => Response) => {
    const seen: string[] = [];
    const server = Bun.serve({ port: 0, fetch: (req) => { const path = new URL(req.url).pathname; seen.push(`${req.method} ${path}`); return route(req.method, path); } });
    return { server, seen, env: { POSTIZ_API_KEY: "dummy-not-real", POSTIZ_API_BASE: `http://127.0.0.1:${server.port}` } };
  };

  test("a 2xx with a body that is not JSON is not re-sent to <base>/api", async () => {
    const s = serve((method, path) =>
      method === "GET" && path === "/public/v1/integrations" ? new Response(INTEGRATIONS)
        : method === "POST" ? new Response('{"truncated": [', { status: 200 })
          : new Response("nf", { status: 404 }));
    try {
      await writeFile(join(sb.project, "publish.json"), manifest([postizItem], "fv-campaign"));
      const r = await runPublish(sb, ["--adapter", "postiz", "--confirm", "--json"], s.env);
      expect(s.seen.filter((x) => x.startsWith("POST"))).toEqual(["POST /public/v1/posts"]);
      const res = (r.json as { adapters: { results: { status: string; detail: string }[] }[] }).adapters[0]!.results[0]!;
      expect(res.status).toBe("failed");
      expect(res.detail).toContain("Invalid JSON response");
    } finally {
      s.server.stop(true);
    }
  }, T);

  test("self-host: the base is decided by the integrations GET, and the post goes only there", async () => {
    // The app root answers HTML 200 to everything; the backend lives under /api.
    const s = serve((method, path) =>
      path === "/api/public/v1/integrations" ? new Response(INTEGRATIONS)
        : method === "POST" && path === "/api/public/v1/posts" ? Response.json([{ postId: "p1" }])
          : new Response("<html>app</html>", { status: 200 }));
    try {
      await writeFile(join(sb.project, "publish.json"), manifest([postizItem], "fv-campaign"));
      const r = await runPublish(sb, ["--adapter", "postiz", "--confirm", "--json"], s.env);
      expect(s.seen.filter((x) => x.startsWith("POST"))).toEqual(["POST /api/public/v1/posts"]);
      expect((r.json as { adapters: { results: { status: string }[] }[] }).adapters[0]!.results[0]!.status).toBe("draft-external");
    } finally {
      s.server.stop(true);
    }
  }, T);
});

describe("typefully: a send is reported as a send", () => {
  test("publish_at now / next-free-slot / a time is sent; no publish_at is a draft", async () => {
    const t = startTypefully('{"id": 1}', 201);
    try {
      await writeFile(join(sb.project, "publish.json"), manifest([
        typefullyItem({ publish_at: "now" }),
        typefullyItem({ publish_at: "next-free-slot" }),
        typefullyItem({ publish_at: "2026-12-01T10:00:00Z" }),
        typefullyItem(),
      ]));
      const r = await runPublish(sb, ["--adapter", "typefully", "--confirm", "--json"], t.env);
      const results = (r.json as { adapters: { results: { status: string; detail: string }[] }[] }).adapters[0]!.results;
      expect((t.posts as { publish_at?: string }[]).map((p) => p.publish_at)).toEqual(["now", "next-free-slot", "2026-12-01T10:00:00Z", undefined]);
      expect(results.map((x) => x.status)).toEqual(["sent", "sent", "sent", "draft-external"]);
      expect(results[0]!.detail).toContain("publish now");
      expect(results[1]!.detail).toContain("next free slot");
      expect(results[2]!.detail).toContain("Scheduled on Typefully for 2026-12-01T10:00:00Z");
    } finally {
      t.server.stop(true);
    }
  }, T);
});

describe("published counts sends only", () => {
  test("drafts, local queue entries and written files are counted apart, top-level and per adapter", async () => {
    const t = startTypefully('{"id": 1}', 201);
    try {
      const up = await runPublish(sb, ["--native-upsert-provider", "--input", JSON.stringify({ identifier: "linkedin", name: "LI", profile: "li" }), "--json"]);
      expect(up.exitCode).toBe(0);
      await writeFile(join(sb.project, "publish.json"), manifest([
        nativeItem, fileItem, typefullyItem(), typefullyItem({ publish_at: "next-free-slot" }),
      ]));
      const r = await runPublish(sb, ["--confirm", "--json"], t.env);
      const data = r.json as Record<string, number> & { adapters: (Record<string, number> & { adapter: string })[] };
      expect({ published: data.published, drafts: data.drafts, queuedLocal: data.queuedLocal, writtenFiles: data.writtenFiles, failed: data.failed })
        .toEqual({ published: 1, drafts: 1, queuedLocal: 1, writtenFiles: 1, failed: 0 });
      const by = Object.fromEntries(data.adapters.map((a) => [a.adapter, [a.published, a.drafts, a.queuedLocal, a.writtenFiles, a.failed]]));
      expect(by).toEqual({ "mktg-native": [0, 0, 1, 0, 0], file: [0, 0, 0, 1, 0], typefully: [1, 1, 0, 0, 0] });
    } finally {
      t.server.stop(true);
    }
  }, T);
});

describe("failure is visible in the exit code", () => {
  test("any failed item exits 4 with the full result as data; none exits 0", async () => {
    await writeFile(join(sb.project, "publish.json"), manifest([fileItem, nativeItem]));
    const partial = await runPublish(sb, ["--confirm", "--json"]);
    expect(partial.exitCode).toBe(4);
    const data = partial.json as { failed: number; writtenFiles: number; adapters: { adapter: string; results: { status: string; detail: string }[] }[] };
    expect(data.failed).toBe(1);
    expect(data.writtenFiles).toBe(1);
    expect(data.adapters.find((a) => a.adapter === "mktg-native")!.results[0]!.detail).toContain("No connected native providers");

    await writeFile(join(sb.project, "publish.json"), manifest([fileItem]));
    expect((await runPublish(sb, ["--confirm", "--json"])).exitCode).toBe(0);
    expect((await runPublish(sb, ["--json"])).exitCode).toBe(0);
  }, T);

  test("a dry run with an item that cannot be planned exits 4 too", async () => {
    for (const item of [typefullyItem(), { type: "email", adapter: "resend", content: "e", metadata: { to: "a@example.invalid" } }, nativeItem]) {
      await writeFile(join(sb.project, "publish.json"), manifest([item]));
      const r = await runPublish(sb, ["--dry-run", "--json"]);
      expect(r.exitCode).toBe(4);
      expect((r.json as { dryRun: boolean; failed: number }).dryRun).toBe(true);
      expect((r.json as { failed: number }).failed).toBe(1);
    }
  }, T);
});
