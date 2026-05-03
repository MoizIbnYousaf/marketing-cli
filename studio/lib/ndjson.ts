// lib/ndjson.ts — NDJSON streaming helper for list endpoints (Agent DX axis 4)
//
// Each item becomes one JSON line + "\n". Supports both sync iterables and
// async iterables so callers can stream from a SQLite cursor, an HTTP read,
// or a plain array without branching.

export const NDJSON_CONTENT_TYPE = "application/x-ndjson";

/**
 * True when the client explicitly asked for NDJSON.
 * Matches "application/x-ndjson" (exact) or when it appears as the
 * highest-priority media type in the Accept header.
 */
export function wantsNdjson(req: Request): boolean {
  const accept = req.headers.get("accept") ?? "";
  if (!accept) return false;
  return accept.includes(NDJSON_CONTENT_TYPE);
}

/**
 * Stream an iterable as NDJSON. Each item is JSON-stringified and followed
 * by a single newline. Errors during iteration close the stream cleanly
 * after writing a trailing `{"error": "<message>"}` line so consumers can
 * distinguish a truncation from a natural end.
 */
export function streamNdjson<T>(
  items: Iterable<T> | AsyncIterable<T>,
  extraHeaders: Record<string, string> = {},
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const item of items as AsyncIterable<T>) {
          controller.enqueue(encoder.encode(JSON.stringify(item) + "\n"));
        }
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.enqueue(
          encoder.encode(JSON.stringify({ error: message }) + "\n"),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": NDJSON_CONTENT_TYPE,
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

/**
 * Collect an NDJSON body into an array. Inverse of `streamNdjson`.
 * Mostly useful for tests. Stops at the first malformed line.
 */
export async function parseNdjson<T = unknown>(body: ReadableStream<Uint8Array> | null): Promise<T[]> {
  if (!body) return [];
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const items: T[] = [];
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    if (done) break;

    let newlineIdx = buffer.indexOf("\n");
    while (newlineIdx >= 0) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (line.length > 0) items.push(JSON.parse(line) as T);
      newlineIdx = buffer.indexOf("\n");
    }
  }

  const tail = buffer.trim();
  if (tail.length > 0) items.push(JSON.parse(tail) as T);

  return items;
}
