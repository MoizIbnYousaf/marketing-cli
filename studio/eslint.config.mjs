import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    // Existing Studio components predate React 19's compiler-oriented hook
    // checks. Keep them visible without making the first lint baseline
    // unusable; migrate these warnings incrementally.
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    ".next-*/**",
    "coverage/**",
    "next-env.d.ts",
    "tsconfig.tsbuildinfo",
  ]),
]);
