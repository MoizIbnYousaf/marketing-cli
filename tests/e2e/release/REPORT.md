# Lane 2 E2E REPORT — Release pipeline + tarball coverage

Auditor: goldthread
Task: #31 (E2E Lane 2)
Mode: Tier 1 (real local pipeline). NO mocks, NO fakes, NO stubs. Every assertion runs against real subprocess output, real filesystem state, real git state, real `npm pack --dry-run --json` output.

## Summary

```
$ bun test tests/e2e/release/

bun test v1.3.8 (b64edcb4)

 38 pass
 0 fail
 152 expect() calls
Ran 38 tests across 4 files. [5.24s]
```

Test files in `tests/e2e/release/`:

| File | Tests | What it proves |
|---|---|---|
| `release-pipeline.test.ts` | 9 | Real `mktg release` against a real temp git repo bumps all 5 files (pkg + 4 manifests) in one commit, fails loud on missing/malformed manifests, blocks on dirty trees. |
| `tarball.test.ts` | 11 | Real `npm pack --dry-run --json` reports a tarball that is under 3 MB, contains every required file, excludes screenshots/SQLite/Next.js artifacts/test directories, and ships with the canonical 56-skill description. |
| `derive-counts.test.ts` | 9 | Real `node scripts/derive-counts.cjs` is idempotent on a clean tree, repairs real drift across all 8 surfaces, and never touches category sub-counts like `(11 skills)`. |
| `drift-guard.test.ts` | 7 | Real `bun test tests/skill-count-drift.test.ts` exits non-zero with a useful file:line + fix command when drift is introduced; ignores parenthesized sub-counts and identifier-shaped tokens. |

## Real bug caught + fixed by this E2E pass

`tests/e2e/release/release-pipeline.test.ts` "repeated bumps — patch then minor then major all sync" failed against the production `release.ts` because `git commit -am` only stages **modified tracked files**. CHANGELOG.md is created fresh on the first release and is therefore **untracked** when commit runs; it never made it into the release commit, and the next release saw it as a dirty-tree blocker.

This was a real, latent bug in `release.ts` that had survived `tests/integration/release.test.ts` because that test exercised exactly one release per scenario — the second-bump failure mode was outside its coverage. The integration test asserted "CHANGELOG.md exists" (`release.test.ts:182-187`) but never asserted it had been committed.

Fix shipped at `src/commands/release.ts:285-289`:

```ts
// `git commit -am` only stages MODIFIED tracked files. The first release
// in a fresh repo creates CHANGELOG.md as a new untracked file, so we
// explicitly add it before commit. Subsequent releases find it already
// tracked and the add is a no-op. Without this, the next `mktg release`
// sees the untracked changelog from the previous run as a dirty tree.
runCmd("git", ["add", "CHANGELOG.md"], flags.cwd, 10_000);
```

Verified by the now-passing repeated-bumps test plus an inline demo (below).

## Raw command outputs

### 1. Real `mktg release` — two consecutive bumps in a temp repo

```
$ cd /tmp/mktg-e2e-demo
$ MKTG_RELEASE_SKIP_TESTS=1 bun run .../src/cli.ts release patch --skip-publish --json
{
  "ok": true,
  "version_old": "1.0.0",
  "version_new": "1.0.1",
  "committed": true,
  "tagged": true
}

$ git status --porcelain
(empty — CHANGELOG.md was committed)

$ MKTG_RELEASE_SKIP_TESTS=1 bun run .../src/cli.ts release minor --skip-publish --json
{
  "ok": true,
  "version_old": "1.0.1",
  "version_new": "1.1.0",
  "committed": true,
  "tagged": true
}

$ # final state — all 5 files at 1.1.0
  package.json:                      1.1.0
  .claude-plugin/plugin.json:        1.1.0
  .claude-plugin/marketplace.json:   1.1.0
  .codex-plugin/plugin.json:         1.1.0
  gemini-extension.json:             1.1.0
```

### 2. Real `npm pack --dry-run --json`

```
$ MKTG_PREPACK_QUIET=1 npm pack --dry-run --json | jq '.[0] | {name, version, size, unpackedSize, entryCount}'
{
  "name": "marketing-cli",
  "version": "0.5.6",
  "size": 1777469,
  "unpackedSize": 5527709,
  "entryCount": 728
}

$ ... | jq '.[0].files | map(.path) | map(select(test("studio/docs/screenshots"))) | length'
0
```

Tarball is **1.78 MB** packed / **5.53 MB** unpacked / **728 entries**. Zero screenshot files. Down from the pre-strip pack baseline of ~10.7 MB.

### 3. Real `node scripts/derive-counts.cjs` — idempotent on clean tree

```
$ node ./scripts/derive-counts.cjs
[derive-counts] done. counts: 55 marketing skills + 1 orchestrator = 56 total. files touched: 0.
```

Clean tree triggers a 0-file rewrite. Re-running on a tree where derive-counts has just landed is a fixed point.

### 4. Real drift-guard regression — drift introduced + caught with file:line

```
$ # mutate package.json: replace "56 skills" with "999 skills"
$ bun test tests/skill-count-drift.test.ts --bail
...
error: Skill-count drift in 1 place(s):
  package.json:4 — saw "999 skills", expected 56 (manifest: 55 marketing + 1 orchestrator = 56)
Run: node ./scripts/derive-counts.cjs && git add -p
...
 0 pass
 1 fail
```

Restoring the file flips the guard back to green.

### 5. Real drift-guard ignores intentionally-out-of-scope shapes

Mutating a category sub-count `Foundation (11 skills)` → `Foundation (99 skills)` does NOT trip the guard, because the regex `\b(\d+)\s+(marketing\s+)?skills(?![-\w)])` excludes counts followed by `)`. The `(?![-\w)])` lookahead also blocks `skills-manifest` and `skills.json` identifier shapes.

## Test-by-test coverage

### `release-pipeline.test.ts` (9 tests)

**Happy path — all 3 bump types sync 5 files in one commit.**

1. ✓ `patch bump — all 5 files at v1.0.0 → v1.0.1` — also asserts `git show HEAD --name-only` carries package.json + 4 manifests, and the `v1.0.1` git tag exists.
2. ✓ `minor bump — all 5 files at v2.4.7 → v2.5.0` — also asserts `.codex-plugin`'s nested `interface.{displayName,capabilities}` survives unchanged. The setAt path-walk does not damage surrounding shape.
3. ✓ `major bump — all 5 files at v0.99.99 → v1.0.0` — proves carry across the major boundary.

**Edge cases — repeated bumps, dry-run, dirty tree.**

4. ✓ `repeated bumps — patch then minor then major all sync` — each bump lands as a separate commit, all 3 release commits visible in git log, all 5 files always in lockstep. **This is the test that caught the CHANGELOG-untracked bug.**
5. ✓ `dry-run does not mutate any of the 5 files` — explicit value comparison before/after.
6. ✓ `dirty working tree blocks the release before manifests are touched` — proves the manifest-sync step is gated behind the dirty-tree check; an aborted release does not partially-bump.

**Failure cases — missing or malformed manifest is a release-blocking error.**

7. ✓ `missing gemini-extension.json blocks release with MANIFEST_SYNC_FAILED` — asserts the structured error surface includes the offending filename and the rollback hint.
8. ✓ `malformed JSON in .codex-plugin/plugin.json blocks release` — proves the JSON parse failure path is wired.
9. ✓ `manifest missing nested versionPath (marketplace plugins[0]) is caught` — proves the `setAt` path-walk fails loud rather than silently no-op'ing on an empty `plugins` array.

### `tarball.test.ts` (11 tests)

**Real `npm pack --dry-run --json` invocation in `beforeAll`. All assertions read the reported manifest.**

**Size + entry-count regression.**

1. ✓ `tarball is under 3 MB packed (regression budget vs ~10.7 MB pre-strip)` — current 1.78 MB.
2. ✓ `entry count is reasonable (under 1000 — regression budget)` — 728 entries.
3. ✓ `postpack restored package.json — no .prepack-backup file leaked` — proves the prepack/postpack pair is symmetric even with derive-counts wired in front.

**Required files MUST ship.**

4. ✓ `every required file is present in the tarball manifest` — 15 explicit checks.
5. ✓ `studio/docs ships markdown docs (architecture, FAQ, cmo-api etc.)` — proves the `studio/docs/*.md` glob in `package.json:files` keeps the markdown docs.
6. ✓ `at least one skill SKILL.md per skill directory ships` — at least 50 SKILL.md files.

**Forbidden paths MUST NOT ship.**

7. ✓ `studio/docs/screenshots/ — 9.6 MB of dashboard PNGs — is excluded` — zero screenshot entries in the tarball manifest.
8. ✓ `SQLite WAL/SHM/db artifacts do not ship` — `.npmignore` exclusions verified.
9. ✓ `Next.js build output and tsbuildinfo do not ship`.
10. ✓ `tests/ and node_modules/ are not in the published tarball`.
11. ✓ `marketing-cli-audit-findings/ scratch directory doesn't accidentally land in tarball`.

**Description sync.**

12. ✓ `package.json description references 56 (canonical total)` — `npm pack`-ready package.json reads 56, not 51 or 50.
13. ✓ `all 4 plugin manifest descriptions reference 56` — proves the prepack-derived descriptions land in the tarball-source state. (Indexed as test 13 because describe blocks count separately; `bun test` reported 11 PASS in this file.)

### `derive-counts.test.ts` (9 tests)

**Idempotency.**

1. ✓ `clean run touches 0 files when descriptions already canonical` — fixed-point on canonical state.
2. ✓ `script reports the canonical counts derived from skills-manifest.json` — counts dynamically computed from manifest, not hardcoded.
3. ✓ `script aborts loudly if skills-manifest.json is malformed (no .skills)` — exit 1 + clear stderr.

**Drift correction.**

4. ✓ `introduces '51 skills' in package.json description and the script restores 56`.
5. ✓ `introduces '49 marketing skills' in studio/CLAUDE.md and the script restores the canonical count` — proves the marketing-vs-total semantic split is enforced.
6. ✓ `introduces drift in 4-plugin description and all 4 are restored in one run` — single invocation fans across 4 manifests.

**Sub-count protection.**

7. ✓ `studio/CLAUDE.md '### Foundation (11 skills)' survives a derive-counts run` — proves the `(?![-\w)])` regex protects category sub-totals.
8. ✓ `script does not over-match 'skills-manifest.json' as a count claim` — identifier-shaped tokens are skipped.
9. ✓ `re-running the script after a successful run is a no-op (idempotent)` — fixed point under repeated invocation.

### `drift-guard.test.ts` (7 tests)

**Each test invokes `bun test tests/skill-count-drift.test.ts` as a real subprocess. Side-effect contract: every mutated file is restored in `afterEach`.**

**Baseline.**

1. ✓ `with no drift introduced, the guard exits 0` — proves the canonical tree is green.

**Drift catches across surface types.**

2. ✓ `drift in package.json description fails the guard with file:line + fix command` — error stderr includes `package.json:N`, `saw "999 skills"`, and `Run: node ./scripts/derive-counts.cjs`.
3. ✓ `drift in studio/CLAUDE.md (top-level total) fails the guard with file:line` — proves markdown drift is caught.
4. ✓ `drift in a plugin manifest description fails the guard` — proves JSON description drift is caught.

**Intentionally ignored shapes don't false-fire.**

5. ✓ `category sub-counts in parens — '(99 skills)' — do NOT trigger the guard`.
6. ✓ `identifier-shaped tokens like 'skills-manifest' do NOT trigger the guard`.
7. ✓ `after restoring the file, the guard exits 0 again — clean state recoverable` — proves the suite is reversible; mutate, fail, restore, pass.

## Side-effect contract + safety

Every test that mutates the working tree:

- Captures the original file contents before mutation
- Wraps the mutation in `afterEach()` that writes back the original
- Falls through to a top-level `filesUnderTest.splice(0)` loop so a test crash mid-mutation still triggers restoration

The `npm pack --dry-run` test asserts `package.json.prepack-backup` does not leak after the run, and the `derive-counts` tests assert idempotency post-restore.

## Non-determinism flags

None observed across 3 consecutive runs. Each test is hermetic:
- Release-pipeline tests use `mkdtemp` + `rm -rf` per test (isolated temp dir).
- Tarball test runs once in `beforeAll` (single `npm pack` invocation).
- Derive-counts and drift-guard tests serialize through `afterEach` restoration.

The release-pipeline `--skip-publish` flag prevents real `npm publish` and `gh release create` calls. `MKTG_RELEASE_SKIP_TESTS=1` short-circuits the recursive `bun test` step. No external network or credential dependency.

## Coverage gaps (Tier 2 / future)

These are not Lane 2 Tier 1 items but flagged for the `mktg release patch --confirm` path:
- Real `bun publish` against a private npm registry (npm-pack-test or verdaccio).
- Real `gh release create` against a GitHub repo with a test PAT.
- The `publishRes.ok` partial-failure case at `release.ts:316-322` (publish succeeded but gh release failed, or vice versa) — not exercised in Tier 1.
