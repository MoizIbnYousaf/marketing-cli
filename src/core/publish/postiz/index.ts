// mktg — Postiz adapter barrel (AGPL firewall — NEVER import @postiz/node)
// Spec: docs/integration/postiz-api-reference.md

export { postizFetch, POSTIZ_DEFAULT_BASE } from "./client";
export { sentMarkerKey, loadSentMarker, persistSentMarker } from "./markers";
export { publishPostiz } from "./adapter";
export { diagnosePostiz, listPostizIntegrations } from "./admin";
export type {
  PostizDiagnosticsResult,
  ListIntegrationsResult,
  PostizError,
  PostizResult,
} from "./types";
