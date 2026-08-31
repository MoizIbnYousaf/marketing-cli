# AEO Diagnosis

Diagnose evidence before prescribing output. Each finding gets one primary cause and optional contributing causes.

## Citation supply chain

For each prompt/attribute:

1. Which sources were cited?
2. What claim did each source support?
3. Does the source contain the brand, competitor, or category?
4. Is the first-party site indexed/ranking for the same intent?
5. Is the answer inaccurate because the site is unclear, because third parties are stale, or because the platform retrieved different evidence?

## Cause routing

| Cause | Evidence threshold | Typical route |
|---|---|---|
| Technical | direct crawler/index/canonical/render/schema failure | `seo-audit` + exact repository fix |
| Comprehension | attribute absent, buried, contradictory, or unsupported on authoritative pages | `seo-content` / product/docs copy |
| Trust/supply | cited third parties omit brand or repeat stale claims; competitors dominate corroboration | `off-page-seo`, honest comparison pages, docs/listing brief |
| Measurement | sample too small, prompt drift, access failure, personalization/locale change | repair method and remeasure |

## Evidence grades

- **A:** direct platform observation plus source/crawl evidence.
- **B:** repeated platform observation without full source chain, or strong search/index evidence.
- **C:** repository/site heuristic only.
- **Unknown:** unavailable or contradictory evidence.

Prioritization must not rank a C-grade theory above an A-grade failure merely because the theory sounds strategic.

## Accuracy failures

Compare factual responses to claim IDs in `.aeo/truth.md`. Mark each claim `correct`, `partially_correct`, `incorrect`, `outdated`, `unsupported`, or `not_scored`. Never rewrite truth to match the model response.

Reference implementation paths: `skills/competitive-intel/SKILL.md` separates evidence from inference; `brand/landscape.md` carries the Claims Blacklist used to prevent unsupported marketing claims.
