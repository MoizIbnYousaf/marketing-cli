// mktg — Publish adapter registry (built-ins + env var metadata)

import { type AdapterResult, type PublishItem } from "./types";
import { publishFile, publishNative, publishResend } from "./adapters";
import { publishTypefully } from "./typefully";
import { publishPostiz } from "./postiz";

export const PRESENTATION_ADAPTER_ORDER = ["mktg-native", "postiz", "typefully", "resend", "file"] as const;

export const ADAPTERS: Record<string, (items: PublishItem[], confirm: boolean, cwd: string, ndjson: boolean, campaign: string) => Promise<AdapterResult>> = {
  "mktg-native": (items, confirm, cwd, ndjson, campaign) => publishNative(items, confirm, cwd, ndjson, campaign),
  postiz: (items, confirm, cwd, ndjson, campaign) => publishPostiz({ items, confirm, cwd, ndjson, campaign }),
  typefully: (items, confirm, _cwd, ndjson, _campaign) => publishTypefully(items, confirm, ndjson),
  resend: (items, confirm, _cwd, ndjson, _campaign) => publishResend(items, confirm, ndjson),
  file: (items, confirm, cwd, ndjson, _campaign) => publishFile(items, confirm, cwd, ndjson),
};

// Adapter env var registry — single source of truth for adapter metadata
export const ADAPTER_ENV_VARS: Record<string, string | null> = {
  "mktg-native": null,
  typefully: "TYPEFULLY_API_KEY",
  resend: "RESEND_API_KEY",
  file: null,
  postiz: "POSTIZ_API_KEY",
};
