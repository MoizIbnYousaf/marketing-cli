#!/usr/bin/env bash
set -euo pipefail

# ----------------------------------------------------------------------
# check-upstream.sh — drift detector for upstream-mirrored mktg skill
# ----------------------------------------------------------------------
# Reads ../upstream.json (the provenance manifest written by /mktg-steal).
# Fetches current upstream blob SHAs via the GitHub API for each source
# (scoped to its `upstream_root` subtree). Emits ONE JSON envelope on
# stdout describing per-source drift.
#
# Exit codes:
#   0  every source in_sync (no real drift; adapted-frontmatter ignored)
#   1  drift detected (any added/removed file, OR any modified file
#      that does NOT carry an `adapted-frontmatter` note)
#   2  preflight failure (missing gh/jq, missing manifest, gh API error)
#
# Adapted-frontmatter convention:
#   The `note: "adapted-frontmatter"` flag on a manifest file marks files
#   that deliberately diverge from upstream (e.g. a SKILL.md whose
#   frontmatter was rewritten for mktg). When the live upstream blob SHA
#   differs from the snapshot, those files appear in `drift.modified` so
#   the upstream change is still surfaced for manual review — but they
#   DO NOT flip `in_sync` to false. Real upstream changes (added,
#   removed, or modified-without-note) DO flip it.
# ----------------------------------------------------------------------

err() { echo "check-upstream: $*" >&2; }

command -v gh >/dev/null 2>&1 || { err "gh CLI required"; exit 2; }
command -v jq >/dev/null 2>&1 || { err "jq required"; exit 2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/../upstream.json"
[ -f "$MANIFEST" ] || { err "manifest not found: $MANIFEST"; exit 2; }
jq -e . "$MANIFEST" >/dev/null 2>&1 || { err "manifest not valid JSON: $MANIFEST"; exit 2; }

CHECKED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SOURCE_COUNT=$(jq '.sources | length' "$MANIFEST")

OVERALL_IN_SYNC=true
SOURCES_JSON='[]'

for ((i=0; i<SOURCE_COUNT; i++)); do
  NAME=$(jq -r ".sources[$i].name" "$MANIFEST")
  REPO=$(jq -r ".sources[$i].repo" "$MANIFEST")
  BRANCH=$(jq -r ".sources[$i].branch" "$MANIFEST")
  UROOT=$(jq -r ".sources[$i].upstream_root" "$MANIFEST")
  SNAPSHOT_SHA=$(jq -r ".sources[$i].snapshot_sha" "$MANIFEST")

  # Live tree scoped to upstream_root via tree-ish "<branch>:<subpath>".
  # Paths in the response are relative to upstream_root, so we re-prefix
  # them to match the manifest's `upstream` field shape.
  if ! TREE_JSON=$(gh api "repos/$REPO/git/trees/$BRANCH:$UROOT?recursive=1" 2>/dev/null); then
    err "gh api tree fetch failed: $REPO@$BRANCH:$UROOT"
    exit 2
  fi

  if ! CURRENT_SHA=$(gh api "repos/$REPO/commits/$BRANCH" --jq .sha 2>/dev/null); then
    err "gh api commit fetch failed: $REPO@$BRANCH"
    exit 2
  fi

  # GitHub may set `truncated: true` for trees > 100k entries. None of
  # the current upstreams come close, but warn loudly if it ever happens
  # so future drift checks aren't silently incomplete.
  if [ "$(echo "$TREE_JSON" | jq '.truncated // false')" = "true" ]; then
    err "WARNING: tree response truncated for $REPO@$BRANCH:$UROOT — drift may be incomplete"
  fi

  MANIFEST_FILES=$(jq -c ".sources[$i].files" "$MANIFEST")

  LIVE_FILES=$(echo "$TREE_JSON" | jq --arg root "$UROOT" -c '
    [.tree[]
     | select(.type == "blob")
     | {upstream: ($root + "/" + .path), sha: .sha}]
  ')

  DRIFT=$(jq -n -c \
    --arg root "$UROOT" \
    --argjson manifest "$MANIFEST_FILES" \
    --argjson live "$LIVE_FILES" '
    ($live    | map({(.upstream): .sha}) | add // {})                                as $live_by_path |
    ($manifest | map({(.upstream): {sha: .sha, note: (.note // null)}}) | add // {}) as $man_by_path  |
    ($root + "/")                                                                    as $prefix       |

    {
      added: (
        $live
        | map(select($man_by_path[.upstream] == null))
        | map({path: (.upstream | ltrimstr($prefix)), current_sha: .sha})
      ),
      modified: (
        $manifest
        | map(select(($live_by_path[.upstream] != null) and ($live_by_path[.upstream] != .sha)))
        | map(
            {
              path: (.upstream | ltrimstr($prefix)),
              snapshot_sha: .sha,
              current_sha: $live_by_path[.upstream]
            }
            + (if .note then {note: .note} else {} end)
          )
      ),
      removed: (
        $manifest
        | map(select($live_by_path[.upstream] == null))
        | map({path: (.upstream | ltrimstr($prefix)), snapshot_sha: .sha})
      )
    }
  ')

  ADDED_N=$(echo "$DRIFT" | jq '.added | length')
  REMOVED_N=$(echo "$DRIFT" | jq '.removed | length')
  REAL_MOD_N=$(echo "$DRIFT" | jq '[.modified[] | select(has("note") | not)] | length')

  if [ "$ADDED_N" -ne 0 ] || [ "$REMOVED_N" -ne 0 ] || [ "$REAL_MOD_N" -ne 0 ]; then
    OVERALL_IN_SYNC=false
  fi

  SOURCES_JSON=$(jq -n -c \
    --argjson acc "$SOURCES_JSON" \
    --arg name "$NAME" \
    --arg repo "$REPO" \
    --arg snapshot "$SNAPSHOT_SHA" \
    --arg current "$CURRENT_SHA" \
    --argjson drift "$DRIFT" '
    $acc + [{
      name: $name,
      repo: $repo,
      snapshot_sha: $snapshot,
      current_sha: $current,
      drift: $drift
    }]
  ')
done

if [ "$OVERALL_IN_SYNC" = "true" ]; then
  IN_SYNC_JSON=true
  EXIT_CODE=0
else
  IN_SYNC_JSON=false
  EXIT_CODE=1
fi

jq -n \
  --arg checked_at "$CHECKED_AT" \
  --argjson in_sync "$IN_SYNC_JSON" \
  --argjson sources "$SOURCES_JSON" '
  {
    ok: true,
    in_sync: $in_sync,
    checked_at: $checked_at,
    sources: $sources
  }
'

exit $EXIT_CODE
