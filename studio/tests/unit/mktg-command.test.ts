import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { resolveMktgCommand } from "../../lib/mktg-command";

describe("resolveMktgCommand", () => {
  test("uses the bundled CLI instead of requiring a global mktg binary", () => {
    const command = resolveMktgCommand(["status", "--json"]);
    const cliRoot = join(import.meta.dir, "..", "..", "..");

    expect(command[0]).toBe(process.execPath);
    const localEntries = [
      join(cliRoot, "dist", "cli.js"),
      join(cliRoot, "src", "cli.ts"),
    ];
    expect(localEntries.some((entry) => command.includes(entry))).toBe(true);
    expect(command.slice(-2)).toEqual(["status", "--json"]);
  });
});
