// lib/types/activity.ts — Activity feed types shared between server and UI

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

// Shape returned by GET /api/activity
export interface ActivityListResponse {
  ok: true;
  data: Activity[];
}

// SSE event payloads
export interface ActivityNewEvent {
  type: "activity-new";
  payload: Activity;
}

export interface NavigateEvent {
  type: "navigate";
  payload: {
    tab: "hq" | "content" | "publish" | "brand";
    filter?: Record<string, unknown>;
  };
}

export interface ToastEvent {
  type: "toast";
  payload: {
    level: "info" | "success" | "warn" | "error";
    message: string;
    duration?: number;
  };
}

export interface HighlightEvent {
  type: "highlight";
  payload: {
    tab: string;
    selector?: string;
    reason?: string;
  };
}

// Legacy type kept for backward compatibility with existing components
export type ActivityItem = {
  id: string;
  type: "skill_run" | "brand_change" | "signal" | "publish" | "message";
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type ActivityFeedData = {
  items: ActivityItem[];
};
