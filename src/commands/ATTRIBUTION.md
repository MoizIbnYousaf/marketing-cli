# Command Attribution

## `mktg transcribe`

**Upstream:** [`crafter-station/trx`](https://github.com/crafter-station/trx)
**License:** MIT (Copyright © 2026 Crafter Station)
**Commit studied:** `836e7abf` (v0.4.0, 2026-04-06)
**Ported by:** mktg maintainers, 2026-04-12
**Research memo:** [`docs/research/trx-analysis.md`](../../docs/research/trx-analysis.md)

### What was ported

`src/core/transcribe.ts` ports the following files from trx:

| trx file | mktg counterpart | Notes |
|---|---|---|
| `packages/cli/src/core/pipeline.ts` | `runTranscribePipeline()` in `src/core/transcribe.ts` | Three-stage orchestrator: download → clean → transcribe. OpenAI backend dropped for v1. |
| `packages/cli/src/core/audio.ts` | `cleanAudio()` in `src/core/transcribe.ts` | ffmpeg filter chain kept verbatim (`silenceremove,dynaudnorm,afftdn`) — it is tuned. |
| `packages/cli/src/core/download.ts` | `downloadMedia()` in `src/core/transcribe.ts` | yt-dlp wrapper with glob-based extension-mismatch fallback kept. |
| `packages/cli/src/core/whisper.ts` | `runWhisper()` in `src/core/transcribe.ts` | whisper-cli argv, including the tuned quality flags (`--suppress-nst`, `--no-fallback`, `--entropy-thold 2.8`, `--logprob-thold -1.0`). |
| `packages/cli/src/utils/spawn.ts` | `runSpawn()` in `src/core/transcribe.ts` | Simplified — mktg does not need `spawnStreaming` for v1. |
| `packages/cli/src/validation/input.ts` | Subset: `WHISPER_MODELS` constant | `validateInput`/`validateUrl`/`validateFilePath` are replaced with mktg's existing `src/core/errors.ts` and `src/core/url-validation.ts` helpers. |
| `packages/cli/schemas/transcribe.json` | `schema` export in `src/commands/transcribe.ts` | Hand-translated into mktg's `CommandSchema` shape. |
| `packages/cli/src/commands/transcribe.ts` | `handler` export in `src/commands/transcribe.ts` | Rewritten to mktg's `CommandResult<T>` pattern; `commander` + `@clack/prompts` dropped (agent-only, no TTY UX). |

### What was NOT ported

- `packages/cli/src/core/openai.ts` — OpenAI backend. v1 is local whisper.cpp only.
- `packages/cli/src/commands/init.ts` — Platform-specific installer. mktg uses `mktg doctor` for install guidance instead.
- `packages/cli/src/utils/output.ts` — mktg's `src/core/output.ts` is strictly more capable (dot-notation `--fields`, 10KB warning, etc.).
- `packages/cli/src/utils/config.ts` — persistent `~/.trx/config.json`. v1 is flags-only; no persistent config.
- `commander`, `@clack/prompts` — mktg owns its CLI router and is agent-only (no interactive prompts or spinners).
- `packages/website/**` — trx's marketing site. Irrelevant.

### Behavioral differences from trx

1. **Response shape.** trx returns `{success, input, backend, files, metadata, text}`; mktg returns `{data: {transcript, segments, duration_seconds, language, source_type, source_url, model, files, summary?}, metadata: {command, duration_ms, warnings}}`. The `segments[]` array is mktg-specific — we parse the SRT into structured `{start, end, text}` segments so source-digestion workflows can cite timestamped moments.
2. **Default model.** trx defaults to `small`. mktg also defaults to `small` based on internal quality testing.
3. **Intermediate .wav handling.** trx keeps the cleaned wav around. mktg deletes it by default; `--keep-wav` opts back in.
4. **Backends.** trx supports `local` and `openai`. mktg v1 is local-only; the `--backend` flag is omitted.
5. **Validators.** trx has its own `rejectControlChars`/`validateUrl`/`validateFilePath`; mktg uses its existing hardened validators from `src/core/errors.ts` and `src/core/url-validation.ts` (SSRF-blocking, double-encoding detection, path traversal).

### MIT license preservation

```
MIT License

Copyright (c) 2026 Crafter Station

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

The full trx license should be verified from the upstream repository before changing the port. This MIT-on-MIT port is fully compatible with mktg's license.
