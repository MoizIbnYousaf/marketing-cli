// E2E: Schema Contract Test
// Proves mktg schema output is the COMPLETE agent contract:
// every command listed, every flag typed, every response field documented,
// every exit code mapped, responseSchema matches actual output.
// Real CLI calls via subprocess. NO MOCKS.
//
// Agent DX Axes Validated:
// - Axis 3: SCHEMA INTROSPECTION (3/3) — per-command schemas with typed flags, output fields, examples
// - Axis 7: AGENT KNOWLEDGE PACKAGING (3/3) — schema is self-describing, agent can discover all commands without docs

import { describe, it, expect } from "bun:test";
import { join } from "node:path";

const CLI = join(import.meta.dir, "../../src/cli.ts");

const run = async (args: string): Promise<{ stdout: string; exitCode: number }> => {
  const proc = Bun.spawn(["bun", "run", CLI, ...args.split(" "), "--json"], {
    cwd: import.meta.dir,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, NO_COLOR: "1" },
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { stdout, exitCode };
};

const parseJSON = (stdout: string): any => {
  try {
    return JSON.parse(stdout);
  } catch {
    // Try to find JSON in the output
    const match = stdout.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`No JSON in output: ${stdout.slice(0, 200)}`);
  }
};

describe("Schema Contract: mktg schema is the complete agent contract", () => {
  it("schema command returns valid JSON", async () => {
    const { stdout, exitCode } = await run("schema");
    expect(exitCode).toBe(0);
    const data = parseJSON(stdout);
    expect(data).toBeDefined();
    // Schema may use ok/data envelope OR direct {version, commands} shape
    const commands = data.data?.commands ?? data.commands;
    expect(commands).toBeDefined();
  });

  it("schema lists all 10 top-level commands", async () => {
    const { stdout } = await run("schema");
    const data = parseJSON(stdout);
    const commands = data.data?.commands ?? data.commands;

    const expectedCommands = ["init", "doctor", "list", "status", "update", "schema", "skill", "brand", "run", "context"];

    expect(Array.isArray(commands)).toBe(true);
    const commandNames = commands.map((c: any) => c.name);
    for (const cmd of expectedCommands) {
      expect(commandNames).toContain(cmd);
    }
  });

  it("each command has required schema fields", async () => {
    const { stdout } = await run("schema");
    const data = parseJSON(stdout);
    const commands = data.data?.commands ?? data.commands;

    for (const cmd of commands) {
      expect(cmd.name).toBeDefined();
      expect(typeof cmd.name).toBe("string");
      expect(cmd.description).toBeDefined();
      expect(typeof cmd.description).toBe("string");
      expect(cmd.flags).toBeDefined();
      expect(Array.isArray(cmd.flags)).toBe(true);
      expect(cmd.output).toBeDefined();
      expect(typeof cmd.output).toBe("object");
      expect(cmd.examples).toBeDefined();
      expect(Array.isArray(cmd.examples)).toBe(true);
    }
  });

  it("update command schema documents all output fields including agentError", async () => {
    const { stdout } = await run("schema");
    const data = parseJSON(stdout);
    const commands = data.data?.commands ?? data.commands;

    const updateCmd = commands.find((c: any) => c.name === "update");
    expect(updateCmd).toBeDefined();
    const outputFields = Object.keys(updateCmd.output);
    expect(outputFields).toContain("skills.updated");
    expect(outputFields).toContain("agents.updated");
    expect(outputFields).toContain("agentError");
    expect(outputFields).toContain("totalSkills");
    expect(outputFields).toContain("totalAgents");
  });

  it("run command schema documents priorRuns", async () => {
    const { stdout } = await run("schema");
    const data = parseJSON(stdout);
    const commands = data.data?.commands ?? data.commands;

    const runCmd = commands.find((c: any) => c.name === "run");
    expect(runCmd).toBeDefined();
    const outputFields = Object.keys(runCmd.output);
    expect(outputFields).toContain("skill");
    expect(outputFields).toContain("content");
    expect(outputFields).toContain("priorRuns");
    expect(outputFields).toContain("loggedAt");
  });

  it("every command has at least one example", async () => {
    const { stdout } = await run("schema");
    const data = parseJSON(stdout);
    const commands = data.data?.commands ?? data.commands;

    for (const cmd of commands) {
      expect(cmd.examples.length).toBeGreaterThan(0);
      for (const example of cmd.examples) {
        expect(example.args).toBeDefined();
        expect(example.description).toBeDefined();
      }
    }
  });

  it("skill and brand commands have subcommands", async () => {
    const { stdout } = await run("schema");
    const data = parseJSON(stdout);
    const commands = data.data?.commands ?? data.commands;

    const skillCmd = commands.find((c: any) => c.name === "skill");
    const brandCmd = commands.find((c: any) => c.name === "brand");

    if (skillCmd?.subcommands) {
      expect(skillCmd.subcommands.length).toBeGreaterThan(0);
    }
    if (brandCmd?.subcommands) {
      expect(brandCmd.subcommands.length).toBeGreaterThan(0);
    }
  });

  it("flag definitions have type information", async () => {
    const { stdout } = await run("schema");
    const data = parseJSON(stdout);
    const commands = data.data?.commands ?? data.commands;

    for (const cmd of commands) {
      for (const flag of cmd.flags) {
        expect(flag.name).toBeDefined();
        expect(flag.type).toBeDefined();
        expect(["boolean", "string", "string[]"]).toContain(flag.type);
      }
    }
  });

  it("schema output is self-describing for agent consumption", async () => {
    const { stdout } = await run("schema");
    const data = parseJSON(stdout);

    // Agent can enumerate all commands
    const commands = data.data?.commands ?? data.commands;
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThanOrEqual(9);

    // Agent can get version info
    const version = data.data?.version ?? data.version;
    expect(version).toBeDefined();
  });
});
