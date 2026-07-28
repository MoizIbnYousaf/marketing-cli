// mktg — Postiz admin helpers (diagnose + list integrations)

import { mapPostizError, postizFetch, POSTIZ_DEFAULT_BASE } from "./client";
import {
  type ListIntegrationsResult,
  type PostizDiagnosticsResult,
  type PostizIntegration,
} from "./types";

export const listPostizIntegrations = async (): Promise<
  { ok: true; data: ListIntegrationsResult } | { ok: false; detail: string; exitCode: 3 | 5 | 2 }
> => {
  const res = await postizFetch<readonly PostizIntegration[]>("/public/v1/integrations", { method: "GET" });
  if (!res.ok) {
    const detail = mapPostizError(res.error);
    const exitCode: 3 | 5 | 2 =
      res.error.kind === "auth-missing" || res.error.kind === "auth-invalid" || res.error.kind === "subscription-required"
        ? 3
        : res.error.kind === "rate-limited" || res.error.kind === "network" || res.error.kind === "server-error"
          ? 5
          : 2;
    return { ok: false, detail, exitCode };
  }
  return { ok: true, data: { adapter: "postiz", integrations: res.data } };
};

export const diagnosePostiz = async (): Promise<PostizDiagnosticsResult> => {
  const base = process.env.POSTIZ_API_BASE ?? POSTIZ_DEFAULT_BASE;
  const checks: PostizDiagnosticsResult["checks"][number][] = [];

  if (!process.env.POSTIZ_API_KEY) {
    return {
      adapter: "postiz",
      configured: false,
      base,
      providers: [],
      checks: [{ name: "api-key", status: "fail", detail: "POSTIZ_API_KEY is not set." }],
    };
  }

  checks.push({ name: "api-key", status: "pass", detail: "POSTIZ_API_KEY is set." });

  const connected = await postizFetch<{ connected: boolean }>("/public/v1/is-connected", { method: "GET" });
  if (!connected.ok) {
    return {
      adapter: "postiz",
      configured: false,
      base,
      providers: [],
      checks: [...checks, { name: "connected", status: "fail", detail: mapPostizError(connected.error) }],
    };
  }
  checks.push({
    name: "connected",
    status: connected.data.connected ? "pass" : "warn",
    detail: connected.data.connected ? "Postiz API accepted the key." : "Postiz responded but did not report an active connection.",
  });

  const integrations = await postizFetch<readonly PostizIntegration[]>("/public/v1/integrations", { method: "GET" });
  if (!integrations.ok) {
    return {
      adapter: "postiz",
      configured: false,
      base,
      providers: [],
      checks: [...checks, { name: "integrations", status: "fail", detail: mapPostizError(integrations.error) }],
    };
  }

  const active = integrations.data.filter((provider) => !provider.disabled);
  checks.push({
    name: "integrations",
    status: active.length > 0 ? "pass" : "warn",
    detail: active.length > 0
      ? `${active.length} active Postiz provider${active.length === 1 ? "" : "s"} connected.`
      : "Postiz is reachable, but no active providers are connected yet.",
  });

  return {
    adapter: "postiz",
    configured: checks.every((check) => check.status !== "fail"),
    base,
    checks,
    providers: integrations.data,
  };
};
