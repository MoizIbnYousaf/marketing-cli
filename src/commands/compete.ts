// mktg compete — Competitive war room: monitor, diff, and route competitor changes
// Stores snapshots in .mktg/compete/, diffs against previous, routes to skills.

import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { ok, err, type CommandHandler, type CommandSchema } from "../types";
import { rejectControlChars, validateResourceId } from "../core/errors";
import { isTTY, writeStderr, bold, dim, green, yellow, red } from "../core/output";

export const schema: CommandSchema = {
  name: "compete",
  description: "Competitive war room — monitor competitor URLs, detect changes, route to skills",
  subcommands: [
    {
      name: "scan",
      description: "Fetch tracked competitor URLs and detect changes since last snapshot",
      flags: [],
      output: { results: "ScanResult[] — per-URL scan results with diff status" },
      examples: [{ args: "mktg compete scan --json", description: "Scan all tracked competitors" }],
    },
    {
      name: "watch",
      description: "Add a competitor URL to track",
      flags: [],
      positional: { name: "url", description: "Competitor URL to track", required: true },
      output: { added: "string — URL added to watchlist" },
      examples: [{ args: "mktg compete watch https://competitor.com", description: "Start tracking" }],
    },
    {
      name: "list",
      description: "Show all tracked competitor URLs",
      flags: [],
      output: { urls: "WatchEntry[] — tracked URLs with last scan info" },
      examples: [{ args: "mktg compete list --json", description: "List tracked competitors" }],
    },
    {
      name: "diff",
      description: "Show detailed changes for a specific competitor",
      flags: [],
      positional: { name: "url", description: "Competitor URL to diff", required: true },
      output: { diff: "CompetitorDiff — detailed change analysis" },
      examples: [{ args: "mktg compete diff https://competitor.com", description: "Show changes" }],
    },
  ],
  flags: [],
  output: {
    results: "ScanResult[] — scan results (default: runs scan)",
  },
  examples: [
    { args: "mktg compete scan --json", description: "Scan all tracked competitors" },
    { args: "mktg compete watch https://competitor.com", description: "Add competitor to track" },
  ],
  vocabulary: ["compete", "competitor", "monitor", "watch", "competitive intelligence"],
};

type WatchEntry = {
  readonly url: string;
  readonly addedAt: string;
  readonly lastScan: string | null;
  readonly lastTitle: string | null;
};

type WatchList = {
  readonly version: 1;
  readonly entries: WatchEntry[];
};

type Snapshot = {
  readonly url: string;
  readonly fetchedAt: string;
  readonly title: string;
  readonly description: string;
  readonly headings: readonly string[];
  readonly contentHash: string;
};

type ScanResult = {
  readonly url: string;
  readonly status: "changed" | "unchanged" | "new" | "error";
  readonly title: string;
  readonly changes: readonly string[];
  readonly suggestedSkill: string | null;
};

type CompetitorDiff = {
  readonly url: string;
  readonly previous: Snapshot | null;
  readonly current: Snapshot | null;
  readonly titleChanged: boolean;
  readonly descriptionChanged: boolean;
  readonly headingsAdded: readonly string[];
  readonly headingsRemoved: readonly string[];
};

const COMPETE_DIR = ".mktg/compete";
const WATCHLIST_FILE = "watchlist.json";

const getCompeteDir = (cwd: string) => join(cwd, COMPETE_DIR);

const loadWatchlist = async (cwd: string): Promise<WatchList> => {
  const file = Bun.file(join(getCompeteDir(cwd), WATCHLIST_FILE));
  if (!(await file.exists())) return { version: 1, entries: [] };
  try { return await file.json() as WatchList; } catch { return { version: 1, entries: [] }; }
};

const saveWatchlist = async (cwd: string, list: WatchList): Promise<void> => {
  await mkdir(getCompeteDir(cwd), { recursive: true });
  await Bun.write(join(getCompeteDir(cwd), WATCHLIST_FILE), JSON.stringify(list, null, 2));
};

const urlToFilename = (url: string): string => {
  return url.replace(/https?:\/\//, "").replace(/[^a-z0-9.-]/gi, "_").slice(0, 100);
};

const loadSnapshot = async (cwd: string, url: string): Promise<Snapshot | null> => {
  const file = Bun.file(join(getCompeteDir(cwd), `${urlToFilename(url)}.json`));
  if (!(await file.exists())) return null;
  try { return await file.json() as Snapshot; } catch { return null; }
};

const saveSnapshot = async (cwd: string, snapshot: Snapshot): Promise<void> => {
  await mkdir(getCompeteDir(cwd), { recursive: true });
  await Bun.write(
    join(getCompeteDir(cwd), `${urlToFilename(snapshot.url)}.json`),
    JSON.stringify(snapshot, null, 2),
  );
};

const fetchPage = async (url: string): Promise<Snapshot | null> => {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "mktg-cli/1.0 (competitive-scan)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const html = await resp.text();

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim().replace(/\s+/g, " ") ?? "";

    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
      ?? html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
    const description = descMatch?.[1]?.trim() ?? "";

    const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
    const headings: string[] = [];
    let match;
    while ((match = headingRegex.exec(html)) !== null && headings.length < 20) {
      const text = match[1]!.replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
      if (text.length > 2 && text.length < 200) headings.push(text);
    }

    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(title + description + headings.join("|"));
    const contentHash = hasher.digest("hex");

    return { url, fetchedAt: new Date().toISOString(), title, description, headings, contentHash };
  } catch {
    return null;
  }
};

const suggestSkill = (changes: string[]): string | null => {
  const text = changes.join(" ").toLowerCase();
  if (text.includes("pricing") || text.includes("price")) return "pricing-strategy";
  if (text.includes("feature") || text.includes("launch")) return "competitive-intel";
  if (text.includes("blog") || text.includes("content")) return "seo-content";
  return "competitive-intel";
};

const handleScan = async (cwd: string, dryRun: boolean): Promise<ScanResult[]> => {
  const watchlist = await loadWatchlist(cwd);
  if (watchlist.entries.length === 0) return [];

  const results: ScanResult[] = [];
  for (const entry of watchlist.entries) {
    const previous = await loadSnapshot(cwd, entry.url);
    const current = await fetchPage(entry.url);
    if (!current) {
      results.push({ url: entry.url, status: "error", title: entry.lastTitle ?? "", changes: ["Failed to fetch"], suggestedSkill: null });
      continue;
    }

    if (!previous) {
      if (!dryRun) await saveSnapshot(cwd, current);
      results.push({ url: entry.url, status: "new", title: current.title, changes: ["First scan — baseline captured"], suggestedSkill: null });
      continue;
    }

    const changes: string[] = [];
    if (previous.title !== current.title) changes.push(`Title: "${previous.title}" → "${current.title}"`);
    if (previous.description !== current.description) changes.push("Description changed");
    const newHeadings = current.headings.filter(h => !previous.headings.includes(h));
    const removedHeadings = previous.headings.filter(h => !current.headings.includes(h));
    if (newHeadings.length > 0) changes.push(`New headings: ${newHeadings.join(", ")}`);
    if (removedHeadings.length > 0) changes.push(`Removed headings: ${removedHeadings.join(", ")}`);

    if (!dryRun) await saveSnapshot(cwd, current);

    // Update watchlist entry
    if (!dryRun) {
      const idx = watchlist.entries.findIndex(e => e.url === entry.url);
      if (idx >= 0) {
        (watchlist.entries as WatchEntry[])[idx] = { ...entry, lastScan: current.fetchedAt, lastTitle: current.title };
      }
      await saveWatchlist(cwd, watchlist);
    }

    results.push({
      url: entry.url,
      status: changes.length > 0 ? "changed" : "unchanged",
      title: current.title,
      changes,
      suggestedSkill: changes.length > 0 ? suggestSkill(changes) : null,
    });
  }
  return results;
};

export const handler: CommandHandler = async (args, flags) => {
  const cwd = flags.cwd;
  const positionalArgs = args.filter(a => !a.startsWith("--"));
  const subcommand = positionalArgs[0] ?? "scan";

  if (subcommand === "watch") {
    const url = positionalArgs[1];
    if (!url) return err("INVALID_ARGS", "Missing URL", ["Usage: mktg compete watch <url>"], 2);
    const cc = rejectControlChars(url, "URL");
    if (!cc.ok) return err("INVALID_ARGS", cc.message, [], 2);
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return err("INVALID_ARGS", "URL must start with http:// or https://", [], 2);
    }
    if (flags.dryRun) return ok({ added: url });
    const watchlist = await loadWatchlist(cwd);
    if (watchlist.entries.some(e => e.url === url)) {
      return ok({ added: url, note: "Already tracked" });
    }
    watchlist.entries.push({ url, addedAt: new Date().toISOString(), lastScan: null, lastTitle: null });
    await saveWatchlist(cwd, watchlist);
    return ok({ added: url });
  }

  if (subcommand === "list") {
    const watchlist = await loadWatchlist(cwd);
    if (isTTY() && !flags.json) {
      writeStderr("");
      writeStderr(`  ${bold("mktg compete")} ${dim(`— ${watchlist.entries.length} tracked`)}`);
      for (const e of watchlist.entries) {
        const scanned = e.lastScan ? dim(` (last: ${e.lastScan.split("T")[0]})`) : dim(" (never scanned)");
        writeStderr(`  ${green(">")} ${e.url}${scanned}`);
      }
      writeStderr("");
    }
    return ok({ urls: watchlist.entries });
  }

  if (subcommand === "diff") {
    const url = positionalArgs[1];
    if (!url) return err("INVALID_ARGS", "Missing URL", ["Usage: mktg compete diff <url>"], 2);
    const previous = await loadSnapshot(cwd, url);
    const current = await fetchPage(url);
    const diff: CompetitorDiff = {
      url,
      previous,
      current,
      titleChanged: previous !== null && current !== null && previous.title !== current.title,
      descriptionChanged: previous !== null && current !== null && previous.description !== current.description,
      headingsAdded: current ? current.headings.filter(h => !previous?.headings.includes(h)) : [],
      headingsRemoved: previous ? previous.headings.filter(h => !current?.headings.includes(h)) : [],
    };
    return ok({ diff });
  }

  // Default: scan
  const results = await handleScan(cwd, flags.dryRun);

  if (isTTY() && !flags.json) {
    writeStderr("");
    writeStderr(`  ${bold("mktg compete scan")} ${dim(`— ${results.length} competitors`)}`);
    writeStderr("");
    for (const r of results) {
      const icon = r.status === "changed" ? red("!") : r.status === "new" ? yellow("*") : r.status === "error" ? red("x") : green("=");
      writeStderr(`  ${icon} ${r.url} ${dim(`[${r.status}]`)}`);
      for (const c of r.changes.slice(0, 3)) {
        writeStderr(`    ${dim(c)}`);
      }
      if (r.suggestedSkill) writeStderr(`    ${dim(`→ Run /${r.suggestedSkill}`)}`);
    }
    writeStderr("");
  }

  return ok({ results });
};
