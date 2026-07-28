// mktg — Postiz adapter shared types (AGPL firewall — NEVER import @postiz/node)

// Full Integration shape from GET /public/v1/integrations
// Source: apps/backend/src/public-api/routes/v1/public.integrations.controller.ts:176-195
export type PostizIntegration = {
  readonly id: string;
  readonly identifier: string;
  readonly name: string;
  readonly picture: string;
  readonly disabled: boolean;
  readonly profile: string;
  readonly customer?: { readonly id: string; readonly name: string } | null;
};

export type PostizError =
  | { readonly kind: "auth-missing" }
  | { readonly kind: "auth-invalid"; readonly msg: string }
  | { readonly kind: "subscription-required"; readonly msg: string }
  | { readonly kind: "rate-limited"; readonly retryAfterSeconds: number | null; readonly msg: string }
  | { readonly kind: "bad-request"; readonly msg: string; readonly status: number }
  | { readonly kind: "server-error"; readonly status: number; readonly msg: string }
  | { readonly kind: "network"; readonly detail: string };

export type PostizResult<T> =
  | { readonly ok: true; readonly data: T; readonly status: number }
  | { readonly ok: false; readonly error: PostizError; readonly status: number | null };

export type PostizFetchInit = {
  readonly method: "GET" | "POST" | "DELETE" | "PUT";
  readonly headers?: Record<string, string>;
  readonly body?: Record<string, unknown> | FormData;
};

export type PostizDiagnosticsResult = {
  readonly adapter: "postiz";
  readonly configured: boolean;
  readonly base: string;
  readonly checks: readonly {
    readonly name: "api-key" | "connected" | "integrations";
    readonly status: "pass" | "fail" | "warn";
    readonly detail: string;
  }[];
  readonly providers: readonly PostizIntegration[];
};

// Spec §6.4 (O1). List connected postiz integrations for skill activation use.
export type ListIntegrationsResult = {
  readonly adapter: "postiz" | "mktg-native";
  readonly integrations: readonly PostizIntegration[];
};

export type PostizMedia = {
  readonly id: string;
  readonly path: string;
  readonly alt?: string;
  readonly thumbnail?: string;
};

export type CreatePostDto = {
  readonly type: "draft" | "schedule" | "now" | "update";
  readonly shortLink: boolean;
  readonly date: string;
  readonly tags: readonly { readonly value: string; readonly label: string }[];
  readonly posts: readonly {
    readonly integration: { readonly id: string };
    readonly value: readonly { readonly content: string; readonly image: readonly PostizMedia[] }[];
  }[];
};

type PostizSentEntry = { readonly postedAt: string; readonly providers: readonly string[] };

export type PostizSentMarker = {
  readonly version: 1;
  readonly campaign: string;
  readonly catalog: "postiz";
  readonly sent: Record<string, PostizSentEntry>;
};
