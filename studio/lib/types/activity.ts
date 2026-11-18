// lib/types/activity.ts -- Activity feed types shared between server and UI

export type ActivityKind =
  | "skill-run"
  | "brand-write"
  | "publish"
  | "toast"
  | "navigate"
  | "custom";

export interface Activity {
  id: number;
  kind: ActivityKind;
  skill?: string | null;
  summary: string;
  detail?: string | null;
  /** Parsed from JSON-encoded string in SQLite */
  filesChanged?: string[];
  /** Parsed from JSON-encoded object in SQLite */
  meta?: Record<string, unknown> | null;
  createdAt: string; // ISO datetime
}
