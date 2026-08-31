# AEO Foundation and Prompt Portfolio

## Repository truth

Build `.aeo/truth.md` before querying answer engines. Inspect the actual sources of product claims: pricing definitions, feature flags, public routes, integrations, auth providers, docs, changelog, schema, and package metadata. Record:

| Claim ID | Claim | Status | Authoritative file/URL | Last verified | Notes |
|---|---|---|---|---|---|

Use `true`, `conditional`, `planned`, `deprecated`, or `unknown`. A marketing page is evidence of what is claimed publicly, not necessarily proof the product implements it.

## Attribute contract

An attribute is one buyer-relevant association, not a slogan. It must be:

- true according to the truth table;
- specific enough to score;
- expressed in buyer language;
- distinguishable from a competitor;
- useful in a decision.

Store: `id`, desired association, accepted phrasings, disallowed/overclaim phrasings, audience, funnel stage, priority, and evidence IDs.

## Prompt portfolio

Use stable IDs and neutral wording. Include:

1. category discovery — “What tools help [audience] do [job]?”
2. recommendation — “What should [audience] use when [constraint]?”
3. comparison — “Compare approaches for [job] under [constraint].”
4. use case — “How can [audience] achieve [outcome]?”
5. objection — “What are the tradeoffs of [category/approach]?”
6. factual verification — brand-named only, scored against `.aeo/truth.md`.

Unbranded discovery prompts must not name, hint at, or list the brand. Brand-named factual prompts measure accuracy, not discovery; never mix their rates.

## Human checkpoint

Show identity, attributes, rejected claims, platform set, locale, competitors, and prompt classes. Wait for approval because every downstream metric inherits these choices.

Reference implementation paths inside this repository: `brand/SCHEMA.md` for durable brand contracts and `skills/seo-machine/references/methodology.md` for long-arc research state.
