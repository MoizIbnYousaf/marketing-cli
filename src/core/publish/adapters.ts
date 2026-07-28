// mktg — Built-in publish adapters (typefully, resend, file, mktg-native)

import { join } from "node:path";
import { type PublishPostType } from "../../types";
import { writeStdout } from "../output";
import {
  appendNativePublishPost,
  listNativePublishProviders,
  resolveNativePublishTargets,
} from "../native-publish";
import { type AdapterResult, type AdapterResultItem, type PublishItem, countTerminal } from "./types";
import { type ListIntegrationsResult } from "./postiz/types";

/** Shared AdapterResult envelope used by typefully / resend / file / mktg-native. */
export const finalizeAdapterResult = (
  adapter: string,
  items: readonly PublishItem[],
  results: readonly AdapterResultItem[],
): AdapterResult => ({
  adapter,
  items: items.length,
  published: countTerminal(results),
  failed: results.filter((r) => r.status === "failed").length,
  errors: results.filter((r) => r.status === "failed").map((r) => r.detail),
  results,
});

/** Shared dry-run skip + optional NDJSON progress line. */
export const pushDryRunSkip = (
  results: AdapterResultItem[],
  adapter: string,
  item: number,
  detail: string,
  ndjson: boolean,
  extra?: Pick<AdapterResultItem, "postType">,
): void => {
  results.push({ item, status: "skipped", detail, ...extra });
  if (ndjson) writeStdout(JSON.stringify({ adapter, item, status: "skipped" }));
};

export const listNativeIntegrations = async (
  cwd: string,
): Promise<{ ok: true; data: ListIntegrationsResult }> => {
  const integrations = await listNativePublishProviders(cwd);
  return {
    ok: true,
    data: {
      adapter: "mktg-native",
      integrations: integrations.map((integration) => ({
        id: integration.id,
        identifier: integration.identifier,
        name: integration.name,
        picture: integration.picture,
        disabled: integration.disabled,
        profile: integration.profile,
      })),
    },
  };
};

export const publishTypefully = async (
  items: PublishItem[],
  confirm: boolean,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const apiKey = process.env.TYPEFULLY_API_KEY;
  const results: AdapterResultItem[] = [];

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
      pushDryRunSkip(results, "typefully", i, `Would publish: ${item.content.slice(0, 80)}...`, ndjson);
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

  return finalizeAdapterResult("typefully", items, results);
};

export const publishResend = async (
  items: PublishItem[],
  confirm: boolean,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const apiKey = process.env.RESEND_API_KEY;
  const results: AdapterResultItem[] = [];

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
      pushDryRunSkip(results, "resend", i, `Would send: ${item.content.slice(0, 80)}...`, ndjson);
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

  return finalizeAdapterResult("resend", items, results);
};

export const publishFile = async (
  items: PublishItem[],
  confirm: boolean,
  cwd: string,
  ndjson: boolean,
): Promise<AdapterResult> => {
  const results: AdapterResultItem[] = [];
  const outDir = join(cwd, ".mktg", "published");

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const metadataFilename = item.metadata?.filename;
    const rawFilename = typeof metadataFilename === "string" ? metadataFilename : `item-${i}.txt`;
    // Sanitize filename — strip path separators and traversal to prevent writes outside outDir
    const filename = rawFilename.replace(/[/\\]/g, "_").replace(/\.\./g, "_");
    if (!confirm) {
      pushDryRunSkip(results, "file", i, `Would write: ${filename}`, ndjson);
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

  return finalizeAdapterResult("file", items, results);
};

export const publishNative = async (
  items: PublishItem[],
  confirm: boolean,
  cwd: string,
  ndjson: boolean,
  campaign: string,
): Promise<AdapterResult> => {
  const results: AdapterResultItem[] = [];

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
      pushDryRunSkip(
        results,
        "mktg-native",
        i,
        `[dry-run] would write ${item.metadata?.postType ?? "draft"} to native backend → ${targetResolution.targets.map((target) => target.identifier).join(", ")}`,
        ndjson,
        { postType: (item.metadata?.postType as PublishPostType | undefined) ?? "draft" },
      );
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

  return finalizeAdapterResult("mktg-native", items, results);
};
