// Plan + compete bridge routes — wrapRoute handlers over the mktg CLI.
//
//   GET /api/plan          → mktg plan --json
//   GET /api/plan/next     → mktg plan next --json
//   GET /api/compete       → mktg compete list --json
//   GET /api/compete/scan  → mktg compete scan --json
//
// CLI error codes are mapped through mapMktgErrorCode so client mistakes
// (INVALID_ARGS…) surface as 400 and real upstream failures as 502.

import { wrapRoute, type ErrorCode } from "../../lib/dx.ts";
import type { CommandResult } from "../../lib/types/mktg";
import {
  mktgPlan,
  mktgPlanNext,
  mktgCompeteList,
  mktgCompeteScan,
} from "../../lib/mktg.ts";
import { mapMktgErrorCode } from "../http.ts";

type BridgeResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string; status: number; fix?: string };

/** Convert a mktg CommandResult into a wrapRoute handler result. */
export function bridgeMktgResult<T>(result: CommandResult<T>): BridgeResult<T> {
  if (result.ok) return { ok: true, data: result.data };
  const mapped = mapMktgErrorCode(result.error.code);
  // StudioErrorCode → wrapRoute ErrorCode: the mapper only yields BAD_INPUT,
  // NOT_FOUND, UNAUTHORIZED, RATE_LIMITED or UPSTREAM_FAILED; UNAUTHORIZED has
  // no wire-level twin so it collapses to UPSTREAM_FAILED (auth lives upstream).
  const code: ErrorCode =
    mapped.code === "BAD_INPUT" || mapped.code === "NOT_FOUND" || mapped.code === "RATE_LIMITED"
      ? mapped.code
      : "UPSTREAM_FAILED";
  return {
    ok: false,
    code,
    message: `mktg ${result.error.code}: ${result.error.message}`,
    status: mapped.status,
    fix: result.error.suggestions[0],
  };
}

function mktgRoute<T>(call: (cwd: string) => Promise<CommandResult<T>>, cwd: string) {
  return wrapRoute<undefined, T>({
    method: "GET",
    handler: async () => bridgeMktgResult(await call(cwd)),
  });
}

/** Build the four plan/compete routes bound to the studio project root. */
export function createPlanCompeteRoutes(cwd: string) {
  return {
    PLAN_ROUTE: mktgRoute(mktgPlan, cwd),
    PLAN_NEXT_ROUTE: mktgRoute(mktgPlanNext, cwd),
    COMPETE_LIST_ROUTE: mktgRoute(mktgCompeteList, cwd),
    COMPETE_SCAN_ROUTE: mktgRoute(mktgCompeteScan, cwd),
  };
}
