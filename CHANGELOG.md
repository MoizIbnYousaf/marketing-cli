# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-13

### Added

- Initial public release
- 5 CLI commands: `init`, `doctor`, `list`, `status`, `update`
- 41 marketing skills across 9 categories
- 5 research and review agents
- Brand memory system (9 compounding brand files)
- Skill lifecycle management (dependency DAG, freshness, versioning)
- Integration checks for third-party skills (Typefully, Resend)
- Schema introspection (`mktg schema --json`)
- `/cmo` orchestrator skill with routing table and disambiguation
- Parallel foundation research (3 agents: brand, audience, competitive)
- 655 tests with real file I/O (no mocks)
- GitHub Actions CI (test + typecheck on PR)
- Marketing website (Next.js)
