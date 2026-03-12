// mktg — Structured exit codes for agent-native CLI
// Inspired by ASC CLI's exit code system (cmd/exit_codes.go).
//
// Design principles:
// - Every exit code is a distinct, documented failure mode
// - Agents parse exit codes to decide next action (retry, fix input, abort)
// - Ranges are reserved for future HTTP/API status mapping
// - 0 = success, 1 = generic, 2-9 = CLI-level, 10+ = reserved for future use

/** All valid mktg exit codes. */
export const ExitCode = {
  /** Successful execution */
  Success: 0,

  /** Generic / unclassified error */
  Error: 1,

  /** Invalid usage — bad flags, missing args, unknown command */
  Usage: 2,

  /** Authentication failure — missing or invalid credentials */
  Auth: 3,

  /** Resource not found — file, skill, brand dir, project */
  NotFound: 4,

  /** Conflict — resource already exists, init already ran */
  Conflict: 5,

  /** Required dependency missing — bun, playwright-cli, gws, etc. */
  DependencyMissing: 6,

  /** Skill execution failed — a marketing skill errored during run */
  SkillFailed: 7,

  /** Network error — fetch failed, timeout, DNS, etc. */
  Network: 8,

  /** Not implemented — command exists but isn't built yet */
  NotImplemented: 9,

  /** Configuration error — invalid config file, bad brand dir state */
  Config: 10,

  /** Permission denied — file system, API quota, rate limit */
  Permission: 11,

  /** Timeout — operation exceeded time limit */
  Timeout: 12,

  /** Validation error — content failed schema or business rules */
  Validation: 13,

  /** I/O error — file read/write failure */
  IO: 14,

  /** Interrupted — user cancelled or SIGINT received */
  Interrupted: 130,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/** Human-readable label for each exit code. */
export const exitCodeLabel = (code: ExitCodeValue): string => {
  const labels: Record<ExitCodeValue, string> = {
    [ExitCode.Success]: "success",
    [ExitCode.Error]: "error",
    [ExitCode.Usage]: "invalid usage",
    [ExitCode.Auth]: "authentication failure",
    [ExitCode.NotFound]: "not found",
    [ExitCode.Conflict]: "conflict",
    [ExitCode.DependencyMissing]: "dependency missing",
    [ExitCode.SkillFailed]: "skill failed",
    [ExitCode.Network]: "network error",
    [ExitCode.NotImplemented]: "not implemented",
    [ExitCode.Config]: "configuration error",
    [ExitCode.Permission]: "permission denied",
    [ExitCode.Timeout]: "timeout",
    [ExitCode.Validation]: "validation error",
    [ExitCode.IO]: "i/o error",
    [ExitCode.Interrupted]: "interrupted",
  };
  return labels[code] ?? "unknown error";
};

/** Machine-readable error code strings (used in JSON output). */
export const ErrorCode = {
  // CLI-level
  UNKNOWN: "UNKNOWN",
  INVALID_USAGE: "INVALID_USAGE",
  INVALID_ARGS: "INVALID_ARGS",
  UNKNOWN_COMMAND: "UNKNOWN_COMMAND",
  MISSING_INPUT: "MISSING_INPUT",

  // Auth
  MISSING_AUTH: "MISSING_AUTH",
  AUTH_EXPIRED: "AUTH_EXPIRED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // Dependencies
  MISSING_DEPENDENCY: "MISSING_DEPENDENCY",

  // Skills
  SKILL_FAILED: "SKILL_FAILED",
  SKILL_NOT_FOUND: "SKILL_NOT_FOUND",

  // Network
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",

  // File system
  IO_ERROR: "IO_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFIG_ERROR: "CONFIG_ERROR",

  // Meta
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  INTERRUPTED: "INTERRUPTED",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Map an error code string to the appropriate exit code. */
export const errorCodeToExitCode = (code: ErrorCodeValue): ExitCodeValue => {
  const mapping: Record<ErrorCodeValue, ExitCodeValue> = {
    [ErrorCode.UNKNOWN]: ExitCode.Error,
    [ErrorCode.INVALID_USAGE]: ExitCode.Usage,
    [ErrorCode.INVALID_ARGS]: ExitCode.Usage,
    [ErrorCode.UNKNOWN_COMMAND]: ExitCode.Usage,
    [ErrorCode.MISSING_INPUT]: ExitCode.Usage,
    [ErrorCode.MISSING_AUTH]: ExitCode.Auth,
    [ErrorCode.AUTH_EXPIRED]: ExitCode.Auth,
    [ErrorCode.AUTH_FORBIDDEN]: ExitCode.Auth,
    [ErrorCode.NOT_FOUND]: ExitCode.NotFound,
    [ErrorCode.CONFLICT]: ExitCode.Conflict,
    [ErrorCode.ALREADY_EXISTS]: ExitCode.Conflict,
    [ErrorCode.MISSING_DEPENDENCY]: ExitCode.DependencyMissing,
    [ErrorCode.SKILL_FAILED]: ExitCode.SkillFailed,
    [ErrorCode.SKILL_NOT_FOUND]: ExitCode.NotFound,
    [ErrorCode.NETWORK_ERROR]: ExitCode.Network,
    [ErrorCode.TIMEOUT]: ExitCode.Timeout,
    [ErrorCode.IO_ERROR]: ExitCode.IO,
    [ErrorCode.PERMISSION_DENIED]: ExitCode.Permission,
    [ErrorCode.VALIDATION_ERROR]: ExitCode.Validation,
    [ErrorCode.CONFIG_ERROR]: ExitCode.Config,
    [ErrorCode.NOT_IMPLEMENTED]: ExitCode.NotImplemented,
    [ErrorCode.INTERRUPTED]: ExitCode.Interrupted,
  };
  return mapping[code] ?? ExitCode.Error;
};
