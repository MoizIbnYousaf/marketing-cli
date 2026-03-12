#!/usr/bin/env bash
set -euo pipefail

# mktg installer — one-liner install for AI marketing CLI
# Usage: curl -fsSL https://raw.githubusercontent.com/MoizIbnYousaf/mktg/main/install.sh | bash
#
# Inspired by ASC CLI's install.sh patterns:
# - OS detection, graceful fallbacks, PATH awareness, post-install bootstrap

PACKAGE_NAME="mktg"
MIN_NODE_VERSION=18

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  RED='\033[0;31m'
  DIM='\033[2m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  GREEN='' YELLOW='' RED='' DIM='' BOLD='' NC=''
fi

info()  { printf "${GREEN}✓${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}!${NC} %s\n" "$1"; }
fail()  { printf "${RED}✗${NC} %s\n" "$1"; exit 1; }
step()  { printf "${BOLD}[%s/%s]${NC} %s\n" "$1" "$2" "$3"; }

# Detect OS
OS="$(uname -s)"
case "${OS}" in
  Darwin) OS="macOS" ;;
  Linux)  OS="linux" ;;
  MINGW*|MSYS*|CYGWIN*) OS="windows" ;;
  *) fail "Unsupported OS: ${OS}" ;;
esac

# Detect architecture
ARCH="$(uname -m)"
case "${ARCH}" in
  x86_64|amd64)   ARCH="x64" ;;
  arm64|aarch64)   ARCH="arm64" ;;
  *) fail "Unsupported architecture: ${ARCH}" ;;
esac

printf "\n${BOLD}mktg installer${NC} ${DIM}(${OS} ${ARCH})${NC}\n\n"

TOTAL_STEPS=3
INSTALLER=""

# Step 1: Find a package manager
step 1 "${TOTAL_STEPS}" "Detecting package manager..."

if command -v bun >/dev/null 2>&1; then
  INSTALLER="bun"
  BUN_VERSION="$(bun --version 2>/dev/null || echo "unknown")"
  info "bun ${BUN_VERSION} found (recommended)"
elif command -v npm >/dev/null 2>&1; then
  INSTALLER="npm"
  # Check Node.js version
  if command -v node >/dev/null 2>&1; then
    NODE_VERSION="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [ "${NODE_VERSION}" -lt "${MIN_NODE_VERSION}" ]; then
      fail "Node.js ${MIN_NODE_VERSION}+ required (found v${NODE_VERSION}). Install from https://nodejs.org"
    fi
    info "npm found with Node.js v$(node -v | sed 's/^v//')"
  else
    fail "npm found but node is missing"
  fi
else
  # Try to install bun
  warn "No package manager found. Installing bun..."
  if [ "${OS}" = "windows" ]; then
    fail "Automatic bun install not supported on Windows. Install bun from https://bun.sh or use npm."
  fi
  curl -fsSL https://bun.sh/install | bash
  # Source the updated PATH
  export BUN_INSTALL="${HOME}/.bun"
  export PATH="${BUN_INSTALL}/bin:${PATH}"
  if command -v bun >/dev/null 2>&1; then
    INSTALLER="bun"
    info "bun installed successfully"
  else
    fail "Failed to install bun. Install manually from https://bun.sh or use npm."
  fi
fi

# Step 2: Install mktg
step 2 "${TOTAL_STEPS}" "Installing ${PACKAGE_NAME}..."

case "${INSTALLER}" in
  bun)
    bun install -g "${PACKAGE_NAME}" 2>/dev/null && info "Installed via bun" || {
      warn "Global bun install failed, trying npm fallback..."
      if command -v npm >/dev/null 2>&1; then
        npm install -g "${PACKAGE_NAME}" && info "Installed via npm (fallback)" || fail "Installation failed"
      else
        fail "Installation failed. Try: bun install -g ${PACKAGE_NAME}"
      fi
    }
    ;;
  npm)
    npm install -g "${PACKAGE_NAME}" && info "Installed via npm" || fail "Installation failed. Try: sudo npm install -g ${PACKAGE_NAME}"
    ;;
esac

# Verify installation
if ! command -v mktg >/dev/null 2>&1; then
  # Check common global bin locations
  for dir in "${HOME}/.bun/bin" "${HOME}/.local/bin" "/usr/local/bin" "${HOME}/.npm-global/bin"; do
    if [ -x "${dir}/mktg" ]; then
      warn "${PACKAGE_NAME} installed to ${dir} but it's not in your PATH"
      printf "  Add to your shell profile:\n"
      printf "    ${DIM}export PATH=\"%s:\$PATH\"${NC}\n" "${dir}"
      break
    fi
  done
fi

# Step 3: Post-install bootstrap
step 3 "${TOTAL_STEPS}" "Running post-install setup..."

if command -v mktg >/dev/null 2>&1; then
  # Run init with --yes for non-interactive setup
  mktg init --yes 2>/dev/null && info "Project initialized" || warn "Init skipped (run 'mktg init' manually in your project directory)"

  printf "\n${GREEN}${BOLD}Ready!${NC}\n"
  printf "  ${DIM}cd your-project && mktg init${NC}  — set up marketing for a project\n"
  printf "  ${DIM}mktg doctor${NC}                    — check installation health\n"
  printf "  ${DIM}mktg list${NC}                      — see available marketing skills\n"
  printf "\n"
else
  warn "mktg command not found in PATH after install"
  printf "  Try opening a new terminal, or run:\n"
  printf "    ${DIM}export PATH=\"\$(${INSTALLER} bin -g 2>/dev/null || echo /usr/local/bin):\$PATH\"${NC}\n"
  printf "\n"
fi
