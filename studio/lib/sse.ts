// lib/sse.ts — Server-Sent Events system for mktg-studio
//
// Server side:  SSEEmitter — manages subscriber streams, publishes typed events.
// Client side:  useSSE<T>  — React hook that subscribes to an SSE URL.

import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Shared event shape — all SSE events use this envelope.
// ---------------------------------------------------------------------------
export interface SSEEvent<T = unknown> {
  type: string;
  payload: T;
  ts: number;
}

// ---------------------------------------------------------------------------
// Server-side SSEEmitter
// ---------------------------------------------------------------------------

interface Subscriber {
  channel: string;
  controller: ReadableStreamDefaultController<string>;
}

export class SSEEmitter {
  private subscribers: Subscriber[] = [];

  /**
   * Subscribe a request to an SSE stream.
   * Returns a Response with Content-Type: text/event-stream.
   * Call from route handlers: `return emitter.subscribe(req, "global")`
   */
  subscribe(channel: string, corsHeaders: Record<string, string> = {}): Response {
    let controller!: ReadableStreamDefaultController<string>;
    let keepalive: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream<string>({
      start: (ctrl) => {
        controller = ctrl;

        const sub: Subscriber = { channel, controller };
        this.subscribers.push(sub);

        // Send initial heartbeat so the browser opens the connection
        const heartbeat = `data: ${JSON.stringify({ type: "connected", payload: { channel }, ts: Date.now() })}\n\n`;
        controller.enqueue(heartbeat);

        // SSE comment-line ping every 15s — Bun.serve and most proxies will
        // close idle streams within 30-60s. Comment frames (`: ping`) keep
        // the socket alive without triggering EventSource.onmessage on the
        // client. This is the root-cause fix for the "subscribers go to 0
        // after ~30s" bug (Bug #8).
        keepalive = setInterval(() => {
          try {
            controller.enqueue(`: ping ${Date.now()}\n\n`);
          } catch {
            if (keepalive) clearInterval(keepalive);
          }
        }, 15_000);
      },
      cancel: () => {
        if (keepalive) {
          clearInterval(keepalive);
          keepalive = null;
        }
        this.subscribers = this.subscribers.filter((s) => s.controller !== controller);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        // Pass through CORS so a dashboard on a different origin (e.g.
        // Playwright's scratch port) can open the EventSource. Same-origin
        // setups get an empty record and behave identically.
        ...corsHeaders,
      },
    });
  }

  /**
   * Publish an event to all subscribers on a channel (or "*" for all).
   * `channel = "*"` broadcasts to every open stream.
   */
  publish<T>(channel: string, event: Omit<SSEEvent<T>, "ts">): void {
    const envelope: SSEEvent<T> = { ...event, ts: Date.now() } as SSEEvent<T>;
    const data = `data: ${JSON.stringify(envelope)}\n\n`;

    const dead: Subscriber[] = [];

    for (const sub of this.subscribers) {
      if (channel !== "*" && sub.channel !== channel && sub.channel !== "*") continue;
      try {
        sub.controller.enqueue(data);
      } catch {
        // Stream closed — mark for removal
        dead.push(sub);
      }
    }

    if (dead.length > 0) {
      this.subscribers = this.subscribers.filter((s) => !dead.includes(s));
    }
  }

  /** Number of active subscribers (for health endpoint). */
  get size(): number {
    return this.subscribers.length;
  }
}

// ---------------------------------------------------------------------------
// Global singleton emitters — import these in route handlers
// ---------------------------------------------------------------------------

/** Global broadcast channel: brand-file-changed, skill-completed, etc. */
export const globalEmitter = new SSEEmitter();

/** Per-job SSE streams keyed by jobId. */
export const jobEmitters = new Map<string, SSEEmitter>();

export function getJobEmitter(jobId: string): SSEEmitter {
  if (!jobEmitters.has(jobId)) {
    jobEmitters.set(jobId, new SSEEmitter());
  }
  return jobEmitters.get(jobId)!;
}

export function removeJobEmitter(jobId: string): void {
  jobEmitters.delete(jobId);
}

// ---------------------------------------------------------------------------
// Client-side useSSE hook (TypeScript/React)
// ---------------------------------------------------------------------------

/**
 * Subscribe to an SSE URL and return the latest parsed event payload.
 *
 * @example
 * const event = useSSE<BrandFileChangedPayload>("/api/events");
 */
export function useSSE<T = unknown>(url: string): SSEEvent<T> | null {
  const [latest, setLatest] = useState<SSEEvent<T> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Close any existing connection before opening a new one
    esRef.current?.close();

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as SSEEvent<T>;
        setLatest(parsed);
      } catch {
        // Ignore malformed frames
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do here
    };

    return () => {
      es.close();
    };
  }, [url]);

  return latest;
}

/**
 * Subscribe to an SSE URL and accumulate all events into an array.
 * Useful for job log streams.
 */
export function useSSELog<T = unknown>(url: string): SSEEvent<T>[] {
  const [events, setEvents] = useState<SSEEvent<T>[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    esRef.current?.close();
    setEvents([]);

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as SSEEvent<T>;
        setEvents((prev) => [...prev, parsed]);
      } catch {
        // Ignore malformed frames
      }
    };

    return () => {
      es.close();
    };
  }, [url]);

  return events;
}
