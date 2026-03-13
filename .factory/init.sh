#!/bin/bash
set -e

# mktg website mission — environment setup (idempotent)

WEBSITE_DIR="/Users/moizibnyousaf/projects/mktg/website"

# Install dependencies if website dir exists
if [ -d "$WEBSITE_DIR" ]; then
  cd "$WEBSITE_DIR"
  if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ] 2>/dev/null; then
    echo "Installing website dependencies..."
    bun install
  else
    echo "Dependencies up to date."
  fi
else
  echo "Website directory not yet created — will be scaffolded by first feature."
fi
