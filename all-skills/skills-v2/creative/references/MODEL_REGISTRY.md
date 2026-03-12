# Model Registry — Vibe Marketing Skills v2

**Single source of truth for all AI model configurations used in the creative engine.**

Every payload in this document has been verified against the Replicate API. If you are building prompts, making API calls, or debugging failures — this is the file you check first.

Last verified: 2026-02-18. Models change. If a call fails, check `replicate.com/[owner]/[model]` for the current schema.

---

## Table of Contents

1. [Image Generation](#image-generation)
2. [Video Generation](#video-generation)
3. [Lip-Sync](#lip-sync)
4. [Model Selection Logic](#model-selection-logic)
5. [Cost Reference](#cost-reference)
6. [Troubleshooting](#troubleshooting)

---

## API Workflow — How to Call Replicate

Every Replicate API call follows the same async pattern. This is the actual HTTP workflow.

### Step 1: Create a Prediction

```bash
curl -s -X POST "https://api.replicate.com/v1/models/{owner}/{model}/predictions" \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"input": { ...model-specific parameters... }}'
```

The model path goes in the **URL** (e.g., `google/nano-banana-pro`). The body only contains `{"input": {...}}`. Do NOT put `model`, `model_owner`, or `model_name` in the body.

**Response** (HTTP 201):
```json
{
  "id": "abc123xyz",
  "status": "starting",
  "urls": {
    "get": "https://api.replicate.com/v1/predictions/abc123xyz"
  }
}
```

### Step 2: Poll for Completion

```bash
curl -s "https://api.replicate.com/v1/predictions/{id}" \
  -H "Authorization: Bearer $REPLICATE_API_TOKEN"
```

Poll every 5 seconds (images) or 10 seconds (video). Check the `"status"` field:

| Status | Meaning | Action |
|--------|---------|--------|
| `"starting"` | Queued | Keep polling |
| `"processing"` | Generating | Keep polling |
| `"succeeded"` | Done | Read `"output"` field |
| `"failed"` | Error | Read `"error"` field |

### Step 3: Get the Output

When `"status": "succeeded"`, the `"output"` field contains the result URL(s).

**CRITICAL: Output URLs expire in 1 hour.** Download or save the file immediately. After 1 hour, the URL returns 404.

### Error Reference

| HTTP Code | Meaning | Fix |
|-----------|---------|-----|
| 401 | Invalid or missing `REPLICATE_API_TOKEN` | Check your token |
| 404 | Model not found | Check model ID in URL matches this registry |
| 422 | Invalid parameter | Check parameter names and types for this specific model |
| 429 | Rate limited | Wait 60 seconds, retry |

If `"status": "failed"` with no useful error, check the [Replicate dashboard](https://replicate.com/predictions) for detailed logs.

---

## Image Generation

### Default Model: Nano Banana Pro

| Field | Value |
|-------|-------|
| **Model ID** | `google/nano-banana-pro` |
| **Underlying Model** | Google Gemini 2.5 Flash Image ("nano-banana") |
| **Why Default** | Best-in-class typography, photorealism, and style control. Handles product photos, social graphics, text rendering, and artistic styles in one model. Generates at 2-3x the speed of comparable models. |
| **Typical Latency** | 15-40 seconds |
| **Cost** | ~$0.02-0.04 per image |

### Verified API Payload

```json
{
  "model": "google/nano-banana-pro",
  "input": {
    "prompt": "{{prompt}}",
    "aspect_ratio": "{{ratio}}",
    "output_format": "jpg",
    "resolution": "2K"
  }
}
```

### Parameter Reference

| Parameter | Type | Required | Default | Options / Range | Notes |
|-----------|------|----------|---------|-----------------|-------|
| `prompt` | string | **Yes** | — | Free text | The image description. Be specific. See VISUAL_INTELLIGENCE.md for prompt construction guidance. |
| `aspect_ratio` | string | No | `"match_input_image"` | `"1:1"`, `"16:9"`, `"9:16"`, `"4:3"`, `"3:4"`, `"3:2"`, `"2:3"`, `"4:5"`, `"5:4"`, `"21:9"`, `"match_input_image"` | Controls output dimensions. Defaults to matching input image ratio if `image_input` is provided. See aspect ratio table below. |
| `output_format` | string | No | `"jpg"` | `"png"`, `"jpg"`, `"webp"` | JPG is default. PNG for quality/transparency. WebP for web delivery. |
| `resolution` | string | No | `"2K"` | `"1K"`, `"2K"` | Output resolution tier. 2K produces higher-quality images. |
| `image_input` | array | No | `[]` | Up to 14 image URLs | Input images for editing, style transfer, or reference. Supports up to 14 images in a single call. |
| `safety_filter_level` | string | No | `"block_only_high"` | `"block_low_and_above"`, `"block_medium_and_above"`, `"block_only_high"` | Content safety filter. `block_only_high` is most permissive. Do not change unless you have a specific reason. |

### Aspect Ratio Quick Reference

| Ratio | Orientation | Best For | Platform Examples |
|-------|-------------|----------|-------------------|
| `1:1` | Square | Product shots, Instagram feed, LinkedIn, profile images | Instagram posts, Facebook, LinkedIn |
| `16:9` | Landscape | Hero banners, YouTube thumbnails, web headers, presentations | YouTube, website heroes, OG images |
| `9:16` | Portrait tall | Stories, Reels, TikTok, vertical ads | Instagram Stories, TikTok, Snapchat |
| `4:3` | Landscape | Blog images, slide decks, classic photo format | Blog posts, PowerPoint |
| `3:4` | Portrait | Pinterest pins, portrait photos | Pinterest, portrait displays |
| `3:2` | Landscape | Classic photography, print | DSLR standard, print media |
| `2:3` | Portrait | Posters, magazine covers, tall pins | Print posters, Pinterest |
| `4:5` | Portrait | Instagram feed (maximum height), Facebook ads | Instagram feed optimal, Facebook |
| `5:4` | Landscape | Wider product photos | Product catalogs |
| `21:9` | Ultrawide | Cinematic headers, ultrawide displays | Website hero sections, cinematic banners |

### Common Mistakes — Image Generation

1. **Do NOT use `width` / `height` parameters.** They are not supported. Use `aspect_ratio` only. The model calculates pixel dimensions internally based on the ratio and its `resolution` tier.

2. **Do NOT pass `negative_prompt`.** This parameter does not exist on Nano Banana Pro. To avoid unwanted elements, use explicit positive language in the prompt: say what you want, not what you do not want.

3. **`image_input` is an array, not a string.** Even for a single reference image, wrap it in an array: `"image_input": ["https://..."]`. Supports up to 14 images for multi-reference generation.

4. **The model owner changed from `fofr` to `google`.** The model ID is `google/nano-banana-pro`. The old `fofr/nano-banana-pro` endpoint returns 404.

5. **Do NOT exceed aspect ratio options.** The supported set is fixed. Passing `"2:1"` or `"1:2"` or pixel dimensions will cause an error or unpredictable behavior.

6. **`output_format` defaults to `"jpg"`, not `"png"`.** If you need transparency, explicitly set `"png"`.

7. **JSON prompt escaping.** Prompts that contain quotes must be escaped (`\"`) in the JSON body. Prefer single quotes inside prompts or avoid special characters.

---

## Video Generation

### Default Model: Kling 2.5 Turbo Pro

| Field | Value |
|-------|-------|
| **Model ID** | `kwaivgi/kling-v2.5-turbo-pro` |
| **Why Default** | Best motion control, cinematic depth, and consistent quality at reasonable speed. Strong prompt adherence. Supports both text-to-video and image-to-video. |
| **Typical Latency** | 2-5 minutes (5s clip), 4-8 minutes (10s clip) |
| **Cost** | ~$0.40 per 5s clip, ~$0.80 per 10s clip |

### Verified API Payload — Image-to-Video (I2V)

```json
{
  "model": "kwaivgi/kling-v2.5-turbo-pro",
  "input": {
    "prompt": "{{motion_description}}",
    "start_image": "{{image_url}}",
    "duration": 5,
    "aspect_ratio": "16:9"
  }
}
```

### Verified API Payload — Text-to-Video (T2V)

```json
{
  "model": "kwaivgi/kling-v2.5-turbo-pro",
  "input": {
    "prompt": "{{video_description}}",
    "duration": 5,
    "aspect_ratio": "16:9"
  }
}
```

### Parameter Reference — Kling 2.5

| Parameter | Type | Required | Default | Options / Range | Notes |
|-----------|------|----------|---------|-----------------|-------|
| `prompt` | string | **Yes** | — | Max 2500 characters | Describe the motion and scene. For I2V, describe what should happen in the video, not the image content. |
| `start_image` | string (URI) | No | — | Image URL | Starting frame for image-to-video. When provided, `aspect_ratio` is overridden by the image dimensions. Preferred over `image`. |
| `image` | string (URI) | No | — | Image URL | Alias for `start_image`. Either works; prefer `start_image` for clarity. |
| `end_image` | string (URI) | No | — | Image URL | Target final frame. Creates interpolation between start and end. Only works in pro mode. |
| `duration` | integer | No | `5` | `5`, `10` | Video length in seconds. 10s costs roughly 2x. |
| `aspect_ratio` | string | No | `"16:9"` | `"16:9"`, `"9:16"`, `"1:1"` | Ignored when `start_image` is provided. |
| `negative_prompt` | string | No | — | Free text | Elements to exclude from the video. Unlike Nano Banana Pro, this model DOES support negative prompts. |

### Common Mistakes — Kling 2.5

1. **Use `start_image` for the starting frame.** Both `start_image` and `image` work, but `start_image` is the canonical parameter name. Use it for consistency.

2. **When providing `start_image`, the `aspect_ratio` parameter is ignored.** The video inherits its aspect ratio from the input image. If you need a specific ratio, resize the image first.

3. **Duration is an integer, not a string.** Pass `5` not `"5"`. Only 5 and 10 are supported. Passing other values will error.

4. **`guidance_scale` has been removed.** This parameter no longer exists in the API. Remove it from any existing payloads.

5. **Do NOT describe the static scene in the prompt for I2V.** The model can see the start_image. Describe the MOTION: "camera slowly orbits right, product rotates to reveal label" not "a bottle of wine on a table."

---

### Production Model: Kling 2.6

| Field | Value |
|-------|-------|
| **Model ID** | `kwaivgi/kling-v2.6` |
| **Why Use** | Best quality-to-cost ratio for production video. Replaces Kling 2.5 as the go-to for final renders. Native audio support. |
| **Typical Latency** | ~60 seconds |
| **Cost** | ~$0.07/sec (no audio), ~$0.14/sec (with audio) |

### Verified API Payload — Kling 2.6 I2V

```json
{
  "model": "kwaivgi/kling-v2.6",
  "input": {
    "prompt": "{{motion_description}}",
    "negative_prompt": "blurry, low quality, distorted, watermark, text overlay",
    "start_image": "{{image_url}}",
    "duration": 5,
    "aspect_ratio": "16:9"
  }
}
```

### Parameter Reference — Kling 2.6

| Parameter | Type | Required | Default | Options / Range | Notes |
|-----------|------|----------|---------|-----------------|-------|
| `prompt` | string | **Yes** | — | Free text | Describe the motion. For I2V, describe what should happen, not what's in the image. |
| `start_image` | string (URI) | No | — | Image URL | Starting frame for I2V. Aspect ratio is inherited from image when provided. |
| `duration` | integer | No | `5` | `5`, `10` | Video length in seconds. |
| `aspect_ratio` | string | No | `"16:9"` | `"16:9"`, `"9:16"`, `"1:1"` | Ignored when `start_image` is provided. |
| `negative_prompt` | string | No | — | Free text | Elements to exclude. |
| `generate_audio` | boolean | No | `false` | `true`, `false` | Native audio generation. Doubles cost when enabled. |

### Common Mistakes — Kling 2.6

1. **Same parameter names as Kling 2.5.** `start_image`, `duration`, `aspect_ratio` — identical API surface.
2. **`guidance_scale` does NOT exist.** Removed from the API. Do not include it.
3. **Audio doubles the cost.** Only enable `generate_audio` when you actually need sound.

---

### Testing Model: Wan 2.2 I2V Fast

| Field | Value |
|-------|-------|
| **Model ID** | `wan-video/wan-2.2-i2v-fast` |
| **Why Use** | Cheapest video generation. Use for rapid variant testing — generate 5-10 options at $0.05 each, pick winners, regenerate with Kling 2.6. |
| **Typical Latency** | ~20 seconds |
| **Cost** | ~$0.05/video (480p) |

### Verified API Payload — Wan 2.2 I2V Fast

```json
{
  "model": "wan-video/wan-2.2-i2v-fast",
  "input": {
    "prompt": "{{motion_description}}",
    "image": "{{image_url}}",
    "resolution": "480p",
    "num_frames": 81,
    "go_fast": true
  }
}
```

### Parameter Reference — Wan 2.2 I2V

| Parameter | Type | Required | Default | Options / Range | Notes |
|-----------|------|----------|---------|-----------------|-------|
| `prompt` | string | **Yes** | — | Free text | Motion description. |
| `image` | string (URI) | **Yes** | — | Image URL | Starting frame. Parameter name is `image`, not `start_image`. |
| `resolution` | string | No | `"480p"` | `"480p"`, `"720p"` | 480p for testing, 720p for slightly better quality. |
| `num_frames` | integer | No | `81` | 17-81 | 81 frames = best quality. Higher frames = worse per-frame quality. |
| `go_fast` | boolean | No | `true` | `true`, `false` | `true` for testing speed, `false` for final quality at same price. |

### Common Mistakes — Wan 2.2

1. **Starting image parameter is `image`, NOT `start_image`.** Different from Kling.
2. **Duration is set via `num_frames`, NOT `duration`.** 81 frames ≈ 3 seconds at default FPS.
3. **This is 480p output.** Use for testing direction only, then regenerate winners with a production model.
4. **No negative prompt parameter.** Use positive prompting only.

---

### Testing Model: Wan 2.2 T2V Fast

| Field | Value |
|-------|-------|
| **Model ID** | `wan-video/wan-2.2-t2v-fast` |
| **Why Use** | Cheap text-to-video drafts when you don't have a starting image. Same $0.05 price as I2V variant. |
| **Typical Latency** | ~20 seconds |
| **Cost** | ~$0.05/video (480p) |

### Verified API Payload — Wan 2.2 T2V Fast

```json
{
  "model": "wan-video/wan-2.2-t2v-fast",
  "input": {
    "prompt": "{{video_description}}",
    "resolution": "480p",
    "num_frames": 81,
    "go_fast": true
  }
}
```

---

### Mid-Tier Model: Seedance 1 Pro

| Field | Value |
|-------|-------|
| **Model ID** | `bytedance/seedance-1-pro` |
| **Why Use** | Budget 1080p with camera control. `camera_fixed: true` locks the camera for clean product shots. Good middle ground between Wan testing and Kling production. |
| **Typical Latency** | ~60 seconds |
| **Cost** | ~$0.03-0.15/sec |

### Verified API Payload — Seedance 1 Pro I2V

```json
{
  "model": "bytedance/seedance-1-pro",
  "input": {
    "prompt": "{{motion_description}}",
    "image": "{{image_url}}",
    "duration": 5,
    "resolution": "1080p",
    "aspect_ratio": "9:16",
    "camera_fixed": true
  }
}
```

### Parameter Reference — Seedance 1 Pro

| Parameter | Type | Required | Default | Options / Range | Notes |
|-----------|------|----------|---------|-----------------|-------|
| `prompt` | string | **Yes** | — | Free text | Motion description. |
| `image` | string (URI) | No | — | Image URL | Starting frame. Parameter name is `image`. |
| `duration` | integer | No | `5` | 2-12 | Video length in seconds. More flexible range than other models. |
| `resolution` | string | No | `"1080p"` | `"480p"`, `"720p"`, `"1080p"` | |
| `aspect_ratio` | string | No | `"16:9"` | 7 options including `"16:9"`, `"9:16"`, `"1:1"`, `"4:3"`, `"3:4"`, `"3:2"`, `"2:3"` | Widest aspect ratio support of any video model. |
| `camera_fixed` | boolean | No | `false` | `true`, `false` | Locks camera position. Essential for clean product shots. |
| `negative_prompt` | string | No | — | Free text | Elements to exclude. |

### Common Mistakes — Seedance

1. **Starting image parameter is `image`, NOT `start_image`.** Same as Wan and Veo, different from Kling.
2. **Use `camera_fixed: true` for product shots.** Without it, the camera may drift during generation.
3. **Duration range is 2-12 seconds.** Most flexible of all models. Don't assume 5/10 only.

---

### Comparison Model: Google Veo 3.1 Fast

| Field | Value |
|-------|-------|
| **Model ID** | `google/veo-3.1-fast` |
| **Why Use** | Faster variant of Veo 3.1. Good for premium content when you need quicker turnaround. Supports reference images for subject consistency. |
| **Typical Latency** | ~130 seconds |
| **Cost** | ~$0.10/sec (no audio), ~$0.20/sec (with audio) |

### Verified API Payload — Veo 3.1 Fast I2V

```json
{
  "model": "google/veo-3.1-fast",
  "input": {
    "prompt": "{{motion_description}}",
    "negative_prompt": "blurry, low quality, distorted",
    "image": "{{image_url}}",
    "duration": 8,
    "aspect_ratio": "16:9",
    "resolution": "1080p"
  }
}
```

Same parameters as Veo 3.1 (see below). Starting image param is `image` (NOT `start_image`). Supports `reference_images` (1-3 URLs) for subject consistency.

---

### Comparison Model: Google Veo 3.1

| Field | Value |
|-------|-------|
| **Model ID** | `google/veo-3.1` |
| **Why Use** | Highest fidelity video, context-aware audio generation, reference image support. Best for hero/flagship content where quality justifies cost and wait time. |
| **Typical Latency** | 3-8 minutes |
| **Cost** | ~$0.80-1.50 per clip |

### Verified API Payload — Veo 3.1 I2V

```json
{
  "model": "google/veo-3.1",
  "input": {
    "prompt": "{{motion_description}}",
    "image": "{{image_url}}",
    "duration": 8,
    "aspect_ratio": "16:9",
    "resolution": "1080p",
    "generate_audio": true
  }
}
```

### Parameter Reference — Veo 3.1

| Parameter | Type | Required | Default | Options / Range | Notes |
|-----------|------|----------|---------|-----------------|-------|
| `prompt` | string | **Yes** | — | Free text | Describe the scene and motion. |
| `image` | string (URI) | No | — | Image URL | Starting frame. Best results at 1280x720 or 720x1280. |
| `last_frame` | string (URI) | No | — | Image URL | Ending frame for interpolation between two images. |
| `reference_images` | array of strings | No | — | 1-3 image URLs | Guide subject consistency. Reference-to-video (R2V) mode only. |
| `duration` | integer | No | `8` | `4`, `6`, `8` | Video length in seconds. |
| `aspect_ratio` | string | No | `"16:9"` | `"16:9"`, `"9:16"` | Only landscape or portrait. No square. |
| `resolution` | string | No | `"720p"` | `"720p"`, `"1080p"` | Higher resolution = slower + more expensive. |
| `generate_audio` | boolean | No | `false` | `true`, `false` | Generate synchronized audio. Adds processing time but produces native sound. |
| `negative_prompt` | string | No | — | Free text | Content to exclude. |
| `seed` | integer | No | random | 0-4294967295 | For reproducibility. |

### Common Mistakes — Veo 3.1

1. **The starting image parameter is `image`, NOT `start_image`.** Different name than Kling. This is the most common cross-model mistake.

2. **No square aspect ratio.** Only `"16:9"` and `"9:16"` are supported. For square content, crop the output in post.

3. **Duration values are 4, 6, or 8 — not 5 or 10.** Different from Kling. Do not pass Kling duration values.

4. **`generate_audio` defaults to false.** If you want audio (dialogue, ambient sound, music), you must explicitly set it to `true`.

5. **Reference images are not the same as start_image.** `reference_images` guide style/subject consistency but do not set the starting frame. Use `image` for the starting frame.

---

### Comparison Model: OpenAI Sora 2

| Field | Value |
|-------|-------|
| **Model ID** | `openai/sora-2` |
| **Why Use** | Strong prompt adherence, native audio generation, good for character-driven content. Use for hero content comparison alongside Veo 3.1. |
| **Typical Latency** | 3-10 minutes |
| **Cost** | ~$0.60-1.20 per clip |

### Verified API Payload — Sora 2 I2V

```json
{
  "model": "openai/sora-2",
  "input": {
    "prompt": "{{motion_description}}",
    "input_reference": "{{image_url}}",
    "seconds": 8,
    "aspect_ratio": "landscape"
  }
}
```

### Parameter Reference — Sora 2

| Parameter | Type | Required | Default | Options / Range | Notes |
|-----------|------|----------|---------|-----------------|-------|
| `prompt` | string | **Yes** | — | Free text | Describe the scene and motion. |
| `input_reference` | string (URI) | No | — | Image URL | Reference image for I2V. Must match the video aspect ratio. |
| `seconds` | integer | No | `8` | 4-12 | Video length in seconds. More granular than Kling/Veo. |
| `aspect_ratio` | string | No | `"landscape"` | `"landscape"` (1280x720), `"portrait"` (720x1280) | Uses words, not ratios. |
| `openai_api_key` | string | No | — | API key string | Optional. If you want to use your own OpenAI key instead of Replicate billing. |

### Common Mistakes — Sora 2

1. **The image parameter is `input_reference`, NOT `image`, `start_image`, or `image_url`.** Every video model uses a different parameter name. Check this file.

2. **Aspect ratio uses words, not numbers.** Pass `"landscape"` or `"portrait"`, not `"16:9"` or `"9:16"`. This is unique to Sora 2 on Replicate.

3. **Duration parameter is `seconds`, NOT `duration`.** Different from both Kling and Veo.

4. **No square aspect ratio.** Like Veo 3.1, only landscape and portrait are supported.

5. **Reference image must match aspect ratio.** If you set `"portrait"` but provide a landscape image, results will be poor. Resize the image to match.

---

### Cross-Model Parameter Cheat Sheet

This table exists because every model uses different parameter names for the same concept. Consult this before writing any API call.

| Concept | Wan 2.2 | Seedance | Kling 2.5/2.6 | Veo 3.1/Fast | Sora 2 |
|---------|---------|----------|---------------|--------------|--------|
| **Starting image** | `image` | `image` | `start_image` | `image` | `input_reference` |
| **Duration** | `num_frames` (17-81) | `duration` (2-12) | `duration` (5, 10) | `duration` (4, 6, 8) | `seconds` (4-12) |
| **Aspect ratio** | N/A (from image) | `aspect_ratio` (7 options) | `aspect_ratio` ("16:9") | `aspect_ratio` ("16:9") | `aspect_ratio` ("landscape") |
| **Negative prompt** | — | `negative_prompt` | `negative_prompt` | `negative_prompt` | — |
| **Audio** | — | — | `generate_audio` | `generate_audio` | Native |
| **Ending frame** | — | — | `end_image` | `last_frame` | — |
| **Resolution** | `resolution` ("480p","720p") | `resolution` ("480p"-"1080p") | Fixed 1080p | `resolution` ("720p","1080p") | Fixed |
| **Camera lock** | — | `camera_fixed` | — | — | — |
| **Speed control** | `go_fast` | — | — | — | — |
| **Reproducibility** | — | — | — | `seed` | — |

---

## Lip-Sync

### Model: Kling Lip-Sync

| Field | Value |
|-------|-------|
| **Model ID** | `kwaivgi/kling-lip-sync` |
| **What It Does** | Takes a video of a person and syncs their lip movements to match provided audio or text. |
| **Typical Latency** | 1-3 minutes |
| **Cost** | ~$0.30-0.60 per clip |

### Verified API Payload — Audio-Driven Lip-Sync

```json
{
  "model": "kwaivgi/kling-lip-sync",
  "input": {
    "video_url": "{{source_video_url}}",
    "audio_file": "{{audio_url}}"
  }
}
```

### Verified API Payload — Text-Driven Lip-Sync (Model TTS)

```json
{
  "model": "kwaivgi/kling-lip-sync",
  "input": {
    "video_url": "{{source_video_url}}",
    "text": "{{spoken_text}}",
    "voice_id": "en_AOT",
    "voice_speed": 1
  }
}
```

### Parameter Reference — Kling Lip-Sync

| Parameter | Type | Required | Default | Options / Range | Notes |
|-----------|------|----------|---------|-----------------|-------|
| `video_url` | string (URI) | **Yes*** | — | .mp4, .mov | Source video. Must be 2-10 seconds, 720p-1080p, under 100MB. Mutually exclusive with `video_id`. |
| `video_id` | string | **Yes*** | — | Kling video ID | Use if the source video was generated by Kling. Mutually exclusive with `video_url`. |
| `audio_file` | string (URI) | **Yes*** | — | .mp3, .wav, .m4a, .aac | Audio to sync to. Under 5MB. Mutually exclusive with `text`. |
| `text` | string | **Yes*** | — | Free text | Text to synthesize and sync. Mutually exclusive with `audio_file`. |
| `voice_id` | string | No | — | Voice identifier string | Which TTS voice to use. Only applies when using `text` input. Example: `"en_AOT"`. |
| `voice_speed` | number | No | `1` | 0.5-2.0 | Speech rate multiplier. Only applies when using `text` input. |

*One of `video_url` or `video_id` is required. One of `audio_file` or `text` is required.

### When to Use Model TTS vs. External Audio

| Scenario | Approach | Why |
|----------|----------|-----|
| Quick talking head prototype | Use `text` + `voice_id` | Fastest path. One API call does everything. |
| Brand-specific voice required | Use external TTS (ElevenLabs, etc.) then pass `audio_file` | Model TTS voices are limited. External gives you voice cloning, brand voices, etc. |
| Voiceover already recorded | Use `audio_file` | You have the audio. No synthesis needed. |
| Multiple languages | Use external TTS then `audio_file` | Model TTS language/accent options are limited. |
| Testimonial/UGC content | Use `audio_file` with real voice recording | Authenticity matters. Real voices convert better. |

### Common Mistakes — Lip-Sync

1. **`audio_file` and `text` are mutually exclusive.** Providing both will error. Pick one input method.

2. **`video_url` and `video_id` are mutually exclusive.** Use `video_url` for external videos, `video_id` only for Kling-generated videos.

3. **Video must be 2-10 seconds.** Shorter or longer videos will be rejected. If your source is longer, trim it first.

4. **Video resolution must be 720p-1080p.** Lower resolution videos will produce poor results. Higher resolution videos may be rejected or downscaled.

5. **Audio file must be under 5MB.** Compress or trim audio that exceeds this limit.

---

## Model Selection Logic

### Tier System — Test Cheap, Ship Quality

The core strategy: generate many cheap variants to find what works, then regenerate winners at production quality.

```
TESTING ($0.05/video)     →  Wan 2.2 I2V/T2V Fast (480p, ~20s)
MID-TIER ($0.15/video)    →  Seedance 1 Pro (1080p, ~60s, camera lock)
PRODUCTION ($0.35/video)  →  Kling 2.6 (1080p, ~60s, native audio)
PREMIUM ($0.80+/video)    →  Veo 3.1 / Veo 3.1 Fast / Sora 2
```

**Workflow:** Generate 5-10 variants with Wan ($0.50 total) → pick winners → regenerate with Kling 2.6 ($0.35-0.70 each).

### Decision Tree

```
WHAT IS BEING MADE?
│
├─ Still image (any kind)
│  └─ Nano Banana Pro (google/nano-banana-pro)
│     Always. No exceptions unless user requests a specific model.
│
├─ Video (testing/exploring direction)
│  ├─ Has a starting image? → Wan 2.2 I2V Fast
│  └─ Text only? → Wan 2.2 T2V Fast
│  Generate 5-10 variants at $0.05 each. Pick winners.
│
├─ Video (clean product shots, camera control needed)
│  └─ Seedance 1 Pro with camera_fixed: true
│
├─ Video (standard production)
│  ├─ Has a starting image? → Kling 2.6 I2V
│  └─ Text only? → Kling 2.6 T2V
│  (Legacy: Kling 2.5 still works but 2.6 is preferred)
│
├─ Video (hero/flagship content)
│  └─ Generate with ALL THREE in parallel:
│     ├─ Kling 2.6
│     ├─ Veo 3.1 (with generate_audio: true)
│     └─ Sora 2
│     Then present all three for user selection.
│
├─ Talking head / lip-sync
│  ├─ Have audio? → Kling Lip-Sync with audio_file
│  └─ Text script only? → Kling Lip-Sync with text + voice_id
│
└─ User requests specific model
   └─ Use what they asked for. Check this registry for the payload.
```

### Hero Content: Parallel Generation Pattern

For flagship content where quality matters most, run all three video models simultaneously:

```
Task 1: Kling 2.6  → cost ~$0.35, time ~60s
Task 2: Veo 3.1    → cost ~$1.00, time ~3min
Task 3: Sora 2     → cost ~$0.80, time ~80s
─────────────────────────────────────────────
Total:               ~$2.15, ~3min (parallel)
```

Present all three results. Let the user pick. The best model for any given prompt varies — running all three eliminates guessing.

---

## Cost Reference

### Per-Generation Estimates

| Model | Output | Estimated Cost | Typical Time |
|-------|--------|---------------|--------------|
| Nano Banana Pro | 1 image | $0.02-0.04 | 15-40s |
| Nano Banana Pro | 4 images | $0.08-0.16 | 20-60s |
| Wan 2.2 (I2V/T2V) | 480p test video | ~$0.05 | ~20s |
| Seedance 1 Pro | 5s video (1080p) | ~$0.15 | ~60s |
| Kling 2.6 | 5s video (no audio) | ~$0.35 | ~60s |
| Kling 2.6 | 5s video (with audio) | ~$0.70 | ~60s |
| Kling 2.5 | 5s video | $0.30-0.50 | 2-5min |
| Kling 2.5 | 10s video | $0.60-1.00 | 4-8min |
| Veo 3.1 Fast | 8s video (1080p) | ~$0.80 | ~130s |
| Veo 3.1 | 8s video (1080p) | $1.00-1.50 | ~3min |
| Sora 2 | 8s video | $0.60-1.20 | ~80s |
| Kling Lip-Sync | 2-10s clip | $0.30-0.60 | 1-3min |

### Campaign Cost Estimates

| Campaign Scale | Assets | Estimated Total |
|----------------|--------|-----------------|
| Social post (3 image variants) | 3 images | ~$0.10 |
| Variant testing (10 Wan drafts) | 10 test videos | ~$0.50 |
| Product launch (10 images + 2 Kling videos) | 12 assets | ~$1-2 |
| Full campaign (20 images + 5 videos + 2 lip-sync) | 27 assets | ~$5-10 |
| Hero content comparison (3 premium models) | 3 videos | ~$2-3 |

Costs are approximate and depend on Replicate's current pricing. Check replicate.com for up-to-date rates.

---

## Troubleshooting

### API Call Fails Immediately

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 401 Unauthorized | Missing or invalid API token | Check `REPLICATE_API_TOKEN` in .env |
| 422 Unprocessable Entity | Invalid parameter value | Check parameter name and type against this registry |
| Model not found | Typo in model ID | Copy the model ID exactly from this file |
| Input validation error | Wrong parameter for this model | Check the cross-model cheat sheet above |

### Generation Completes But Output Is Wrong

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Wrong aspect ratio | Passed pixel dimensions instead of ratio string | Use `"16:9"` not `1920x1080` |
| Image looks generic | Prompt too vague | See VISUAL_INTELLIGENCE.md for prompt construction |
| Video has no motion | I2V prompt describes static scene | Describe the MOTION, not the scene |
| Lip-sync mismatch | Audio too long or video too short | Ensure video is 2-10s and audio matches |
| Output URL is null | Generation failed silently | Check Replicate dashboard for error logs |

### Model-Specific Known Issues

**Nano Banana Pro:**
- Occasionally produces images with subtle text artifacts on complex typography. For text-heavy designs, generate multiple variants and pick the cleanest.
- Very long prompts (500+ words) may be truncated. Keep prompts under 300 words for best results.

**Kling 2.5:**
- Fast camera movements can cause warping artifacts at edges. Use moderate camera motion descriptions.
- 10-second clips sometimes have a quality dip in the middle. For critical content, use 5-second clips and stitch.

**Kling 2.6:**
- Same parameter surface as 2.5 (`start_image`, `duration`, `aspect_ratio`). Drop-in replacement.
- `guidance_scale` does NOT exist. Do not include it.
- Audio generation doubles cost. Only enable when needed.

**Wan 2.2:**
- 480p output only. Use for testing direction, not production.
- Starting image param is `image` (not `start_image`). Duration is `num_frames` (not `duration`).
- 81 frames = best per-frame quality. Going higher degrades quality.

**Seedance 1 Pro:**
- `camera_fixed: true` is critical for product shots. Without it, camera drifts.
- Starting image param is `image` (not `start_image`).
- Widest aspect ratio support (7 options) and duration range (2-12s).

**Veo 3.1 / Veo 3.1 Fast:**
- Audio generation significantly increases processing time. Only enable when audio is actually needed.
- Portrait aspect ratio (9:16) sometimes crops subjects unexpectedly. Review results carefully.

**Sora 2:**
- Aspect ratio must be "landscape" or "portrait" as strings — not numeric ratios.
- Generation times are the most variable of all models. Allow extra buffer for timeouts.

**Kling Lip-Sync:**
- Works best with front-facing, well-lit videos of a single person.
- Side profiles and multiple people in frame produce poor results.
- Audio with heavy background music interferes with sync quality.

---

*This registry is maintained as part of the Vibe Marketing Skills v2 creative engine. When model schemas change upstream, update this file first, then update any mode files that reference the changed model.*
