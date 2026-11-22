# mktg transcribe

Transcribe audio and video from any source — YouTube, TikTok, podcasts, local files — using [whisper.cpp](https://github.com/ggml-org/whisper.cpp). Returns structured JSON with full transcript, timestamped segments, and optional summary.

## Quick start

```bash
# Local audio file
mktg transcribe podcast.mp3 --json

# YouTube video
mktg transcribe https://www.youtube.com/watch?v=abc --json

# TikTok
mktg transcribe https://www.tiktok.com/@user/video/123 --json

# Get just the transcript text (context-window discipline)
mktg transcribe talk.mp4 --fields transcript --json

# Preview the pipeline without executing
mktg transcribe recording.wav --dry-run --json
```

## Usage

```
mktg transcribe <source> [flags]
```

### Source types

| Source | Detection | Requires |
|---|---|---|
| Local audio (.mp3, .m4a, .wav, .flac, .ogg, .opus) | File extension | ffmpeg, whisper-cli |
| Local video (.mp4, .mov, .mkv, .webm, .avi) | File extension | ffmpeg, whisper-cli |
| YouTube URL | `youtube.com` or `youtu.be` hostname | yt-dlp, ffmpeg, whisper-cli |
| TikTok URL | `tiktok.com` hostname | yt-dlp, ffmpeg, whisper-cli |
| Podcast (direct audio URL) | URL ending in audio extension | yt-dlp, ffmpeg, whisper-cli |
| Direct audio URL | Any other public https URL | yt-dlp, ffmpeg, whisper-cli |

### Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--model` | string | `small` | Whisper model: tiny, base, small, medium, large, large-v3-turbo (+ `.en` variants) |
| `--language` | string | `auto` | ISO 639-1 code or `auto` for detection |
| `--output` | string | `.` | Output directory for .srt/.txt files (relative to --cwd) |
| `--summarize` | boolean | false | Pipe transcript through `summarize` CLI if installed |
| `--keep-wav` | boolean | false | Keep intermediate cleaned .wav (default: delete after transcription) |
| `--words` | boolean | false | Word-level timestamps in SRT (increases output size) |
| `--threads` | string | `4` | Thread count for whisper-cli |
| `--confirm` | boolean | false | Allow overwriting output files that already exist (see [Overwrite guard](#overwrite-guard)) |

Global flags `--json`, `--dry-run`, `--fields`, `--cwd`, `--input` all work as documented in `mktg --help`.

## Response shape

```json
{
  "transcript": "Full transcript text...",
  "segments": [
    { "start": 0.0, "end": 3.5, "text": "Hello and welcome to..." },
    { "start": 3.5, "end": 7.2, "text": "Today we're discussing..." }
  ],
  "duration_seconds": 1842.5,
  "language": "auto",
  "source_type": "youtube",
  "source_url": "https://www.youtube.com/watch?v=abc",
  "model": "small",
  "files": {
    "wav": null,
    "srt": "/path/to/output/video.wav.srt",
    "txt": "/path/to/output/video.txt"
  },
  "duration_ms": 45230,
  "warnings": [],
  "summary": "Optional summary when --summarize is set"
}
```

### `--dry-run` response

```json
{
  "action": "dry-run",
  "source_type": "youtube",
  "would_transcribe": "https://www.youtube.com/watch?v=abc",
  "model": "small",
  "estimated_size": "unknown",
  "output_dir": "/path/to/project",
  "would_overwrite": [],
  "steps": [
    "download via yt-dlp",
    "clean audio via ffmpeg (silenceremove + dynaudnorm + afftdn, 16kHz mono pcm_s16le)",
    "transcribe with whisper.cpp (model=small, language=auto, threads=4)",
    "parse SRT into structured segments",
    "delete intermediate .wav"
  ]
}
```

`would_overwrite` lists the existing files a real run would replace. A real run refuses them unless `--confirm` is passed (see [Overwrite guard](#overwrite-guard)).

## Overwrite guard

For a local file `<name>.<ext>`, a run writes three paths inside `--output`:

- `<name>.wav`: the cleaned audio (ffmpeg overwrites it, then it is deleted unless `--keep-wav`). If that path is the source file itself, this becomes `<name>_clean.wav`. Identity is compared, not spelling, so `Tone.WAV` on a case-insensitive filesystem (the macOS default) also gets `Tone_clean.wav`.
- `<name>.wav.srt` (or `<name>_clean.wav.srt`): whisper-cli's SRT.
- `<name>.txt` (or `<name>_clean.txt`): the plain-text transcript.

If any of these already exists as a file and `--confirm` is not passed, the command exits 2 (`INVALID_ARGS`), names the files, and writes nothing. Pass `--confirm` (or `"confirm": true` in `--input`) to overwrite them, or choose another `--output`. `--dry-run` does not refuse these; it reports them in `would_overwrite`. `--confirm` takes no value: `--confirm=true` is rejected with exit 2.

If any of these paths is a symlink (dangling or not), the source file itself, or cannot be inspected, the command exits 2 in every mode, `--confirm` and `--dry-run` included, because writing there would land outside `--output` or destroy the input. Remove or rename the path, or choose another `--output`.

Both checks run before any dependency check, so they apply whether or not whisper-cli, ffmpeg or yt-dlp are installed.

URL sources are downloaded to a fresh `mktg-<timestamp>.<ext>` name, so their outputs never collide with existing files and `would_overwrite` is always empty for them. The downloaded media file is left in `--output` after the run.

## Dependencies

Three CLI tools, none bundled — `mktg doctor` detects them:

| Tool | Purpose | Install |
|---|---|---|
| `whisper-cli` | Speech-to-text engine (whisper.cpp binary) | `brew install whisper-cpp` or build from [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp) |
| `ffmpeg` | Audio extraction, cleaning, resampling to 16kHz mono wav | `brew install ffmpeg` |
| `yt-dlp` | Download from YouTube, TikTok, podcasts, any URL | `brew install yt-dlp` |

### Model files

Whisper models are stored at `~/.mktg/transcribe/models/ggml-<model>.bin`. Download the model you want:

```bash
mkdir -p ~/.mktg/transcribe/models
curl -L -o ~/.mktg/transcribe/models/ggml-small.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
```

Model sizes: tiny (~75MB), base (~142MB), small (~466MB), medium (~1.5GB), large (~3GB).

Default model is `small` — the whisper.cpp sweet spot for quality vs speed. Use `--model tiny` in agent loops where latency matters more than accuracy.

## Pipeline

The command runs a three-stage pipeline ported from [crafter-station/trx](https://github.com/crafter-station/trx):

1. **Download** (URLs only) — `yt-dlp` fetches the media file
2. **Clean** — `ffmpeg` resamples to 16kHz mono wav with noise reduction (`silenceremove + dynaudnorm + afftdn`)
3. **Transcribe** — `whisper-cli` produces an SRT file, which is parsed into structured `segments[]`

The intermediate `.wav` is deleted by default (pass `--keep-wav` to retain).

## Exit codes

| Code | Meaning | When |
|---|---|---|
| 0 | Success | Transcript produced |
| 2 | Invalid args | Bad source, unsupported extension, invalid model/language, SSRF-blocked URL, output files already exist without `--confirm`, an output path is a symlink or the source itself, a boolean flag given a value (`--confirm=true`) |
| 3 | Missing dependency | whisper-cli, ffmpeg, or yt-dlp not on PATH; model file not downloaded |
| 5 | Network error | yt-dlp download failed |

## Security

- **SSRF protection:** URLs are validated via `validatePublicUrl()` — loopback, RFC1918, link-local (169.254.x.x), CGNAT, and non-http schemes are rejected before any network call
- **Path sandboxing:** Local file paths are sandboxed to `--cwd` via `sandboxPath()` — absolute paths, `..` traversal, and symlink escapes are blocked
- **Input hardening:** Control characters and URL-encoded path components (`%2e`, `%2f`, `%5c`) are rejected upfront
- **`--output` sandboxed:** Output directory must stay within `--cwd`

## Attribution

Core transcription logic ported from [crafter-station/trx](https://github.com/crafter-station/trx) (MIT, © 2026 Crafter Station). See `src/commands/ATTRIBUTION.md` for the full port map.
