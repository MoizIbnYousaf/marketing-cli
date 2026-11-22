// mktg publish --adapter postiz — crash and resume.
//
// A real CLI child process publishes two items to a local Bun.serve standing
// in for Postiz. The server accepts item 0, then SIGKILLs the child when item
// 1's create arrives. The sent-marker must already record item 0, so the
// resumed run (same manifest) skips it and creates only item 1.

import { afterEach, beforeEach, expect, test } from "bun:test";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CLI, makeSandbox, manifest, type Sandbox } from "./publish-cli-harness";

let sb: Sandbox;
beforeEach(async () => { sb = await makeSandbox(); });
afterEach(async () => { await sb.cleanup(); });

test("a run killed after Postiz accepted item 0 does not create item 0 again on resume", async () => {
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

    // The marker already holds item 0, written before item 1's request.
    const markerPath = join(sb.project, ".mktg", "publish", "fv-crash-postiz.json");
    expect(await readdir(join(sb.project, ".mktg", "publish"))).toEqual(["fv-crash-postiz.json"]);
    const marker = JSON.parse(await readFile(markerPath, "utf8")) as { sent: Record<string, unknown> };
    expect(Object.keys(marker.sent)).toHaveLength(1);

    killOnItem1 = false;
    const second = await run();
    expect(second.exitCode).toBe(0);
    // Item 0 was never re-created; item 1 was created again (its first request was cut off).
    expect(creates).toEqual(["ITEM0", "ITEM1", "ITEM1"]);
    const results = (JSON.parse(second.stdout.trim().split("\n").at(-1)!) as { adapters: { results: { status: string; detail: string }[] }[] }).adapters[0]!.results;
    expect(results.map((r) => r.status)).toEqual(["skipped", "draft-external"]);
    expect(results[0]!.detail).toContain("already-sent");
  } finally {
    server.stop(true);
  }
}, 120_000);
