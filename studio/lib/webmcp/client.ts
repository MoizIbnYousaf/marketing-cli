import { studioAuthHeaders } from "@/lib/studio-token"

const MAX_RESULT_BYTES = 128_000
const MAX_TEXT_CHARS = 48_000
const SECRET_KEY = /(?:authorization|password|secret|api[_-]?key|token)/i

export interface WebMCPRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH"
  body?: unknown
  signal: AbortSignal
}

export type WebMCPRequest = (
  path: string,
  options: WebMCPRequestOptions,
) => Promise<unknown>

/** Chrome's origin-trial builds may omit callback options predating the
 * 26 August draft. Keep cancellation in current clients and degrade to a
 * non-aborted signal in those builds instead of making every tool throw. */
export function withExecutionSignal(
  execute: WebMCP.ModelContextTool["execute"],
): WebMCP.ModelContextTool["execute"] {
  return (input, options) => execute(
    input,
    options ?? { signal: new AbortController().signal },
  )
}

export class WebMCPInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WebMCPInputError"
  }
}

export async function studioWebMCPRequest(
  path: string,
  { method = "GET", body, signal }: WebMCPRequestOptions,
): Promise<unknown> {
  if (signal.aborted) throw signal.reason

  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...studioAuthHeaders(),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  const result = await response.json().catch(() => ({
    ok: false,
    error: { code: "INVALID_RESPONSE", message: `Studio returned HTTP ${response.status}` },
  }))

  if (!response.ok || (isRecord(result) && result.ok === false)) {
    const error = isRecord(result) && isRecord(result.error) ? result.error : null
    const code = typeof error?.code === "string" ? error.code : `HTTP_${response.status}`
    const message = typeof error?.message === "string" ? error.message : response.statusText
    throw new Error(`${code}: ${message}`)
  }
  if (signal.aborted) throw signal.reason
  return boundToolResult(result)
}

export function boundToolResult(value: unknown): unknown {
  const redacted = redactAndTruncate(value)
  const serialized = JSON.stringify(redacted)
  if (new TextEncoder().encode(serialized).byteLength <= MAX_RESULT_BYTES) return redacted
  return {
    ok: false,
    error: {
      code: "RESULT_TOO_LARGE",
      message: `Studio result exceeded the ${MAX_RESULT_BYTES}-byte WebMCP response budget. Narrow the request.`,
    },
  }
}

export function unwrapData(value: unknown): unknown {
  return isRecord(value) && value.ok === true && "data" in value ? value.data : value
}

export function inputRecord(value: Record<string, unknown>): Record<string, unknown> {
  if (!isRecord(value)) throw new WebMCPInputError("Tool input must be an object")
  return value
}

export function stringInput(
  input: Record<string, unknown>,
  key: string,
  options: { required?: boolean; max?: number; allowEmpty?: boolean } = {},
): string | undefined {
  const value = input[key]
  if (value === undefined && !options.required) return undefined
  if (typeof value !== "string" || (!options.allowEmpty && value.length === 0)) {
    throw new WebMCPInputError(`${key} must be ${options.allowEmpty ? "a string" : "a non-empty string"}`)
  }
  if (value.length > (options.max ?? 512)) {
    throw new WebMCPInputError(`${key} exceeds ${options.max ?? 512} characters`)
  }
  return value
}

export function enumInput<const T extends readonly string[]>(
  input: Record<string, unknown>,
  key: string,
  values: T,
  fallback?: T[number],
): T[number] {
  const value = input[key] ?? fallback
  if (typeof value !== "string" || !values.includes(value)) {
    throw new WebMCPInputError(`${key} must be one of: ${values.join(", ")}`)
  }
  return value as T[number]
}

export function integerInput(
  input: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = input[key] ?? fallback
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new WebMCPInputError(`${key} must be an integer from ${min} to ${max}`)
  }
  return value as number
}

function redactAndTruncate(value: unknown, key = "", depth = 0): unknown {
  if (depth > 12) return "[TRUNCATED: maximum nesting depth]"
  if (typeof value === "string") {
    if (SECRET_KEY.test(key)) return "[REDACTED]"
    return value.length > MAX_TEXT_CHARS
      ? `${value.slice(0, MAX_TEXT_CHARS)}\n[TRUNCATED ${value.length - MAX_TEXT_CHARS} characters]`
      : value
  }
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => redactAndTruncate(item, key, depth + 1))
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, child]) => [
        childKey,
        redactAndTruncate(child, childKey, depth + 1),
      ]),
    )
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
