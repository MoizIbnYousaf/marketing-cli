// tests/unit/schema-export.test.ts — Zod → JSON Schema bridge for ROUTE_SCHEMA

import { afterEach, describe, expect, test } from "bun:test";
import { z } from "zod";
import {
  registerRouteSchema,
  enrichRouteEntry,
  enrichRouteSchema,
  getInputJsonSchema,
  _resetRegistryForTests,
  _registrySize,
} from "../../lib/schema-export.ts";

afterEach(() => {
  _resetRegistryForTests();
});

describe("registerRouteSchema + getInputJsonSchema", () => {
  test("returns undefined when nothing is registered", () => {
    expect(getInputJsonSchema("/api/nope", "POST")).toBeUndefined();
    expect(_registrySize()).toBe(0);
  });

  test("converts a simple object schema to JSON Schema 2020-12", () => {
    registerRouteSchema("/api/probe", {
      method: "POST",
      body: z.object({ id: z.number().int().positive() }),
    });

    const out = getInputJsonSchema("/api/probe", "POST") as Record<string, unknown>;
    expect(out).toBeDefined();
    expect(out.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(out.type).toBe("object");
    const props = out.properties as Record<string, { type: string; exclusiveMinimum?: number }>;
    expect(props.id.type).toBe("integer");
    expect(props.id.exclusiveMinimum).toBe(0);
    expect(out.required).toEqual(["id"]);
  });

  test("preserves enum + min/max constraints", () => {
    registerRouteSchema("/api/probe-enum", {
      method: "POST",
      body: z.object({
        level: z.enum(["info", "warn", "error"]),
        message: z.string().min(1).max(500),
      }),
    });

    const out = getInputJsonSchema("/api/probe-enum", "POST") as {
      properties: {
        level: { enum: string[] };
        message: { minLength: number; maxLength: number };
      };
    };
    expect(out.properties.level.enum).toEqual(["info", "warn", "error"]);
    expect(out.properties.message.minLength).toBe(1);
    expect(out.properties.message.maxLength).toBe(500);
  });

  test("optional fields land outside required[]", () => {
    registerRouteSchema("/api/probe-optional", {
      method: "POST",
      body: z.object({
        required: z.string(),
        optional: z.string().optional(),
      }),
    });

    const out = getInputJsonSchema("/api/probe-optional", "POST") as {
      required: string[];
    };
    expect(out.required).toEqual(["required"]);
  });

  test("two methods on the same path coexist", () => {
    const postBody = z.object({ a: z.number() });
    const putBody = z.object({ b: z.string() });
    registerRouteSchema("/api/multi", { method: "POST", body: postBody });
    registerRouteSchema("/api/multi", { method: "PUT", body: putBody });

    const post = getInputJsonSchema("/api/multi", "POST") as { properties: Record<string, unknown> };
    const put = getInputJsonSchema("/api/multi", "PUT") as { properties: Record<string, unknown> };
    expect("a" in post.properties).toBe(true);
    expect("b" in put.properties).toBe(true);
  });

  test("re-registering the same method replaces the prior entry", () => {
    registerRouteSchema("/api/replace", {
      method: "POST",
      body: z.object({ old: z.string() }),
    });
    registerRouteSchema("/api/replace", {
      method: "POST",
      body: z.object({ new: z.string() }),
    });
    const out = getInputJsonSchema("/api/replace", "POST") as { properties: Record<string, unknown> };
    expect("old" in out.properties).toBe(false);
    expect("new" in out.properties).toBe(true);
  });
});

describe("enrichRouteEntry", () => {
  test("adds inputSchema when a registered match exists", () => {
    registerRouteSchema("/api/x", {
      method: "POST",
      body: z.object({ foo: z.string() }),
    });

    const entry = { method: "POST", path: "/api/x", description: "x" };
    const enriched = enrichRouteEntry(entry);
    expect(enriched.inputSchema).toBeDefined();
    expect((enriched.inputSchema as { type: string }).type).toBe("object");
    // Original fields pass through.
    expect(enriched.path).toBe("/api/x");
    expect(enriched.description).toBe("x");
  });

  test("passes through unchanged when nothing is registered", () => {
    const entry = { method: "GET", path: "/api/health", description: "x" };
    const enriched = enrichRouteEntry(entry);
    expect(enriched.inputSchema).toBeUndefined();
    expect(enriched).toEqual(entry);
  });

  test("doesn't mutate the input entry", () => {
    registerRouteSchema("/api/y", {
      method: "POST",
      body: z.object({ k: z.string() }),
    });
    const entry = { method: "POST", path: "/api/y", description: "y" };
    enrichRouteEntry(entry);
    expect(entry).not.toHaveProperty("inputSchema");
  });
});

describe("enrichRouteSchema (array variant)", () => {
  test("enriches entries that match, leaves the rest", () => {
    registerRouteSchema("/api/has", {
      method: "POST",
      body: z.object({ k: z.string() }),
    });

    const entries = [
      { method: "GET", path: "/api/free", description: "" },
      { method: "POST", path: "/api/has", description: "" },
    ];

    const enriched = enrichRouteSchema(entries);
    expect(enriched[0].inputSchema).toBeUndefined();
    expect(enriched[1].inputSchema).toBeDefined();
  });
});
