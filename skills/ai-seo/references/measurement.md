# AEO Measurement and Statistics

## Observation schema

Every observation records:

```json
{
  "schemaVersion": 1,
  "runId": "2026-08-31T12:00:00Z",
  "promptId": "attr-1-discovery-1",
  "platform": "perplexity",
  "modelOrMode": "unknown",
  "locale": "en-US",
  "timestamp": "2026-08-31T12:00:00Z",
  "status": "valid",
  "brandMentioned": false,
  "recommended": false,
  "accuracy": "not_applicable",
  "citations": []
}
```

Valid statuses: `valid`, `blocked`, `auth_required`, `rate_limited`, `platform_error`, `not_observed`. Errors are not negative answers and do not belong in rate denominators.

## Sampling

- One response is qualitative evidence only; never turn it into a percentage.
- Default target: at least 5 valid repeats per prompt/platform for directional reporting; 20+ for trend comparisons when cost permits.
- Run repeats across more than one time block where practical.
- Keep prompt wording, locale, platform mode, and scoring rules frozen within a comparison.
- If platform access changes between runs, split the series.

## Uncertainty

For a binary rate with `x` successes from `n` valid observations, report `x/n`, percentage, and a Wilson 95% interval when `n ≥ 5`. With smaller samples, label the result “insufficient sample; observations only.” Do not infer a meaningful increase merely because two point estimates differ; compare intervals and disclose low power.

## Citation normalization

Preserve the cited URL, domain, page title if observed, first-party/third-party classification, and which claim it supported. Resolve obvious tracking parameters for grouping, but retain the original URL. A mention without a citation and a first-party citation are separate outcomes.

## Reproducibility

The method section must list prompt count, repeats, platform/model/mode, locale, date range, exclusions, paid calls, inaccessible platforms, scoring rubric, and known account/personalization effects.

Reference implementation path: OpenSEO keeps bounded tool inputs and explicit cost semantics in `every-app/open-seo/src/server/mcp/tools/research-keywords.ts`; mktg applies the same explicit-call discipline to AEO observations.
