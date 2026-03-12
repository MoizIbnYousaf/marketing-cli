#!/usr/bin/env bun
// mktg — Agent-native marketing playbook CLI
// Entry point — routes to command handlers

const args = process.argv.slice(2)
const command = args[0]

if (!command || command === '--help' || command === '-h') {
  console.log(`mktg v0.1.0 — Agent-native marketing playbook CLI

Commands:
  init       Detect project + build brand/ + install skills
  doctor     Health checks + skill updates
  launch     Full launch package
  content    Generate specific content
  social     Generate social content
  post       Publish via Playwright CLI
  email      Generate + send via gws
  calendar   30-day content calendar
  audit      Marketing analysis + scoring
  test       Full e2e pipeline test
  update     Force-update skills
  list       Show available skills
  schema     Introspect command schemas

Flags:
  --json     Machine-readable JSON output
  --dry-run  Validate without writing/posting
  --fields   Limit output fields

Run 'mktg <command> --help' for command-specific usage.`)
  process.exit(0)
}

// TODO: Route to command handlers in src/commands/
console.error(JSON.stringify({
  error: {
    code: 'NOT_IMPLEMENTED',
    message: `Command '${command}' is not yet implemented.`,
    suggestions: ['mktg --help']
  }
}))
process.exit(1)
