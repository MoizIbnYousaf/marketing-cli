// mktg — YAML scalar reading for top-level frontmatter keys
// Reads one top-level value the way YAML does: plain (multi-line folded),
// single- and double-quoted (with folding and escapes), and block scalars
// (`|` literal, `>` folded, `-`/`+` chomping, 1-9 indentation indicator).
// Pure functions, no dependency: the bundled CLI also runs under node,
// where Bun.YAML does not exist.

export type ScalarRead = {
  readonly value: string;
  /** Index of the first line after the scalar. */
  readonly next: number;
};

const BLOCK_HEADER = /^([|>])([1-9][+-]?|[+-][1-9]?)?\s*(?:#.*)?$/;

const indentOf = (line: string): number => line.length - line.trimStart().length;

const isBlank = (line: string): boolean => line.trim() === "";

/** Strip a trailing ` # comment` from a plain scalar line. */
const stripComment = (text: string): string => {
  const at = text.search(/(^|\s)#/);
  return at < 0 ? text : text.slice(0, at);
};

/** Fold the lines of a flow (plain or quoted) scalar: a break is a space, n empty lines are n newlines. */
const foldFlowLines = (lines: readonly string[]): string => {
  let out = "";
  let empties = 0;
  let started = false;
  for (const line of lines) {
    if (line === "") { empties += 1; continue; }
    if (started) out += empties > 0 ? "\n".repeat(empties) : " ";
    out += line;
    started = true;
    empties = 0;
  }
  return out;
};

const readBlock = (lines: readonly string[], start: number, header: RegExpMatchArray): ScalarRead => {
  const style = header[1]!;
  const indicators = header[2] ?? "";
  const chomp = indicators.includes("-") ? "strip" : indicators.includes("+") ? "keep" : "clip";
  const digit = indicators.match(/[1-9]/)?.[0];
  let indent = digit ? Number(digit) : 0;
  let i = start;
  const body: string[] = [];
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (isBlank(line)) { body.push(indent > 0 && line.length > indent ? line.slice(indent) : ""); continue; }
    if (indent === 0) indent = indentOf(line);
    if (indent === 0 || indentOf(line) < indent) break;
    body.push(line.slice(indent));
  }
  let last = body.length;
  while (last > 0 && body[last - 1] === "") last -= 1;
  const trailing = body.length - last;
  const content = body.slice(0, last);
  // Blank lines after the scalar belong to the document, not the value.
  const next = i;
  let text: string;
  if (style === "|") {
    text = content.join("\n");
  } else {
    text = "";
    let empties = 0;
    let prev: "none" | "normal" | "more" = "none";
    for (const line of content) {
      if (line === "") { empties += 1; continue; }
      const more = /^[ \t]/.test(line);
      if (prev === "none") text += "\n".repeat(empties);
      else if (prev === "normal" && !more) text += empties > 0 ? "\n".repeat(empties) : " ";
      else text += "\n" + "\n".repeat(empties);
      text += line;
      empties = 0;
      prev = more ? "more" : "normal";
    }
  }
  if (content.length === 0) return { value: chomp === "keep" ? "\n".repeat(trailing) : "", next };
  const value = chomp === "strip" ? text : chomp === "clip" ? text + "\n" : text + "\n" + "\n".repeat(trailing);
  return { value, next };
};

const DOUBLE_ESCAPES: Record<string, string> = {
  "0": "\0", a: "\x07", b: "\b", t: "\t", "\t": "\t", n: "\n", v: "\v", f: "\f", r: "\r",
  e: "\x1b", " ": " ", '"': '"', "/": "/", "\\": "\\", N: "\x85", _: "\xa0", L: " ", P: " ",
};

const unescapeDouble = (text: string): string =>
  text.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g, (whole, esc: string) => {
    if (esc.length > 1) return String.fromCodePoint(parseInt(esc.slice(1), 16));
    return DOUBLE_ESCAPES[esc] ?? whole;
  });

/** Find the closing quote; returns its offset in `text` or -1. */
const closingQuote = (text: string, quote: string, from: number): number => {
  for (let k = from; k < text.length; k++) {
    const c = text[k];
    if (quote === '"' && c === "\\") { k += 1; continue; }
    if (c === quote) {
      if (quote === "'" && text[k + 1] === "'") { k += 1; continue; }
      return k;
    }
  }
  return -1;
};

const readQuoted = (lines: readonly string[], start: number, first: string): ScalarRead | null => {
  const quote = first[0]!;
  const parts: string[] = [];
  let rest = first.slice(1);
  let i = start;
  for (;;) {
    const end = closingQuote(rest, quote, 0);
    if (end >= 0) { parts.push(rest.slice(0, end)); break; }
    parts.push(rest);
    if (i >= lines.length) return null;
    rest = lines[i]!;
    i += 1;
  }
  // Fold the raw lines: outer whitespace of each line goes, breaks fold.
  const trimmed = parts.map((p, k) => {
    let t = p;
    if (k > 0) t = t.trimStart();
    if (k < parts.length - 1) t = t.trimEnd();
    return t;
  });
  if (quote === "'") return { value: foldFlowLines(trimmed).replace(/''/g, "'"), next: i };
  // Double quotes: a line ending in an odd number of backslashes joins with no space.
  let out = "";
  let empties = 0;
  let joinTight = false;
  trimmed.forEach((line, k) => {
    if (k === 0) { out = line; } else if (line === "" && k < trimmed.length - 1) { empties += 1; return; } else {
      out += joinTight ? "" : empties > 0 ? "\n".repeat(empties) : " ";
      out += line;
      empties = 0;
    }
    const slashes = (line.match(/\\+$/)?.[0].length ?? 0);
    joinTight = slashes % 2 === 1 && k < trimmed.length - 1;
    if (joinTight) out = out.slice(0, -1);
  });
  return { value: unescapeDouble(out), next: i };
};

/**
 * Read the scalar value of a top-level key. `inline` is the text after
 * `key:` on the key's own line; `start` is the index of the next line.
 * Returns null for a malformed quoted scalar (no closing quote).
 */
export const readTopLevelScalar = (lines: readonly string[], start: number, inline: string): ScalarRead | null => {
  const head = inline.trim();
  const header = head.match(BLOCK_HEADER);
  if (header) return readBlock(lines, start, header);
  if (head.startsWith('"') || head.startsWith("'")) return readQuoted(lines, start, head);
  const collected: string[] = [stripComment(head).trim()];
  let i = start;
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (isBlank(line)) { collected.push(""); continue; }
    if (indentOf(line) === 0) break;
    if (/^\s*#/.test(line)) continue;
    collected.push(stripComment(line).trim());
  }
  return { value: foldFlowLines(collected), next: i };
};
