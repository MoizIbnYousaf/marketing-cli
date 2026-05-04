import {
	AbsoluteFill,
	Easing,
	HtmlInCanvas,
	type HtmlInCanvasOnInit,
	type HtmlInCanvasOnPaint,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from "remotion";
import { useCallback, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Composition shape
//   1920×1080, 60 fps, 600 frames (10s).
//   Stage 1 (frames 0–90, 1.5s)    : terminal panel fades in.
//   Stage 2 (frames 90–210, 2s)    : types `npx create-video@latest …`.
//   Stage 3 (frames 210–300, 1.5s) : mock command output fades line by line.
//   Stage 4 (frames 300–390, 1.5s) : types `claude` + Enter, Claude panel glow.
//   Stage 5 (frames 390–540, 2.5s) : types prompt into the Claude Code panel.
//   Stage 6 (frames 540–600, 1s)   : holds the final state with subtle motion.
//
// Wrapped in <HtmlInCanvas> with a WebGL2 fragment shader that adds barrel
// distortion, scanlines, vignette, and chromatic aberration. The CRT
// `intensity` uniform breathes via `useCurrentFrame()` so the effect feels
// alive, not static.
// ─────────────────────────────────────────────────────────────────────────────

const TERMINAL_CMD = "npx create-video@latest --yes --blank my-video";
const CLAUDE_INVOKE = "claude";
const CLAUDE_PROMPT = "Add a CRT effect using HTML-in-canvas";

const OUTPUT_LINES = [
	"✓ Created my-video",
	"  Initializing composition…",
	"✓ Done — cd my-video && npx remotion studio",
];

// Stage frame anchors (start of each phase).
const STAGE_PANEL_FADE = 0;
const STAGE_TYPE_CMD = 90;
const STAGE_OUTPUT = 210;
const STAGE_CLAUDE_CMD = 300;
const STAGE_CLAUDE_PANEL = 360;
const STAGE_CLAUDE_PROMPT = 390;

// Typewriter cadence (frames per character). Tuned so each block lands inside
// its budget without rushing.
const CMD_CHAR_FRAMES = Math.max(
	1,
	Math.floor((STAGE_OUTPUT - STAGE_TYPE_CMD) / Math.max(1, TERMINAL_CMD.length)),
);
const CLAUDE_INVOKE_CHAR_FRAMES = 6;
const CLAUDE_PROMPT_CHAR_FRAMES = Math.max(
	1,
	Math.floor(150 / Math.max(1, CLAUDE_PROMPT.length)),
);

// ─────────────────────────────────────────────────────────────────────────────
// WebGL2 shaders for the CRT effect
// ─────────────────────────────────────────────────────────────────────────────

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
	v_uv = (a_position + 1.0) * 0.5;
	gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_tex;
uniform float u_intensity;
uniform vec2 u_resolution;

vec2 barrel(vec2 uv, float k) {
	vec2 cc = uv - 0.5;
	float dist = dot(cc, cc);
	return uv + cc * (dist * k);
}

void main() {
	float k = 0.08 * u_intensity;
	vec2 uv = barrel(v_uv, k);

	if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
		fragColor = vec4(0.02, 0.03, 0.06, 1.0);
		return;
	}

	float ca = (1.0 / max(u_resolution.x, 1.0)) * u_intensity;
	float r = texture(u_tex, vec2(uv.x + ca, uv.y)).r;
	float g = texture(u_tex, uv).g;
	float b = texture(u_tex, vec2(uv.x - ca, uv.y)).b;
	vec3 color = vec3(r, g, b);

	float scan = mod(gl_FragCoord.y, 2.0) < 1.0 ? 0.97 : 1.0;
	color *= mix(1.0, scan, u_intensity);

	vec2 vc = v_uv - 0.5;
	float vig = smoothstep(0.85, 0.30, length(vc));
	color *= mix(1.0, vig, u_intensity * 0.6);

	fragColor = vec4(color, 1.0);
}`;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const typedSlice = (
	frame: number,
	fullText: string,
	startFrame: number,
	charFrames: number,
): string => {
	if (frame < startFrame) return "";
	const elapsed = frame - startFrame;
	const chars = Math.min(fullText.length, Math.floor(elapsed / charFrames));
	return fullText.slice(0, chars);
};

const Cursor: React.FC<{ visible?: boolean; frame: number; blinkFrames?: number }> = ({
	visible = true,
	frame,
	blinkFrames = 30,
}) => {
	if (!visible) return null;
	const opacity = interpolate(
		frame % blinkFrames,
		[0, blinkFrames / 2, blinkFrames],
		[1, 0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	return (
		<span
			style={{
				display: "inline-block",
				width: 18,
				height: 36,
				background: "#9bf2c0",
				marginLeft: 6,
				transform: "translateY(6px)",
				opacity,
			}}
		/>
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type GLStore = {
	gl?: WebGL2RenderingContext;
	program?: WebGLProgram;
	vao?: WebGLVertexArrayObject;
	buffer?: WebGLBuffer;
	texture?: WebGLTexture;
	uIntensity?: WebGLUniformLocation | null;
	uResolution?: WebGLUniformLocation | null;
	uTex?: WebGLUniformLocation | null;
};

export const CRTComposition: React.FC = () => {
	const frame = useCurrentFrame();
	const { width, height, fps } = useVideoConfig();
	const store = useRef<GLStore>({});

	// Stage 1 — panel entrance with a soft spring.
	const panelEntrance = spring({
		frame: frame - STAGE_PANEL_FADE,
		fps,
		config: { damping: 18, stiffness: 120, mass: 0.9 },
	});
	const panelOpacity = interpolate(panelEntrance, [0, 1], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const panelLift = interpolate(panelEntrance, [0, 1], [24, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// Stage 2 — main command typewriter.
	const typedCmd = typedSlice(frame, TERMINAL_CMD, STAGE_TYPE_CMD, CMD_CHAR_FRAMES);
	const cmdComplete =
		frame >= STAGE_TYPE_CMD + TERMINAL_CMD.length * CMD_CHAR_FRAMES;

	// Stage 3 — output line reveals (each line over 25 frames).
	const visibleOutputCount = Math.max(
		0,
		Math.min(
			OUTPUT_LINES.length,
			Math.floor((frame - STAGE_OUTPUT) / 25) + 1,
		),
	);

	// Stage 4 — types `claude` + Enter; the Claude Code panel glows on.
	const typedClaudeCmd = typedSlice(
		frame,
		CLAUDE_INVOKE,
		STAGE_CLAUDE_CMD,
		CLAUDE_INVOKE_CHAR_FRAMES,
	);
	const claudeEntered =
		frame >= STAGE_CLAUDE_CMD + CLAUDE_INVOKE.length * CLAUDE_INVOKE_CHAR_FRAMES;

	const claudePanelEntrance = spring({
		frame: frame - STAGE_CLAUDE_PANEL,
		fps,
		config: { damping: 20, stiffness: 110, mass: 0.85 },
	});
	const claudePanelOpacity = interpolate(claudePanelEntrance, [0, 1], [0, 1], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});
	const claudePanelLift = interpolate(claudePanelEntrance, [0, 1], [16, 0], {
		extrapolateLeft: "clamp",
		extrapolateRight: "clamp",
	});

	// Stage 5 — prompt typewriter into the Claude panel.
	const typedClaudePrompt = typedSlice(
		frame,
		CLAUDE_PROMPT,
		STAGE_CLAUDE_PROMPT,
		CLAUDE_PROMPT_CHAR_FRAMES,
	);

	// Stage 6 — final hold; the whole stage already breathes via shader intensity.

	// Whether to show a blinking cursor on each typewriter (only on the active
	// line, never on a stale completed one).
	const showTerminalCursor = !cmdComplete || (cmdComplete && !claudeEntered);
	const showClaudePromptCursor =
		frame >= STAGE_CLAUDE_PROMPT &&
		typedClaudePrompt.length < CLAUDE_PROMPT.length + 4;

	// ── WebGL setup ────────────────────────────────────────────────────────────

	const onInit: HtmlInCanvasOnInit = useCallback(({ canvas }) => {
		const gl = canvas.getContext("webgl2", {
			alpha: true,
			premultipliedAlpha: true,
		});
		if (!gl) {
			throw new Error("WebGL2 unavailable for CRTComposition");
		}
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

		const compile = (type: number, src: string): WebGLShader => {
			const shader = gl.createShader(type);
			if (!shader) throw new Error("Failed to allocate shader");
			gl.shaderSource(shader, src);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				const info = gl.getShaderInfoLog(shader) ?? "(no info)";
				gl.deleteShader(shader);
				throw new Error(`Shader compile failed: ${info}`);
			}
			return shader;
		};

		const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
		const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
		const program = gl.createProgram();
		if (!program) throw new Error("Failed to allocate program");
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const info = gl.getProgramInfoLog(program) ?? "(no info)";
			throw new Error(`Program link failed: ${info}`);
		}
		gl.deleteShader(vs);
		gl.deleteShader(fs);

		const buffer = gl.createBuffer();
		const vao = gl.createVertexArray();
		if (!buffer || !vao) {
			throw new Error("Failed to allocate buffer/VAO");
		}
		gl.bindVertexArray(vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([
				-1, -1, 1, -1, -1, 1,
				-1, 1, 1, -1, 1, 1,
			]),
			gl.STATIC_DRAW,
		);
		const aPos = gl.getAttribLocation(program, "a_position");
		gl.enableVertexAttribArray(aPos);
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(null);

		const texture = gl.createTexture();
		if (!texture) throw new Error("Failed to allocate texture");
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		store.current = {
			gl,
			program,
			vao,
			buffer,
			texture,
			uIntensity: gl.getUniformLocation(program, "u_intensity"),
			uResolution: gl.getUniformLocation(program, "u_resolution"),
			uTex: gl.getUniformLocation(program, "u_tex"),
		};

		return () => {
			const s = store.current;
			if (s.program) gl.deleteProgram(s.program);
			if (s.vao) gl.deleteVertexArray(s.vao);
			if (s.buffer) gl.deleteBuffer(s.buffer);
			if (s.texture) gl.deleteTexture(s.texture);
			store.current = {};
		};
	}, []);

	const onPaint: HtmlInCanvasOnPaint = useCallback(
		({ canvas, elementImage }) => {
			const s = store.current;
			const gl = s.gl;
			if (!gl || !s.program || !s.vao || !s.texture) return;

			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.clearColor(0.04, 0.05, 0.1, 1);
			gl.clear(gl.COLOR_BUFFER_BIT);

			gl.useProgram(s.program);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, s.texture);

			// `texElementImage2D` is the HtmlInCanvas WebGL upload path.
			// It is not in the default WebGL2 lib types, so cast through `unknown`
			// to preserve type-safety on the surrounding code.
			(
				gl as unknown as {
					texElementImage2D: (
						target: number,
						level: number,
						internalFormat: number,
						format: number,
						type: number,
						source: unknown,
					) => void;
				}
			).texElementImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				elementImage,
			);

			if (s.uTex) gl.uniform1i(s.uTex, 0);
			if (s.uResolution) {
				gl.uniform2f(s.uResolution, canvas.width, canvas.height);
			}

			const intensity = 0.85 + 0.15 * Math.sin(frame / 30);
			if (s.uIntensity) gl.uniform1f(s.uIntensity, intensity);

			gl.bindVertexArray(s.vao);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			gl.bindVertexArray(null);
		},
		[frame],
	);

	// ── DOM that gets captured into the WebGL texture ─────────────────────────

	const grid =
		"linear-gradient(rgba(155, 242, 192, 0.05) 1px, transparent 1px), " +
		"linear-gradient(90deg, rgba(155, 242, 192, 0.05) 1px, transparent 1px)";

	// A subtle ambient glow that animates with the same breath as the shader.
	const ambient = interpolate(
		Math.sin(frame / 24),
		[-1, 1],
		[0.85, 1.0],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) },
	);

	// Hold-stage extra subtle drift so the final frame doesn't look frozen.
	const holdDrift =
		frame > 540
			? interpolate(frame, [540, 600], [0, 1.5], { easing: Easing.inOut(Easing.cubic) })
			: 0;

	return (
		<HtmlInCanvas width={width} height={height} onInit={onInit} onPaint={onPaint}>
			<AbsoluteFill
				style={{
					backgroundColor: "#0a0e1a",
					backgroundImage: grid,
					backgroundSize: "48px 48px",
					fontFamily: "ui-monospace, 'JetBrains Mono', Menlo, monospace",
					color: "#e7f6f0",
					padding: 80,
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				{/* Terminal panel ───────────────────────────────────────────────── */}
				<div
					style={{
						width: 1280,
						borderRadius: 18,
						background: "rgba(10, 18, 28, 0.92)",
						border: "1px solid rgba(155, 242, 192, 0.25)",
						boxShadow: `0 0 ${48 * ambient}px rgba(155, 242, 192, ${0.15 * ambient}), inset 0 0 ${36 * ambient}px rgba(155, 242, 192, ${0.06 * ambient})`,
						padding: "28px 36px",
						opacity: panelOpacity,
						transform: `translateY(${panelLift - holdDrift}px)`,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 10,
							marginBottom: 18,
							opacity: 0.85,
						}}
					>
						<span style={dotStyle("#ff6058")} />
						<span style={dotStyle("#ffbd2e")} />
						<span style={dotStyle("#27c93f")} />
						<span
							style={{
								marginLeft: 18,
								fontSize: 22,
								color: "#9bf2c0",
								letterSpacing: 1,
							}}
						>
							~/projects/cmo-remotion · zsh
						</span>
					</div>

					<div style={{ fontSize: 36, lineHeight: 1.5 }}>
						<span style={{ color: "#9bf2c0" }}>$ </span>
						<span>{typedCmd}</span>
						<Cursor frame={frame} visible={!cmdComplete} />
					</div>

					<div style={{ marginTop: 16, fontSize: 28, color: "#a8c7c2" }}>
						{OUTPUT_LINES.slice(0, visibleOutputCount).map((line, i) => {
							const lineStart = STAGE_OUTPUT + i * 25;
							const lineOpacity = interpolate(
								frame,
								[lineStart, lineStart + 18],
								[0, 1],
								{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
							);
							return (
								<div key={line} style={{ opacity: lineOpacity }}>
									{line}
								</div>
							);
						})}
					</div>

					{frame >= STAGE_CLAUDE_CMD ? (
						<div style={{ marginTop: 20, fontSize: 36, lineHeight: 1.5 }}>
							<span style={{ color: "#9bf2c0" }}>$ </span>
							<span>{typedClaudeCmd}</span>
							<Cursor
								frame={frame}
								visible={!claudeEntered && frame < STAGE_CLAUDE_PROMPT}
							/>
						</div>
					) : null}
				</div>

				{/* Claude Code panel ────────────────────────────────────────────── */}
				<div
					style={{
						width: 1280,
						marginTop: 32,
						borderRadius: 18,
						background:
							"linear-gradient(180deg, rgba(20, 36, 30, 0.96), rgba(12, 22, 18, 0.96))",
						border: "1px solid rgba(155, 242, 192, 0.45)",
						boxShadow: `0 0 ${72 * ambient}px rgba(155, 242, 192, ${0.32 * claudePanelOpacity * ambient})`,
						padding: "26px 36px",
						opacity: claudePanelOpacity,
						transform: `translateY(${claudePanelLift + holdDrift * 0.4}px)`,
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 12,
							color: "#9bf2c0",
							fontSize: 22,
							letterSpacing: 1,
							marginBottom: 14,
						}}
					>
						<span
							style={{
								width: 14,
								height: 14,
								borderRadius: 7,
								background: "#9bf2c0",
								boxShadow: "0 0 12px #9bf2c0",
							}}
						/>
						Claude Code
					</div>
					<div style={{ fontSize: 34, lineHeight: 1.5, color: "#e7f6f0" }}>
						<span style={{ color: "#9bf2c0" }}>{">  "}</span>
						<span>{typedClaudePrompt}</span>
						<Cursor frame={frame} visible={showClaudePromptCursor} />
					</div>
				</div>

				{/* Cursor parity for terminal when nothing else is active ─────── */}
				<div style={{ position: "absolute", bottom: -9999 }}>
					{showTerminalCursor ? null : null}
				</div>
			</AbsoluteFill>
		</HtmlInCanvas>
	);
};

const dotStyle = (color: string): React.CSSProperties => ({
	display: "inline-block",
	width: 14,
	height: 14,
	borderRadius: 7,
	background: color,
});
