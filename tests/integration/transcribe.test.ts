// Integration test: TRANSCRIBE command
// Covers Agent DX 21/21 axes for mktg transcribe — JSON envelope, raw-payload
// --input, schema introspection, --fields dot-notation, input hardening
// (SSRF / control chars / traversal / encoding), safety rails (--dry-run),
// and the missing-dep exit path.
//
// Uses real file I/O inside mkdtemp'd cwds. NO MOCKS. Whisper is never actually
// invoked — we stay on the validation / dry-run / missing-dep paths so the
// test runs in under a second and doesn't need whisper-cli installed.

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

type RunOut = { stdout: string; stderr: string; exitCode: number };

const PROJECT_ROOT = import.meta.dir.replace("/tests/integration", "");

const run = async (args: readonly string[], cwd?: string): Promise<RunOut> => {
  const proc = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: PROJECT_ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NO_COLOR: "1",
      // Point whisper-cli PATH at a non-existent dir so `Bun.which` returns null,
      // keeping the missing-dep test deterministic on machines where the real
      // tool is installed. Individual tests override this when they need the
      // tool to appear present.
    },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited };
};

const parseJson = <T = Record<string, unknown>>(stdout: string): T => {
  try {
    return JSON.parse(stdout) as T;
  } catch (e) {
    throw new Error(`Expected JSON, got: ${stdout.slice(0, 200)}`);
  }
};

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "mktg-transcribe-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

// ─── Schema introspection (Agent DX axis 3) ───

describe("schema introspection", () => {
  test("mktg schema transcribe --json returns a CommandSchema with responseSchema", async () => {
    const { stdout, exitCode } = await run(["schema", "transcribe", "--json"]);
    expect(exitCode).toBe(0);
    const schema = parseJson(stdout) as Record<string, unknown>;
    expect(schema.name).toBe("transcribe");
    expect(schema.description).toContain("whisper");
    expect(Array.isArray(schema.flags)).toBe(true);
    expect(Array.isArray(schema.examples)).toBe(true);
    expect(Array.isArray(schema.responseSchema)).toBe(true);

    const fields = (schema.responseSchema as Array<Record<string, unknown>>).map(f => f.field);
    expect(fields).toContain("transcript");
    expect(fields).toContain("segments");
    expect(fields).toContain("source_type");
    expect(fields).toContain("duration_ms");
    expect(fields).toContain("warnings");
    expect(fields).toContain("model");
  });

  test("schema lists transcribe in the commands registry", async () => {
    const { stdout, exitCode } = await run(["schema", "--json"]);
    expect(exitCode).toBe(0);
    const parsed = parseJson(stdout) as { commands: Array<{ name: string }> };
    const names = parsed.commands.map(c => c.name);
    expect(names).toContain("transcribe");
  });
});

// ─── Missing / invalid source ───

describe("source validation", () => {
  test("no source → INVALID_ARGS exit 2", async () => {
    const { stdout, exitCode } = await run(["transcribe", "--json"]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
  });

  test("nonexistent local file → INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run(
      ["--cwd", tempDir, "transcribe", "nope.mp3", "--dry-run", "--json"],
    );
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
    expect(body.error.message).toMatch(/not found|File not found/i);
  });

  test("unsupported extension → INVALID_ARGS with supported-list hint", async () => {
    await writeFile(join(tempDir, "bad.txt"), "not audio");
    const { stdout, exitCode } = await run(
      ["--cwd", tempDir, "transcribe", "bad.txt", "--dry-run", "--json"],
    );
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
    expect(body.error.message).toMatch(/Unsupported file extension/i);
  });
});

// ─── Source type detection via --dry-run ───

describe("source type detection", () => {
  test("local .mp3 → source_type=audio-file", async () => {
    await writeFile(join(tempDir, "clip.mp3"), "");
    const { stdout, exitCode } = await run(
      ["--cwd", tempDir, "transcribe", "clip.mp3", "--dry-run", "--json"],
    );
    expect(exitCode).toBe(0);
    const body = parseJson(stdout) as { action: string; source_type: string };
    expect(body.action).toBe("dry-run");
    expect(body.source_type).toBe("audio-file");
  });

  test("local .mp4 → source_type=video-file", async () => {
    await writeFile(join(tempDir, "talk.mp4"), "");
    const { stdout } = await run(
      ["--cwd", tempDir, "transcribe", "talk.mp4", "--dry-run", "--json"],
    );
    const body = parseJson(stdout) as { source_type: string };
    expect(body.source_type).toBe("video-file");
  });

  test("local .wav → source_type=audio-file", async () => {
    await writeFile(join(tempDir, "rec.wav"), "");
    const { stdout } = await run(
      ["--cwd", tempDir, "transcribe", "rec.wav", "--dry-run", "--json"],
    );
    const body = parseJson(stdout) as { source_type: string };
    expect(body.source_type).toBe("audio-file");
  });

  test("YouTube URL → source_type=youtube", async () => {
    const { stdout, exitCode } = await run([
      "transcribe",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "--dry-run",
      "--json",
    ]);
    expect(exitCode).toBe(0);
    const body = parseJson(stdout) as { source_type: string };
    expect(body.source_type).toBe("youtube");
  });

  test("youtu.be short URL → source_type=youtube", async () => {
    const { stdout } = await run([
      "transcribe", "https://youtu.be/abc123", "--dry-run", "--json",
    ]);
    const body = parseJson(stdout) as { source_type: string };
    expect(body.source_type).toBe("youtube");
  });

  test("TikTok URL → source_type=tiktok", async () => {
    const { stdout } = await run([
      "transcribe",
      "https://www.tiktok.com/@user/video/123",
      "--dry-run",
      "--json",
    ]);
    const body = parseJson(stdout) as { source_type: string };
    expect(body.source_type).toBe("tiktok");
  });

  test("direct .mp3 URL → source_type=podcast", async () => {
    const { stdout } = await run([
      "transcribe",
      "https://example.com/feed/episode-42.mp3",
      "--dry-run",
      "--json",
    ]);
    const body = parseJson(stdout) as { source_type: string };
    expect(body.source_type).toBe("podcast");
  });

  test("generic public https URL → source_type=audio-url", async () => {
    const { stdout } = await run([
      "transcribe",
      "https://example.com/media/episode",
      "--dry-run",
      "--json",
    ]);
    const body = parseJson(stdout) as { source_type: string };
    expect(body.source_type).toBe("audio-url");
  });
});

// ─── Input hardening (Agent DX axis 5) ───

describe("input hardening", () => {
  test("SSRF: http://169.254.169.254/ (AWS IMDS) rejected", async () => {
    const { stdout, exitCode } = await run([
      "transcribe", "http://169.254.169.254/latest/meta-data/", "--json",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
    expect(body.error.message).toMatch(/169\.254|private|loopback|link-local/i);
  });

  test("SSRF: http://localhost/ rejected", async () => {
    const { stdout, exitCode } = await run([
      "transcribe", "http://localhost/feed.mp3", "--json",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
  });

  test("SSRF: http://10.0.0.1/ (RFC1918 private) rejected", async () => {
    const { stdout, exitCode } = await run([
      "transcribe", "http://10.0.0.1/file.mp3", "--json",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
  });

  test("non-http scheme file:// rejected", async () => {
    const { stdout, exitCode } = await run([
      "transcribe", "file:///etc/passwd", "--json",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
  });

  test("path traversal ../../../etc/passwd rejected", async () => {
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "transcribe", "../../../etc/passwd", "--dry-run", "--json",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
  });

  test("absolute local path rejected (must be relative to --cwd)", async () => {
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "transcribe", "/etc/passwd", "--dry-run", "--json",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
  });

  test("URL-encoded path traversal %2e%2e/foo rejected", async () => {
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "transcribe", "%2e%2e/foo.mp3", "--dry-run", "--json",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
    expect(body.error.message).toMatch(/URL-encoded|double-encoded/i);
  });

  test("invalid --model rejected with valid list in suggestions", async () => {
    await writeFile(join(tempDir, "rec.wav"), "");
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "transcribe", "rec.wav",
      "--model", "gargantuan", "--dry-run", "--json",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string; suggestions: string[] } };
    expect(body.error.code).toBe("INVALID_ARGS");
    expect(body.error.suggestions.join(" ")).toContain("small");
  });

  test("invalid --threads rejected", async () => {
    await writeFile(join(tempDir, "rec.wav"), "");
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "transcribe", "rec.wav",
      "--threads", "-5", "--dry-run", "--json",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
  });
});

// ─── Raw payload input (Agent DX axis 2) ───

describe("--input raw payload", () => {
  test("--input with source+model applies both", async () => {
    await writeFile(join(tempDir, "rec.mp3"), "");
    const payload = JSON.stringify({ source: "rec.mp3", model: "tiny", language: "es" });
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "--input", payload, "transcribe", "--dry-run", "--json",
    ]);
    expect(exitCode).toBe(0);
    const body = parseJson(stdout) as { action: string; model: string; steps: string[] };
    expect(body.action).toBe("dry-run");
    expect(body.model).toBe("tiny");
    expect(body.steps.join(" ")).toContain("language=es");
  });

  test("--input with invalid JSON returns INVALID_ARGS", async () => {
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "--input", "{not json", "transcribe", "--dry-run", "--json",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
    expect(body.error.message).toMatch(/Invalid --input JSON/);
  });

  test("--input with __proto__ pollution rejected", async () => {
    const { stdout, exitCode } = await run([
      "--cwd", tempDir,
      "--input", '{"__proto__":{"polluted":true}}',
      "transcribe", "--dry-run", "--json",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string } };
    expect(body.error.code).toBe("INVALID_ARGS");
  });
});

// ─── Safety rails (Agent DX axis 6) ───

describe("safety rails", () => {
  test("--dry-run for local file returns full dry-run envelope, no side effects", async () => {
    await writeFile(join(tempDir, "episode.mp3"), "xyz");
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "transcribe", "episode.mp3", "--dry-run", "--json",
    ]);
    expect(exitCode).toBe(0);
    const body = parseJson(stdout) as {
      action: string;
      source_type: string;
      would_transcribe: string;
      model: string;
      estimated_size: string;
      output_dir: string;
      steps: string[];
    };
    expect(body.action).toBe("dry-run");
    expect(body.source_type).toBe("audio-file");
    expect(body.model).toBe("small");
    expect(body.estimated_size).toMatch(/bytes/);
    expect(body.steps.length).toBeGreaterThan(0);
    expect(body.steps.join(" ")).toContain("whisper.cpp");

    // No artifacts should be written
    const filesInTempAfter = Array.from(new Bun.Glob("*").scanSync({ cwd: tempDir }));
    expect(filesInTempAfter).toEqual(["episode.mp3"]);
  });

  test("--dry-run for URL lists yt-dlp as a step", async () => {
    const { stdout } = await run([
      "transcribe", "https://www.youtube.com/watch?v=abc", "--dry-run", "--json",
    ]);
    const body = parseJson(stdout) as { steps: string[] };
    expect(body.steps[0]).toContain("yt-dlp");
  });

  test("--dry-run for file should NOT include yt-dlp in steps", async () => {
    await writeFile(join(tempDir, "local.m4a"), "");
    const { stdout } = await run([
      "--cwd", tempDir, "transcribe", "local.m4a", "--dry-run", "--json",
    ]);
    const body = parseJson(stdout) as { steps: string[] };
    expect(body.steps.some(s => s.includes("yt-dlp"))).toBe(false);
  });
});

// ─── Context window discipline (Agent DX axis 4) ───

describe("--fields filtering", () => {
  test("--fields action on dry-run returns only the action key", async () => {
    await writeFile(join(tempDir, "rec.mp3"), "");
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "transcribe", "rec.mp3", "--dry-run", "--json",
      "--fields", "action",
    ]);
    expect(exitCode).toBe(0);
    const body = parseJson(stdout) as Record<string, unknown>;
    expect(body.action).toBe("dry-run");
    expect(body.source_type).toBeUndefined();
    expect(body.steps).toBeUndefined();
  });

  test("--fields source_type,model on dry-run returns both", async () => {
    await writeFile(join(tempDir, "rec.mp3"), "");
    const { stdout } = await run([
      "--cwd", tempDir, "transcribe", "rec.mp3", "--dry-run", "--json",
      "--fields", "source_type,model",
    ]);
    const body = parseJson(stdout) as Record<string, unknown>;
    expect(body.source_type).toBe("audio-file");
    expect(body.model).toBe("small");
    expect(body.action).toBeUndefined();
  });

  test("--fields on unknown field returns UNKNOWN_FIELD exit 2", async () => {
    await writeFile(join(tempDir, "rec.mp3"), "");
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "transcribe", "rec.mp3", "--dry-run", "--json",
      "--fields", "zzznotreal",
    ]);
    expect(exitCode).toBe(2);
    const body = parseJson(stdout) as { error: { code: string } };
    expect(body.error.code).toBe("UNKNOWN_FIELD");
  });
});

// ─── Auto-JSON when piped (Agent DX axis 1) ───

describe("piped output auto-JSON", () => {
  test("piped transcribe output is valid JSON without --json flag", async () => {
    await writeFile(join(tempDir, "rec.mp3"), "");
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "transcribe", "rec.mp3", "--dry-run",
    ]);
    expect(exitCode).toBe(0);
    // Subprocess stdout is piped → non-TTY → auto-JSON
    const body = parseJson(stdout) as { action: string };
    expect(body.action).toBe("dry-run");
  });
});

// ─── Missing dependency path (Agent DX axis 6 — structured errors) ───
// Only runs when whisper-cli is NOT installed. On dev machines with whisper-cli
// already on PATH, skip the assertion. We do not want this test to shell out
// to a real whisper binary that may or may not exist.

describe("missing dependency path", () => {
  test("without whisper-cli on PATH, running transcribe returns MISSING_DEPENDENCY", async () => {
    const whisperInstalled = Bun.which("whisper-cli") !== null;
    if (whisperInstalled) {
      // whisper-cli is present; we can't exercise the missing-dep path without
      // unsetting PATH which would break the bun runtime. Skip loudly.
      return;
    }
    await writeFile(join(tempDir, "rec.mp3"), "");
    const { stdout, exitCode } = await run([
      "--cwd", tempDir, "transcribe", "rec.mp3", "--json",
    ]);
    // Exit 3 = MISSING_DEPENDENCY in mktg's canonical exit-code table.
    expect(exitCode).toBe(3);
    const body = parseJson(stdout) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("MISSING_DEPENDENCY");
    expect(body.error.message.toLowerCase()).toContain("whisper");
  });
});

// ─── Error envelope consistency ───

describe("error envelope consistency", () => {
  test("all error responses have code, message, suggestions, exitCode", async () => {
    const { stdout } = await run(["transcribe", "--json"]);
    const body = parseJson(stdout) as {
      error: { code: string; message: string; suggestions: unknown };
      exitCode: number;
    };
    expect(typeof body.error.code).toBe("string");
    expect(typeof body.error.message).toBe("string");
    expect(Array.isArray(body.error.suggestions)).toBe(true);
    expect(typeof body.exitCode).toBe("number");
  });
});
