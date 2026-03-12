# ASC CLI Distribution & Self-Bootstrap Patterns

Research analysis of how [ASC CLI](https://github.com/rudrankriyam/App-Store-Connect-CLI) handles installation, distribution, and self-bootstrapping — extracted for mktg's distribution story.

## 1. install.sh — OS/Arch Detection & Binary Download

ASC uses a single `install.sh` that:

1. **Detects OS** via `uname -s` → maps Darwin→macOS, Linux→linux
2. **Detects architecture** via `uname -m` → normalizes to amd64/arm64
3. **Resolves latest version** by following the GitHub `/releases/latest` redirect URL and extracting the tag from the final URL
4. **Downloads the platform-specific binary** from `github.com/{repo}/releases/download/{version}/{bin}_{version}_{os}_{arch}`
5. **Verifies checksum** (SHA-256) against a checksums.txt file published alongside release assets
6. **Installs to `~/.local/bin`** by default (falls back to `/usr/local/bin`), using `sudo` only when the directory isn't writable
7. **Warns about PATH** if the install directory isn't on `$PATH`

**Key patterns:**
- `set -euo pipefail` — fail fast, no silent errors
- `trap 'rm -rf "${TMP_DIR}"' EXIT` — always clean up temp files
- Graceful degradation: if checksums can't be downloaded or verified, it warns but continues
- `INSTALL_DIR` is overridable via environment variable
- Uses `install -m 755` for proper permissions (not just `cp`)

**What mktg adapts:**
- mktg is a Bun/Node tool distributed via npm, not a compiled binary. The install.sh equivalent is `bun install -g mktg` or `npm install -g mktg`.
- The install.sh for mktg should: (1) detect if bun is available, (2) fall back to npm, (3) install globally, (4) run `mktg init` post-install.

## 2. Release Workflow

ASC uses a GitHub Actions workflow triggered by semver tags (`[0-9]*.[0-9]*.[0-9]*`):

1. **Guardrails before release:** format-check, lint, docs sync, full test suite
2. **Multi-platform builds:** macOS (amd64 + arm64), Linux (amd64 + arm64), Windows (amd64)
3. **Code signing:** Apple Developer ID codesigning for macOS binaries
4. **Checksums:** SHA-256 checksums file published with every release
5. **GitHub Release:** created via `softprops/action-gh-release` with auto-generated release notes
6. **Homebrew tap update:** automatically updates a separate homebrew-tap repo with the new version and SHA

**Key patterns:**
- Version, commit hash, and build date are injected at compile time via `-ldflags`
- Release runs on `macos-latest` (needed for codesigning)
- Homebrew formula update is non-blocking (graceful failure if token not set)
- Uses `generate_release_notes: true` for automatic changelogs

**What mktg adapts:**
- npm handles distribution, so the release workflow is simpler: test → publish to npm
- Version injection can be done via package.json version field
- Auto-generated release notes from GitHub are still valuable

## 3. Versioning & Changelogs

- **Versioning:** Git tags in semver format trigger releases. Version is derived from `git describe --tags`
- **Changelogs:** GitHub's auto-generated release notes (based on PR titles/labels since last tag)
- **No manual CHANGELOG.md** — relies on GitHub releases page as the changelog

**What mktg adapts:**
- Use `npm version patch/minor/major` → git tag → push tag → CI publishes
- GitHub auto-generated release notes

## 4. Self-Update Patterns

ASC does **not** have a built-in self-update command. Users update via:
- `brew upgrade asc` (Homebrew)
- Re-running the install script (which always fetches latest)

**What mktg adapts:**
- `mktg update` already exists for updating skills
- For CLI self-update: `bun update -g mktg` or `npm update -g mktg`
- The install.sh can double as an update mechanism (re-run = update)

## 5. Doctor/Health Check Patterns

ASC doesn't have a formal `doctor` command, but it uses several validation patterns:

- **Pre-release guardrails:** format-check, lint, docs sync, test suite all must pass
- **`make dev`:** runs format → lint → test → build as a single dev-readiness check
- **Integration tests:** opt-in, require real credentials via env vars
- **`ASC_BYPASS_KEYCHAIN=1`:** allows tests to run in CI without macOS keychain access

**What mktg already has:**
- `mktg doctor` checks brand files, installed skills, and CLI dependencies — this is more sophisticated than ASC's approach

## 6. Distribution Philosophy Summary

| Aspect | ASC CLI | mktg |
|--------|---------|------|
| **Language** | Go (compiled binary) | TypeScript/Bun (npm package) |
| **Primary install** | `brew install asc` | `bun install -g mktg` |
| **Fallback install** | `curl \| bash` (downloads binary) | `curl \| bash` (installs via bun/npm) |
| **Post-install** | Manual `asc auth login` | Automatic `mktg init` |
| **Update** | `brew upgrade` / re-run install.sh | `bun update -g mktg` / re-run install.sh |
| **Health check** | Pre-release CI guardrails | `mktg doctor` (runtime) |
| **Versioning** | Git tags → goreleaser | npm version → npm publish |
| **Skills** | Separate repo of agent skills | Bundled with CLI |

## 7. Key Takeaways for mktg

1. **The `curl | bash` pattern is table stakes** — even with npm as primary, a one-liner install script removes friction
2. **Post-install bootstrapping is the differentiator** — ASC requires manual auth setup; mktg's `init` auto-scaffolds everything
3. **Graceful degradation matters** — ASC's install.sh warns but continues when checksums can't verify; mktg should similarly handle missing optional tools
4. **Checksum verification is good practice** — even though npm handles integrity, the install.sh should verify bun/npm is legitimate
5. **Keep the release workflow simple** — ASC's workflow is complex because of cross-platform Go compilation; mktg just needs test → npm publish
6. **PATH awareness** — warn users if the install location isn't on PATH (ASC does this well)
