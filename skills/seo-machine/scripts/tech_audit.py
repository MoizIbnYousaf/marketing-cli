#!/usr/bin/env python3
"""
Technical foundations audit — sitemap.xml, robots.txt, meta tags, schema markup.

Usage:
    python tech_audit.py --domain https://example.com
    python tech_audit.py --domain https://example.com --schema https://example.com/alternatives/hootsuite
    python tech_audit.py --local            # scan local repo for sitemap/robots files

Prints findings as JSON to stdout and exit-1 if any critical issues found.

Requires: requests (or falls back to urllib.request stdlib).
"""

import argparse
import json
import re
import sys
from urllib.parse import urljoin

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    import urllib.request
    HAS_REQUESTS = False


def fetch(url: str, timeout: int = 10):
    if HAS_REQUESTS:
        try:
            r = requests.get(url, timeout=timeout, headers={"User-Agent": "seo-sprint-audit/1.0"})
            return r.status_code, r.text, dict(r.headers)
        except requests.RequestException as e:
            return None, str(e), {}
    else:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "seo-sprint-audit/1.0"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status, resp.read().decode("utf-8", errors="ignore"), dict(resp.headers)
        except Exception as e:
            return None, str(e), {}


def audit_sitemap(domain: str):
    findings = []
    url = urljoin(domain, "/sitemap.xml")
    status, body, _ = fetch(url)
    if status is None:
        findings.append({"severity": "critical", "issue": "sitemap_fetch_failed", "detail": body})
        return findings, None
    if status != 200:
        findings.append({"severity": "critical", "issue": "sitemap_not_200", "detail": f"{url} returned {status}"})
        return findings, None

    # Crude XML check
    if "<urlset" not in body and "<sitemapindex" not in body:
        findings.append({"severity": "critical", "issue": "sitemap_invalid_xml", "detail": "no <urlset> or <sitemapindex>"})
        return findings, body

    locs = re.findall(r"<loc>([^<]+)</loc>", body)
    lastmods = re.findall(r"<lastmod>([^<]+)</lastmod>", body)

    if len(locs) == 0:
        findings.append({"severity": "high", "issue": "sitemap_empty", "detail": "sitemap has 0 URLs"})

    # Future-date check
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date()
    for d in lastmods:
        try:
            date = datetime.fromisoformat(d.replace("Z", "+00:00").split("T")[0]).date()
            if date > today:
                findings.append({"severity": "high", "issue": "sitemap_future_lastmod", "detail": d})
                break
        except (ValueError, IndexError):
            continue

    return findings, body


def audit_robots(domain: str):
    findings = []
    url = urljoin(domain, "/robots.txt")
    status, body, _ = fetch(url)
    if status is None:
        findings.append({"severity": "high", "issue": "robots_fetch_failed", "detail": body})
        return findings
    if status != 200:
        findings.append({"severity": "high", "issue": "robots_not_200", "detail": f"{url} returned {status}"})
        return findings

    # Look for site-wide disallow
    if re.search(r"^User-agent:\s*\*\s*\n+\s*Disallow:\s*/\s*$", body, re.MULTILINE):
        findings.append({"severity": "critical", "issue": "robots_disallows_all", "detail": "User-agent: * Disallow: /"})

    # Sitemap reference?
    if "Sitemap:" not in body:
        findings.append({"severity": "medium", "issue": "robots_missing_sitemap_ref", "detail": "No Sitemap: directive"})

    return findings


def audit_meta(url: str):
    findings = []
    status, body, _ = fetch(url)
    if status is None or status != 200:
        findings.append({"severity": "high", "issue": "page_fetch_failed", "detail": f"{url} returned {status}"})
        return findings

    title_match = re.search(r"<title>([^<]+)</title>", body, re.IGNORECASE)
    if not title_match:
        findings.append({"severity": "high", "issue": "missing_title", "detail": url})
    else:
        title = title_match.group(1).strip()
        if len(title) > 60:
            findings.append({"severity": "medium", "issue": "title_too_long", "detail": f"{len(title)} chars: {title}"})

    desc_match = re.search(r'<meta\s+name="description"\s+content="([^"]+)"', body, re.IGNORECASE)
    if not desc_match:
        findings.append({"severity": "medium", "issue": "missing_description", "detail": url})
    else:
        desc = desc_match.group(1).strip()
        if len(desc) > 155:
            findings.append({"severity": "low", "issue": "description_too_long", "detail": f"{len(desc)} chars"})

    canonical_match = re.search(r'<link\s+rel="canonical"\s+href="([^"]+)"', body, re.IGNORECASE)
    if not canonical_match:
        findings.append({"severity": "medium", "issue": "missing_canonical", "detail": url})

    h1_count = len(re.findall(r"<h1[\s>]", body, re.IGNORECASE))
    if h1_count == 0:
        findings.append({"severity": "high", "issue": "missing_h1", "detail": url})
    elif h1_count > 1:
        findings.append({"severity": "medium", "issue": "multiple_h1", "detail": f"{h1_count} H1 tags on {url}"})

    return findings


def audit_schema(url: str):
    findings = []
    status, body, _ = fetch(url)
    if status is None or status != 200:
        findings.append({"severity": "high", "issue": "schema_fetch_failed", "detail": url})
        return findings

    schemas = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>', body, re.IGNORECASE)
    if not schemas:
        findings.append({"severity": "high", "issue": "no_jsonld_found", "detail": url})
        return findings

    types_found = set()
    for s in schemas:
        try:
            parsed = json.loads(s.strip())
            if isinstance(parsed, dict):
                t = parsed.get("@type")
                if isinstance(t, list):
                    types_found.update(t)
                elif t:
                    types_found.add(t)
            elif isinstance(parsed, list):
                for item in parsed:
                    if isinstance(item, dict) and item.get("@type"):
                        types_found.add(item["@type"])
        except json.JSONDecodeError:
            findings.append({"severity": "medium", "issue": "invalid_jsonld", "detail": "Failed to parse one of the JSON-LD blocks"})

    return findings, sorted(types_found)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain", help="Domain to audit (e.g. https://example.com)")
    parser.add_argument("--schema", help="A specific URL to check schema markup on")
    parser.add_argument("--local", action="store_true", help="Scan local repo for sitemap/robots files")
    args = parser.parse_args()

    report = {"domain": args.domain, "findings": []}

    if args.local:
        from pathlib import Path
        root = Path(".")
        local_findings = []
        if not any(root.rglob("sitemap*.xml*")):
            if not any(root.rglob("sitemap*.ts")) and not any(root.rglob("sitemap*.erb")):
                local_findings.append({"severity": "high", "issue": "no_local_sitemap_template", "detail": "No sitemap.xml, sitemap.ts, or sitemap.erb found"})
        if not (root / "public" / "robots.txt").exists() and not (root / "static" / "robots.txt").exists():
            local_findings.append({"severity": "medium", "issue": "no_local_robots", "detail": "No robots.txt in public/ or static/"})
        report["local_findings"] = local_findings

    if args.domain:
        sitemap_findings, sitemap_body = audit_sitemap(args.domain)
        report["findings"].extend(sitemap_findings)

        robots_findings = audit_robots(args.domain)
        report["findings"].extend(robots_findings)

        meta_findings = audit_meta(args.domain)
        report["findings"].extend(meta_findings)

    if args.schema:
        schema_findings_and_types = audit_schema(args.schema)
        if isinstance(schema_findings_and_types, tuple):
            schema_findings, types_found = schema_findings_and_types
            report["schema_target_url"] = args.schema
            report["schema_types_found"] = types_found
            report["findings"].extend(schema_findings)
        else:
            report["findings"].extend(schema_findings_and_types)

    print(json.dumps(report, indent=2))

    severities = {f.get("severity") for f in report["findings"]}
    if "critical" in severities or "high" in severities:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
