# mktg — Build system
# Inspired by asc-cli's Makefile patterns (see docs/research/asc-cli-testing.md)

.PHONY: all build test lint typecheck format dev clean check install-hooks

# Colors
GREEN  := \033[0;32m
RED    := \033[0;31m
YELLOW := \033[0;33m
NC     := \033[0m

all: build

# ── Development ──────────────────────────────────────────────

## Run full local check: typecheck + lint + test + build
dev: typecheck lint test build
	@printf "$(GREEN)✓ All checks passed$(NC)\n"

# ── Type Checking ────────────────────────────────────────────

## Run TypeScript type checker
typecheck:
	@printf "$(YELLOW)→ Typechecking...$(NC)\n"
	@bun run typecheck
	@printf "$(GREEN)✓ Typecheck passed$(NC)\n"

# ── Linting ──────────────────────────────────────────────────

## Run linter
lint:
	@printf "$(YELLOW)→ Linting...$(NC)\n"
	@bun run lint
	@printf "$(GREEN)✓ Lint passed$(NC)\n"

# ── Testing ──────────────────────────────────────────────────

## Run test suite
test:
	@printf "$(YELLOW)→ Running tests...$(NC)\n"
	@bun test
	@printf "$(GREEN)✓ Tests passed$(NC)\n"

# ── Build ────────────────────────────────────────────────────

## Build CLI
build:
	@printf "$(YELLOW)→ Building...$(NC)\n"
	@bun run build
	@printf "$(GREEN)✓ Build complete$(NC)\n"

## Remove build artifacts
clean:
	@rm -rf dist
	@printf "$(GREEN)✓ Cleaned$(NC)\n"

# ── Git Hooks ────────────────────────────────────────────────

## Install pre-commit hooks
install-hooks:
	@git config core.hooksPath .githooks
	@chmod +x .githooks/pre-commit
	@printf "$(GREEN)✓ Git hooks installed$(NC)\n"
