// mktg — content-first home view for bare `mktg` (no command)
// Returns a compact live snapshot (health, brand, skills, next commands) instead
// of static help. `mktg --help` still prints the full command list.

import { homedir } from "node:os";
import { ok, type CommandResult, type GlobalFlags } from "../types";
import { bold, dim, green, red, yellow } from "./output";

export type HomeView = {
  readonly bin: string;
  readonly description: string;
  readonly cwd: string;
  readonly version: string;
  readonly health: "ready" | "incomplete" | "needs-setup" | "unknown";
  readonly brand: { readonly populated: number; readonly total: number };
  readonly skills: { readonly installed: number; readonly total: number };
  readonly help: readonly string[];
};

export const HOME_DESCRIPTION = "Agent-native marketing playbook CLI";

/** Collapse a leading $HOME to `~` so paths are short and machine-portable. */
export const collapseHome = (p: string, home: string = homedir()): string =>
  home && (p === home || p.startsWith(`${home}/`)) ? `~${p.slice(home.length)}` : p;

const helpForHealth = (health: HomeView["health"]): readonly string[] => {
  if (health === "needs-setup") {
    return [
      "mktg init --json",
      "mktg doctor --json",
      "mktg list --json",
      "mktg --help",
    ];
  }
  return [
    "mktg status --json",
    "mktg plan --json",
    "mktg run <skill> --json",
    "mktg brand freshness --json",
    "mktg --help",
  ];
};

type StatusShape = {
  readonly health: HomeView["health"];
  readonly brandSummary: { readonly populated: number };
  readonly brand: Record<string, unknown>;
  readonly skills: { readonly installed: number; readonly total: number };
};

export const buildHomeView = async (
  flags: GlobalFlags,
  version: string,
  bin: string,
): Promise<CommandResult<HomeView>> => {
  let status: StatusShape | undefined;
  try {
    const { handler } = await import("../commands/status");
    const res = await handler([], { ...flags, json: true, fields: [] });
    if (res.ok) status = res.data as unknown as StatusShape;
  } catch {
    // Fall through — home view degrades to "unknown" health rather than failing.
  }
  const health = status?.health ?? "unknown";
  const view: HomeView = {
    bin: collapseHome(bin),
    description: HOME_DESCRIPTION,
    cwd: collapseHome(flags.cwd),
    version,
    health,
    brand: {
      populated: status?.brandSummary.populated ?? 0,
      total: status ? Object.keys(status.brand).length : 0,
    },
    skills: {
      installed: status?.skills.installed ?? 0,
      total: status?.skills.total ?? 0,
    },
    help: helpForHealth(health),
  };
  return ok(view, formatHomeView(view));
};

const healthLabel = (health: HomeView["health"]): string =>
  health === "ready" ? green("● ready")
    : health === "incomplete" ? yellow("● incomplete")
      : health === "needs-setup" ? red("● needs-setup")
        : dim("● unknown");

export const formatHomeView = (v: HomeView): string => [
  `${bold(`mktg v${v.version}`)} ${dim("—")} ${v.description}`,
  `  ${dim("bin")}     ${v.bin}`,
  `  ${dim("cwd")}     ${v.cwd}`,
  `  ${dim("health")}  ${healthLabel(v.health)}`,
  `  ${dim("brand")}   ${v.brand.populated}/${v.brand.total} populated`,
  `  ${dim("skills")}  ${v.skills.installed}/${v.skills.total} installed`,
  "",
  dim("Next:"),
  ...v.help.map((h) => `  ${h}`),
  "",
  dim("Run 'mktg --help' for the full command list."),
].join("\n");
