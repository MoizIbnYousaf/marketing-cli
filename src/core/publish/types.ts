// mktg — Shared publish adapter types + terminal-status counting

import { type PublishPostType, type PublishItemStatus } from "../../types";

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

/**
 * Counts by outcome. `published` is only what was actually sent or scheduled
 * (status "sent"); staged work is counted apart and never as published.
 */
export type PublishCounts = {
  readonly published: number;
  readonly drafts: number;
  readonly queuedLocal: number;
  readonly writtenFiles: number;
  readonly failed: number;
};

export type AdapterResult = PublishCounts & {
  readonly adapter: string;
  readonly items: number;
  readonly errors: readonly string[];
  readonly results: readonly AdapterResultItem[];
};

const countStatus = (results: readonly { readonly status: PublishItemStatus }[], status: PublishItemStatus): number =>
  results.filter((r) => r.status === status).length;

export const tallyResults = (results: readonly { readonly status: PublishItemStatus }[]): PublishCounts => ({
  published: countStatus(results, "sent"),
  drafts: countStatus(results, "draft-external"),
  queuedLocal: countStatus(results, "queued-local"),
  writtenFiles: countStatus(results, "written-file"),
  failed: countStatus(results, "failed"),
});

/** Counts for an adapter that failed every item before trying any. */
export const allFailedCounts = (n: number): PublishCounts => ({ published: 0, drafts: 0, queuedLocal: 0, writtenFiles: 0, failed: n });
