// E2E tests for `mktg cmo` — real Bun.spawn, no real claude calls.
//
// The live spawn path is intentionally not exercised here — a real
// `claude -p` invocation hits the network, costs tokens, and is too
// slow for CI. The dry-run path fully covers the argv construction
// contract; MISSING_DEPENDENCY is tested by scrubbing PATH.

import { describe, test, expect } from "bun:test";
import {
  handler as cmoHandler,
  schema as cmoSchema,
  parseRouting,
  type CmoResponse,
} from "../../src/commands/cmo";
import type { GlobalFlags } from "../../src/types";

const baseFlags = (overrides: Partial<GlobalFlags> = {}): GlobalFlags => ({
  json: true,
  dryRun: false,
  fields: [],
  cwd: process.cwd(),
  jsonInput: undefined,
  ...overrides,
});

describe("mktg cmo — schema", () => {
  test("declares the M4 flags", () => {
    const names = cmoSchema.flags.map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining(["--dry-run", "--timeout", "--model", "--allowed-tools"]),
    );
  });

  test("declares prompt as a required positional", () => {
    expect(cmoSchema.positional?.required).toBe(true);
    expect(cmoSchema.positional?.name).toBe("prompt");
  });

  test("output shape exposes the CmoResponse contract", () => {
    const keys = Object.keys(cmoSchema.output);
    expect(keys).toEqual(
      expect.arrayContaining(["prompt", "response", "durationMs", "exitCode", "mode", "routing", "metadata", "preview"]),
    );
  });
});

describe("mktg cmo — input validation", () => {
  test("empty prompt returns INVALID_ARGS", async () => {
    const res = await cmoHandler([], baseFlags({ dryRun: true }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("INVALID_ARGS");
    expect(res.error.message).toContain("requires a prompt");
  });

  test("prompt with NUL byte returns INVALID_ARGS", async () => {
    const res = await cmoHandler(["bad\x00prompt"], baseFlags({ dryRun: true }));
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe("INVALID_ARGS");
    expect(res.error.message).toContain("control char");
  });

  test("prompt WITH newlines/tabs is allowed (legitimate multi-line prompts)", async () => {
    const res = await cmoHandler(
      ["line one\nline two\ttabbed"],
      baseFlags({ dryRun: true }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.prompt).toContain("line one");
    expect(res.data.prompt).toContain("line two");
  });

  test("--timeout out of range returns INVALID_ARGS", async () => {
    const res = await cmoHandler(
      ["x", "--timeout", "99999"],
      baseFlags({ dryRun: true }),
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.message).toContain("--timeout");
  });

  test("--timeout non-numeric returns INVALID_ARGS", async () => {
    const res = await cmoHandler(["x", "--timeout", "abc"], baseFlags({ dryRun: true }));
    expect(res.ok).toBe(false);
  });

  test("MISSING_DEPENDENCY when claude binary absent", async () => {
    const originalPath = process.env.PATH;
    process.env.PATH = "/usr/bin:/bin"; // neither has `claude`
    try {
      const res = await cmoHandler(["help"], baseFlags({ dryRun: false }));
      expect(res.ok).toBe(false);
      if (res.ok) return;
      expect(res.error.code).toBe("MISSING_DEPENDENCY");
      expect(res.error.message).toContain("claude");
      expect(res.exitCode).toBe(3);
    } finally {
      process.env.PATH = originalPath;
    }
  });
});

describe("mktg cmo --dry-run", () => {
  test("returns preview envelope with resolved claude binary and full argv", async () => {
    const res = await cmoHandler(
      ["help me market this app"],
      baseFlags({ dryRun: true }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.mode).toBe("dry-run");
    expect(res.data.prompt).toBe("/cmo help me market this app");
    expect(res.data.preview).toBeDefined();
    expect(res.data.preview!.cmd[0]).toMatch(/claude$/);
    expect(res.data.preview!.cmd).toEqual(expect.arrayContaining(["-p", "--output-format", "json", "--no-session-persistence"]));
    expect(res.data.exitCode).toBe(0);
    expect(res.data.response).toBe("");
  });

  test("auto-prefix '/cmo ' when prompt doesn't already start with it", async () => {
    const res = await cmoHandler(["what next"], baseFlags({ dryRun: true }));
    if (!res.ok) return;
    expect(res.data.prompt).toBe("/cmo what next");
  });

  test("keep existing '/cmo ' prefix intact", async () => {
    const res = await cmoHandler(["/cmo already prefixed"], baseFlags({ dryRun: true }));
    if (!res.ok) return;
    expect(res.data.prompt).toBe("/cmo already prefixed");
  });

  test("--model is threaded into argv", async () => {
    const res = await cmoHandler(
      ["test", "--model", "sonnet"],
      baseFlags({ dryRun: true }),
    );
    if (!res.ok) return;
    expect(res.data.metadata.model).toBe("sonnet");
    expect(res.data.preview!.cmd).toEqual(expect.arrayContaining(["--model", "sonnet"]));
  });

  test("--allowed-tools override is threaded into argv", async () => {
    const custom = "Bash(mktg *) Bash(gh *)";
    const res = await cmoHandler(
      ["test", "--allowed-tools", custom],
      baseFlags({ dryRun: true }),
    );
    if (!res.ok) return;
    expect(res.data.metadata.allowedTools).toBe(custom);
    expect(res.data.preview!.cmd).toEqual(expect.arrayContaining([custom]));
  });

  test("--timeout propagates to metadata", async () => {
    const res = await cmoHandler(
      ["test", "--timeout", "45"],
      baseFlags({ dryRun: true }),
    );
    if (!res.ok) return;
    expect(res.data.metadata.timeoutMs).toBe(45_000);
  });
});

describe("parseRouting (heuristic)", () => {
  test("finds skill from 'routing to /seo-content'", () => {
    const r = parseRouting("Got it. Routing to /seo-content because your keyword plan is fresh.");
    expect(r?.skillSuggested).toBe("seo-content");
    expect(r?.confidence).toMatch(/high|medium|low/);
    expect(r?.evidence).toBeDefined();
  });

  test("finds skill from 'I'll run /audience-research'", () => {
    const r = parseRouting("I'll run /audience-research to build out your persona.");
    expect(r?.skillSuggested).toBe("audience-research");
  });

  test("returns undefined when no skill route is detected", () => {
    expect(parseRouting("Your brand voice looks good.")).toBeUndefined();
  });

  test("confidence=high on decisive language", () => {
    const r = parseRouting("Let's run /landscape-scan. I recommend this now.");
    expect(r?.confidence).toBe("high");
  });

  test("confidence=low on hedged language", () => {
    const r = parseRouting("You might want to consider routing to /positioning-angles.");
    expect(r?.confidence).toBe("low");
  });
});
