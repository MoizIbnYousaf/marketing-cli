import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const skillPath = join(root, "skills", "ai-seo", "SKILL.md");

describe("ai-seo durable AEO program contract", () => {
  test("owns repeatable measurement, diagnosis, execution, and remeasurement", async () => {
    const skill = await Bun.file(skillPath).text();
    for (const mode of ["setup", "audit", "plan", "fix", "remeasure", "report"]) {
      expect(skill).toContain(`\`${mode}\``);
    }
    expect(skill).toContain(".aeo/report.md");
    expect(skill).toContain(".aeo/gameplan.md");
    expect(skill).toContain("sample size");
    expect(skill).toContain("Never ask a leading question");
    expect(skill).toContain("Never auto-publish");
  });

  test("ships every referenced AEO method file", async () => {
    const skill = await Bun.file(skillPath).text();
    const refs = [...skill.matchAll(/\]\(references\/([^)]+\.md)\)/g)].map(match => match[1]!);
    expect(refs.length).toBeGreaterThanOrEqual(5);
    for (const ref of refs) {
      expect(await Bun.file(join(root, "skills", "ai-seo", "references", ref)).exists()).toBe(true);
    }
  });

  test("default OpenSEO MCP config supports OAuth without embedding an empty bearer header", async () => {
    const config = await Bun.file(join(root, ".mcp.json")).json() as {
      mcpServers: { openseo: { url: string; headers?: Record<string, string> } };
    };
    expect(config.mcpServers.openseo.url).toBe("https://app.openseo.so/mcp");
    expect(config.mcpServers.openseo.headers).toBeUndefined();
  });
});
