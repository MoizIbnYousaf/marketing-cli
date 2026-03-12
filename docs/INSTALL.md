# Installing mktg

## Quick Start

```bash
# One-liner (recommended)
curl -fsSL https://raw.githubusercontent.com/MoizIbnYousaf/mktg/main/install.sh | bash

# Or install directly with bun
bun install -g mktg

# Or with npm
npm install -g mktg
```

## What Gets Installed

1. **`mktg` CLI** — the command-line tool, installed globally
2. **38 marketing skills** — SKILL.md files installed to `~/.claude/skills/`
3. **`/cmo` skill** — the orchestrator skill that teaches agents how to use everything

## Post-Install Setup

After installing, run `mktg init` in any project directory:

```bash
cd your-project
mktg init
```

This will:
- Detect your project (reads package.json, README, etc.)
- Scaffold the `brand/` directory with starter templates
- Install marketing skills to `~/.claude/skills/`
- Run `mktg doctor` to verify everything works

### Non-Interactive Mode (for agents/CI)

```bash
# With defaults
mktg init --yes

# With specific input
mktg init --json '{"business":"My App","goal":"launch"}'
```

## Requirements

| Requirement | Version | Required |
|------------|---------|----------|
| Bun | latest | Recommended |
| Node.js | 18+ | Alternative to Bun |
| Claude Code | latest | For skill usage |

### Optional Tools

These enhance specific skills but aren't required:

| Tool | Purpose |
|------|---------|
| `gws` | Email sending via Gmail |
| `playwright-cli` | Social media posting |
| `ffmpeg` | Video processing |

Run `mktg doctor` to check which tools are available.

## Updating

```bash
# Update the CLI
bun update -g mktg
# or
npm update -g mktg

# Update skills only
mktg update
```

Or re-run the install script — it always installs the latest version:

```bash
curl -fsSL https://raw.githubusercontent.com/MoizIbnYousaf/mktg/main/install.sh | bash
```

## Verifying Installation

```bash
# Check CLI is installed
mktg --help

# Run health checks
mktg doctor

# List available skills
mktg list
```

## Uninstalling

```bash
# Remove the CLI
bun remove -g mktg
# or
npm uninstall -g mktg

# Remove installed skills (optional)
rm -rf ~/.claude/skills/mktg-*
```

## Troubleshooting

### `mktg: command not found`

The global bin directory isn't in your PATH. Add it:

```bash
# For bun
export PATH="$HOME/.bun/bin:$PATH"

# For npm
export PATH="$(npm bin -g):$PATH"
```

Add the appropriate line to your shell profile (`~/.zshrc`, `~/.bashrc`).

### `mktg init` fails

1. Make sure you're in a project directory (one with a package.json or README)
2. Run `mktg doctor` to see what's missing
3. Try with `--yes` flag: `mktg init --yes`

### Skills not installing

Check that `~/.claude/` exists and is writable:

```bash
ls -la ~/.claude/
mkdir -p ~/.claude/skills
```

### Permission errors on install

```bash
# Option 1: Use bun (installs to ~/.bun, no sudo needed)
bun install -g mktg

# Option 2: Fix npm permissions
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH="$HOME/.npm-global/bin:$PATH"
npm install -g mktg
```
