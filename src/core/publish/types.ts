// mktg — Shared publish adapter types + terminal-status counting

import { type PublishPostType, type PublishItemStatus, TERMINAL_PUBLISH_STATUSES } from "../../types";

/** Local metadata-wide publish item (manifest + adapter input). */
export type PublishItem = {
  readonly type: "social" | "email" | "file";
  readonly adapter: string;
  readonly content: string;
  readonly metadata?: Record<string, unknown>;
};

export type PublishManifest = {
  readonly name: string;
  readonly version?: number;
  readonly items: readonly PublishItem[];
};

export type AdapterResultItem = {
  readonly item: number;
  readonly status: PublishItemStatus;
  readonly detail: string;
  readonly postType?: PublishPostType;
};

export type AdapterResult = {
  readonly adapter: string;
  readonly items: number;
  readonly published: number;
  readonly failed: number;
  readonly errors: readonly string[];
  readonly results: readonly AdapterResultItem[];
};

export const countTerminal = (results: readonly { readonly status: PublishItemStatus }[]): number =>
  results.filter(r => (TERMINAL_PUBLISH_STATUSES as readonly PublishItemStatus[]).includes(r.status)).length;
