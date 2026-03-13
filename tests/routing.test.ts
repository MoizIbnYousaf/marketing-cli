// Tests for src/core/routing.ts — namespace routing utilities
// No mocks.

import { describe, test, expect } from "bun:test";
import { isKeyOf } from "../src/core/routing";

describe("isKeyOf", () => {
  const obj = { foo: 1, bar: "hello", baz: true } as const;

  test("returns true for a key that exists in the object", () => {
    expect(isKeyOf(obj, "foo")).toBe(true);
    expect(isKeyOf(obj, "bar")).toBe(true);
    expect(isKeyOf(obj, "baz")).toBe(true);
  });

  test("returns false for a key that doesn't exist", () => {
    expect(isKeyOf(obj, "missing")).toBe(false);
    expect(isKeyOf(obj, "nope")).toBe(false);
  });

  test("returns false for empty string", () => {
    expect(isKeyOf(obj, "")).toBe(false);
  });

  test("works with as const objects (TypeScript narrowing)", () => {
    const commands = { init: () => {}, doctor: () => {}, list: () => {} } as const;
    const key = "init";
    if (isKeyOf(commands, key)) {
      // If this compiles, narrowing works — key is now keyof typeof commands
      const _fn: () => void = commands[key];
      expect(typeof _fn).toBe("function");
    }
    expect(isKeyOf(commands, key)).toBe(true);
  });

  test("prototype keys like __proto__, constructor, toString are in the prototype chain", () => {
    // `key in obj` traverses the prototype chain — this is expected JS behavior
    // These return true because they exist on Object.prototype
    expect(isKeyOf(obj, "__proto__")).toBe(true);
    expect(isKeyOf(obj, "constructor")).toBe(true);
    expect(isKeyOf(obj, "toString")).toBe(true);
  });

  test("returns false for prototype keys on null-prototype objects", () => {
    const safe = Object.create(null) as Record<string, unknown>;
    safe.foo = 1;
    expect(isKeyOf(safe, "foo")).toBe(true);
    expect(isKeyOf(safe, "__proto__")).toBe(false);
    expect(isKeyOf(safe, "constructor")).toBe(false);
    expect(isKeyOf(safe, "toString")).toBe(false);
  });
});
