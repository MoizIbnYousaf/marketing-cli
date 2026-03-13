// mktg — Shared routing utilities for namespace commands
// Used by skill.ts, brand.ts, content.ts to dispatch subcommands.

export const isKeyOf = <T extends Record<string, unknown>>(
  obj: T,
  key: string,
): key is keyof T & string => key in obj;
