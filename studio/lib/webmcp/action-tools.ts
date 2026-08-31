import {
  enumInput,
  inputRecord,
  stringInput,
  withExecutionSignal,
  type WebMCPRequest,
} from "./client"

export type WebMCPNavigate = (input: {
  view: string
  skill?: string
  platform?: string
  stream?: string
  time?: string
}) => Promise<{ ok: true; path: string }>

export type WebMCPConfirm = (message: string) => boolean | Promise<boolean>

const objectSchema = (properties: Record<string, object> = {}, required: string[] = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
})

const actionAnnotations = {
  readOnlyHint: false,
  untrustedContentHint: true,
} as const

export function createWebMCPActionTools(
  request: WebMCPRequest,
  navigate: WebMCPNavigate,
  confirm: WebMCPConfirm,
): WebMCP.ModelContextTool[] {
  return [
    actionTool("mktg.studio.navigate", "Open Studio view", "Navigate the visible Studio UI to Pulse, Signals, Publish, Brand, Skills, a skill detail, Settings, or Onboarding. This changes only browser navigation.", async (raw) => {
      const input = inputRecord(raw)
      const view = enumInput(input, "view", ["pulse", "signals", "publish", "brand", "skills", "skill", "settings", "onboarding"] as const)
      return navigate({
        view,
        skill: stringInput(input, "skill", { max: 128 }),
        platform: stringInput(input, "platform", { max: 64 }),
        stream: stringInput(input, "stream", { max: 64 }),
        time: stringInput(input, "time", { max: 64 }),
      })
    }, objectSchema({
      view: { type: "string", enum: ["pulse", "signals", "publish", "brand", "skills", "skill", "settings", "onboarding"] },
      skill: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$", maxLength: 128, description: "Required when view is skill." },
      platform: { type: "string", maxLength: 64, description: "Optional Signals platform filter." },
      stream: { type: "string", maxLength: 64, description: "Optional Signals stream filter." },
      time: { type: "string", maxLength: 64, description: "Optional Signals time filter." },
    }, ["view"])),

    actionTool("mktg.studio.signal.review", "Review marketing signal", "Approve, dismiss, or flag one signal. Studio always asks the human for confirmation before persisting the review.", async (raw, { signal }) => {
      const input = inputRecord(raw)
      const id = input.id
      if (!Number.isInteger(id) || (id as number) <= 0) throw new Error("id must be a positive integer")
      const action = enumInput(input, "action", ["approve", "dismiss", "flag"] as const)
      const reason = stringInput(input, "reason", { max: 500 })
      if (action === "flag" && !reason) throw new Error("reason is required when action is flag")
      if (!(await confirm(`Allow the agent to ${action} signal ${id}?`))) return cancelled()
      return request(`/api/signals/${action}`, {
        method: "POST",
        body: action === "flag" ? { id, reason } : { id },
        signal,
      })
    }, objectSchema({
      id: { type: "integer", minimum: 1 },
      action: { type: "string", enum: ["approve", "dismiss", "flag"] },
      reason: { type: "string", maxLength: 500 },
    }, ["id", "action"])),

    actionTool("mktg.studio.brand.update", "Update brand memory", "Atomically update one brand-memory Markdown file using its current mtime. Studio shows a human confirmation dialog before writing.", async (raw, { signal }) => {
      const input = inputRecord(raw)
      const file = stringInput(input, "file", { required: true, max: 128 })!
      const content = stringInput(input, "content", { required: true, max: 2_000_000, allowEmpty: true })!
      const expectedMtime = stringInput(input, "expectedMtime", { required: true, max: 64 })!
      if (!(await confirm(`Allow the agent to replace brand/${file.replace(/^brand\//, "")}?`))) return cancelled()
      return request("/api/brand/write", {
        method: "POST",
        body: { file, content, expectedMtime },
        signal,
      })
    }, objectSchema({
      file: { type: "string", pattern: "^(brand/)?[a-z0-9][a-z0-9._-]*\\.md$", maxLength: 128 },
      content: { type: "string", maxLength: 2_000_000 },
      expectedMtime: { type: "string", maxLength: 64, description: "The exact mtime returned by mktg.studio.brand.read." },
    }, ["file", "content", "expectedMtime"])),

    actionTool("mktg.studio.content.update", "Update marketing content", "Atomically update one existing project-local text artifact using its current mtime. Studio asks the human before writing.", async (raw, { signal }) => {
      const input = inputRecord(raw)
      const path = stringInput(input, "path", { required: true, max: 1_024 })!
      const content = stringInput(input, "content", { required: true, max: 5_000_000, allowEmpty: true })!
      const expectedMtime = stringInput(input, "expectedMtime", { required: true, max: 64 })!
      if (!(await confirm(`Allow the agent to replace ${path}?`))) return cancelled()
      return request("/api/cmo/content/file", {
        method: "PUT",
        body: { path, content, expectedMtime },
        signal,
      })
    }, objectSchema({
      path: { type: "string", maxLength: 1024 },
      content: { type: "string", maxLength: 5_000_000 },
      expectedMtime: { type: "string", maxLength: 64, description: "The exact mtime returned by mktg.studio.content.read." },
    }, ["path", "content", "expectedMtime"])),

    actionTool("mktg.studio.skill.queue", "Queue /cmo skill", "Queue one installed marketing skill for the user's /cmo session. This does not falsely claim the skill already ran. Studio asks the human before creating the job.", async (raw, { signal }) => {
      const input = inputRecord(raw)
      const name = stringInput(input, "name", { required: true, max: 128 })!
      if (!(await confirm(`Allow the agent to queue the ${name} skill for /cmo?`))) return cancelled()
      return request("/api/skill/run", { method: "POST", body: { name }, signal })
    }, objectSchema({ name: { type: "string", pattern: "^[a-z0-9][a-z0-9-]*$", maxLength: 128 } }, ["name"])),

    actionTool("mktg.studio.foundation.start", "Start marketing foundation", "Start Studio's three-lane brand foundation setup. This initializes local brand files and may inspect the supplied public website. Studio asks the human before starting.", async (raw, { signal }) => {
      const input = inputRecord(raw)
      const from = stringInput(input, "from", { max: 2_048 })
      if (!(await confirm(`Allow the agent to start the marketing foundation${from ? ` from ${from}` : ""}?`))) return cancelled()
      return request("/api/onboarding/foundation", {
        method: "POST",
        body: { ...(from ? { from } : {}), seed: !from },
        signal,
      })
    }, objectSchema({ from: { type: "string", format: "uri", maxLength: 2048 } })),

    actionTool("mktg.studio.publish.preview", "Preview publish request", "Validate a publish manifest through Studio's real adapter contract using dry-run only. This tool never publishes externally; the human finishes publishing in the visible Publish UI.", async (raw, { signal }) => {
      const input = inputRecord(raw)
      const adapter = stringInput(input, "adapter", { required: true, max: 64 })!
      const manifest = input.manifest
      if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
        throw new Error("manifest must be an object")
      }
      return request("/api/publish?dryRun=true", {
        method: "POST",
        body: { adapter, manifest, confirm: false },
        signal,
      })
    }, objectSchema({
      adapter: { type: "string", pattern: "^[a-z0-9._-]+$", maxLength: 64 },
      manifest: { type: "object", description: "A publish manifest matching the Studio /api/publish schema." },
    }, ["adapter", "manifest"])),
  ]
}

function actionTool(
  name: string,
  title: string,
  description: string,
  execute: WebMCP.ModelContextTool["execute"],
  inputSchema: object,
): WebMCP.ModelContextTool {
  return {
    name,
    title,
    description,
    inputSchema,
    execute: withExecutionSignal(execute),
    annotations: actionAnnotations,
  }
}

function cancelled() {
  return { ok: false, cancelled: true, message: "The human declined this Studio action." }
}
