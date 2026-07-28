// mktg — Postiz adapter barrel (AGPL firewall — NEVER import @postiz/node)
// Spec: docs/integration/postiz-api-reference.md

export { postizFetch, mapPostizError, postizBaseCandidates, POSTIZ_DEFAULT_BASE } from "./client";
export { sentMarkerKey, loadSentMarker, persistSentMarker } from "./markers";
export { extractMediaInputs, uploadPostizMedia } from "./media";
export { publishPostiz } from "./adapter";
export { diagnosePostiz, listPostizIntegrations } from "./admin";
export type {
  PostizIntegration,
  PostizDiagnosticsResult,
  ListIntegrationsResult,
  PostizSentMarker,
  PostizMedia,
  PostizError,
  PostizResult,
  PostizFetchInit,
  CreatePostDto,
} from "./types";
