# AEO Deliverables

## `.aeo/report.md`

Required sections:

1. date, scope, run ID, and executive finding;
2. method and limitations;
3. platform availability and sample table;
4. per-attribute mention/recommendation/citation/accuracy rates with `x/n`;
5. competitor share of voice with denominator definition;
6. citation supply chain by domain/page;
7. accuracy failures tied to truth claim IDs;
8. technical readiness;
9. findings table with evidence grade and cause;
10. change since prior comparable run;
11. what was not measured.

## `.aeo/gameplan.md`

Use `Now`, `Next`, `Later`, and `Done`. Every action includes:

| ID | Finding | Route | Exact target | Effort | Expected effect | Verification | Status |
|---|---|---|---|---|---|---|---|

“Exact target” is a repository file, page URL, command, or named external profile. “Improve AEO” is not an action.

## Config contract

`.aeo/config.json` includes `schemaVersion`, site/domain, locales, platforms, attributes file, prompts file, default repeats, scoring version, created/updated timestamps, and raw-data retention policy. Reject unknown future schema versions rather than silently misreading them.

## Resume protocol

On every activation:

1. validate config and required state;
2. find the latest complete run;
3. inspect gameplan items in progress;
4. detect truth/prompt changes since the baseline;
5. choose the next incomplete phase;
6. preserve prior runs rather than overwriting evidence.

The Done section records ship date and observed effect, including `not yet measured`. A task does not become effective merely because it shipped.

Reference implementation path: `skills/seo-machine/assets/roadmap-template.md` demonstrates mktg's same-commit long-arc tracker discipline.
