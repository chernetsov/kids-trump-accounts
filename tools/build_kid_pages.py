#!/usr/bin/env python3
"""Generate one landing page per child (vera/index.html, alisa/index.html) from index.html.

The child pages are the same page as index.html, focused on one girl: app.js reads
data-kid on <html> and swaps in the "kid.*" texts from i18n.js. This script only
rewrites asset paths and the link-preview tags, so after editing index.html run:

    python3 tools/build_kid_pages.py

The GitHub Pages workflow also runs it on every deploy, so the pages never go stale.
Children are read from assets/js/config.js (their "id" becomes the URL: /vera/).
"""

import argparse
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_URL = "https://chernetsov.github.io/kids-trump-accounts/"


def read_kids():
    cfg = (ROOT / "assets/js/config.js").read_text(encoding="utf-8")
    kids = re.findall(r'id:\s*"([a-z0-9-]+)"[^}]*?name:\s*\{\s*en:\s*"([^"]+)"', cfg, re.S)
    if not kids:
        raise SystemExit("No kids found in assets/js/config.js")
    return kids


def set_meta(page, attr, key, value):
    pattern = re.compile(r'(<meta %s="%s" content=")[^"]*(")' % (attr, re.escape(key)))
    page, n = pattern.subn(lambda m: m.group(1) + value + m.group(2), page)
    if n != 1:
        raise SystemExit(f"Expected one <meta {attr}=\"{key}\"> in index.html")
    return page


def build(kid_id, name, src):
    page = src
    page = page.replace('<html lang="en">', f'<html lang="en" data-kid="{kid_id}" data-root="../">', 1)
    page = page.replace("<head>", "<head>\n  <!-- Generated from index.html by tools/build_kid_pages.py. Do not edit by hand. -->", 1)
    page = re.sub(r'(href|src)="assets/', r'\1="../assets/', page)
    page = page.replace('<a class="brand" href="#top"', '<a class="brand" href="../"', 1)

    title = html.escape(f"{name} · A gift that grows")
    desc = html.escape(f"For {name}’s birthday and holidays: a gift that grows, a contribution to her Trump Account. "
                       f"Подарок, который растёт.")
    page = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", page, count=1)
    page = set_meta(page, "name", "description", desc)
    page = set_meta(page, "property", "og:title", title)
    page = set_meta(page, "property", "og:description", desc)
    page = set_meta(page, "property", "og:image", f"{SITE_URL}assets/img/og-{kid_id}.jpg")
    return page


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=str(ROOT), help="output directory (default: repo root)")
    args = ap.parse_args()

    src = (ROOT / "index.html").read_text(encoding="utf-8")
    out = Path(args.out)
    for kid_id, name in read_kids():
        target = out / kid_id / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(build(kid_id, name, src), encoding="utf-8")
        print(f"wrote {target.relative_to(out) if target.is_relative_to(out) else target}")


if __name__ == "__main__":
    main()
