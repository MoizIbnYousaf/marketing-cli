#!/usr/bin/env python3
"""
Word counter for SEO-pattern pages. Strips code/markup before counting so we
measure rendered prose, not template plumbing.

Usage:
    python word_count.py <file>                # count one file
    python word_count.py <file> --min 600      # count + assert >= min
    python word_count.py <dir>                 # count every .tsx/.astro/.mdx/.md/.erb/.rb in dir
    python word_count.py <file> --pattern A    # apply pattern minimum (A=600, B/C=800, D=700, E=2500)

Exit code 0 if all files meet the threshold (or no threshold set).
Exit code 1 if any file falls under the threshold.
"""

import argparse
import re
import sys
from pathlib import Path

PATTERN_MINIMUMS = {
    "A": 600,
    "B": 800,
    "C": 800,
    "D": 700,
    "E": 2500,
    "alternatives": 600,
    "use-case": 800,
    "audience": 800,
    "compare": 700,
    "playbook": 2500,
}

# Patterns that strip non-prose content from various file types.
STRIP_PATTERNS = [
    # JSX/TSX components: <Component prop="value" />, removed in two passes
    (r"<[A-Z][A-Za-z0-9]*[^>]*?/>", " "),                       # self-closing
    (r"<[A-Z][A-Za-z0-9]*[^>]*?>(.*?)</[A-Z][A-Za-z0-9]*>", r"\1"),  # opening+closing, keep inner

    # HTML tags (lowercase)
    (r"<[a-z][^>]*?>", " "),
    (r"</[a-z][^>]*?>", " "),

    # Ruby/JS/TS multi-line comments
    (r"/\*[\s\S]*?\*/", " "),

    # Single-line comments (// ... # ...)
    (r"//[^\n]*", " "),
    (r"^\s*#[^\n]*", " "),

    # Code fences in markdown
    (r"```[\s\S]*?```", " "),
    (r"`[^`\n]+`", " "),

    # Frontmatter
    (r"^---[\s\S]*?---\n", " "),

    # ERB tags
    (r"<%[\s\S]*?%>", " "),

    # className/class attributes
    (r'className=["\'][^"\']*["\']', " "),
    (r'class=["\'][^"\']*["\']', " "),

    # Common JSX/TSX/Ruby symbols
    (r"[{}\[\]()=>;:,]", " "),

    # Quotes and string delimiters
    (r'["\'`]', " "),

    # Standalone symbols
    (r"[#@$%^&*+/\\|~]", " "),
]


def strip_to_prose(text: str) -> str:
    """Strip markup/code so we approximate rendered prose word count."""
    out = text
    for pattern, repl in STRIP_PATTERNS:
        out = re.sub(pattern, repl, out, flags=re.MULTILINE)
    return out


def count_words(text: str) -> int:
    prose = strip_to_prose(text)
    # Tokens of >=2 alphanumeric chars (avoids counting stray symbols and 1-char fragments)
    tokens = re.findall(r"[A-Za-z][A-Za-z0-9'-]+", prose)
    return len(tokens)


def count_file(path: Path) -> int:
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        print(f"warning: could not read {path}: {e}", file=sys.stderr)
        return 0
    return count_words(text)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("path", help="File or directory to count")
    parser.add_argument("--min", type=int, help="Minimum word count threshold")
    parser.add_argument("--pattern", help="Pattern shortcut: A, B, C, D, E, or full name")
    parser.add_argument("--extensions", default="tsx,ts,jsx,js,astro,mdx,md,erb,rb",
                        help="Comma-separated extensions to count (default for src dirs)")
    args = parser.parse_args()

    minimum = args.min
    if args.pattern:
        key = args.pattern.upper() if len(args.pattern) == 1 else args.pattern.lower()
        if key in PATTERN_MINIMUMS:
            minimum = PATTERN_MINIMUMS[key]
        else:
            print(f"unknown pattern: {args.pattern}", file=sys.stderr)
            sys.exit(2)

    path = Path(args.path)
    failures = []

    if path.is_file():
        n = count_file(path)
        emit(path, n, minimum, failures)
    elif path.is_dir():
        exts = {f".{e.lstrip('.')}" for e in args.extensions.split(",")}
        for p in sorted(path.rglob("*")):
            if p.is_file() and p.suffix in exts:
                n = count_file(p)
                emit(p, n, minimum, failures)
    else:
        print(f"not a file or directory: {path}", file=sys.stderr)
        sys.exit(2)

    if failures:
        print(f"\n✗ {len(failures)} file(s) below threshold ({minimum}):", file=sys.stderr)
        for f, n in failures:
            print(f"  {f}: {n} words", file=sys.stderr)
        sys.exit(1)
    sys.exit(0)


def emit(path: Path, n: int, minimum, failures):
    status = ""
    if minimum is not None:
        if n < minimum:
            status = f" ✗ below threshold ({minimum})"
            failures.append((path, n))
        else:
            status = f" ✓ (≥{minimum})"
    print(f"{n:>6} words  {path}{status}")


if __name__ == "__main__":
    main()
