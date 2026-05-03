// mktg cmo — CLI-invokable /cmo wrapper via headless Claude Code spawn
//
// Thin bridge between the mktg CLI and the /cmo skill that lives in
// Claude Code. Agents (and tests) that need to drive /cmo from a
// non-interactive context shell out through this command rather than
// building their own Claude Code session handling.
//
// Under the hood: `claude -p <prompt> --output-format json --no-session-persistence`
// with sensible defaults that match /cmo's allowed-tools declaration.
//
// M4 Pass 1 surface:
//   mktg cmo <prompt>                    → spawn, return structured CmoResponse
//   mktg cmo <prompt> --json             → JSON envelope for agent consumption
//   mktg cmo <prompt> --dry-run --json   → preview what would be spawned, no LLM call
//   mktg cmo --json                      → require prompt, return INVALID_ARGS
//
// Agent DX 21/21 notes:
//   Axis 1: structured CmoResponse, never prose
//   Axis 2: prompt is the raw payload; no translation loss
//   Axis 3: schema exposes every flag + response field
//   Axis 4: --fields works over response/metadata/routing
//   Axis 5: prompt validated via rejectControlChars (a prompt may legitimately
//           contain newlines/tabs, but NOT NUL / backspace / bell)
//   Axis 6: --dry-run is safe by construction — returns the exact argv that
//           WOULD run without invoking claude
//   Axis 7: schema + README entry reference this command; /cmo rules
//           command-reference.md will gain an entry in a follow-up

import { ok, err, type CommandHandler, type CommandSchema } from "../types";
import { isTTY, writeStderr, bold, dim, green, yellow } from "../core/output";

const CLAUDE_BIN = "claude";
/** Default allowed tools — matches /cmo's SKILL.md frontmatter. */
const DEFAULT_ALLOWED_TOOLS = "Bash(mktg *)";
/** Default timeout. Agents can override; tests should override to ~30s. */
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_TIMEOUT_MS = 600_000;

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface CmoRouting {
  /** Skill name parsed from the response if /cmo routed to one. */
  readonly skillSuggested?: string;
  /** Confidence derived from /cmo's language (heuristic). */
  readonly confidence?: "high" | "medium" | "low";
  /** Raw excerpt where routing was detected. */
  readonly evidence?: string;
}

export interface CmoResponse {
  readonly prompt: string;
  /** The textual response from /cmo. Empty in --dry-run mode. */
  readonly response: string;
  /** Claude session id when claude CLI emits one. */
  readonly sessionId?: string;
  readonly durationMs: number;
  readonly exitCode: number;
  readonly mode: "dry-run" | "execute";
  readonly routing?: CmoRouting;
  readonly metadata: {
    readonly claudeBinary: string;
    readonly claudeVersion: string;
    readonly cwd: string;
    readonly allowedTools: string;
    readonly timeoutMs: number;
    readonly model?: string;
  };
  /** In dry-run, the exact argv that WOULD be spawned. */
  readonly preview?: {
    readonly cmd: readonly string[];
    readonly env: Readonly<Record<string, string>>;
  };
  /** In execute mode: tail of stderr kept inline when the spawn errored. */
  readonly stderrTail?: string;
}

// ------------------------------------------------------------------
// Schema
// ------------------------------------------------------------------

export const schema: CommandSchema = {
  name: "cmo",
  description:
    "Invoke the /cmo skill via a headless Claude Code subprocess. Returns a structured CmoResponse for agent consumption. `mktg cmo <prompt>` spawns, `mktg cmo <prompt> --dry-run` previews the argv without LLM cost.",
  flags: [
    {
      name: "--dry-run",
      type: "boolean",
      required: false,
      default: false,
      description:
        "Preview the claude CLI argv that would be spawned. Zero LLM cost, zero side effects. Safe for tests + schema discovery.",
    },
    {
      name: "--timeout",
      type: "string",
      required: false,
      default: String(DEFAULT_TIMEOUT_MS / 1000),
      description:
        "Wall-clock timeout in seconds (1-600). Hard-caps a run so agent tests can't hang. Default 120s.",
    },
    {
      name: "--model",
      type: "string",
      required: false,
      description:
        "Override claude model (e.g. 'sonnet', 'opus'). Passed through verbatim.",
    },
    {
      name: "--allowed-tools",
      type: "string",
      required: false,
      default: DEFAULT_ALLOWED_TOOLS,
      description:
        "Tool allowlist forwarded to claude --allowedTools. Default matches /cmo's SKILL.md frontmatter (`Bash(mktg *)`).",
    },
  ],
  positional: {
    name: "prompt",
    description:
      "The prompt to send to /cmo. A leading '/cmo ' is auto-added if missing. Multiword prompts should be quoted.",
    required: true,
  },
  output: {
    prompt: "string — the prompt that was sent to /cmo (with '/cmo ' prefix if auto-added)",
    response: "string — /cmo's textual response; empty in dry-run mode",
    sessionId: "string? — claude session id when emitted",
    durationMs: "number — wall-clock time of the spawn (0 in dry-run)",
    exitCode: "number — claude CLI exit code (0 in dry-run)",
    mode: "'dry-run' | 'execute'",
    routing:
      "{ skillSuggested?, confidence?, evidence? }? — heuristic parse of routing cues from the response",
    metadata:
      "{ claudeBinary, claudeVersion, cwd, allowedTools, timeoutMs, model? } — spawn environment",
    preview:
      "{ cmd: string[], env: Record<string, string> }? — dry-run only; exact argv that would be spawned",
    stderrTail: "string? — bounded tail of stderr when spawn errored",
  },
  examples: [
    {
      args: `mktg cmo "help me market this app" --json`,
      description: "Spawn /cmo with a real prompt, return structured response",
    },
    {
      args: `mktg cmo "what should I do next" --json --dry-run`,
      description: "Preview the claude CLI argv without spawning",
    },
    {
      args: `mktg cmo "audit my brand" --json --timeout 60 --model sonnet`,
      description: "60-second cap, force sonnet model",
    },
    {
      args: `mktg cmo "status check" --json --fields routing,metadata`,
      description: "Field mask — agent automation",
    },
    {
      args: `mktg cmo "run landscape scan" --json --allowed-tools "Bash(mktg *) Bash(gh *)"`,
      description: "Expand the tool allowlist for the /cmo session",
    },
  ],
  vocabulary: ["cmo", "chief-marketing-officer", "orchestrator", "skill-routing"],
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const resolveClaudeBin = (): string | null =>
  Bun.which(CLAUDE_BIN, { PATH: process.env.PATH ?? "" });

const probeClaudeVersion = async (binary: string): Promise<string> => {
  try {
    const proc = Bun.spawn({
      cmd: [binary, "--version"],
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited,
    ]);
    if (exitCode === 0) {
      const line = stdout.trim().split("\n")[0];
      if (line && line.length < 64) return line;
    }
  } catch { /* fall through */ }
  return "unknown";
};

/** Parse routing heuristics from /cmo's text response. Best-effort, no LLM. */
export const parseRouting = (response: string): CmoRouting | undefined => {
  // Heuristic: look for "routing to /<skill>" or "I'll run /<skill>" or backtick'd skill names.
  const skillRoutePatterns = [
    /routing to [`/]?([a-z][a-z0-9-]+)/i,
    /I(?:'ll| will) run [`/]?([a-z][a-z0-9-]+)/i,
    /(?:let'?s|let us) run [`/]?([a-z][a-z0-9-]+)/i,
    /skill[:\s]+[`/]?([a-z][a-z0-9-]+)/i,
  ];
  let skillSuggested: string | undefined;
  let evidence: string | undefined;
  for (const pattern of skillRoutePatterns) {
    const m = response.match(pattern);
    if (m) {
      skillSuggested = m[1];
      evidence = m[0];
      break;
    }
  }
  if (!skillSuggested) return undefined;

  // Confidence heuristic: presence of hedging language = lower confidence.
  const lower = response.toLowerCase();
  const confidence: "high" | "medium" | "low" =
    /\b(definitely|clearly|recommend|let'?s)\b/.test(lower) ? "high" :
    /\b(might|maybe|consider|could)\b/.test(lower) ? "low" : "medium";

  return {
    skillSuggested,
    confidence,
    ...(evidence !== undefined ? { evidence } : {}),
  };
};

const parseFlagValue = (args: readonly string[], name: string): string | undefined => {
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === name && args[i + 1]) return args[i + 1];
    if (a.startsWith(`${name}=`)) return a.slice(name.length + 1);
  }
  return undefined;
};

/** Reject only the control chars that break JSON + shell — allow \n, \t, \r. */
const rejectDangerousControlChars = (s: string, label: string):
  | { ok: true }
  | { ok: false; message: string } => {
  // eslint-disable-next-line no-control-regex
  const match = s.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
  if (match) {
    const code = match[0]!.charCodeAt(0).toString(16).padStart(2, "0");
    return { ok: false, message: `${label} contains disallowed control char \\x${code}` };
  }
  return { ok: true };
};

// ------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------

export const handler: CommandHandler<CmoResponse> = async (args, flags) => {
  // Extract positional prompt (every arg that doesn't start with --).
  // Multiple positionals are concatenated with spaces; most callers will
  // quote multi-word prompts so positional.length === 1.
  const positionals = args.filter((a) => !a.startsWith("--") && !isFlagValue(args, a));
  // Above is too loose; for safety, grab raw positionals by rebuilding.
  const rawPositionals: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a.startsWith("--")) {
      // Skip the flag and its value for flags that take one
      if (["--timeout", "--model", "--allowed-tools"].includes(a) && args[i + 1]) {
        i++;
      }
      continue;
    }
    rawPositionals.push(a);
  }
  const promptRaw = rawPositionals.join(" ").trim();

  if (!promptRaw) {
    return err(
      "INVALID_ARGS",
      "mktg cmo requires a prompt",
      [
        `Example: mktg cmo "help me market this app" --json`,
        `Use --dry-run to preview the spawn without calling claude`,
      ],
      2,
    );
  }

  const ctrl = rejectDangerousControlChars(promptRaw, "prompt");
  if (!ctrl.ok) return err("INVALID_ARGS", ctrl.message, [], 2);

  // Auto-prefix with "/cmo " if missing so a bare prompt routes through the skill.
  const prompt = promptRaw.startsWith("/cmo ") || promptRaw === "/cmo"
    ? promptRaw
    : `/cmo ${promptRaw}`;

  // --- Flag parsing ---
  const timeoutSecRaw = parseFlagValue(args, "--timeout") ?? String(DEFAULT_TIMEOUT_MS / 1000);
  const timeoutSec = parseInt(timeoutSecRaw, 10);
  if (!Number.isFinite(timeoutSec) || timeoutSec < 1 || timeoutSec > MAX_TIMEOUT_MS / 1000) {
    return err(
      "INVALID_ARGS",
      `--timeout must be an integer in [1, ${MAX_TIMEOUT_MS / 1000}] seconds; got '${timeoutSecRaw}'`,
      [`Example: --timeout 60`],
      2,
    );
  }
  const timeoutMs = timeoutSec * 1000;

  const model = parseFlagValue(args, "--model");
  if (model !== undefined) {
    const mctrl = rejectDangerousControlChars(model, "model");
    if (!mctrl.ok) return err("INVALID_ARGS", mctrl.message, [], 2);
  }

  const allowedTools = parseFlagValue(args, "--allowed-tools") ?? DEFAULT_ALLOWED_TOOLS;
  const atCtrl = rejectDangerousControlChars(allowedTools, "allowed-tools");
  if (!atCtrl.ok) return err("INVALID_ARGS", atCtrl.message, [], 2);

  // --- Resolve claude binary ---
  // Dry-run is an agent-discovery path and must stay side-effect free even on
  // CI machines that do not have Claude Code installed.
  const resolvedBinary = resolveClaudeBin();
  if (!resolvedBinary && !flags.dryRun) {
    return err(
      "MISSING_DEPENDENCY",
      `${CLAUDE_BIN} binary not found on PATH`,
      [
        "Install Claude Code: https://claude.ai/code",
        "Or export PATH to include ~/.local/bin if already installed",
        "Verify: which claude",
      ],
      3,
    );
  }
  const binary = resolvedBinary ?? CLAUDE_BIN;
  const claudeVersion = resolvedBinary ? await probeClaudeVersion(resolvedBinary) : "unresolved";

  // --- Build argv ---
  const cmd: string[] = [
    binary,
    "-p",
    "--output-format", "json",
    "--no-session-persistence",
    "--allowedTools", allowedTools,
  ];
  if (model) cmd.push("--model", model);
  cmd.push(prompt);

  const metadata: CmoResponse["metadata"] = {
    claudeBinary: binary,
    claudeVersion,
    cwd: flags.cwd,
    allowedTools,
    timeoutMs,
    ...(model !== undefined ? { model } : {}),
  };

  // --- Dry-run: return preview, do not spawn ---
  if (flags.dryRun) {
    const response: CmoResponse = {
      prompt,
      response: "",
      durationMs: 0,
      exitCode: 0,
      mode: "dry-run",
      metadata,
      preview: {
        cmd,
        env: { PATH: process.env.PATH ?? "", CLAUDE_CODE_SIMPLE: "0" },
      },
    };
    if (isTTY() && !flags.json) printTtyPreview(response);
    return ok(response);
  }

  // --- Execute: spawn claude with timeout ---
  const started = performance.now();
  let timeoutFired = false;
  const ctrlAbort = new AbortController();
  const timer = setTimeout(() => {
    timeoutFired = true;
    ctrlAbort.abort();
  }, timeoutMs);

  try {
    const proc = Bun.spawn({
      cmd,
      cwd: flags.cwd,
      env: process.env,
      stdout: "pipe",
      stderr: "pipe",
    });
    const killOnAbort = () => { try { proc.kill("SIGTERM"); } catch { /* gone */ } };
    ctrlAbort.signal.addEventListener("abort", killOnAbort);

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    clearTimeout(timer);
    ctrlAbort.signal.removeEventListener("abort", killOnAbort);

    const durationMs = Math.round(performance.now() - started);

    if (timeoutFired) {
      return err(
        "TIMEOUT",
        `mktg cmo: claude exceeded --timeout ${timeoutSec}s`,
        [
          `Try a longer --timeout (max ${MAX_TIMEOUT_MS / 1000}s)`,
          `Use --dry-run first to verify the prompt routes correctly`,
        ],
        5,
      );
    }

    if (exitCode !== 0) {
      const stderrTail = stderr.slice(-4_000);
      const response: CmoResponse = {
        prompt,
        response: stdout,
        durationMs,
        exitCode: exitCode ?? 1,
        mode: "execute",
        metadata,
        stderrTail,
      };
      // Still return ok() so --fields can reach metadata/stderrTail;
      // surface the failure via exitCode in the payload.
      // Exception: if claude itself errored hard, promote to err envelope.
      if (exitCode === 127 || !stdout.trim()) {
        return err(
          "CMO_SPAWN_FAILED",
          `claude exited ${exitCode} with no stdout`,
          [`stderr tail: ${stderrTail.slice(-500)}`],
          4,
        );
      }
      return ok(response);
    }

    // Parse claude's JSON output to extract response text + session id.
    let responseText = stdout;
    let sessionId: string | undefined;
    try {
      const parsed = JSON.parse(stdout) as { result?: string; session_id?: string };
      if (typeof parsed.result === "string") responseText = parsed.result;
      if (typeof parsed.session_id === "string") sessionId = parsed.session_id;
    } catch {
      // Not JSON; keep raw stdout.
    }

    const routing = parseRouting(responseText);

    const response: CmoResponse = {
      prompt,
      response: responseText,
      ...(sessionId !== undefined ? { sessionId } : {}),
      durationMs,
      exitCode: 0,
      mode: "execute",
      ...(routing !== undefined ? { routing } : {}),
      metadata,
    };
    return ok(response);
  } catch (e) {
    clearTimeout(timer);
    return err(
      "CMO_SPAWN_FAILED",
      `claude spawn failed: ${e instanceof Error ? e.message : String(e)}`,
      ["Verify `claude --version` runs successfully"],
      4,
    );
  }
};

// Unused helper kept for API parity; positionals is parsed via rawPositionals loop above.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const isFlagValue = (_args: readonly string[], _a: string): boolean => false;

const printTtyPreview = (r: CmoResponse): void => {
  if (!r.preview) return;
  writeStderr("");
  writeStderr(`  ${bold("mktg cmo")} ${dim("(dry-run)")}`);
  writeStderr(`  ${dim("binary:")}  ${r.metadata.claudeBinary}`);
  writeStderr(`  ${dim("version:")} ${r.metadata.claudeVersion}`);
  writeStderr(`  ${dim("prompt:")}  ${r.prompt}`);
  writeStderr(`  ${dim("timeout:")} ${r.metadata.timeoutMs / 1000}s`);
  writeStderr(`  ${dim("would run:")}`);
  writeStderr(`    ${green(r.preview.cmd.slice(0, 2).join(" "))} ${dim("... + " + (r.preview.cmd.length - 2) + " args")}`);
  writeStderr("");
};
