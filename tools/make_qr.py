#!/usr/bin/env python3
"""Make a clean, high-contrast QR code for a child's contribution link, and verify it.

Writes assets/qr/<id>-qr.svg (used on the site) and assets/qr/<id>-qr.png (1000+ px, for
printing on invites), then decodes the PNG, including a small, screen-sized copy, with two
independent decoders. Exits with an error unless every decode returns the exact URL.

Usage:
    pip install segno zxing-cpp opencv-python-headless pillow
    python3 tools/make_qr.py vera "https://contribute.trumpaccount.com/..."
Then set qrImage: "assets/qr/vera-qr.svg" in assets/js/config.js.
"""

import sys
from pathlib import Path

import cv2
import numpy as np
import segno
import zxingcpp
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "qr"
DARK = "#1f2a44"   # site navy; ~14:1 contrast against white
LIGHT = "#ffffff"
BORDER = 4         # the quiet zone the QR spec requires


def decode_all(img: Image.Image):
    found = [r.text for r in zxingcpp.read_barcodes(img)]
    text, _, _ = cv2.QRCodeDetector().detectAndDecode(cv2.cvtColor(np.array(img.convert("RGB")), cv2.COLOR_RGB2BGR))
    return found, text


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    kid, url = sys.argv[1], sys.argv[2]
    qr = segno.make(url, error="q", micro=False, boost_error=False)
    OUT.mkdir(parents=True, exist_ok=True)
    svg, png = OUT / f"{kid}-qr.svg", OUT / f"{kid}-qr.png"
    qr.save(svg, kind="svg", scale=10, border=BORDER, dark=DARK, light=LIGHT, xmldecl=False, svgclass=None, lineclass=None)
    qr.save(png, kind="png", scale=24, border=BORDER, dark=DARK, light=LIGHT)
    # crispEdges keeps module edges sharp when the browser scales the SVG
    svg.write_text(svg.read_text().replace("<svg ", '<svg shape-rendering="crispEdges" ', 1))
    print(f"version {qr.version}, error correction {qr.error}, {qr.symbol_size(scale=1, border=0)[0]} modules")

    full = Image.open(png)
    small = full.resize((160, 160), Image.LANCZOS)  # roughly how it appears on screen
    ok = True
    for label, img in (("print png", full), ("screen-size", small)):
        zx, cv = decode_all(img)
        good = zx == [url] and cv == url
        ok &= good
        print(f"{'OK ' if good else 'BAD'} {label}: zxing={zx} opencv={cv!r}")
    for f in (svg, png):
        print(f"wrote {f.relative_to(ROOT)} ({f.stat().st_size // 1024 or 1} KB)")
    if not ok:
        sys.exit("QR verification failed")


if __name__ == "__main__":
    main()
