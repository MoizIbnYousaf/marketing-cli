#!/usr/bin/env bash
# ============================================================================
# install.sh - Vibe Marketing Skills v2 Installer
# ============================================================================
# Installs the Vibe Marketing skill suite into Claude Desktop's skill
# directory so every conversation has access to professional marketing tools.
#
# Usage:
#   ./install.sh              Install full skill suite
#   ./install.sh --claude-only  Install only Claude-native skills (no Replicate)
#
# Environment:
#   TVM_INSTALL_HOME  Override the install root (default: ~/.claude)
#                     Useful for testing in isolated environments.
# ============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INSTALL_HOME="${TVM_INSTALL_HOME:-$HOME/.claude}"
SKILLS_DIR="$INSTALL_HOME/skills"
SYSTEM_DIR="$SKILLS_DIR/_system"
CLAUDE_ONLY=false
VERSION="2.0"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --claude-only)
      CLAUDE_ONLY=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [--claude-only]"
      echo ""
      echo "Options:"
      echo "  --claude-only  Skip the creative skill (requires Replicate API)"
      echo "  --help         Show this help message"
      exit 0
      ;;
    *)
      echo "Error: Unknown option '$1'"
      echo "Run '$0 --help' for usage."
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RESET="\033[0m"

info()    { echo -e "${CYAN}[info]${RESET}  $1"; }
success() { echo -e "${GREEN}[done]${RESET}  $1"; }
warn()    { echo -e "${YELLOW}[warn]${RESET}  $1"; }

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}  Vibe Marketing Skills v${VERSION} Installer${RESET}"
echo -e "  ────────────────────────────────────"
echo ""
info "Source:  $SKILLS_ROOT"
info "Target:  $SKILLS_DIR"
if $CLAUDE_ONLY; then
  warn "Mode:    Claude-only (creative skill excluded)"
else
  info "Mode:    Full suite"
fi
echo ""

# ---------------------------------------------------------------------------
# Validate source directory
# ---------------------------------------------------------------------------
if [[ ! -f "$SKILLS_ROOT/_system/brand-memory.md" ]]; then
  echo "Error: Cannot find skills source at $SKILLS_ROOT"
  echo "Run this script from inside the skills-v2/ directory tree."
  exit 1
fi

# ---------------------------------------------------------------------------
# Build list of skills to install
# ---------------------------------------------------------------------------
SKILLS=(
  "start-here"
  "brand-voice"
  "positioning-angles"
  "direct-response-copy"
  "keyword-research"
  "seo-content"
  "email-sequences"
  "lead-magnet"
  "newsletter"
  "content-atomizer"
)

if ! $CLAUDE_ONLY; then
  SKILLS+=("creative")
fi

# ---------------------------------------------------------------------------
# Create target directory structure
# ---------------------------------------------------------------------------
info "Creating directory structure..."
mkdir -p "$SYSTEM_DIR/schemas"
mkdir -p "$SYSTEM_DIR/scripts"
for skill in "${SKILLS[@]}"; do
  mkdir -p "$SKILLS_DIR/$skill"
  # Create references/ and modes/ subdirectories if they exist in source
  if [[ -d "$SKILLS_ROOT/$skill/references" ]]; then
    mkdir -p "$SKILLS_DIR/$skill/references"
  fi
  if [[ -d "$SKILLS_ROOT/$skill/modes" ]]; then
    mkdir -p "$SKILLS_DIR/$skill/modes"
  fi
done
success "Directory structure ready"

# ---------------------------------------------------------------------------
# Copy files using rsync (with cp fallback)
# ---------------------------------------------------------------------------
copy_tree() {
  local src="$1"
  local dst="$2"
  if command -v rsync &>/dev/null; then
    rsync -a --exclude='.DS_Store' --exclude='.git' "$src/" "$dst/"
  else
    # Fallback: use cp -R and manually clean up .DS_Store
    cp -R "$src/" "$dst/"
    find "$dst" -name '.DS_Store' -delete 2>/dev/null || true
  fi
}

copy_file() {
  local src="$1"
  local dst="$2"
  cp "$src" "$dst"
}

# --- System files ---
info "Installing system files..."
copy_file "$SKILLS_ROOT/_system/brand-memory.md"  "$SYSTEM_DIR/brand-memory.md"
copy_file "$SKILLS_ROOT/_system/output-format.md"  "$SYSTEM_DIR/output-format.md"
success "_system/brand-memory.md"
success "_system/output-format.md"

# --- Schemas ---
info "Installing schemas..."
copy_tree "$SKILLS_ROOT/_system/schemas" "$SYSTEM_DIR/schemas"
success "_system/schemas/ ($(ls "$SKILLS_ROOT/_system/schemas" | wc -l | tr -d ' ') files)"

# --- Scripts ---
info "Installing scripts..."
copy_tree "$SKILLS_ROOT/_system/scripts" "$SYSTEM_DIR/scripts"
# Preserve execute permissions
chmod +x "$SYSTEM_DIR/scripts/"*.sh 2>/dev/null || true
success "_system/scripts/ ($(ls "$SKILLS_ROOT/_system/scripts/"*.sh 2>/dev/null | wc -l | tr -d ' ') files)"

# --- Individual skills ---
INSTALLED_COUNT=0
for skill in "${SKILLS[@]}"; do
  info "Installing skill: $skill"
  copy_tree "$SKILLS_ROOT/$skill" "$SKILLS_DIR/$skill"
  INSTALLED_COUNT=$((INSTALLED_COUNT + 1))
  success "$skill/"
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
TOTAL_FILES=$(find "$SYSTEM_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')
for skill in "${SKILLS[@]}"; do
  TOTAL_FILES=$((TOTAL_FILES + $(find "$SKILLS_DIR/$skill" -type f 2>/dev/null | wc -l | tr -d ' ')))
done
echo ""
echo -e "${BOLD}  Installation Complete${RESET}"
echo -e "  ─────────────────────"
echo ""
success "$INSTALLED_COUNT skills installed"
success "$TOTAL_FILES total files"
success "Location: $SKILLS_DIR"
echo ""

if ! $CLAUDE_ONLY; then
  if [[ -z "${REPLICATE_API_TOKEN:-}" ]]; then
    echo ""
    warn "Replicate API token not found in environment."
    warn "The creative skill requires REPLICATE_API_TOKEN to generate images."
    warn "Set it with: export REPLICATE_API_TOKEN=r8_your_token_here"
    echo ""
  fi
fi

echo -e "  Run ${CYAN}doctor.sh${RESET} to verify your installation."
echo ""
