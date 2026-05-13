#!/usr/bin/env python3
"""
Internal-link audit for SEO-sprint pages.

Counts internal links pointing TO a given slug AND FROM a given slug,
and asserts they meet per-pattern minimums.

Usage:
    python link_audit.py --slug hootsuite --pattern A --root .
    python link_audit.py --pattern A --root . --slug-list slug1,slug2
    python link_audit.py --orphan-check --root .

The script scans common file extensions for links matching:
  /alternatives/<slug>
  /for/<slug>
  /compare/<slug>
  /playbooks/<slug>
  /features/<slug>
  /tools/<slug>

It does not try to understand framework-specific link helpers. Direct URL
strings or href= attributes are what it counts. If your code uses a helper
like `alternatives_show_url(slug)`, this script will undercount — bias
towards URL strings or augment the script's regex to your helper's pattern.
"""

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

# Patterns: how many links are required FROM each page-type, broken down by link-target-type
OUTBOUND_REQUIREMENTS = {
    "A": {  # /alternatives/[slug]
        "alternatives": 2,
        "features":     1,
        "tools":        1,
    },
    "B": {  # /for/[slug] (use-case)
        "features":     2,
        "tools":        2,
        "for":          1,
    },
    "C": {  # /for/[slug] (audience) — same as B
        "features":     2,
        "tools":        2,
        "for":          1,
    },
    "D": {  # /compare/[slug]
        "alternatives": 2,  # both /alternatives/[a] and /alternatives/[b]
        "for":          1,
        "pricing":      1,
    },
    "E": {  # /playbooks/[slug]
        "features":     3,
        "tools":        2,
        "for":          2,
        "alternatives": 1,
    },
}

INBOUND_MINIMUM = 2  # every page must be linked to from at least 2 other pages

LINK_REGEXES = {
    "alternatives": re.compile(r"/alternatives/([a-z0-9][a-z0-9-]*)"),
    "for":          re.compile(r"/for/([a-z0-9][a-z0-9-]*)"),
    "compare":      re.compile(r"/compare/([a-z0-9][a-z0-9-]*)"),
    "playbooks":    re.compile(r"/playbooks/([a-z0-9][a-z0-9-]*)"),
    "features":     re.compile(r"/features/([a-z0-9][a-z0-9-]*)"),
    "tools":        re.compile(r"/tools/([a-z0-9][a-z0-9-]*)"),
    "pricing":      re.compile(r"/pricing(?:[/'\"\s>?])"),
}

DEFAULT_EXTENSIONS = {".tsx", ".ts", ".jsx", ".js", ".astro", ".mdx", ".md", ".erb", ".rb", ".html", ".vue", ".svelte"}


def scan_links(root: Path, exclude: list = None):
    """Return {file_path: {target_type: [slugs]}} for every link found."""
    found = defaultdict(lambda: defaultdict(list))
    excludes = exclude or []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix not in DEFAULT_EXTENSIONS:
            continue
        if any(part in path.parts for part in (".git", "node_modules", "dist", "build", ".next", "tmp", "public")):
            continue
        if any(str(path).endswith(ex) for ex in excludes):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for target_type, rx in LINK_REGEXES.items():
            for m in rx.finditer(text):
                slug = m.group(1) if rx.groups else "_pricing"
                found[str(path)][target_type].append(slug)
    return found


def assert_outbound(slug: str, pattern: str, root: Path):
    """For a given (slug, pattern), check that the page file linking from it meets requirements."""
    if pattern not in OUTBOUND_REQUIREMENTS:
        print(f"unknown pattern: {pattern}", file=sys.stderr)
        return False

    pattern_dir_map = {"A": "alternatives", "B": "for", "C": "for", "D": "compare", "E": "playbooks"}
    page_kind = pattern_dir_map[pattern]
    # Heuristic: page-defining file is one whose path contains the slug AND the pattern dir
    candidates = []
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix not in DEFAULT_EXTENSIONS:
            continue
        if slug in path.stem or slug in str(path):
            if page_kind in str(path).lower() or pattern == "E":
                candidates.append(path)
    # For data-driven files (single hash with all slugs), also check the file that *defines* this slug
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix not in {".rb", ".ts", ".tsx", ".js"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        if f"'{slug}'" in text or f'"{slug}"' in text:
            if page_kind in text.lower() or slug in text:
                if path not in candidates:
                    candidates.append(path)

    if not candidates:
        print(f"✗ Could not locate the page definition file for slug={slug} pattern={pattern}", file=sys.stderr)
        return False

    # Aggregate outbound links across all candidate files
    aggregated = defaultdict(set)
    for path in candidates:
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        # Only count text near this slug (rough proximity heuristic: nearest 4000 chars)
        i = text.find(slug)
        snippet = text[max(0, i - 200):i + 4000] if i >= 0 else text
        for target_type, rx in LINK_REGEXES.items():
            for m in rx.finditer(snippet):
                target_slug = m.group(1) if rx.groups else "_pricing"
                if target_type == page_kind and target_slug == slug:
                    continue  # self-link doesn't count
                aggregated[target_type].add(target_slug)

    required = OUTBOUND_REQUIREMENTS[pattern]
    all_pass = True
    print(f"\nOutbound link audit — pattern {pattern}, slug={slug}")
    for target_type, min_count in required.items():
        found = len(aggregated.get(target_type, set()))
        ok = found >= min_count
        mark = "✓" if ok else "✗"
        print(f"  {mark} {target_type}: {found} / {min_count} required")
        if not ok:
            all_pass = False
    return all_pass


def assert_inbound(slug: str, pattern: str, root: Path):
    """Check that ≥2 other files link to this slug."""
    pattern_dir_map = {"A": "alternatives", "B": "for", "C": "for", "D": "compare", "E": "playbooks"}
    target_type = pattern_dir_map[pattern]
    rx = LINK_REGEXES[target_type]

    inbound_files = set()
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix not in DEFAULT_EXTENSIONS:
            continue
        if any(p in path.parts for p in (".git", "node_modules", "dist", "build", ".next", "tmp")):
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for m in rx.finditer(text):
            if m.group(1) == slug:
                inbound_files.add(str(path))

    n = len(inbound_files)
    ok = n >= INBOUND_MINIMUM
    mark = "✓" if ok else "✗"
    print(f"\nInbound link audit — slug={slug}")
    print(f"  {mark} {n} / {INBOUND_MINIMUM} required files link to this page")
    if n < INBOUND_MINIMUM and inbound_files:
        for f in sorted(inbound_files):
            print(f"      → {f}")
    return ok


def orphan_check(root: Path):
    """Find pattern slugs that have <2 inbound links anywhere in the repo."""
    print("\nOrphan check — slugs with <2 inbound links")
    all_slugs_by_type = defaultdict(set)
    # Discover all slugs from file naming conventions (rough)
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix not in DEFAULT_EXTENSIONS:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        for target_type, rx in LINK_REGEXES.items():
            for m in rx.finditer(text):
                if rx.groups:
                    all_slugs_by_type[target_type].add(m.group(1))

    any_orphans = False
    for target_type, slugs in all_slugs_by_type.items():
        rx = LINK_REGEXES[target_type]
        for slug in sorted(slugs):
            inbound_files = set()
            for path in root.rglob("*"):
                if not path.is_file() or path.suffix not in DEFAULT_EXTENSIONS:
                    continue
                try:
                    text = path.read_text(encoding="utf-8")
                except (OSError, UnicodeDecodeError):
                    continue
                for m in rx.finditer(text):
                    if m.group(1) == slug:
                        inbound_files.add(str(path))
            # subtract files that ARE the page-definition file (we want inbound from elsewhere)
            external_inbound = [f for f in inbound_files if not slug in Path(f).stem]
            if len(external_inbound) < INBOUND_MINIMUM:
                print(f"  ✗ /{target_type}/{slug} — only {len(external_inbound)} inbound link(s)")
                any_orphans = True

    if not any_orphans:
        print("  ✓ No orphans")
    return not any_orphans


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", help="Slug to audit")
    parser.add_argument("--pattern", choices=["A", "B", "C", "D", "E"])
    parser.add_argument("--root", default=".", help="Repo root to scan")
    parser.add_argument("--orphan-check", action="store_true", help="List all orphan pages")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not root.is_dir():
        print(f"not a directory: {root}", file=sys.stderr)
        sys.exit(2)

    if args.orphan_check:
        ok = orphan_check(root)
        sys.exit(0 if ok else 1)

    if not args.slug or not args.pattern:
        parser.error("--slug and --pattern are required unless --orphan-check is used")

    a = assert_outbound(args.slug, args.pattern, root)
    b = assert_inbound(args.slug, args.pattern, root)
    sys.exit(0 if (a and b) else 1)


if __name__ == "__main__":
    main()
