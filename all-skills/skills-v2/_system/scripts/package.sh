#!/usr/bin/env bash
# ============================================================================
# package.sh - Vibe Marketing Skills v2 Packager
# ============================================================================
# Builds a distributable zip archive of the complete skill suite. The output
# is a timestamped zip ready for delivery to customers.
#
# Usage:
#   ./package.sh                Build vibe-skills-v2-YYYYMMDD.zip
#   ./package.sh --output-dir /path/to/dir   Custom output directory
#
# Output:
#   vibe-skills-v2-YYYYMMDD.zip in the current directory (or --output-dir)
# ============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TIMESTAMP=$(date +%Y%m%d)
PACKAGE_NAME="vibe-skills-v2-${TIMESTAMP}"
OUTPUT_DIR="$(pwd)"

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [--output-dir PATH]"
      echo ""
      echo "Options:"
      echo "  --output-dir PATH  Directory for the output zip (default: cwd)"
      echo "  --help             Show this help message"
      exit 0
      ;;
    *)
      echo "Error: Unknown option '$1'"
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
BOLD="\033[1m"
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
DIM="\033[2m"
RESET="\033[0m"

info()    { echo -e "  ${CYAN}[info]${RESET}  $1"; }
success() { echo -e "  ${GREEN}[done]${RESET}  $1"; }
fail()    { echo -e "  ${RED}[fail]${RESET}  $1"; }

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}  Vibe Marketing Skills v2 - Packager${RESET}"
echo -e "  ────────────────────────────────────"
echo ""
info "Source:  $SKILLS_ROOT"
info "Output:  $OUTPUT_DIR/${PACKAGE_NAME}.zip"
echo ""

# ---------------------------------------------------------------------------
# Validate source
# ---------------------------------------------------------------------------
if [[ ! -f "$SKILLS_ROOT/_system/brand-memory.md" ]]; then
  fail "Cannot find skills source at $SKILLS_ROOT"
  exit 1
fi

# ---------------------------------------------------------------------------
# Define expected manifest
# ---------------------------------------------------------------------------
EXPECTED_FILES=(
  "skills-v2/README.md"
  "skills-v2/_system/brand-memory.md"
  "skills-v2/_system/output-format.md"
  "skills-v2/_system/schemas/voice-profile.schema.json"
  "skills-v2/_system/schemas/campaign-brief.schema.json"
  "skills-v2/_system/scripts/install.sh"
  "skills-v2/_system/scripts/doctor.sh"
  "skills-v2/_system/scripts/e2e-fresh-install.sh"
  "skills-v2/_system/scripts/package.sh"
  "skills-v2/start-here/SKILL.md"
  "skills-v2/brand-voice/SKILL.md"
  "skills-v2/positioning-angles/SKILL.md"
  "skills-v2/positioning-angles/references/angle-frameworks.md"
  "skills-v2/positioning-angles/references/dunford-positioning.md"
  "skills-v2/positioning-angles/references/hormozi-offer.md"
  "skills-v2/positioning-angles/references/schwartz-sophistication.md"
  "skills-v2/positioning-angles/references/unique-mechanism.md"
  "skills-v2/direct-response-copy/SKILL.md"
  "skills-v2/direct-response-copy/references/COPYWRITING_PLAYBOOK.md"
  "skills-v2/keyword-research/SKILL.md"
  "skills-v2/seo-content/SKILL.md"
  "skills-v2/seo-content/references/eeat-examples.md"
  "skills-v2/email-sequences/SKILL.md"
  "skills-v2/lead-magnet/SKILL.md"
  "skills-v2/lead-magnet/references/format-examples.md"
  "skills-v2/lead-magnet/references/info-product-magnets.md"
  "skills-v2/lead-magnet/references/psychology.md"
  "skills-v2/lead-magnet/references/saas-magnets.md"
  "skills-v2/lead-magnet/references/services-magnets.md"
  "skills-v2/newsletter/SKILL.md"
  "skills-v2/newsletter/references/newsletter-examples.md"
  "skills-v2/content-atomizer/SKILL.md"
  "skills-v2/content-atomizer/references/platform-playbook.md"
  "skills-v2/creative/SKILL.md"
  "skills-v2/creative/references/MODEL_REGISTRY.md"
  "skills-v2/creative/references/VISUAL_INTELLIGENCE.md"
  "skills-v2/creative/modes/product-photo.md"
  "skills-v2/creative/modes/product-video.md"
  "skills-v2/creative/modes/social-graphics.md"
  "skills-v2/creative/modes/talking-head.md"
  "skills-v2/creative/modes/ad-creative.md"
)

# ---------------------------------------------------------------------------
# Pre-flight: verify all expected files exist in source
# ---------------------------------------------------------------------------
info "Verifying source files..."
MISSING=0
for expected in "${EXPECTED_FILES[@]}"; do
  # Convert manifest path back to source path
  src_path="${expected#skills-v2/}"
  if [[ ! -f "$SKILLS_ROOT/$src_path" ]]; then
    fail "Missing source file: $src_path"
    MISSING=$((MISSING + 1))
  fi
done

if [[ "$MISSING" -gt 0 ]]; then
  echo ""
  fail "$MISSING files missing from source. Cannot build package."
  exit 1
fi
success "All ${#EXPECTED_FILES[@]} expected files present in source"

# ---------------------------------------------------------------------------
# Build the zip
# ---------------------------------------------------------------------------
info "Building zip archive..."

mkdir -p "$OUTPUT_DIR"
ZIP_FILE="$OUTPUT_DIR/${PACKAGE_NAME}.zip"

# Remove existing zip if present
rm -f "$ZIP_FILE"

# Create zip from the parent of skills-v2, including only skills-v2/
# This preserves the skills-v2/ prefix in the archive
PARENT_DIR="$(dirname "$SKILLS_ROOT")"
SKILLS_DIRNAME="$(basename "$SKILLS_ROOT")"

(
  cd "$PARENT_DIR"
  zip -r "$ZIP_FILE" "$SKILLS_DIRNAME/" \
    -x "*.DS_Store" \
    -x "*/.git/*" \
    -x "*/.git" \
    -x "*.tmp" \
    -x "*~" \
    -x "*.swp" \
    -x "*.swo" \
    -x "*/__pycache__/*" \
    -x "*.pyc" \
    -x "*/.env" \
    -x "*/.env.*" \
    -x "*/CLAUDE.md" \
    -x "*/_system/scripts/outputs/*" \
    -x "*/SESSION-LOG-*" \
    -x "*/_system/scripts/brand_context.py" \
    -x "*/_system/scripts/smoke-test-apis.sh" \
    -x "*/_system/scripts/e2e_generate.py" \
    -x "*/_system/scripts/e2e_review.py" \
    -x "*/_system/scripts/integration_test.py" \
    -x "*/_system/scripts/validate.sh" \
    > /dev/null 2>&1
)

if [[ ! -f "$ZIP_FILE" ]]; then
  fail "Zip file was not created"
  exit 1
fi
success "Zip archive created"

# ---------------------------------------------------------------------------
# Verify zip contents against manifest
# ---------------------------------------------------------------------------
info "Verifying zip contents..."

VERIFY_FAIL=0
ZIP_CONTENTS=$(unzip -l "$ZIP_FILE" 2>/dev/null)

for expected in "${EXPECTED_FILES[@]}"; do
  if echo "$ZIP_CONTENTS" | grep -q "$expected"; then
    : # Present
  else
    fail "Missing from zip: $expected"
    VERIFY_FAIL=$((VERIFY_FAIL + 1))
  fi
done

if [[ "$VERIFY_FAIL" -gt 0 ]]; then
  echo ""
  fail "$VERIFY_FAIL expected files missing from zip archive"
  exit 1
fi
success "All ${#EXPECTED_FILES[@]} expected files verified in zip"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
FILE_COUNT=$(unzip -l "$ZIP_FILE" 2>/dev/null | tail -1 | awk '{print $2}')
FILE_SIZE=$(ls -lh "$ZIP_FILE" | awk '{print $5}')
FILE_SIZE_BYTES=$(wc -c < "$ZIP_FILE" | tr -d ' ')

echo ""
echo -e "  ${BOLD}Package Summary${RESET}"
echo -e "  ───────────────"
echo ""
success "Archive:  ${PACKAGE_NAME}.zip"
success "Location: $ZIP_FILE"
success "Files:    $FILE_COUNT"
success "Size:     $FILE_SIZE ($FILE_SIZE_BYTES bytes)"
echo ""
echo -e "  ${DIM}To test this package:${RESET}"
echo -e "  ${DIM}  ./e2e-fresh-install.sh --zip $ZIP_FILE${RESET}"
echo ""
