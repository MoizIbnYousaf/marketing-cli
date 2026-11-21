// mktg — Home directory resolution
//
// Single source of truth for "where is the user's home". Prefers the HOME
// environment variable and falls back to the OS lookup.
//
// Why not os.homedir() directly: under Bun, os.homedir() does not follow a
// HOME value assigned at runtime, so code that calls it in-process can never
// be pointed at an isolated directory. That let the test suite write into the
// developer's real ~/.claude and ~/.mktg. Reading HOME first makes every
// install path redirectable by environment, in-process and in child processes.

import { homedir } from "node:os";

export const userHome = (): string => {
  const fromEnv = process.env.HOME;
  return fromEnv && fromEnv.length > 0 ? fromEnv : homedir();
};
