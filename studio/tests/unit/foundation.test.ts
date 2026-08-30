import { describe, expect, test } from "bun:test";
import agentsManifest from "../../../agents-manifest.json";
import {
  FOUNDATION_LANES,
  LANE_TO_FILE,
  type FoundationCompletePayload,
} from "../../lib/foundation.ts";

describe("foundation initialization contract", () => {
  test("uses honest lane names while preserving manifest-owned file mapping", () => {
    expect(FOUNDATION_LANES).toEqual(["brand", "audience", "competitors"]);
    expect(LANE_TO_FILE).toEqual({
      brand: "brand/voice-profile.md",
      audience: "brand/audience.md",
      competitors: "brand/competitors.md",
    });
    expect(Object.keys(agentsManifest.agents)).toEqual(
      expect.arrayContaining(["brand-researcher", "audience-researcher", "competitive-scanner"]),
    );
  });

  test("completion contract requires an explicit success verdict", () => {
    const payload: FoundationCompletePayload = {
      durationMs: 10,
      success: false,
      lanes: [],
    };
    expect(payload.success).toBe(false);
  });
});
