// mktg — Built-in publish adapters (typefully, resend, file, mktg-native)

import { join } from "node:path";
import { type PublishPostType } from "../../types";
import { writeStdout } from "../output";
import {
  appendNativePublishPost,
  resolveNativePublishTargets,
} from "../native-publish";
import { type AdapterResult, type PublishItem, countTerminal } from "./types";

export const publishTypefully = async (
  items: PublishItem[],
  confirm: boolean,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const apiKey = process.env.TYPEFULLY_API_KEY;
  const results: AdapterResult["results"][number][] = [];

  if (!apiKey) {
    return {
      adapter: "typefully", items: items.length, published: 0, failed: items.length,
      errors: ["TYPEFULLY_API_KEY not set"],
      results: items.map((_, i) => ({ item: i, status: "failed" as const, detail: "API key missing" })),
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (!confirm) {
      results.push({ item: i, status: "skipped", detail: `Would publish: ${item.content.slice(0, 80)}...` });
      if (ndjson) writeStdout(JSON.stringify({ adapter: "typefully", item: i, status: "skipped" }));
      continue;
    }
    try {
      const resp = await fetch("https://api.typefully.com/v1/drafts/", {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ content: item.content, ...item.metadata }),
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        // Typefully's API creates DRAFTS — never imply a send happened.
        results.push({ item: i, status: "draft-external", detail: "Draft created on Typefully" });
      } else {
        results.push({ item: i, status: "failed", detail: `HTTP ${resp.status}` });
      }
    } catch (e) {
      results.push({ item: i, status: "failed", detail: e instanceof Error ? e.message : "Unknown error" });
    }
    if (ndjson) writeStdout(JSON.stringify({ adapter: "typefully", item: i, status: results[results.length - 1]!.status }));
  }

  return {
    adapter: "typefully",
    items: items.length,
    published: countTerminal(results),
    failed: results.filter(r => r.status === "failed").length,
    errors: results.filter(r => r.status === "failed").map(r => r.detail),
    results,
  };
};

export const publishResend = async (
  items: PublishItem[],
  confirm: boolean,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const apiKey = process.env.RESEND_API_KEY;
  const results: AdapterResult["results"][number][] = [];

  if (!apiKey) {
    return {
      adapter: "resend", items: items.length, published: 0, failed: items.length,
      errors: ["RESEND_API_KEY not set"],
      results: items.map((_, i) => ({ item: i, status: "failed" as const, detail: "API key missing" })),
    };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (!confirm) {
      results.push({ item: i, status: "skipped", detail: `Would send: ${item.content.slice(0, 80)}...` });
      if (ndjson) writeStdout(JSON.stringify({ adapter: "resend", item: i, status: "skipped" }));
      continue;
    }
    try {
      const metadata = item.metadata ?? {};
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: metadata.from ?? "noreply@example.com",
          to: metadata.to ?? "",
          subject: metadata.subject ?? "Published via mktg",
          html: item.content,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (resp.ok) {
        results.push({ item: i, status: "sent", detail: "Email sent via Resend" });
      } else {
        results.push({ item: i, status: "failed", detail: `HTTP ${resp.status}` });
      }
    } catch (e) {
      results.push({ item: i, status: "failed", detail: e instanceof Error ? e.message : "Unknown error" });
    }
    if (ndjson) writeStdout(JSON.stringify({ adapter: "resend", item: i, status: results[results.length - 1]!.status }));
  }

  return {
    adapter: "resend",
    items: items.length,
    published: countTerminal(results),
    failed: results.filter(r => r.status === "failed").length,
    errors: results.filter(r => r.status === "failed").map(r => r.detail),
    results,
  };
};

export const publishFile = async (
  items: PublishItem[],
  confirm: boolean,
  cwd: string,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const results: AdapterResult["results"][number][] = [];
  const outDir = join(cwd, ".mktg", "published");

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const metadataFilename = item.metadata?.filename;
    const rawFilename = typeof metadataFilename === "string" ? metadataFilename : `item-${i}.txt`;
    // Sanitize filename — strip path separators and traversal to prevent writes outside outDir
    const filename = rawFilename.replace(/[/\\]/g, "_").replace(/\.\./g, "_");
    if (!confirm) {
      results.push({ item: i, status: "skipped", detail: `Would write: ${filename}` });
      if (ndjson) writeStdout(JSON.stringify({ adapter: "file", item: i, status: "skipped" }));
      continue;
    }
    try {
      const { mkdir: mkdirFs } = await import("node:fs/promises");
      await mkdirFs(outDir, { recursive: true });
      await Bun.write(join(outDir, filename), item.content);
      results.push({ item: i, status: "written-file", detail: `Written to .mktg/published/${filename}` });
    } catch (e) {
      results.push({ item: i, status: "failed", detail: e instanceof Error ? e.message : "Unknown error" });
    }
    if (ndjson) writeStdout(JSON.stringify({ adapter: "file", item: i, status: results[results.length - 1]!.status }));
  }

  return {
    adapter: "file",
    items: items.length,
    published: countTerminal(results),
    failed: results.filter(r => r.status === "failed").length,
    errors: results.filter(r => r.status === "failed").map(r => r.detail),
    results,
  };
};

export const publishNative = async (
  items: PublishItem[],
  confirm: boolean,
  cwd: string,
  ndjson: boolean,
  campaign: string,
): Promise<AdapterResult> => {
  const results: AdapterResult["results"][number][] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const targetResolution = await resolveNativePublishTargets(
      cwd,
      item.metadata as Readonly<Record<string, unknown>> | undefined,
    );
    if (!targetResolution.ok) {
      results.push({ item: i, status: "failed", detail: targetResolution.detail });
      if (ndjson) writeStdout(JSON.stringify({ adapter: "mktg-native", item: i, status: "failed", detail: targetResolution.detail }));
      continue;
    }

    if (!confirm) {
      results.push({
        item: i,
        status: "skipped",
        detail: `[dry-run] would write ${item.metadata?.postType ?? "draft"} to native backend → ${targetResolution.targets.map((target) => target.identifier).join(", ")}`,
        postType: (item.metadata?.postType as PublishPostType | undefined) ?? "draft",
      });
      if (ndjson) writeStdout(JSON.stringify({ adapter: "mktg-native", item: i, status: "skipped" }));
      continue;
    }

    const metadata = item.metadata as Readonly<Record<string, unknown>> | undefined;
    const stored = await appendNativePublishPost(cwd, {
      campaign,
      content: item.content,
      ...(metadata ? { metadata } : {}),
      targets: targetResolution.targets,
    });
    // mktg-native is a LOCAL workspace queue — the write never leaves the
    // machine, so the item status is always queued-local regardless of the
    // stored post's internal draft/scheduled/published state.
    const detail = `queued-local (${stored.status}) → ${targetResolution.targets.map((target) => target.identifier).join(", ")}`;
    results.push({ item: i, status: "queued-local", detail, postType: stored.type });
    if (ndjson) writeStdout(JSON.stringify({ adapter: "mktg-native", item: i, status: "queued-local", detail }));
  }

  return {
    adapter: "mktg-native",
    items: items.length,
    published: countTerminal(results),
    failed: results.filter((result) => result.status === "failed").length,
    errors: results.filter((result) => result.status === "failed").map((result) => result.detail),
    results,
  };
};
