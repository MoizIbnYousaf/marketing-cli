/**
 * SHA-256 digests of the mktg CLI `BRAND_TEMPLATES` seeds
 * (`src/core/brand.ts`). Studio template detection must match
 * `isTemplateContent()` — exact hash equality, nothing else.
 *
 * Regenerate after editing CLI templates:
 *   bun -e 'import { BRAND_TEMPLATES } from "./src/core/brand.ts";
 *     for (const [f,c] of Object.entries(BRAND_TEMPLATES)) {
 *       const h = new Bun.CryptoHasher("sha256"); h.update(c);
 *       console.log(f, h.digest("hex"));
 *     }'
 */
export const CLI_BRAND_TEMPLATE_SHA256: Readonly<Record<string, string>> = {
  "voice-profile.md": "e99c32ec1cebe3210bd6b6133d1f9378e81b7ee7bb219d9d7e931ed6f3694cac",
  "positioning.md": "33f04d3c78fc9913e356a0138021bb10568d245cadac2598c3048cc2ea7d3628",
  "audience.md": "6a789fddf5df4e11996d02dde1d717cac2f68d07dd72c162721365974e75d913",
  "competitors.md": "81e3b0123114a0fa6ff98fc5ff13d275255345192a77504ed6a2e9b4a6a01730",
  "landscape.md": "7ba39e9a04a6ff30b3593949e70d350b36e6d6cd31b1e0193dd6d2e7d2465039",
  "keyword-plan.md": "362059c59e79d850398958f4197cb79f7481ae5f4811e889b377e57e1884a433",
  "creative-kit.md": "9789b087342bcc4974d8956687e76ec555a9e48533b3bd8382fc217a3753701f",
  "stack.md": "bc0a57f2d7a732e32bd9036062657897e5252a60c84f5e397a6dbd9136200dba",
  "assets.md": "3b5040b35d252f8a0448f44435a28171958b20ad993e50ee5a8bc3eccc092c80",
  "learnings.md": "64d9e8f06f30e1dc84af605682161f11d67c465c1f00d3ab1ae8a4572b77a9bb",
};
