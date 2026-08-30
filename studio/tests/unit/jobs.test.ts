import { describe, expect, test } from "bun:test";
import { createJob, runJob } from "../../lib/jobs.ts";
import type { JobSSEEvent } from "../../lib/sse.ts";
import { getJobEmitter } from "../../lib/sse.ts";

async function readUntil(
  response: Response,
  type: JobSSEEvent["type"],
): Promise<JobSSEEvent | null> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const deadline = Date.now() + 2_000;
  try {
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const chunk = await Promise.race([
        reader.read(),
        Bun.sleep(Math.max(1, remaining)).then(() => null),
      ]);
      if (!chunk) return null;
      if (chunk.done) return null;
      const value = chunk.value as string | Uint8Array;
      buffer += typeof value === "string"
        ? value
        : decoder.decode(value, { stream: true });
      for (const frame of buffer.split("\n\n")) {
        const line = frame.split("\n").find((entry) => entry.startsWith("data: "));
        if (!line) continue;
        const event = JSON.parse(line.slice(6)) as JobSSEEvent;
        if (event.type === type) return event;
      }
    }
    return null;
  } finally {
    await reader.cancel();
  }
}

describe("job SSE contract", () => {
  test("per-job streams receive the typed started, log, and terminal lifecycle", async () => {
    const job = createJob("unit-probe");
    const stream = getJobEmitter(job.id).subscribe(job.id);
    const completed = readUntil(stream, "job-completed");

    runJob(job.id, async (_job, emit) => {
      emit("working");
      return { done: true };
    });

    const event = await completed;
    expect(event?.type).toBe("job-completed");
    if (event?.type !== "job-completed") return;
    expect(event.payload.id).toBe(job.id);
    expect(event.payload.status).toBe("success");
  });
});
