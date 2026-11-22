// mktg publish --adapter postiz — crash, resume and exactly-once.
//
// A real CLI child process publishes to a local Bun.serve standing in for
// Postiz. The first test: the server accepts item 0, then SIGKILLs the child
// when item 1's create arrives. The sent-marker already records item 0 as
// sent and item 1 as pending (written before its request), so the resumed
// run skips item 0 and reports item 1 unconfirmed instead of creating it a
// second time.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CLI, makeSandbox, manifest, runPublish, type Sandbox } from "./publish-cli-harness";

let sb: Sandbox;
beforeEach(async () => { sb = await makeSandbox(); });
afterEach(async () => { await sb.cleanup(); });

test("a run killed while a create is in flight creates neither item again on resume", async () => {
  await writeFile(join(sb.project, "publish.json"), manifest([
    { type: "social", adapter: "postiz", content: "ITEM0 first post", metadata: { providers: ["linkedin"] } },
    { type: "social", adapter: "postiz", content: "ITEM1 second post", metadata: { providers: ["linkedin"] } },
  ], "fv-crash"));

  const creates: string[] = [];
  let killOnItem1 = true;
  let child: ReturnType<typeof Bun.spawn> | null = null;
  const server = Bun.serve({
    port: 0,
    fetch: async (req) => {
      const path = new URL(req.url).pathname;
      if (req.method === "GET" && path === "/public/v1/integrations") {
        return Response.json([{ id: "int-1", identifier: "linkedin", name: "L", picture: "", disabled: false, profile: "l" }]);
      }
      if (req.method === "POST" && path === "/public/v1/posts") {
        const body = await req.text();
        const which = body.includes("ITEM0") ? "ITEM0" : body.includes("ITEM1") ? "ITEM1" : "other";
        creates.push(which);
        if (which === "ITEM1" && killOnItem1) {
          child?.kill("SIGKILL");
          await child?.exited;
          return new Response("killed", { status: 500 });
        }
        return Response.json([{ postId: `p-${which}-${creates.length}`, integration: "int-1" }]);
      }
      return new Response("not found", { status: 404 });
    },
  });

  const run = async () => {
    child = Bun.spawn(["bun", "run", CLI, "publish", "--adapter", "postiz", "--confirm", "--json"], {
      cwd: sb.project,
      env: { PATH: process.env.PATH ?? "", HOME: sb.home, POSTIZ_API_KEY: "dummy-not-real", POSTIZ_API_BASE: `http://127.0.0.1:${server.port}` },
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([new Response(child.stdout as ReadableStream).text(), child.exited]);
    return { stdout, exitCode, signal: child.signalCode };
  };

  try {
    const first = await run();
    expect(first.signal).toBe("SIGKILL");
    expect(creates).toEqual(["ITEM0", "ITEM1"]);

    // The marker holds item 0 as sent and item 1 as pending, written before
    // item 1's request. The killed run's lock is left behind.
    const dir = join(sb.project, ".mktg", "publish");
    const markerPath = join(dir, "fv-crash-postiz.json");
    expect((await readdir(dir)).sort()).toEqual(["fv-crash-postiz.json", "fv-crash-postiz.json.lock"]);
    const marker = JSON.parse(await readFile(markerPath, "utf8")) as { sent: Record<string, { state?: string }> };
    expect(Object.values(marker.sent).map((e) => e.state ?? "sent").sort()).toEqual(["pending", "sent"]);

    killOnItem1 = false;
    const second = await run();
    // Item 1 may or may not exist on Postiz: it is reported, not re-sent, and exits 4.
    expect(second.exitCode).toBe(4);
    expect(creates).toEqual(["ITEM0", "ITEM1"]);
    const results = (JSON.parse(second.stdout.trim().split("\n").at(-1)!) as { adapters: { results: { status: string; detail: string }[] }[] }).adapters[0]!.results;
    expect(results.map((r) => r.status)).toEqual(["skipped", "failed"]);
    expect(results[0]!.detail).toContain("already-sent");
    expect(results[1]!.detail).toContain("Unconfirmed");
    expect(results[1]!.detail).toContain(markerPath);
    // The stale lock of the killed run was taken over and released.
    expect(await readdir(dir)).toEqual(["fv-crash-postiz.json"]);
  } finally {
    server.stop(true);
  }
}, 120_000);

// ---------------------------------------------------------------- exactly-once without a crash

const INTEGRATIONS = [{ id: "int-1", identifier: "linkedin", name: "L", picture: "", disabled: false, profile: "l" }];
const items = [0, 1, 2].map((n) => ({ type: "social", adapter: "postiz", content: `ITEM${n} post`, metadata: { providers: ["linkedin"] } }));
const CONFIRM = ["--adapter", "postiz", "--confirm", "--json"];

/** A Postiz stand-in that counts creates per item; `answer` decides each create's reply. */
const startPostiz = (answer: (n: number) => Response | Promise<Response> = () => Response.json([{ postId: "p" }], { status: 201 })) => {
  const creates: string[] = [];
  const server = Bun.serve({
    port: 0,
    fetch: async (req) => {
      const path = new URL(req.url).pathname;
      if (req.method === "GET" && path === "/public/v1/integrations") return Response.json(INTEGRATIONS);
      if (req.method === "POST" && path === "/public/v1/posts") {
        creates.push((await req.text()).match(/ITEM\d/)?.[0] ?? "?");
        return answer(creates.length);
      }
      return new Response("not found", { status: 404 });
    },
  });
  return { server, creates, env: { POSTIZ_API_KEY: "dummy-not-real", POSTIZ_API_BASE: `http://127.0.0.1:${server.port}` } };
};

type Result = { failed: number; adapters: { results: { status: string; detail: string }[] }[] };
const statuses = (json: unknown): string[] => (json as Result).adapters[0]!.results.map((r) => r.status);
const details = (json: unknown): string[] => (json as Result).adapters[0]!.results.map((r) => r.detail);

describe("postiz exactly-once", () => {
  test("a marker folder that cannot be written stops the run before any create, and stdout stays one JSON document", async () => {
    if (process.getuid?.() === 0) return; // root ignores directory permissions
    const p = startPostiz();
    const dir = join(sb.project, ".mktg", "publish");
    try {
      await writeFile(join(sb.project, "publish.json"), manifest(items, "camp"));
      await mkdir(dir, { recursive: true });
      await chmod(dir, 0o555);
      for (let run = 0; run < 2; run++) {
        const r = await runPublish(sb, CONFIRM, p.env);
        expect(r.exitCode).toBe(4);
        expect(r.stdout.trim().split("\n")).toHaveLength(1);
        expect(statuses(r.json)).toEqual(["failed", "failed", "failed"]);
        expect(details(r.json)[0]).toContain("Nothing was sent");
      }
      expect(p.creates).toEqual([]);
    } finally {
      await chmod(dir, 0o755);
      p.server.stop(true);
    }
  }, 120_000);

  test("a 2xx whose body is not JSON is recorded unconfirmed, so a re-run does not create it again", async () => {
    const p = startPostiz(() => new Response("<html>ok</html>", { status: 200 }));
    try {
      await writeFile(join(sb.project, "publish.json"), manifest([items[0]!], "camp"));
      const first = await runPublish(sb, CONFIRM, p.env);
      expect(first.exitCode).toBe(4);
      expect(details(first.json)[0]).toContain("not confirmed — check Postiz before re-sending");
      expect(details(first.json)[0]).not.toContain("rejected");
      const second = await runPublish(sb, CONFIRM, p.env);
      expect(second.exitCode).toBe(4);
      expect(details(second.json)[0]).toContain("Unconfirmed");
      expect(p.creates).toEqual(["ITEM0"]);
    } finally {
      p.server.stop(true);
    }
  }, 120_000);

  test("a corrupt marker is refused in the dry run and the confirmed run, and left as it is", async () => {
    const p = startPostiz();
    try {
      await writeFile(join(sb.project, "publish.json"), manifest(items, "camp"));
      const first = await runPublish(sb, CONFIRM, p.env);
      expect(first.exitCode).toBe(0);
      const markerPath = join(sb.project, ".mktg", "publish", "camp-postiz.json");
      const corrupt = JSON.stringify({ version: 1, campaign: "camp", catalog: "postiz", sent: { x: {} } });
      await writeFile(markerPath, corrupt);
      for (const args of [["--adapter", "postiz", "--json"], CONFIRM]) {
        const r = await runPublish(sb, args, p.env);
        expect(r.exitCode).toBe(4);
        expect(r.stdout.trim().split("\n")).toHaveLength(1);
        expect(statuses(r.json)).toEqual(["failed", "failed", "failed"]);
        expect(details(r.json)[0]).toContain("is unreadable");
      }
      expect(p.creates).toEqual(["ITEM0", "ITEM1", "ITEM2"]);
      expect(await readdir(join(sb.project, ".mktg", "publish"))).toEqual(["camp-postiz.json"]);
      expect(await readFile(markerPath, "utf8")).toBe(corrupt);
    } finally {
      p.server.stop(true);
    }
  }, 120_000);

  test("a second confirmed run on the same campaign while one is running sends nothing", async () => {
    let release: () => void = () => {};
    const held = new Promise<void>((r) => { release = r; });
    let arrived: () => void = () => {};
    const firstArrived = new Promise<void>((r) => { arrived = r; });
    const p = startPostiz(async (n) => {
      if (n === 1) { arrived(); await held; }
      return Response.json([{ postId: `p${n}` }], { status: 201 });
    });
    try {
      await writeFile(join(sb.project, "publish.json"), manifest(items, "camp"));
      const a = runPublish(sb, CONFIRM, p.env);
      await firstArrived;
      const b = await runPublish(sb, CONFIRM, p.env);
      expect(b.exitCode).toBe(4);
      expect(statuses(b.json)).toEqual(["failed", "failed", "failed"]);
      expect(details(b.json)[0]).toContain("Another mktg publish run");
      release();
      const ra = await a;
      expect(ra.exitCode).toBe(0);
      expect(statuses(ra.json)).toEqual(["draft-external", "draft-external", "draft-external"]);
      expect(p.creates).toEqual(["ITEM0", "ITEM1", "ITEM2"]);
      expect(await readdir(join(sb.project, ".mktg", "publish"))).toEqual(["camp-postiz.json"]);
    } finally {
      release();
      p.server.stop(true);
    }
  }, 120_000);
});
