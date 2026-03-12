// mktg — YAML frontmatter parser for SKILL.md files
// Parses the subset of YAML used in skill frontmatter without external dependencies.

export type FrontmatterData = Record<string, unknown>;

export type FrontmatterResult = {
  readonly data: FrontmatterData;
  readonly body: string;
};

/**
 * Extract and parse YAML frontmatter from a markdown string.
 * Returns parsed key-value data and the remaining body.
 * If no valid frontmatter is found, returns empty data and the full string as body.
 */
export const parseFrontmatter = (raw: string): FrontmatterResult => {
  const lines = raw.split(/\r?\n/);
  if (lines.length === 0 || lines[0]?.trim() !== "---") {
    return { data: {}, body: raw };
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i]?.trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { data: {}, body: raw };
  }

  const yamlLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join("\n");
  const data = parseYamlBlock(yamlLines);

  return { data, body };
};

/**
 * Parse a simple YAML block into a key-value record.
 * Handles: scalars, multiline strings (> and |), and arrays (- items).
 */
const parseYamlBlock = (lines: string[]): FrontmatterData => {
  const data: FrontmatterData = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Skip empty lines and comments
    if (line.trim() === "" || line.trim().startsWith("#")) {
      i += 1;
      continue;
    }

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) {
      i += 1;
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const afterColon = line.slice(colonIndex + 1).trim();

    if (afterColon === "" || afterColon === "|" || afterColon === ">") {
      // Could be a multiline string or array — peek at next lines
      const isBlock = afterColon === "|" || afterColon === ">";
      const foldBlock = afterColon === ">";

      i += 1;

      // Check if it's an array (next non-empty line starts with -)
      const nextNonEmpty = findNextNonEmptyLine(lines, i);
      if (nextNonEmpty !== null && (lines[nextNonEmpty]?.trim().startsWith("- ") ?? false)) {
        // Array
        const items: string[] = [];
        while (i < lines.length) {
          const arrLine = lines[i] ?? "";
          if (arrLine.trim() === "") {
            i += 1;
            continue;
          }
          if (!arrLine.match(/^\s+-\s/)) break;
          items.push(arrLine.trim().slice(2).trim());
          i += 1;
        }
        data[key] = items;
      } else if (isBlock) {
        // Multiline string block
        const blockLines: string[] = [];
        while (i < lines.length) {
          const blockLine = lines[i] ?? "";
          // Stop at non-indented lines (new key or empty followed by new key)
          if (blockLine.trim() !== "" && !blockLine.startsWith(" ") && !blockLine.startsWith("\t")) {
            break;
          }
          if (blockLine.trim() === "" && i + 1 < lines.length) {
            const next = lines[i + 1] ?? "";
            if (next.trim() !== "" && !next.startsWith(" ") && !next.startsWith("\t")) {
              break;
            }
          }
          blockLines.push(blockLine.replace(/^ {2}/, ""));
          i += 1;
        }
        const joined = foldBlock
          ? blockLines.map((l) => l.trim()).filter(Boolean).join(" ")
          : blockLines.join("\n");
        data[key] = joined.trim();
      } else {
        // Empty value
        data[key] = "";
      }
    } else if (afterColon.startsWith("[")) {
      // Inline array: [a, b, c]
      const match = afterColon.match(/^\[(.*)]\s*$/);
      if (match?.[1] !== undefined) {
        data[key] = match[1]
          .split(",")
          .map((s) => unquote(s.trim()))
          .filter(Boolean);
      } else {
        data[key] = afterColon;
      }
      i += 1;
    } else {
      // Scalar value
      data[key] = parseScalar(afterColon);
      i += 1;
    }
  }

  return data;
};

const findNextNonEmptyLine = (lines: string[], start: number): number | null => {
  for (let i = start; i < lines.length; i += 1) {
    if ((lines[i]?.trim() ?? "") !== "") return i;
  }
  return null;
};

const parseScalar = (value: string): string | number | boolean => {
  const unquoted = unquote(value);

  if (unquoted === "true") return true;
  if (unquoted === "false") return false;
  if (unquoted === "null" || unquoted === "~") return "";

  // Check for number
  if (/^-?\d+(\.\d+)?$/.test(unquoted)) {
    return Number(unquoted);
  }

  return unquoted;
};

const unquote = (s: string): string => {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
};
