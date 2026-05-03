// mktg — transcribe core: source detection, whisper/yt-dlp/ffmpeg orchestration, SRT parsing.
// @attribution: crafter-station/trx (MIT, © 2026 Crafter Station, 836e7abf). See ATTRIBUTION.md.

import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { validatePublicUrl } from "./url-validation";
import { validatePathInput } from "./errors";

export type SourceType = "audio-file" | "video-file" | "youtube" | "tiktok" | "podcast" | "audio-url";
export type SourceDetection =
  | { readonly kind: "url"; readonly sourceType: SourceType; readonly url: string }
  | { readonly kind: "file"; readonly sourceType: SourceType; readonly path: string };
export type TranscribeSegment = { readonly start: number; readonly end: number; readonly text: string };

export const WHISPER_MODELS = [
  "tiny", "tiny.en", "base", "base.en", "small", "small.en",
  "medium", "medium.en", "large", "large-v3-turbo",
] as const;
export type WhisperModel = typeof WHISPER_MODELS[number];
export const DEFAULT_MODEL: WhisperModel = "small";
export const AUDIO_EXTENSIONS = [".mp3", ".m4a", ".wav", ".flac", ".ogg", ".opus"] as const;
export const VIDEO_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm", ".avi"] as const;

const YOUTUBE_HOSTS: ReadonlySet<string> = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be",
]);
const isUrl = (s: string): boolean => /^https?:\/\//i.test(s);

const classifyUrl = (url: string): SourceType => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (YOUTUBE_HOSTS.has(host)) return "youtube";
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
    const ext = extname(parsed.pathname).toLowerCase();
    if ((AUDIO_EXTENSIONS as readonly string[]).includes(ext)) return "podcast";
    return "audio-url";
  } catch {
    return "audio-url";
  }
};

const classifyFile = (path: string): SourceType | null => {
  const ext = extname(path).toLowerCase();
  if ((AUDIO_EXTENSIONS as readonly string[]).includes(ext)) return "audio-file";
  if ((VIDEO_EXTENSIONS as readonly string[]).includes(ext)) return "video-file";
  return null;
};

export const detectSource = (
  source: string,
  cwd: string,
): { ok: true; detection: SourceDetection } | { ok: false; message: string } => {
  if (isUrl(source)) {
    const valid = validatePublicUrl(source);
    if (!valid.ok) return { ok: false, message: valid.message };
    return {
      ok: true,
      detection: { kind: "url", sourceType: classifyUrl(valid.url), url: valid.url },
    };
  }

  const pathCheck = validatePathInput(cwd, source);
  if (!pathCheck.ok) return { ok: false, message: pathCheck.message };

  const sourceType = classifyFile(pathCheck.path);
  if (!sourceType) {
    const all = [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS];
    return {
      ok: false,
      message: `Unsupported file extension '${extname(pathCheck.path)}'. Supported: ${all.join(", ")}`,
    };
  }
  if (!existsSync(pathCheck.path)) {
    return { ok: false, message: `File not found: ${source}` };
  }
  return { ok: true, detection: { kind: "file", sourceType, path: pathCheck.path } };
};
export const getModelPath = (model: string): string =>
  join(homedir(), ".mktg", "transcribe", "models", `ggml-${model}.bin`);

const srtTimeToSeconds = (ts: string): number => {
  const match = ts.match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!match) return 0;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
};

export const parseSrt = (srt: string): TranscribeSegment[] => {
  const segments: TranscribeSegment[] = [];
  for (const block of srt.split(/\n\s*\n/)) {
    const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) continue;
    const timingIdx = /^\d+$/.test(lines[0]!) ? 1 : 0;
    const timing = lines[timingIdx];
    if (!timing || !timing.includes("-->")) continue;
    const [startStr, endStr] = timing.split("-->").map(s => s.trim());
    if (!startStr || !endStr) continue;
    const textLines = lines.slice(timingIdx + 1);
    if (textLines.length === 0) continue;
    segments.push({
      start: srtTimeToSeconds(startStr),
      end: srtTimeToSeconds(endStr),
      text: textLines.join(" ").trim(),
    });
  }
  return segments;
};

export const segmentsToText = (segments: readonly TranscribeSegment[]): string =>
  segments.map(s => s.text).join("\n");

type SpawnResult = { readonly exitCode: number; readonly stdout: string; readonly stderr: string };

const runSpawn = async (cmd: readonly string[]): Promise<SpawnResult> => {
  const proc = Bun.spawn([...cmd], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  return { exitCode: await proc.exited, stdout: stdout.trim(), stderr: stderr.trim() };
};
// ffmpeg audio cleaning (filter chain verbatim from trx/core/audio.ts)
export const cleanAudio = async (
  inputPath: string,
  outputPath: string,
): Promise<{ ok: true } | { ok: false; message: string }> => {
  const result = await runSpawn([
    "ffmpeg",
    "-i", inputPath,
    "-af", "silenceremove=stop_periods=-1:stop_duration=1:stop_threshold=-40dB,dynaudnorm,afftdn=nf=-25",
    "-ar", "16000",
    "-ac", "1",
    "-c:a", "pcm_s16le",
    outputPath,
    "-y",
  ]);
  if (result.exitCode !== 0) {
    return { ok: false, message: `ffmpeg failed (exit ${result.exitCode}): ${result.stderr || result.stdout}` };
  }
  return { ok: true };
};

// yt-dlp download (keeps glob fallback from trx/core/download.ts)
export const downloadMedia = async (
  url: string,
  outputDir: string,
): Promise<{ ok: true; filePath: string } | { ok: false; message: string }> => {
  const base = `mktg-${Date.now()}`;
  const tmpl = `${outputDir}/${base}.%(ext)s`;
  const result = await runSpawn([
    "yt-dlp", "--no-playlist", "-o", tmpl, "--print", "after_move:filepath", url,
  ]);
  if (result.exitCode !== 0) {
    return { ok: false, message: `yt-dlp failed: ${result.stderr || result.stdout}` };
  }
  const reported = result.stdout.split("\n").pop()?.trim();
  if (reported && existsSync(reported)) return { ok: true, filePath: reported };
  // Glob fallback — yt-dlp sometimes renames the file during post-processing
  const glob = new Bun.Glob(`${base}.*`);
  for await (const file of glob.scan({ cwd: outputDir })) {
    return { ok: true, filePath: `${outputDir}/${file}` };
  }
  return { ok: false, message: `yt-dlp completed but no file found. stdout: ${result.stdout}` };
};

// whisper-cli invocation (tuned flags from trx/core/whisper.ts)
export type WhisperRunOptions = {
  readonly modelPath: string;
  readonly language: string;
  readonly threads: number;
  readonly wordTimestamps: boolean;
};

export const runWhisper = async (
  wavPath: string,
  opts: WhisperRunOptions,
): Promise<{ ok: true; srtPath: string; srt: string } | { ok: false; modelMissing?: boolean; message: string }> => {
  if (!existsSync(opts.modelPath)) {
    return { ok: false, modelMissing: true, message: `Whisper model not found at ${opts.modelPath}` };
  }
  const args = [
    "whisper-cli",
    "-m", opts.modelPath,
    "-f", wavPath,
    "-t", String(opts.threads),
    "--max-len", opts.wordTimestamps ? "1" : "0",
    "--output-srt",
    "--suppress-nst",
    "--no-fallback",
    "--max-context", "0",
    "--entropy-thold", "2.8",
    "--logprob-thold", "-1.0",
  ];
  if (opts.language !== "auto") args.push("--language", opts.language);

  const result = await runSpawn(args);
  if (result.exitCode !== 0) {
    return { ok: false, message: `whisper-cli failed (exit ${result.exitCode}): ${result.stderr || result.stdout}` };
  }
  const srtPath = `${wavPath}.srt`;
  if (!existsSync(srtPath)) {
    return { ok: false, message: `whisper-cli completed but no SRT at ${srtPath}` };
  }
  const srt = await Bun.file(srtPath).text();
  return { ok: true, srtPath, srt };
};

// Pipeline orchestrator (ported from trx/core/pipeline.ts)
export type PipelineOptions = {
  readonly detection: SourceDetection;
  readonly outputDir: string;
  readonly model: string;
  readonly language: string;
  readonly threads: number;
  readonly wordTimestamps: boolean;
  readonly keepWav: boolean;
};

export type PipelineResult = {
  readonly transcript: string;
  readonly segments: readonly TranscribeSegment[];
  readonly duration_seconds: number;
  readonly files: { readonly wav: string | null; readonly srt: string; readonly txt: string };
  readonly warnings: readonly string[];
};

export type PipelineFailure = {
  readonly ok: false;
  readonly code: "dep" | "network" | "exec";
  readonly message: string;
};

export const runTranscribePipeline = async (
  opts: PipelineOptions,
): Promise<{ ok: true; result: PipelineResult } | PipelineFailure> => {
  const warnings: string[] = [];

  // 1. Resolve input file (download if URL)
  let inputFile: string;
  if (opts.detection.kind === "url") {
    const dl = await downloadMedia(opts.detection.url, opts.outputDir);
    if (!dl.ok) return { ok: false, code: "network", message: dl.message };
    inputFile = dl.filePath;
  } else {
    inputFile = opts.detection.path;
  }

  // 2. Clean audio to 16kHz mono wav
  const name = basename(inputFile).replace(/\.[^.]+$/, "");
  let wavPath = resolve(opts.outputDir, `${name}.wav`);
  if (wavPath === resolve(inputFile)) {
    wavPath = resolve(opts.outputDir, `${name}_clean.wav`);
  }
  const clean = await cleanAudio(inputFile, wavPath);
  if (!clean.ok) return { ok: false, code: "exec", message: clean.message };

  // 3. Run whisper
  const whisper = await runWhisper(wavPath, {
    modelPath: getModelPath(opts.model),
    language: opts.language,
    threads: opts.threads,
    wordTimestamps: opts.wordTimestamps,
  });
  if (!whisper.ok) {
    return { ok: false, code: whisper.modelMissing ? "dep" : "exec", message: whisper.message };
  }

  // 4. Parse SRT into structured segments + plain text
  const segments = parseSrt(whisper.srt);
  const transcript = segmentsToText(segments);
  const duration_seconds = segments.length > 0 ? segments[segments.length - 1]!.end : 0;

  // 5. Write .txt (mirrors trx behavior so source-digestion flows have an on-disk reference)
  const txtPath = wavPath.replace(/\.wav$/, ".txt");
  await Bun.write(txtPath, transcript);

  // 6. Delete intermediate wav unless --keep-wav
  let wavResult: string | null = wavPath;
  if (!opts.keepWav) {
    try {
      await unlink(wavPath);
      wavResult = null;
    } catch (e) {
      warnings.push(`Failed to delete intermediate wav: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    ok: true,
    result: {
      transcript,
      segments,
      duration_seconds,
      files: { wav: wavResult, srt: whisper.srtPath, txt: txtPath },
      warnings,
    },
  };
};
