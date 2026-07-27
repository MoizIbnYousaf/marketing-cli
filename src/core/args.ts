// mktg — Canonical CLI flag parsing helpers
// One home for the `--flag value` / `--flag=value` pattern. Until this
// module existed, ~12 command files hand-rolled the same loop; new parsing
// should live here, and older call sites migrate opportunistically.

/** Last value for a flag: `--flag value` or `--flag=value`. Undefined when absent. */
export const flagValue = (args: readonly string[], name: string): string | undefined => {
  const prefix = `${name}=`;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === name && args[i + 1] !== undefined) return args[i + 1]!;
    if (a.startsWith(prefix)) return a.slice(prefix.length);
  }
  return undefined;
};

/** Every value for a repeatable flag, comma-expanded: `--flag a,b --flag c` → ["a","b","c"]. */
export const flagValues = (args: readonly string[], name: string): readonly string[] => {
  const prefix = `${name}=`;
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === name && args[i + 1] !== undefined) {
      out.push(...args[i + 1]!.split(","));
      i++;
    } else if (a.startsWith(prefix)) {
      out.push(...a.slice(prefix.length).split(","));
    }
  }
  return out.map(v => v.trim()).filter(Boolean);
};

/** Boolean presence check for value-less flags. */
export const hasFlag = (args: readonly string[], name: string): boolean => args.includes(name);
