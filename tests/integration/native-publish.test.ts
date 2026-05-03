import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import type { GlobalFlags } from "../../src/types";
import { handler } from "../../src/commands/publish";

let tempDir: string;
let flags: GlobalFlags;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-native-publish-"));
  flags = { json: true, dryRun: false, fields: [], cwd: tempDir, jsonInput: undefined };
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("mktg-native publish backend", () => {
  test("auto-provisions a workspace account", async () => {
    const result = await handler(["--native-account"], flags);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.data as {
      adapter: "mktg-native";
      account: { id: string; apiKey: string; apiKeyPreview: string };
      providerCount: number;
      postCount: number;
    };
    expect(data.adapter).toBe("mktg-native");
    expect(data.account.id).toContain("mktg-native-");
    expect(data.account.apiKey).toContain("mktg_live_");
    expect(data.providerCount).toBe(0);
    expect(data.postCount).toBe(0);
  });

  test("upserts a provider and exposes it via --list-integrations", async () => {
    const create = await handler(["--native-upsert-provider"], {
      ...flags,
      jsonInput: JSON.stringify({
        identifier: "linkedin",
        name: "Acme LinkedIn",
        profile: "acme",
      }),
    });
    expect(create.ok).toBe(true);
    if (!create.ok) return;

    const integrations = await handler(["--adapter", "mktg-native", "--list-integrations"], flags);
    expect(integrations.ok).toBe(true);
    if (!integrations.ok) return;

    const data = integrations.data as {
      adapter: "mktg-native";
      integrations: Array<{ identifier: string; name: string; profile: string; disabled: boolean }>;
    };
    expect(data.adapter).toBe("mktg-native");
    expect(data.integrations).toHaveLength(1);
    expect(data.integrations[0]?.identifier).toBe("linkedin");
    expect(data.integrations[0]?.name).toBe("Acme LinkedIn");
    expect(data.integrations[0]?.profile).toBe("acme");
    expect(data.integrations[0]?.disabled).toBe(false);
  });

  test("stores native publish records and exposes them via --native-list-posts", async () => {
    await handler(["--native-upsert-provider"], {
      ...flags,
      jsonInput: JSON.stringify({
        identifier: "linkedin",
        name: "Acme LinkedIn",
        profile: "acme",
      }),
    });

    const manifest = {
      name: "native-campaign",
      items: [
        {
          type: "social",
          adapter: "mktg-native",
          content: "Ship the native publishing backend.",
          metadata: {
            providers: ["linkedin"],
            postType: "schedule",
            date: "2026-04-24T10:00:00.000Z",
            mediaPaths: ["brand/assets/twitter-launch-card.png"],
          },
        },
      ],
    };

    const publish = await handler(["--confirm", "--adapter", "mktg-native"], {
      ...flags,
      jsonInput: JSON.stringify(manifest),
    });
    expect(publish.ok).toBe(true);
    if (!publish.ok) return;

    const published = publish.data as {
      adapters: Array<{ adapter: string; published: number; failed: number }>;
    };
    expect(published.adapters[0]?.adapter).toBe("mktg-native");
    expect(published.adapters[0]?.published).toBe(1);
    expect(published.adapters[0]?.failed).toBe(0);

    const posts = await handler(["--native-list-posts"], flags);
    expect(posts.ok).toBe(true);
    if (!posts.ok) return;

    const data = posts.data as {
      adapter: "mktg-native";
      posts: Array<{
        campaign: string;
        type: string;
        status: string;
        posts: Array<{ integration: { identifier: string }; value: Array<{ content: string; mediaPaths?: string[] }> }>;
      }>;
    };
    expect(data.posts).toHaveLength(1);
    expect(data.posts[0]?.campaign).toBe("native-campaign");
    expect(data.posts[0]?.type).toBe("schedule");
    expect(data.posts[0]?.status).toBe("scheduled");
    expect(data.posts[0]?.posts[0]?.integration.identifier).toBe("linkedin");
    expect(data.posts[0]?.posts[0]?.value[0]?.content).toContain("native publishing backend");
    expect(data.posts[0]?.posts[0]?.value[0]?.mediaPaths).toEqual(["brand/assets/twitter-launch-card.png"]);
  });

  test("rejects unsupported native providers outside the initial rollout", async () => {
    const create = await handler(["--native-upsert-provider"], {
      ...flags,
      jsonInput: JSON.stringify({
        identifier: "bluesky",
        name: "Acme Bluesky",
        profile: "acme",
      }),
    });
    expect(create.ok).toBe(false);
    if (create.ok) return;
    expect(create.error.message).toContain("Unsupported native provider");
    expect(create.error.message).toContain("x");
    expect(create.error.message).toContain("linkedin");
  });
});
