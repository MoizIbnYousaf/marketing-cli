// mktg transcribe — Universal audio/video → transcript command.
// Handles YouTube, TikTok, podcasts, local audio, local video via whisper.cpp.
// Exit codes: see docs/EXIT_CODES.md (3=dep missing, 2=invalid args, 5=network).
//
// @attribution: Handler shape ported from crafter-station/trx (MIT, © 2026 Crafter Station).
// Core logic in src/core/transcribe.ts. See src/commands/ATTRIBUTION.md.

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { ok, type CommandHandler, type CommandSchema } from "../types";
import {
  invalidArgs,
  missingDep,
  networkError,
  parseJsonInput,
  rejectControlChars,
  detectDoubleEncoding,
  sandboxPath,
} from "../core/errors";
import {
  detectSource,
  getModelPath,
  runTranscribePipeline,
  WHISPER_MODELS,
  DEFAULT_MODEL,
  type SourceType,
  type TranscribeSegment,
  type WhisperModel,
} from "../core/transcribe";

type TranscribeResult = {
  readonly transcript: string;
  readonly segments: readonly TranscribeSegment[];
  readonly duration_seconds: number;
  readonly language: string;
  readonly source_type: SourceType;
  readonly source_url: string;
  readonly model: string;
  readonly files: { readonly wav: string | null; readonly srt: string; readonly txt: string };
  readonly duration_ms: number;
  readonly warnings: readonly string[];
  readonly summary?: string;
};

type DryRunResult = {
  readonly action: "dry-run";
  readonly source_type: SourceType;
  readonly would_transcribe: string;
  readonly model: string;
  readonly estimated_size: string;
  readonly output_dir: string;
  readonly steps: readonly string[];
};

export const schema: CommandSchema = {
  name: "transcribe",
  description: "Transcribe audio/video from a URL or local file using whisper.cpp — YouTube, TikTok, podcasts, local audio/video all supported",
  positional: { name: "source", description: "URL (https://) or local audio/video file path", required: true },
  flags: [
    { name: "--model", type: "string", required: false, default: "small", description: `Whisper model: ${WHISPER_MODELS.join(", ")}` },
    { name: "--language", type: "string", required: false, default: "auto", description: "ISO 639-1 language code or 'auto' for detection" },
    { name: "--output", type: "string", required: false, default: ".", description: "Output directory for .srt/.txt files (relative to --cwd)" },
    { name: "--summarize", type: "boolean", required: false, default: false, description: "Run transcript through 'summarize' CLI if available" },
    { name: "--keep-wav", type: "boolean", required: false, default: false, description: "Keep the intermediate cleaned .wav file (default: delete after transcription)" },
    { name: "--words", type: "boolean", required: false, default: false, description: "Word-level timestamps in SRT (significantly larger output)" },
    { name: "--threads", type: "string", required: false, default: "4", description: "Number of threads for whisper-cli" },
    { name: "--confirm", type: "boolean", required: false, default: false, description: "Confirm overwriting existing files in the output directory" },
  ],
  output: {
    "transcript": "string — full transcript as plain text",
    "segments": "Array<{start,end,text}> — timestamped segments from SRT",
    "duration_seconds": "number — total audio duration in seconds",
    "language": "string — language code used ('auto' when unspecified)",
    "source_type": "'audio-file' | 'video-file' | 'youtube' | 'tiktok' | 'podcast' | 'audio-url' — detected type",
    "source_url": "string — canonical source (URL or resolved file path)",
    "model": "string — whisper model used",
    "files": "object — on-disk paths: wav (null unless --keep-wav), srt, txt",
    "duration_ms": "number — wall-clock execution time in ms",
    "warnings": "string[] — non-fatal warnings",
    "summary": "string | undefined — present only with --summarize + summarize CLI installed",
  },
  examples: [
    { args: "mktg transcribe podcast.mp3 --json", description: "Transcribe local audio" },
    { args: "mktg transcribe https://youtube.com/watch?v=abc --json", description: "Transcribe YouTube video" },
    { args: "mktg transcribe talk.mp4 --fields transcript --json", description: "Get transcript text only" },
    { args: "mktg transcribe audio.wav --dry-run --json", description: "Preview execution plan" },
  ],
  vocabulary: ["transcribe", "transcript", "whisper", "audio", "video", "podcast", "youtube", "tiktok", "srt"],
};

type Parsed = {
  readonly source: string;
  readonly model: string;
  readonly language: string;
  readonly output: string;
  readonly summarize: boolean;
  readonly keepWav: boolean;
  readonly words: boolean;
  readonly threads: number;
  readonly confirm: boolean;
};

const parseFlags = (
  args: readonly string[],
  jsonInput: string | undefined,
): { ok: true; parsed: Parsed } | { ok: false; error: { message: string; suggestions: readonly string[] } } => {
  const positional: string[] = [];
  let model = DEFAULT_MODEL as string, language = "auto", output = ".";
  let summarize = false, keepWav = false, words = false, confirm = false;
  let threads = 4;

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!, next = args[i + 1];
    if (a === "--model" && next) { model = next; i++; continue; }
    if (a.startsWith("--model=")) { model = a.slice(8); continue; }
    if (a === "--language" && next) { language = next; i++; continue; }
    if (a.startsWith("--language=")) { language = a.slice(11); continue; }
    if (a === "--output" && next) { output = next; i++; continue; }
    if (a.startsWith("--output=")) { output = a.slice(9); continue; }
    if (a === "--threads" && next) { threads = Number(next); i++; continue; }
    if (a.startsWith("--threads=")) { threads = Number(a.slice(10)); continue; }
    if (a === "--summarize") { summarize = true; continue; }
    if (a === "--keep-wav") { keepWav = true; continue; }
    if (a === "--words") { words = true; continue; }
    if (a === "--confirm") { confirm = true; continue; }
    if (a.startsWith("-")) continue;
    positional.push(a);
  }

  let source = positional[0];

  // --input overrides positional / flags (raw payload input, Agent DX axis 2)
  if (jsonInput) {
    const parsed = parseJsonInput<Record<string, unknown>>(jsonInput);
    if (!parsed.ok) {
      return { ok: false, error: { message: `Invalid --input JSON: ${parsed.message}`, suggestions: ['Payload: {"source":"...","model":"small","language":"auto"}'] } };
    }
    const p = parsed.data;
    if (typeof p.source === "string") source = p.source;
    if (typeof p.model === "string") model = p.model;
    if (typeof p.language === "string") language = p.language;
    if (typeof p.output === "string") output = p.output;
    if (typeof p.summarize === "boolean") summarize = p.summarize;
    if (typeof p.keepWav === "boolean") keepWav = p.keepWav;
    if (typeof p.words === "boolean") words = p.words;
    if (typeof p.threads === "number") threads = p.threads;
  }

  if (!source) {
    return { ok: false, error: { message: "Missing source argument", suggestions: ["Usage: mktg transcribe <url|file>", "Or pass --input '{\"source\":\"...\"}'"] } };
  }

  // Input hardening — before anything that touches fs/network
  const cc = rejectControlChars(source, "source");
  if (!cc.ok) return { ok: false, error: { message: cc.message, suggestions: ["Remove control characters from the source argument"] } };
  const de = detectDoubleEncoding(source);
  if (!de.ok) return { ok: false, error: { message: de.message, suggestions: ["Pass a plain URL or file path, not URL-encoded"] } };

  // Validate model
  if (!(WHISPER_MODELS as readonly string[]).includes(model)) {
    return { ok: false, error: { message: `Unknown --model '${model}'`, suggestions: [`Valid: ${WHISPER_MODELS.join(", ")}`] } };
  }

  // Validate threads
  if (!Number.isFinite(threads) || threads < 1 || threads > 64) {
    return { ok: false, error: { message: `Invalid --threads: ${threads}`, suggestions: ["Use a positive integer ≤ 64"] } };
  }

  return { ok: true, parsed: { source, model, language, output, summarize, keepWav, words, threads, confirm } };
};

const runSummarize = async (transcript: string): Promise<{ ok: true; summary: string } | { ok: false; message: string }> => {
  const proc = Bun.spawn(["summarize"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(transcript);
  await proc.stdin.end();
  const [stdout, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  if (exitCode !== 0 || stdout.trim().length === 0) {
    return { ok: false, message: `summarize CLI exited ${exitCode} with ${stdout.trim().length} bytes` };
  }
  return { ok: true, summary: stdout.trim() };
};

export const handler: CommandHandler<TranscribeResult | DryRunResult> = async (args, flags) => {
  const startedAt = Date.now();

  const parseResult = parseFlags(args, flags.jsonInput);
  if (!parseResult.ok) return invalidArgs(parseResult.error.message, parseResult.error.suggestions);
  const p = parseResult.parsed;

  const detection = detectSource(p.source, flags.cwd);
  if (!detection.ok) {
    return invalidArgs(`Invalid source: ${detection.message}`, [
      "For URLs: pass a public https:// URL (YouTube, TikTok, podcast, or direct audio)",
      "For files: pass a relative path to a supported audio/video file",
    ]);
  }
  const det = detection.detection;
  const sourceType: SourceType = det.sourceType;
  const sourceUrl = det.kind === "url" ? det.url : det.path;

  const outDirCheck = sandboxPath(flags.cwd, p.output);
  if (!outDirCheck.ok) return invalidArgs(`Invalid --output directory: ${outDirCheck.message}`, ["Use a relative path inside the project"]);
  const outputDir = outDirCheck.path;

  if (flags.dryRun) {
    const steps: string[] = [];
    if (det.kind === "url") steps.push("download via yt-dlp");
    steps.push("clean audio via ffmpeg (silenceremove + dynaudnorm + afftdn, 16kHz mono pcm_s16le)");
    steps.push(`transcribe with whisper.cpp (model=${p.model}, language=${p.language}, threads=${p.threads})`);
    steps.push("parse SRT into structured segments");
    if (p.summarize) steps.push("pipe transcript through summarize CLI (if available)");
    if (!p.keepWav) steps.push("delete intermediate .wav");
    const estimated_size =
      det.kind === "file" && existsSync(det.path)
        ? `${Bun.file(det.path).size} bytes`
        : "unknown";
    return ok<DryRunResult>({
      action: "dry-run",
      source_type: sourceType,
      would_transcribe: sourceUrl,
      model: p.model,
      estimated_size,
      output_dir: outputDir,
      steps,
    });
  }

  const missing: { tool: string; fix: string }[] = [];
  if (!Bun.which("whisper-cli")) missing.push({ tool: "whisper-cli", fix: "brew install whisper-cpp (or build from github.com/ggml-org/whisper.cpp)" });
  if (!Bun.which("ffmpeg")) missing.push({ tool: "ffmpeg", fix: "brew install ffmpeg" });
  if (det.kind === "url" && !Bun.which("yt-dlp")) missing.push({ tool: "yt-dlp", fix: "brew install yt-dlp" });
  if (missing.length > 0) {
    return missingDep(missing[0]!.tool, [
      missing[0]!.fix, "Run `mktg doctor` to see all missing dependencies",
      ...missing.slice(1).map(m => `${m.tool}: ${m.fix}`),
    ]);
  }

  const modelPath = getModelPath(p.model);
  if (!existsSync(modelPath)) {
    return missingDep(`whisper model '${p.model}'`, [
      `Expected at ${modelPath}`,
      `Download: mkdir -p ~/.mktg/transcribe/models && curl -L -o ${modelPath} https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-${p.model}.bin`,
    ]);
  }

  await mkdir(outputDir, { recursive: true });
  const pipeline = await runTranscribePipeline({
    detection: det,
    outputDir,
    model: p.model,
    language: p.language,
    threads: p.threads,
    wordTimestamps: p.words,
    keepWav: p.keepWav,
  });
  if (!pipeline.ok) {
    if (pipeline.code === "dep") return missingDep(pipeline.message);
    if (pipeline.code === "network") return networkError(pipeline.message);
    return invalidArgs(`Transcription failed: ${pipeline.message}`, ["Check source accessibility", "Run `mktg doctor`"]);
  }
  const pr = pipeline.result;
  const warnings: string[] = [...pr.warnings];

  let summary: string | undefined;
  if (p.summarize) {
    if (!Bun.which("summarize")) warnings.push("--summarize: 'summarize' CLI not on PATH — skipping");
    else {
      const s = await runSummarize(pr.transcript);
      if (s.ok) summary = s.summary; else warnings.push(`summarize failed: ${s.message}`);
    }
  }

  return ok<TranscribeResult>({
    transcript: pr.transcript,
    segments: pr.segments,
    duration_seconds: pr.duration_seconds,
    language: p.language,
    source_type: sourceType,
    source_url: sourceUrl,
    model: p.model,
    files: pr.files,
    duration_ms: Date.now() - startedAt,
    warnings,
    ...(summary !== undefined && { summary }),
  });
};
