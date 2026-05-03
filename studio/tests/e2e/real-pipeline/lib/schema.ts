// tests/e2e/real-pipeline/lib/schema.ts
//
// captureAndAssertFullShape — validates a captured API response against
// a declared field map, failing loudly if any expected field is missing
// OR any unexpected field appears.
//
// The point is zero translation loss: if Postiz returns 40 fields on
// /integrations, the test must assert all 40. Hand-rolled `expect(x.ok)`
// checks miss field drift; this helper doesn't.

import { expect } from "bun:test";

/** Minimal schema node. Extend with enum/oneOf later as needs arise. */
export type SchemaType =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "array"
  | "object"
  | "any";

export interface FieldSchema {
  readonly type: SchemaType;
  readonly required?: boolean;
  readonly nullable?: boolean;
  /** For type: "array" — the shape of each item. */
  readonly items?: FieldSchema;
  /** For type: "object" — the expected field map. */
  readonly fields?: Record<string, FieldSchema>;
  /** For type: "string" — exact match or enum. */
  readonly enum?: readonly string[];
}

export type Schema = Record<string, FieldSchema>;

const typeOf = (v: unknown): SchemaType => {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "object") return "object";
  if (typeof v === "string") return "string";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  return "any";
};

const pathStr = (parts: readonly string[]): string =>
  parts.length === 0 ? "<root>" : parts.join(".");

function assertField(
  value: unknown,
  schema: FieldSchema,
  path: readonly string[],
  errors: string[],
): void {
  if (value === null || value === undefined) {
    if (schema.nullable || !schema.required) return;
    errors.push(`${pathStr(path)}: expected ${schema.type} but got ${value === null ? "null" : "undefined"}`);
    return;
  }

  const actualType = typeOf(value);
  if (schema.type !== "any" && actualType !== schema.type) {
    errors.push(`${pathStr(path)}: expected type ${schema.type} but got ${actualType}`);
    return;
  }

  if (schema.enum && typeof value === "string" && !schema.enum.includes(value)) {
    errors.push(`${pathStr(path)}: value '${value}' not in enum [${schema.enum.join(", ")}]`);
  }

  if (schema.type === "array" && schema.items && Array.isArray(value)) {
    value.forEach((item, i) => assertField(item, schema.items!, [...path, `[${i}]`], errors));
  }

  if (schema.type === "object" && schema.fields && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const declaredKeys = new Set(Object.keys(schema.fields));
    const actualKeys = new Set(Object.keys(obj));

    // Required fields must exist.
    for (const [k, fs] of Object.entries(schema.fields)) {
      if (fs.required && !(k in obj)) {
        errors.push(`${pathStr([...path, k])}: required field missing`);
        continue;
      }
      if (k in obj) {
        assertField(obj[k], fs, [...path, k], errors);
      }
    }

    // Extra fields are surfaced as warnings — the schema may be incomplete.
    // In strict mode, callers can post-process `errors` to treat these as hard fails.
    for (const k of actualKeys) {
      if (!declaredKeys.has(k)) {
        errors.push(`${pathStr([...path, k])}: unexpected field (schema may need updating)`);
      }
    }
  }
}

/**
 * Assert a response matches a declared schema exactly. Every expected field
 * must be present and correctly typed; every actual field must be declared.
 *
 * Integrates with bun:test — calls `expect(errors).toEqual([])` so a mismatch
 * produces a readable diff.
 *
 * @example
 *   captureAndAssertFullShape(response, {
 *     id:           { type: "string",  required: true },
 *     identifier:   { type: "string",  required: true },
 *     providerIdentifier: { type: "string", required: true },
 *     name:         { type: "string",  required: true },
 *     picture:      { type: "string",  required: true, nullable: true },
 *     disabled:     { type: "boolean", required: true },
 *     customer:     {
 *       type: "object", required: true, fields: {
 *         id: { type: "string", required: true },
 *         name: { type: "string", required: true },
 *       },
 *     },
 *   });
 */
export function captureAndAssertFullShape(response: unknown, schema: Schema): void {
  const errors: string[] = [];
  assertField(
    response,
    { type: "object", required: true, fields: schema },
    [],
    errors,
  );
  expect(errors, errors.length > 0 ? errors.join("\n") : "schema matches").toEqual([]);
}
