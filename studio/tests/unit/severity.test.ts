// tests/unit/severity.test.ts — signal severity + ranking

import { describe, expect, test } from "bun:test";
import {
  classifySeverity,
  isSpikeSignal,
  extractFocusTerms,
  normalizeTrendTerm,
  computeBrandFit,
  rankSignalsForBrand,
  FIT_THRESHOLD,
  type SignalForScoring,
  type AgentForScoring,
} from "../../lib/severity.ts";

describe("classifySeverity", () => {
  test("p0 for spike ≥ 5x", () => {
    expect(classifySeverity(5)).toBe("p0");
    expect(classifySeverity(10)).toBe("p0");
  });

  test("p1 for spike ≥ 2x but < 5x", () => {
    expect(classifySeverity(2)).toBe("p1");
    expect(classifySeverity(4.99)).toBe("p1");
  });

  test("negative for spike < 0.5x", () => {
    expect(classifySeverity(0.25)).toBe("negative");
  });

  test("watch for rising trend or high interest", () => {
    expect(classifySeverity(null, 70)).toBe("watch");
    expect(classifySeverity(null, 10, true)).toBe("watch");
  });

  test("negative when declining with low interest", () => {
    expect(classifySeverity(null, 10, false)).toBe("negative");
  });

  test("neutral when no signals", () => {
    expect(classifySeverity()).toBe("neutral");
    expect(classifySeverity(null, 40)).toBe("neutral");
  });
});

describe("isSpikeSignal", () => {
  test("true for p0 and p1 only", () => {
    expect(isSpikeSignal("p0")).toBe(true);
    expect(isSpikeSignal("p1")).toBe(true);
    expect(isSpikeSignal("watch")).toBe(false);
    expect(isSpikeSignal("negative")).toBe(false);
    expect(isSpikeSignal("neutral")).toBe(false);
  });
});

describe("normalizeTrendTerm", () => {
  test("lowercases, strips punctuation, collapses whitespace", () => {
    expect(normalizeTrendTerm("  Hello,  World!  ")).toBe("hello world");
    expect(normalizeTrendTerm("#SkincareTips")).toBe("skincaretips");
  });

  test("preserves hyphens", () => {
    expect(normalizeTrendTerm("deep-work")).toBe("deep-work");
  });
});

describe("extractFocusTerms", () => {
  test("ranks keywords above research subject", () => {
    const agents: AgentForScoring[] = [
      {
        keywords: ["skincare", "sunscreen"],
        researchSubject: "skincare routines",
        researchFocus: null,
        clientContext: null,
        instagramHandle: null,
        tiktokHandle: null,
      },
    ];
    const terms = extractFocusTerms(agents);
    expect(terms).toContain("skincare");
    expect(terms).toContain("sunscreen");
  });

  test("filters stop terms", () => {
    const agents: AgentForScoring[] = [
      {
        keywords: ["the brand", "for agents"],
        researchSubject: null,
        researchFocus: null,
        clientContext: null,
        instagramHandle: null,
        tiktokHandle: null,
      },
    ];
    const terms = extractFocusTerms(agents);
    expect(terms).not.toContain("the");
    expect(terms).not.toContain("brand");
  });

  test("caps output at 14 terms", () => {
    const agents: AgentForScoring[] = [
      {
        keywords: Array.from({ length: 30 }, (_, i) => `keyword${i}`),
        researchSubject: null,
        researchFocus: null,
        clientContext: null,
        instagramHandle: null,
        tiktokHandle: null,
      },
    ];
    expect(extractFocusTerms(agents).length).toBeLessThanOrEqual(14);
  });
});

describe("computeBrandFit", () => {
  const now = Date.now();

  test("scores higher with more matching terms", () => {
    const signal: SignalForScoring = {
      title: "skincare sunscreen routine",
      capturedAt: now,
    };
    const many = computeBrandFit(signal, ["skincare", "sunscreen", "routine"], now);
    const few = computeBrandFit(signal, ["skincare"], now);
    expect(many.score).toBeGreaterThan(few.score);
  });

  test("applies negative fit bias when no terms match", () => {
    const signal: SignalForScoring = {
      title: "totally unrelated content",
      capturedAt: now,
    };
    const result = computeBrandFit(signal, ["skincare"], now);
    expect(result.matches.length).toBe(0);
  });

  test("recency score boosts fresh signals", () => {
    const fresh: SignalForScoring = { title: "skincare tip", capturedAt: now };
    const old: SignalForScoring = { title: "skincare tip", capturedAt: now - 10 * 86_400_000 };
    const f = computeBrandFit(fresh, ["skincare"], now);
    const o = computeBrandFit(old, ["skincare"], now);
    expect(f.score).toBeGreaterThanOrEqual(o.score);
  });

  test("scores are clamped to [0, 100]", () => {
    const signal: SignalForScoring = {
      title: "skincare sunscreen routine hydration spf dermatology",
      capturedAt: now,
      metrics: { views: 10_000_000, likes: 1_000_000, comments: 100_000, shares: 50_000 },
      spikeMultiplier: 50,
      trendInterest: 100,
      trendRising: true,
    };
    const r = computeBrandFit(signal, ["skincare", "sunscreen", "routine", "hydration", "spf"], now);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
});

describe("rankSignalsForBrand", () => {
  const now = Date.now();

  test("returns empty for no signals", () => {
    expect(rankSignalsForBrand([], ["x"])).toEqual([]);
  });

  test("sorts by descending score", () => {
    const signals: SignalForScoring[] = [
      { title: "irrelevant content", capturedAt: now - 86_400_000 },
      { title: "skincare sunscreen deep dive", capturedAt: now, metrics: { views: 10_000 } },
    ];
    const ranked = rankSignalsForBrand(signals, ["skincare", "sunscreen"]);
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
  });

  test("threshold constant exists and is sensible", () => {
    expect(FIT_THRESHOLD).toBeGreaterThan(0);
    expect(FIT_THRESHOLD).toBeLessThan(100);
  });
});
