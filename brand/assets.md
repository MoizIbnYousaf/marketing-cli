# Assets Log

<!-- Append-only. Agent adds entries as assets are created. -->

<!-- AGENT INSTRUCTIONS:
Log every asset created during marketing execution.
Format: | date | type | file/url | skill | notes |
Types: blog, social, video, email, landing-page, image, slide-deck
-->

| Date | Type | File/URL | Skill | Notes |
|------|------|----------|-------|-------|
| 2026-04-25 | image | brand/assets/twitter-marketing-studio-launch.png | imagegen | X launch image post creative for Marketing Studio / marketing-cli.com. |
| 2026-04-28 | video | brand/assets/marketing-cli-launch-video.mp4 | cmo | 18.6s square 1080x1080 launch video for X/Twitter. Six scenes: hook, "50 skills / 5 agents / 10 brand memory files" cascade, "your agent becomes your CMO", agent cycle (Claude/Terminal/Codex/OpenClaw), npm install command, copy-paste CTA. Source: mktg-site/marketing-cli-launch (Remotion). |
| 2026-04-30 | video | brand/assets/launch-video-v2-60s.mp4 | cmo | 60s square 1080x1080 cinema-grade v2 launch video. Six scenes: Hook (5s), Slop (10s, banned-word strike-through), Install (7s), /cmo orchestrator (16s), Studio dashboard reveal (12s), Close (10s). Silent baseline — no audio. Source: _drafts/launch-video-v2 (Remotion 4). |
| 2026-04-30 | video | brand/assets/launch-video-v2-twitter.mp4 | cmo | 60s v2.1 Twitter cut. Same six scenes as v2 baseline plus: sharpened first 1.5s for mute autoplay, 12-frame fade-to-graphite close for clean loop, ambient pad bed (~120Hz, -24 dBFS) + per-scene SFX (cursor ticks, paper-thunks on slop strikes, bell chimes on lime checkmarks, dashboard swell, install-command type-ticks + resolution chord). Peak -7.9 dBFS. 4.1 MB. Source: _drafts/launch-video-v2.1-twitter. |
| 2026-05-01 | video | brand/assets/launch-video-v2.2-twitter-vo.mp4 | cmo | 60s v2.2 — v2.1 plus Brian VO from ElevenLabs (voice nPczCjzI2devNBz1zQrb, eleven_multilingual_v2, stability 0.6, speed 0.92, request stitching across scenes). Sidechain ducking + alimiter on the mix; peak -4.8 dBFS. Per-scene VO clips at _drafts/launch-video-v2.1-twitter/public/vo/. |
| 2026-05-01 | video | brand/assets/launch-video-v2.3-natural.mp4 | cmo | 60s v2.3 — same visuals as v2.2 with ALL musical elements removed (no instruments, no vocal bed). Brian VO + natural SFX only with silence between cues. SFX: cursor ticks (Scene 1), paper-thunks on banned-word strikes (Scene 2), wood taps on lime checkmarks (Scene 3, replacing bell chimes), card-whoosh on draft slide-in (Scene 4), wind sweep on dashboard rise (Scene 5, replacing musical swell), type-ticks on install command + closing-book thud (Scene 6, replacing A-major chord). Peak -5.3 dBFS, mean -29.9 dB. 3.4 MB. |
| 2026-05-01 | image | banner.svg | cmo | README hero banner at 1280×640 (was 1280×320, wrong aspect for GitHub social preview which renders 2:1). Pure SVG, ~5 KB. Graphite #0b0f12 + lime #d8ff3c + cream #f5f0e6 wordmark. JetBrains Mono "marketing-cli" centerpiece, Inter tagline, stats strip (50 skills · 5 agents · brand memory · parallel research · 2,599 tests · real CLI), install command card with blinking cursor pip, footer caps. Renders at any DPI; under 100 KB. |
| 2026-05-01 | video | explainer.gif | cmo | README explainer GIF at 720×720, 6.6s, 20fps, 590 KB. Shows: type-on `$ npm i -g marketing-cli && mktg init`, then four lime checkmarks pulse in (50 skills, 5 research agents, brand/ scaffolded, ready). On-brand graphite/lime/cream. Replaces 2026-04-11 explainer.gif (1.2 MB, 720×405) — half the file size, square aspect, real install copy instead of mockup. Encoded with bayer dither + 192-color diff palette. |
